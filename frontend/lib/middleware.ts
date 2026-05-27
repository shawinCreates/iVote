// Frontend Security and Logging Middleware

interface RequestLog {
  timestamp: string;
  method: string;
  url: string;
  status?: number;
  duration: number;
  error?: string;
}

class SecurityMiddleware {
  private requestLogs: RequestLog[] = [];
  private maxLogs = 100;
  private isDevelopment = process.env.NODE_ENV === 'development';

  logRequest(method: string, url: string): number {
    const startTime = Date.now();
    const log: RequestLog = {
      timestamp: new Date().toISOString(),
      method,
      url,
      duration: 0,
    };
    
    this.requestLogs.push(log);
    this.trimLogs();
    
    if (this.isDevelopment) {
      console.log(`[API Request] ${method} ${url}`);
    }
    
    return startTime;
  }

  logResponse(startTime: number, method: string, url: string, status: number, error?: string): void {
    const duration = Date.now() - startTime;
    const logIndex = this.requestLogs.findIndex(
      (log) => log.method === method && log.url === url && log.duration === 0
    );
    
    if (logIndex !== -1) {
      this.requestLogs[logIndex] = {
        ...this.requestLogs[logIndex],
        status,
        duration,
        error,
      };
    }
    
    if (this.isDevelopment) {
      if (error) {
        console.error(`[API Error] ${method} ${url} - ${status} (${duration}ms): ${error}`);
      } else {
        console.log(`[API Response] ${method} ${url} - ${status} (${duration}ms)`);
      }
    }
  }

  private trimLogs(): void {
    if (this.requestLogs.length > this.maxLogs) {
      this.requestLogs = this.requestLogs.slice(-this.maxLogs);
    }
  }

  getLogs(): RequestLog[] {
    return [...this.requestLogs];
  }

  clearLogs(): void {
    this.requestLogs = [];
  }
}

class TokenValidator {
  private tokenExpiryThreshold = 30 * 60 * 1000; // 30 minutes in milliseconds

  validateToken(token: string | null): boolean {
    if (!token) {
      return false;
    }

    try {
      // Decode JWT payload (without verification for frontend)
      const payload = this.decodeJWT(token);
      if (!payload) {
        return false;
      }

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        console.warn('[Security] Token expired');
        return false;
      }

      // Check if token is about to expire (within threshold)
      if (payload.exp && (payload.exp - now) * 1000 < this.tokenExpiryThreshold) {
        console.warn('[Security] Token expiring soon, consider refresh');
      }

      return true;
    } catch (error) {
      console.error('[Security] Token validation failed:', error);
      return false;
    }
  }

  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  }

  getTokenExpiry(token: string | null): number | null {
    if (!token) return null;
    
    try {
      const payload = this.decodeJWT(token);
      return payload?.exp ? payload.exp * 1000 : null;
    } catch (error) {
      return null;
    }
  }
}

class SecurityHeaders {
  static addSecurityHeaders(headers: HeadersInit): HeadersInit {
    const newHeaders = new Headers(headers);
    
    // Add security headers for frontend requests
    newHeaders.set('X-Requested-With', 'XMLHttpRequest');
    newHeaders.set('X-Content-Type-Options', 'nosniff');
    
    return newHeaders;
  }

  static sanitizeUrl(url: string): string {
    // Prevent protocol-relative URLs
    if (url.startsWith('//')) {
      throw new Error('Protocol-relative URLs are not allowed');
    }
    
    // Prevent javascript: protocol
    if (url.toLowerCase().startsWith('javascript:')) {
      throw new Error('JavaScript URLs are not allowed');
    }
    
    return url;
  }
}

class ErrorHandlingMiddleware {
  private static errorCounts: Map<string, number> = new Map();
  private static maxErrorCount = 5;
  private static errorResetTime = 5 * 60 * 1000; // 5 minutes

  static handleError(error: any, url: string): void {
    const errorKey = `${url}:${error.message}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    
    this.errorCounts.set(errorKey, currentCount + 1);
    
    // Reset error counts after threshold time
    setTimeout(() => {
      this.errorCounts.delete(errorKey);
    }, this.errorResetTime);
    
    // Log error details
    console.error('[Security] API Error:', {
      url,
      message: error.message,
      status: error.status,
      count: currentCount + 1,
    });
    
    // Check if error threshold exceeded
    if (currentCount + 1 >= this.maxErrorCount) {
      console.error('[Security] Error threshold exceeded for:', url);
      // Could trigger additional security measures here
    }
  }

  static getAuthError(error: any): string | null {
    if (error.status === 401) {
      return 'Your session has expired. Please log in again.';
    }
    if (error.status === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (error.status === 429) {
      return 'Too many requests. Please try again later.';
    }
    if (error.status >= 500) {
      return 'Server error. Please try again later.';
    }
    return null;
  }

  static clearErrorCounts(): void {
    this.errorCounts.clear();
  }
}

// Export singleton instances
export const securityMiddleware = new SecurityMiddleware();
export const tokenValidator = new TokenValidator();

// Export classes for direct use
export { SecurityHeaders, ErrorHandlingMiddleware };

// Export types
export type { RequestLog };
