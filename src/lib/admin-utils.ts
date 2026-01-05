import { ref, set, serverTimestamp } from 'firebase/database';
import { createUserWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { auth, database } from '@/lib/firebase';
import { logger } from '@/lib/logger';

interface CreateDriverData {
  name: string;
  phone?: string;
  licenseNumber?: string;
  assignedVehicleId?: string;
}

interface CreateDriverResult {
  success: boolean;
  uid?: string;
  email?: string;
  tempPassword?: string;
  error?: string;
}

/**
 * Admin function to create a new driver account
 * Uses internal email format (driver_<id>@app.local)
 * Sets temporary password and mustChangePassword flag
 */
export const createDriverAccount = async (driverData: CreateDriverData): Promise<CreateDriverResult> => {
  try {
    logger.processing('Creating driver account');
    
    // Generate internal email and temporary password
    const timestamp = Date.now();
    const driverId = `driver_${timestamp}`;
    const email = `${driverId}@app.local`;
    const tempPassword = `TempPass${timestamp.toString().slice(-6)}`; // Last 6 digits of timestamp
    
    logger.info('Creating Firebase Auth account', `Email: ${email}`);
    
    // Create Firebase Auth account
    const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
    const uid = userCredential.user.uid;
    
    // Store driver data in Realtime Database with mustChangePassword flag
    const userData = {
      ...driverData,
      email,
      role: 'driver',
      mustChangePassword: true, // Force password change on first login
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await set(ref(database, `users/${uid}`), userData);
    
    logger.success('Driver account created', `UID: ${uid}, Email: ${email}`);
    
    return {
      success: true,
      uid,
      email,
      tempPassword,
    };
    
  } catch (error: any) {
    logger.failed('Driver account creation failed', error.message || 'Unknown error');
    
    let errorMessage = 'Failed to create driver account';
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Email already exists. Please try again.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Temporary password is too weak. Please try again.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email format. Please try again.';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Generate driver credentials for admin display
 */
export const generateDriverCredentials = (driverId?: string) => {
  const timestamp = Date.now();
  const id = driverId || `driver_${timestamp}`;
  const email = `${id}@app.local`;
  const tempPassword = `TempPass${timestamp.toString().slice(-6)}`;
  
  return {
    email,
    password: tempPassword,
    displayEmail: email,
    instructions: [
      '1. Share these credentials with the driver',
      '2. Driver will login with temporary password',
      '3. On first login, driver must change password',
      '4. After password change, normal dashboard access is granted'
    ]
  };
};
