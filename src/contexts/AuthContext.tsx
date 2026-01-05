import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateEmail as updateFirebaseEmail,
  sendEmailVerification,
  verifyBeforeUpdateEmail
} from 'firebase/auth';
import { ref, set, get, update } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import { User } from '@/types';
import { logger } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  signup: (email: string, password: string, name: string, role: 'admin' | 'driver' | 'customer') => Promise<boolean>;
  login: (email: string, password: string) => Promise<{ success: boolean; mustChangePassword?: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  updateEmail: (currentPassword: string, newEmail: string) => Promise<boolean>;
  checkAndCompleteEmailChange: () => Promise<boolean>;
  canChangeCredentials: () => boolean;
  isLoading: boolean;
  requiresPasswordChange: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  // Fetch user data from Realtime Database - Optimized with caching
  const fetchUserData = async (uid: string, email: string): Promise<User | null> => {
    try {
      logger.processing('Fetching user data');
      const userRef = ref(database, `users/${uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const userData = snapshot.val();
        logger.loaded('User data fetched');
        return {
          id: uid,
          email: email,
          name: userData.name || '',
          role: userData.role || 'customer',
          phone: userData.phone,
          avatar: userData.avatar,
          assignedVehicleId: userData.assignedVehicleId,
          licenseNumber: userData.licenseNumber,
          mustChangePassword: userData.mustChangePassword || false,
        };
      }
      logger.warning('User data not found');
      return null;
    } catch (error) {
      logger.failed('Error fetching user data', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  };

  useEffect(() => {
    logger.processing('Initializing authentication');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        logger.info('User authenticated');
        // Use Promise with timeout for faster response
        const userDataPromise = Promise.race([
          fetchUserData(firebaseUser.uid, firebaseUser.email || ''),
          new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('Authentication timeout')), 5000)
          )
        ]);
        
        try {
          const userData = await userDataPromise;
          if (userData) {
            setUser(userData);
            // Check if user must change password
            if (userData.mustChangePassword) {
              logger.warning('Password change required', `User ${userData.email} must change password`);
              setRequiresPasswordChange(true);
            } else {
              setRequiresPasswordChange(false);
            }
            logger.loaded('User session established');
          } else {
            logger.warning('User data missing');
          }
        } catch (error) {
          logger.failed('User data fetch timeout', 'Authentication timeout - please try again');
        }
      } else {
        logger.info('User signed out');
        setUser(null);
        setRequiresPasswordChange(false);
      }
      
      setIsLoading(false);
    });

    return () => {
      logger.info('Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  const signup = async (
    email: string, 
    password: string, 
    name: string, 
    role: 'admin' | 'driver' | 'customer'
  ): Promise<boolean> => {
    try {
    setIsLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
    
      // Store user data in Realtime Database
      await set(ref(database, `users/${uid}`), {
        name,
        email,
        role,
        createdAt: Date.now(),
      });

      // Fetch and set user data
      const userData = await fetchUserData(uid, email);
      if (userData) {
        setUser(userData);
      }

      setIsLoading(false);
      return true;
    } catch (error: any) {
      console.error('Signup error:', error);
      setIsLoading(false);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; mustChangePassword?: boolean }> => {
    try {
      logger.processing('Starting login process');
      setIsLoading(true);
      
      // Add timeout to prevent hanging
      const loginPromise = Promise.race([
        signInWithEmailAndPassword(auth, email, password),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Login timeout')), 8000)
        )
      ]);
      
      await loginPromise;
      logger.success('Login successful');
      // User data will be fetched in onAuthStateChanged
      setIsLoading(false);
      return { success: true };
    } catch (error: any) {
      setIsLoading(false);
      
      // Handle specific Firebase auth errors
      let errorMessage = 'Invalid email or password';
      if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Login timeout. Please try again.';
      }
      
      logger.failed('Login failed', `${error.code || 'Unknown'}: ${errorMessage}`);
      return { success: false };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      logger.processing('Starting logout process');
      
      // Show immediate feedback
      const userName = user?.name || 'User';
      
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
      setRequiresPasswordChange(false);
      
      logger.success('Logout successful');
    } catch (error) {
      logger.failed('Logout error', error instanceof Error ? error.message : 'Unknown error');
      // Still clear local state even if Firebase logout fails
      setUser(null);
      setFirebaseUser(null);
      setRequiresPasswordChange(false);
    }
  };

  const refreshUser = async (): Promise<void> => {
    if (firebaseUser) {
      const userData = await fetchUserData(firebaseUser.uid, firebaseUser.email || '');
      setUser(userData);
      // Update password change requirement
      if (userData?.mustChangePassword) {
        setRequiresPasswordChange(true);
      } else {
        setRequiresPasswordChange(false);
      }
    }
  };

  const canChangeCredentials = (): boolean => {
    if (!user) return false;
    
    // Admin can always change credentials
    if (user.role === 'admin') return true;
    
    // Customer can always change their own credentials
    if (user.role === 'customer') return true;
    
    // All drivers can change credentials (both admin-created and regular)
    if (user.role === 'driver') return true;
    
    return false;
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    if (!canChangeCredentials()) {
      logger.failed('Password change not allowed', 'User does not have permission to change password');
      return false;
    }
    
    try {
      if (!firebaseUser || !user) {
        logger.failed('Password change failed', 'No authenticated user');
        return false;
      }

      logger.processing('Changing password');
      
      // Reauthenticate user first
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      
      // Update password
      await updatePassword(firebaseUser, newPassword);
      
      // Clear mustChangePassword flag in database
      const userRef = ref(database, `users/${user.id}`);
      await update(userRef, {
        mustChangePassword: false,
        updatedAt: Date.now()
      });
      
      // Update local state
      setUser({ ...user, mustChangePassword: false });
      setRequiresPasswordChange(false);
      
      logger.success('Password changed successfully');
      return true;
    } catch (error: any) {
      logger.failed('Password change failed', error.message || 'Unknown error');
      
      // Handle specific errors
      if (error.code === 'auth/wrong-password') {
        logger.failed('Current password incorrect', 'Authentication failed');
      } else if (error.code === 'auth/weak-password') {
        logger.failed('Password too weak', 'New password does not meet requirements');
      }
      
      return false;
    }
  };

  const updateEmail = async (currentPassword: string, newEmail: string): Promise<boolean> => {
    if (!canChangeCredentials()) {
      logger.failed('Email update not allowed', 'User does not have permission to change email');
      return false;
    }
    
    try {
      if (!firebaseUser || !user) {
        logger.failed('Email update failed', 'No authenticated user');
        return false;
      }

      logger.processing('Updating email');
      
      // Reauthenticate user first
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      
      // Use verifyBeforeUpdateEmail to send verification email first
      await verifyBeforeUpdateEmail(firebaseUser, newEmail);
      
      // Update email in database (but not in Firebase Auth until verified)
      const userRef = ref(database, `users/${user.id}`);
      await update(userRef, {
        pendingEmail: newEmail,
        updatedAt: Date.now()
      });
      
      logger.success('Email verification sent successfully');
      return true;
    } catch (error: any) {
      logger.failed('Email update failed', error.message || 'Unknown error');
      
      // Handle specific errors
      if (error.code === 'auth/wrong-password') {
        logger.failed('Current password incorrect', 'Authentication failed');
      } else if (error.code === 'auth/email-already-in-use') {
        logger.failed('Email already in use', 'Please choose a different email');
      } else if (error.code === 'auth/invalid-email') {
        logger.failed('Invalid email format', 'Please enter a valid email address');
      }
      
      return false;
    }
  };

  const checkAndCompleteEmailChange = async (): Promise<boolean> => {
    try {
      if (!firebaseUser || !user) {
        logger.failed('Email change check failed', 'No authenticated user');
        return false;
      }

      // Check if user has pending email verification
      const userRef = ref(database, `users/${user.id}`);
      const userSnapshot = await get(userRef);
      const userData = userSnapshot.val();
      
      if (userData?.pendingEmail && firebaseUser.emailVerified) {
        // Complete the email change
        await updateFirebaseEmail(firebaseUser, userData.pendingEmail);
        
        // Clear pending email from database
        await update(userRef, {
          email: userData.pendingEmail,
          pendingEmail: null,
          updatedAt: Date.now()
        });
        
        // Update local state
        setUser({ ...user, email: userData.pendingEmail });
        
        logger.success('Email change completed successfully');
        return true;
      }
      
      return false;
    } catch (error: any) {
      logger.failed('Email change completion failed', error.message || 'Unknown error');
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      firebaseUser, 
      signup, 
      login, 
      logout, 
      refreshUser, 
      changePassword,
      updateEmail,
      checkAndCompleteEmailChange,
      canChangeCredentials,
      isLoading, 
      requiresPasswordChange 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
