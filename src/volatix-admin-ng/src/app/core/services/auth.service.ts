import { Injectable, signal, computed, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, delay, catchError, tap } from 'rxjs/operators';
import { User, LoginCredentials, AuthResponse, AuthState, UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'volatix_auth_token';
  private readonly USER_KEY = 'volatix_user';

  // Reactive state using signals
  private _authState = signal<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: false,
    error: null,
  });

  // Public computed signals
  public readonly authState = this._authState.asReadonly();
  public readonly isAuthenticated = computed(() => this._authState().isAuthenticated);
  public readonly currentUser = computed(() => this._authState().user);
  public readonly isLoading = computed(() => this._authState().loading);
  public readonly authError = computed(() => this._authState().error);

  constructor(
    private http: HttpClient, 
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeAuth();
  }

  /**
   * Check if running in browser environment
   */
  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /**
   * Safe localStorage getter
   */
  private getFromStorage(key: string): string | null {
    if (this.isBrowser()) {
      return localStorage.getItem(key);
    }
    return null;
  }

  /**
   * Safe localStorage setter
   */
  private setInStorage(key: string, value: string): void {
    if (this.isBrowser()) {
      localStorage.setItem(key, value);
    }
  }

  /**
   * Safe localStorage remover
   */
  private removeFromStorage(key: string): void {
    if (this.isBrowser()) {
      localStorage.removeItem(key);
    }
  }

  /**
   * Initialize authentication state from localStorage
   */
  private initializeAuth(): void {
    if (!this.isBrowser()) {
      return; // Skip initialization on server side
    }

    const token = this.getFromStorage(this.TOKEN_KEY);
    const userData = this.getFromStorage(this.USER_KEY);

    if (token && userData) {
      try {
        const user: User = JSON.parse(userData);
        this.updateAuthState({
          isAuthenticated: true,
          user,
          token,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.clearStoredAuth();
      }
    }
  }

  /**
   * Login user with credentials
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    this.updateAuthState({ ...this._authState(), loading: true, error: null });

    // Simulate API call with delay
    return this.simulateAuthRequest(credentials).pipe(
      tap((response) => {
        if (response.success && response.user && response.token) {
          this.setAuthData(response.user, response.token);
        } else {
          this.updateAuthState({
            ...this._authState(),
            loading: false,
            error: response.message || 'Login failed',
          });
        }
      }),
      catchError((error) => {
        this.updateAuthState({
          ...this._authState(),
          loading: false,
          error: error.message || 'An error occurred during login',
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Logout user
   */
  logout(): void {
    this.clearStoredAuth();
    this.updateAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      error: null,
    });
    this.router.navigate(['/login']);
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: UserRole): boolean {
    const user = this._authState().user;
    return user?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: UserRole[]): boolean {
    const user = this._authState().user;
    return user ? roles.includes(user.role) : false;
  }

  /**
   * Refresh user token (simulate API call)
   */
  refreshToken(): Observable<AuthResponse> {
    const currentUser = this._authState().user;
    const currentToken = this._authState().token;

    if (!currentUser || !currentToken) {
      return throwError(() => new Error('No valid session found'));
    }

    return of({
      success: true,
      user: currentUser,
      token: this.generateFakeToken(),
      message: 'Token refreshed successfully',
    }).pipe(
      delay(500),
      tap((response) => {
        if (response.success && response.token) {
          this.setInStorage(this.TOKEN_KEY, response.token);
          this.updateAuthState({
            ...this._authState(),
            token: response.token,
          });
        }
      })
    );
  }

  /**
   * Simulate authentication request
   */
  private simulateAuthRequest(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.get<{ users: any[] }>('/users.json').pipe(
      delay(800), // Simulate network delay
      map((data) => {
        const user = data.users.find(
          (u) => u.username === credentials.username && u.password === credentials.password
        );

        if (!user) {
          return {
            success: false,
            message: 'Invalid username or password',
          };
        }

        if (!user.isActive) {
          return {
            success: false,
            message: 'Account is inactive. Please contact administrator.',
          };
        }

        // Convert string dates to Date objects and map role
        const authenticatedUser: User = {
          ...user,
          role: user.role as UserRole,
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
          createdAt: new Date(user.createdAt),
        };

        return {
          success: true,
          user: authenticatedUser,
          token: this.generateFakeToken(),
          message: 'Login successful',
        };
      })
    );
  }

  /**
   * Set authentication data in state and localStorage
   */
  private setAuthData(user: User, token: string): void {
    // Update last login
    user.lastLogin = new Date();

    this.setInStorage(this.TOKEN_KEY, token);
    this.setInStorage(this.USER_KEY, JSON.stringify(user));

    this.updateAuthState({
      isAuthenticated: true,
      user,
      token,
      loading: false,
      error: null,
    });
  }

  /**
   * Clear stored authentication data
   */
  private clearStoredAuth(): void {
    this.removeFromStorage(this.TOKEN_KEY);
    this.removeFromStorage(this.USER_KEY);
  }

  /**
   * Update authentication state
   */
  private updateAuthState(newState: AuthState): void {
    this._authState.set(newState);
  }

  /**
   * Generate a fake JWT-like token for simulation
   */
  private generateFakeToken(): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        sub: this._authState().user?.id || 'unknown',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
      })
    );
    const signature = btoa('fake-signature-' + Math.random().toString(36).substring(7));

    return `${header}.${payload}.${signature}`;
  }

  /**
   * Clear any authentication errors
   */
  clearError(): void {
    this.updateAuthState({
      ...this._authState(),
      error: null,
    });
  }
}
