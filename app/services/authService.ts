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
  // Support multiple concurrent sessions keyed by client identifier (defaults to userName)
  private sessions: Map<string, {
    token: string | null;
    tokenExpiry: number | null;
    userName: string;
    apiKey: string;
    isValidating: boolean;
  }> = new Map();

  // For backward compatibility with legacy single-session usage
  private defaultClientKey: string | null = null;
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
      try {
        const validationPromises: Array<Promise<void>> = [];
        for (const [clientKey, record] of this.sessions.entries()) {
          if (record.token && !record.isValidating) {
            validationPromises.push(
              (async () => {
                try {
                  const ok = await this.validateSession(clientKey);
                  if (ok) {
                    // Extend expiry on successful validation
                    const current = this.sessions.get(clientKey);
                    if (current) {
                      current.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000);
                      this.sessions.set(clientKey, current);
                    }
                  }
                } catch (err) {
                  console.error(`Automatic validation error for ${clientKey}:`, err);
                }
              })()
            );
          }
        }
        // Validate all in parallel
        await Promise.all(validationPromises);
      } catch (error) {
        console.error('Automatic validation sweep error:', error);
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
  async getSessionToken(userName: string, apiKey: string, clientId?: string): Promise<string> {
    const clientKey = (clientId ?? userName).trim();
    if (!clientKey) {
      throw new Error('clientId or userName must be provided');
    }

    // Set default key for backward compatibility
    this.defaultClientKey = clientKey;

    // Ensure a session record exists
    if (!this.sessions.has(clientKey)) {
      this.sessions.set(clientKey, {
        token: null,
        tokenExpiry: null,
        userName,
        apiKey,
        isValidating: false,
      });
    } else {
      // Keep latest credentials in case they changed
      const existing = this.sessions.get(clientKey)!;
      existing.userName = userName;
      existing.apiKey = apiKey;
      this.sessions.set(clientKey, existing);
    }

    const record = this.sessions.get(clientKey)!;

    // If we have a cached token
    if (record.token && record.tokenExpiry) {
      if (Date.now() < record.tokenExpiry) {
        return record.token;
      }
      // Try to validate expired token first
      try {
        console.log(`[${clientKey}] Token expired, attempting validation...`);
        const isValid = await this.validateSession(clientKey);
        if (isValid) {
          const updated = this.sessions.get(clientKey)!;
          updated.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000);
          this.sessions.set(clientKey, updated);
          console.log(`[${clientKey}] Validation successful, extending expiry`);
          return updated.token!;
        }
      } catch (error) {
        console.log(`[${clientKey}] Token validation failed, re-authenticating:`, error);
      }
    }

    // Authenticate to get a new token
    return this.authenticateForKey(clientKey, userName, apiKey);
  }

  // Validate existing session token
  async validateSession(clientId?: string): Promise<boolean> {
    const clientKey = clientId ?? this.defaultClientKey;
    if (!clientKey) return false;

    const record = this.sessions.get(clientKey);
    if (!record || !record.token || record.isValidating) {
      return false;
    }

    record.isValidating = true;
    this.sessions.set(clientKey, record);

    try {
      console.log(`[${clientKey}] Validating session token...`);

      const response = await fetch('https://api.topstepx.com/api/Auth/validate', {
        method: 'POST',
        headers: {
          'accept': 'text/plain',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${record.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ValidateResponse = await response.json();
      console.log(`[${clientKey}] Session validation response:`, data);

      if (!data.success || data.errorCode !== 0) {
        throw new Error(data.errorMessage || 'Session validation failed');
      }

      console.log(`[${clientKey}] Session token is still valid`);
      return true;

    } catch (error) {
      console.error(`[${clientKey}] Session validation error:`, error);
      // Clear invalid token for this session
      const updated = this.sessions.get(clientKey);
      if (updated) {
        updated.token = null;
        updated.tokenExpiry = null;
        this.sessions.set(clientKey, updated);
      }
      return false;
    } finally {
      const updated = this.sessions.get(clientKey);
      if (updated) {
        updated.isValidating = false;
        this.sessions.set(clientKey, updated);
      }
    }
  }

  // Authenticate with the API
  private async authenticateForKey(clientKey: string, userName: string, apiKey: string): Promise<string> {
    try {
      console.log(`[${clientKey}] Authenticating with ProjectX TopStep API...`);

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
      console.log(`[${clientKey}] Authentication response:`, data);

      if (!data.success || data.errorCode !== 0) {
        throw new Error(data.errorMessage || 'Authentication failed');
      }

      // Store the session token and set expiry (tokens typically last 24 hours)
      const record = this.sessions.get(clientKey) ?? {
        token: null,
        tokenExpiry: null,
        userName,
        apiKey,
        isValidating: false,
      };
      record.token = data.token;
      record.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
      record.userName = userName;
      record.apiKey = apiKey;
      this.sessions.set(clientKey, record);

      console.log(`[${clientKey}] Successfully authenticated with ProjectX TopStep API`);
      return data.token;

    } catch (error) {
      console.error(`[${clientKey}] Authentication error:`, error);
      throw error;
    }
  }

  // Force revalidation of current token
  async revalidateSession(clientId?: string): Promise<boolean> {
    const clientKey = clientId ?? this.defaultClientKey;
    if (!clientKey) throw new Error('No client specified for revalidation');

    const record = this.sessions.get(clientKey);
    if (!record) throw new Error('No credentials available for revalidation');

    console.log(`[${clientKey}] Force revalidating session...`);
    record.token = null;
    record.tokenExpiry = null;
    this.sessions.set(clientKey, record);
    
    try {
      await this.authenticateForKey(clientKey, record.userName, record.apiKey);
      return true;
    } catch (error) {
      console.error(`[${clientKey}] Revalidation failed:`, error);
      return false;
    }
  }

  // Clear cached token
  clearToken(clientId?: string): void {
    if (clientId) {
      this.sessions.delete(clientId);
      if (this.defaultClientKey === clientId) this.defaultClientKey = null;
    } else {
      this.sessions.clear();
      this.defaultClientKey = null;
    }
  }

  // Get current token (without authentication)
  getCurrentToken(clientId?: string): string | null {
    const clientKey = clientId ?? this.defaultClientKey;
    if (!clientKey) return null;
    return this.sessions.get(clientKey)?.token ?? null;
  }

  // Check if token is valid
  isTokenValid(clientId?: string): boolean {
    const clientKey = clientId ?? this.defaultClientKey;
    if (!clientKey) return false;
    const record = this.sessions.get(clientKey);
    return !!(record && record.token && record.tokenExpiry && Date.now() < record.tokenExpiry);
  }

  // Get token expiry time
  getTokenExpiry(clientId?: string): Date | null {
    const clientKey = clientId ?? this.defaultClientKey;
    if (!clientKey) return null;
    const expiry = this.sessions.get(clientKey)?.tokenExpiry ?? null;
    return expiry ? new Date(expiry) : null;
  }

  // Get time until token expires (in milliseconds)
  getTimeUntilExpiry(clientId?: string): number {
    const clientKey = clientId ?? this.defaultClientKey;
    if (!clientKey) return 0;
    const expiry = this.sessions.get(clientKey)?.tokenExpiry ?? null;
    if (!expiry) return 0;
    return Math.max(0, expiry - Date.now());
  }
}

// Export singleton instance
export const authService = new AuthService(); 