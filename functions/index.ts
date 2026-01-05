import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import Razorpay from 'razorpay';
import { createHmac } from 'crypto';
import multer from 'multer';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Add after line 21 (after existing middleware)

// Security middleware
app.use((req: any, res: any, next: any) => {
  // Rate limiting (basic implementation)
  const clientIP = req.ip || req.connection.remoteAddress;
  const currentTime = Date.now();
  
  // Simple in-memory rate limiting (for production, use Redis)
  const rateLimitMap = (global as any).rateLimitMap || new Map();
  (global as any).rateLimitMap = rateLimitMap;
  
  const key = `${clientIP}:${req.path}`;
  const requests = rateLimitMap.get(key) || [];
  
  // Clean old requests (older than 1 minute)
  const validRequests = requests.filter((time: number) => currentTime - time < 60000);
  
  if (validRequests.length > 30) { // 30 requests per minute
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  validRequests.push(currentTime);
  rateLimitMap.set(key, validRequests);

  // Validate origin for sensitive endpoints
  const sensitiveEndpoints = ['/api/razorpay/', '/api/upload'];
  const isSensitive = sensitiveEndpoints.some(endpoint => req.path.includes(endpoint));
  
  if (isSensitive) {
    const origin = req.headers.origin;
    const allowedOrigins = [
      'http://localhost:5173', // Vite dev
      'https://logic-flow-e72c1.firebaseapp.com',
      'https://logic-flow-e72c1.web.app',
    ];
    
    if (!allowedOrigins.includes(origin) && process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Origin not allowed' });
    }
  }

  next();
});

// Add Firebase App Check validation (optional but recommended)
app.use(async (req: any, res: any, next: any) => {
  const appCheckToken = req.header('X-Firebase-AppCheck');
  
  // Skip App Check for health endpoint and development
  if (req.path === '/health' || process.env.DEV) {
    return next();
  }

  if (!appCheckToken) {
    return res.status(401).json({ error: 'App Check token required' });
  }

  try {
    // Verify App Check token
    await admin.appCheck().verifyToken(appCheckToken);
    next();
  } catch (error) {
    console.error('App Check verification failed:', error);
    res.status(401).json({ error: 'Invalid App Check token' });
  }
});

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req: any, file: Express.Multer.File, cb: (error: Error | null, acceptFile?: boolean) => void) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// Razorpay configuration
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// // Mappls token validation endpoint
// app.get('/api/validate-mappls', async (req: any, res: any) => {
//   try {
//     const { token } = req.query;
    
//     if (!token) {
//       return res.status(400).json({ 
//         valid: false, 
//         error: 'Token is required' 
//       });
//     }

//     // Test token by making a request to Mappls API
//     const testUrl = `https://apis.mappls.com/advancedmaps/api/${token}/map_sdk?v=3.8&layer=vector`;
    
//     try {
//       const response = await fetch(testUrl, { 
//         method: 'HEAD',
//         signal: AbortSignal.timeout(5000) // 5 second timeout
//       });
      
//       if (response.ok) {
//         res.json({
//           valid: true,
//           message: 'Token is valid',
//           tokenLength: token.length,
//           tokenPrefix: (typeof token === 'string' ? token.substring(0, 20) : String(token).substring(0, 20)) + '...'
//         });
//       } else if (response.status === 401) {
//         res.json({
//           valid: false,
//           error: 'Token is invalid or expired (401)',
//           suggestion: 'Please check your Mappls token and get a new one from mappls.com/api'
//         });
//       } else if (response.status === 403) {
//         res.json({
//           valid: false,
//           error: 'Token is forbidden (403)',
//           suggestion: 'Token may not have the required permissions'
//         });
//       } else {
//         res.json({
//           valid: false,
//           error: `Token validation failed (${response.status})`,
//           suggestion: 'Check token format and network connection'
//         });
//       }
//     } catch (fetchError: any) {
//       res.json({
//         valid: false,
//         error: 'Network error during validation',
//         details: fetchError.message,
//         suggestion: 'Check network connection and try again'
//       });
//     }
//   } catch (error: any) {
//     console.error('Token validation error:', error);
//     res.status(500).json({ 
//       valid: false, 
//       error: 'Internal server error during validation' 
//     });
//   }
// });

// Health check
app.get('/health', (req: any, res: any) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// File upload endpoint (using multer)
app.post('/api/upload-image', upload.single('image'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Convert buffer to base64
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(base64Image, {
      folder: 'logitech-vehicles',
      resource_type: 'auto',
      transformation: [
        { width: 800, height: 600, crop: 'limit' }, // Resize for optimization
        { quality: 'auto:good' } // Auto quality
      ]
    });

    res.json({
      success: true,
      url: uploadResponse.secure_url,
      publicId: uploadResponse.public_id,
      message: 'Image uploaded successfully'
    });
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload image', 
      details: error.message 
    });
  }
});

// Backup: Original base64 upload endpoint (for compatibility)
app.post('/api/upload', async (req: any, res: any) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: 'logitech-vehicles',
      resource_type: 'auto',
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto:good' }
      ]
    });

    res.json({
      success: true,
      url: uploadResponse.secure_url,
      publicId: uploadResponse.public_id,
    });
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ error: 'Failed to upload image', details: error.message });
  }
});

// Razorpay order creation endpoint
app.post('/api/razorpay/create-order', async (req: any, res: any) => {
  try {
    const { amount, currency = 'INR' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error: any) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

// Razorpay payment verification endpoint
app.post('/api/razorpay/verify-payment', async (req: any, res: any) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ success: false, error: 'Missing payment details' });
    }

    const generatedSignature = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature === signature) {
      res.json({
        success: true,
        verified: true,
        orderId,
        paymentId,
      });
    } else {
      res.status(400).json({
        success: false,
        verified: false,
        error: 'Invalid signature',
      });
    }
  } catch (error: any) {
    console.error('Razorpay verification error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify payment', details: error.message });
  }
});

// Error handling middleware
app.use((err: Error, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Export the Express app as a Firebase Function
export const api = functions.https.onRequest(app);
