// API Configuration for LogiTech Logistics
import { apiFallback } from './api-fallback';

// Environment-based API selection
const environment = import.meta.env.VITE_ENVIRONMENT || (import.meta.env.DEV ? 'development' : 'production');
const isDevelopmentMode = environment === 'development';

// Base API URLs based on environment
export const PRIMARY_API_URL = isDevelopmentMode 
  ? 'http://localhost:3001' 
  : 'https://logitech-server.vercel.app';

export const FALLBACK_API_URL = import.meta.env.VITE_FALLBACK_API || 'http://localhost:3001';

// API Response Types (export for compatibility)
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadResponse {
  success: boolean;
  url: string;
  publicId: string;
  message?: string;
  error?: string;
}

export interface RazorpayOrderResponse {
  success: boolean;
  orderId: string;
  amount: number;
  currency: string;
  error?: string;
}

export interface RazorpayVerifyResponse {
  success: boolean;
  verified: boolean;
  orderId: string;
  paymentId: string;
  error?: string;
}

export interface HealthResponse {
  status: string;
  message: string;
}

// Development vs Production detection
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// API configuration object
export const API_CONFIG = {
  primaryURL: PRIMARY_API_URL,
  fallbackURL: FALLBACK_API_URL,
  isDevelopment,
  isProduction,
  timeout: 10000,
} as const;

// Helper function for API calls (now uses fallback service)
export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  return apiFallback.request<T>(endpoint, options);
}

// Helper for multipart form data (file uploads)
export async function apiUpload<T>(
  endpoint: string,
  formData: FormData
): Promise<ApiResponse<T>> {
  const options: RequestInit = {
    method: 'POST',
    body: formData,
    headers: {}, // Let browser set Content-Type for multipart
  };

  return apiFallback.request<T>(endpoint, options);
}

// Specific API methods using fallback service
export const api = {
  // Image upload
  uploadImage: (formData: FormData) => apiFallback.uploadImage(formData),
  
  // Razorpay operations
  createRazorpayOrder: (amount: number, currency?: string) => 
    apiFallback.createRazorpayOrder(amount, currency),
  verifyRazorpayPayment: (orderId: string, paymentId: string, signature: string) =>
    apiFallback.verifyRazorpayPayment(orderId, paymentId, signature),
  
  // Health check
  healthCheck: () => apiFallback.healthCheck(),
  
  // Generic request
  request: <T>(endpoint: string, options?: RequestInit) => 
    apiFallback.request<T>(endpoint, options),
  
  // Status
  getStatus: () => apiFallback.getStatus(),
};

// API Endpoints
export const API_ENDPOINTS = {
  RAZORPAY_CREATE_ORDER: '/api/razorpay/create-order',
  RAZORPAY_VERIFY_PAYMENT: '/api/razorpay/verify-payment',
  UPLOAD_IMAGE: '/api/upload-image',
} as const;

// Export for easy usage (backward compatibility)
export default {
  API_CONFIG,
  API_ENDPOINTS,
  apiCall,
  apiUpload,
  api,
  PRIMARY_API_URL,
  FALLBACK_API_URL,
};