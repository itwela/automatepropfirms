// Authentication service for ProjectX TopStep API

export interface AuthResponse {
  token: string;
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
}

export interface AuthRequest {
  userName: string;
  apiKey: string;
}

export interface ValidateResponse {
  success: boolean;
  errorCode: number;
  errorMessage: string | null;
}

class AuthService {
  private sessionToken: string | null = null;
  private tokenExpiry: number | null = null;
  private userName: string | null = null;
  private apiKey: string | null = null;
  private isValidating: boolean = false;
  private autoValidationInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start automatic validation when service is created
    this.startAutoValidation();
  }

  // Start automatic background validation
  private startAutoValidation(): void {
    // Clear any existing interval
    if (this.autoValidationInterval) {
      clearInterval(this.autoValidationInterval);
    }

    // Run validation every 12 hours (half of the 24-hour expiry)
    this.autoValidationInterval = setInterval(async () => {
      if (this.sessionToken && this.userName && this.apiKey) {
        try {
          console.log('Running automatic session validation...');
          const isValid = await this.validateSession();
          if (isValid) {
            console.log('Automatic validation successful');
          } else {
            console.log('Automatic validation failed, will re-authenticate on next request');
          }
        } catch (error) {
          console.error('Automatic validation error:', error);
        }
      }
    }, 12 * 60 * 60 * 1000); // 12 hours
  }

  // Stop automatic validation
  private stopAutoValidation(): void {
    if (this.autoValidationInterval) {
      clearInterval(this.autoValidationInterval);
      this.autoValidationInterval = null;
    }
  }

  // Get session token (either from cache, validate existing, or authenticate)
  async getSessionToken(userName: string, apiKey: string): Promise<string> {
    // Store credentials for revalidation
    this.userName = userName;
    this.apiKey = apiKey;

    // Check if we have a cached token
    if (this.sessionToken && this.tokenExpiry) {
      // If token is still valid, return it
      if (Date.now() < this.tokenExpiry) {
        return this.sessionToken;
      }
      
      // If token is expired but we have credentials, try to validate it first
      if (this.userName && this.apiKey) {
        try {
          console.log('Token expired, attempting to validate existing token...');
          const isValid = await this.validateSession();
          if (isValid) {
            // Update expiry time after successful validation
            this.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
            console.log('Token validation successful, extending expiry');
            return this.sessionToken;
          }
        } catch (error) {
          console.log('Token validation failed, will re-authenticate:', error);
        }
      }
    }

    // If no valid token, authenticate to get new token
    return this.authenticate(userName, apiKey);
  }

  // Validate existing session token
  async validateSession(): Promise<boolean> {
    if (!this.sessionToken || this.isValidating) {
      return false;
    }

    this.isValidating = true;

    try {
      console.log('Validating session token...');

      const response = await fetch('https://api.topstepx.com/api/Auth/validate', {
        method: 'POST',
        headers: {
          'accept': 'text/plain',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.sessionToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ValidateResponse = await response.json();
      
      console.log('Session validation response:', data);

      if (!data.success || data.errorCode !== 0) {
        throw new Error(data.errorMessage || 'Session validation failed');
      }

      console.log('Session token is still valid');
      return true;

    } catch (error) {
      console.error('Session validation error:', error);
      // Clear invalid token
      this.sessionToken = null;
      this.tokenExpiry = null;
      return false;
    } finally {
      this.isValidating = false;
    }
  }

  // Authenticate with the API
  private async authenticate(userName: string, apiKey: string): Promise<string> {
    try {
      console.log('Authenticating with ProjectX TopStep API...');

      const response = await fetch('https://api.topstepx.com/api/Auth/loginKey', {
        method: 'POST',
        headers: {
          'accept': 'text/plain',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userName: userName,
          apiKey: apiKey
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AuthResponse = await response.json();
      
      console.log('Authentication response:', data);

      if (!data.success || data.errorCode !== 0) {
        throw new Error(data.errorMessage || 'Authentication failed');
      }

      // Store the session token and set expiry (tokens typically last 24 hours)
      this.sessionToken = data.token;
      this.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

      console.log('Successfully authenticated with ProjectX TopStep API');
      return data.token;

    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  // Force revalidation of current token
  async revalidateSession(): Promise<boolean> {
    if (!this.userName || !this.apiKey) {
      throw new Error('No credentials available for revalidation');
    }

    console.log('Force revalidating session...');
    
    // Clear current token and re-authenticate
    this.sessionToken = null;
    this.tokenExpiry = null;
    
    try {
      await this.authenticate(this.userName, this.apiKey);
      return true;
    } catch (error) {
      console.error('Revalidation failed:', error);
      return false;
    }
  }

  // Clear cached token
  clearToken(): void {
    this.sessionToken = null;
    this.tokenExpiry = null;
    this.userName = null;
    this.apiKey = null;
    this.stopAutoValidation();
  }

  // Get current token (without authentication)
  getCurrentToken(): string | null {
    return this.sessionToken;
  }

  // Check if token is valid
  isTokenValid(): boolean {
    return !!(this.sessionToken && this.tokenExpiry && Date.now() < this.tokenExpiry);
  }

  // Get token expiry time
  getTokenExpiry(): Date | null {
    return this.tokenExpiry ? new Date(this.tokenExpiry) : null;
  }

  // Get time until token expires (in milliseconds)
  getTimeUntilExpiry(): number {
    if (!this.tokenExpiry) return 0;
    return Math.max(0, this.tokenExpiry - Date.now());
  }
}

// Export singleton instance
export const authService = new AuthService(); 