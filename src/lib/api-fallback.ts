// API Fallback Utility for Dual Backend Architecture
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface FallbackConfig {
  primaryApi: string;
  fallbackApi: string;
  timeout: number;
  maxRetries: number;
}

class ApiFallbackService {
  private config: FallbackConfig;
  private retryCount = 0;

  constructor() {
    const environment = import.meta.env.VITE_ENVIRONMENT || (import.meta.env.DEV ? 'development' : 'production');
    const isDevelopmentMode = environment === 'development';
    
    this.config = {
      primaryApi: isDevelopmentMode 
        ? 'http://localhost:3001' 
        : 'https://logitech-server.vercel.app',
      fallbackApi: 'http://localhost:3001', // Keep localhost as fallback
      timeout: 10000,
      maxRetries: isDevelopmentMode ? 1 : 2 // Fewer retries in development
    };
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      // Don't set Content-Type for FormData - let browser set it with boundary
      const headers = { ...options.headers };
      if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          ...headers,
        },
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async tryEndpoint<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      console.log(`Making request to: ${url}`);
      console.log('Request options:', { ...options, body: options.body instanceof FormData ? 'FormData' : options.body });
      
      const response = await this.fetchWithTimeout(url, options);
      
      console.log(`Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.clone().json();
          errorMessage += ` - ${JSON.stringify(errorData)}`;
        } catch (e) {
          // If response is not JSON, try text
          try {
            const errorText = await response.clone().text();
            if (errorText) errorMessage += ` - ${errorText}`;
          } catch (textError) {
            // Ignore if we can't read response body
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Response data:', data);
      this.retryCount = 0; // Reset retry count on success
      return {
        success: true,
        data
      };
    } catch (error) {
      console.warn(`API call failed for ${url}:`, error);
      throw error;
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const primaryUrl = `${this.config.primaryApi}${endpoint}`;
    const fallbackUrl = `${this.config.fallbackApi}${endpoint}`;

    // Try primary API first
    try {
      console.log(`Trying primary API: ${primaryUrl}`);
      return await this.tryEndpoint<T>(primaryUrl, options);
    } catch (primaryError) {
      console.warn('Primary API failed, trying fallback:', primaryError);

      // Try fallback API
      try {
        console.log(`Trying fallback API: ${fallbackUrl}`);
        return await this.tryEndpoint<T>(fallbackUrl, options);
      } catch (fallbackError) {
        console.error('Both APIs failed:', { primaryError, fallbackError });
        
        // Retry logic
        if (this.retryCount < this.config.maxRetries) {
          this.retryCount++;
          console.log(`Retrying... Attempt ${this.retryCount}/${this.config.maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount)); // Exponential backoff
          return this.request<T>(endpoint, options);
        }

        throw new Error(`All API endpoints failed. Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`);
      }
    }
  }

  // Specialized methods for different endpoints
  async uploadImage(formData: FormData): Promise<any> {
    const options: RequestInit = {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for multipart
    };

    return this.request('/api/upload-image', options);
  }

  async createRazorpayOrder(amount: number, currency = 'INR'): Promise<any> {
    return this.request('/api/razorpay/create-order', {
      method: 'POST',
      body: JSON.stringify({ amount, currency }),
    });
  }

  async verifyRazorpayPayment(orderId: string, paymentId: string, signature: string): Promise<any> {
    return this.request('/api/razorpay/verify-payment', {
      method: 'POST',
      body: JSON.stringify({ orderId, paymentId, signature }),
    });
  }

  async healthCheck(): Promise<any> {
    return this.request('/health', { method: 'GET' });
  }

  // Get current status
  getStatus() {
    return {
      config: this.config,
      retryCount: this.retryCount,
      primaryApi: this.config.primaryApi,
      fallbackApi: this.config.fallbackApi,
    };
  }
}

// Export singleton instance
export const apiFallback = new ApiFallbackService();
export default apiFallback;