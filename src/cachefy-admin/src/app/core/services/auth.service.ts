import { Injectable, signal, computed, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { map, delay, catchError, tap, switchMap } from 'rxjs/operators';
import { User, LoginCredentials, AuthResponse, AuthState, UserRole } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'cachefy_auth_token';
  private readonly USER_KEY = 'cachefy_user';

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

    console.log('🚀 AuthService - Initializing auth from storage');
    console.log('🔑 Token exists:', !!token);
    console.log('👤 User data exists:', !!userData);

    if (token && userData) {
      try {
        const user: User = JSON.parse(userData);
        console.log('📦 Loaded user from storage:', user);
        console.log('🎭 Original role:', user.role);

        // Migrate old lowercase role values to uppercase first character
        if (user.role) {
          const normalizedRole =
            user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase();
          if (user.role !== normalizedRole) {
            console.log('🔄 Migrating role from', user.role, 'to', normalizedRole);
            user.role = normalizedRole;
            // Save updated user data back to storage
            this.setInStorage(this.USER_KEY, JSON.stringify(user));
            console.log('✅ Role migrated and saved to storage');
          } else {
            console.log('✅ Role already in correct format:', user.role);
          }
        }

        this.updateAuthState({
          isAuthenticated: true,
          user,
          token,
          loading: false,
          error: null,
        });
        console.log('✅ Auth state updated with user role:', user.role);
      } catch (error) {
        console.error('❌ Error parsing stored user data:', error);
        this.clearStoredAuth();
      }
    } else {
      console.log('⚠️ No stored authentication found');
    }
  }

  /**
   * Login user with credentials
   */
  login(credentials: LoginCredentials): Observable<AuthResponse> {
    this.updateAuthState({ ...this._authState(), loading: true, error: null });

    // Call real API
    return this.http
      .post<{ token: string; email: string; serviceIds?: string[] }>(
        `${environment.apiUrl}/auth/login`,
        {
          email: credentials.username,
          password: credentials.password,
        }
      )
      .pipe(
        // After successful login, fetch user data from /user/me endpoint
        switchMap((loginResponse) => {
          const token = loginResponse.token;
          console.log('✅ Login successful, fetching user data from /user/me');

          // Fetch user data with the token
          return this.http
            .get<User>(`${environment.apiUrl}/user/me`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })
            .pipe(
              map((user) => {
                console.log('✅ Fetched user data from /user/me:', user);
                console.log('🎭 User role from API:', user.role);

                return {
                  success: true,
                  user: user,
                  token: token,
                  message: 'Login successful',
                } as AuthResponse;
              }),
              catchError((error) => {
                console.error('❌ Error fetching user data from /user/me:', error);
                // If /user/me fails, fallback to basic user data from login
                const fallbackUser: User = {
                  id: 'api-user',
                  email: loginResponse.email,
                  role: 'User', // Default to User role if we can't fetch
                  linkedServiceNames: loginResponse.serviceIds || [],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                return of({
                  success: true,
                  user: fallbackUser,
                  token: token,
                  message: 'Login successful (using fallback user data)',
                } as AuthResponse);
              })
            );
        }),
        tap((authResponse) => {
          if (authResponse.success && authResponse.user && authResponse.token) {
            this.setAuthData(authResponse.user, authResponse.token);
          } else {
            this.updateAuthState({
              ...this._authState(),
              loading: false,
              error: authResponse.message || 'Login failed',
            });
          }
        }),
        catchError((error) => {
          const errorMessage =
            error.error?.message || error.message || 'An error occurred during login';
          this.updateAuthState({
            ...this._authState(),
            loading: false,
            error: errorMessage,
          });
          return throwError(() => new Error(errorMessage));
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
  hasRole(role: UserRole | string): boolean {
    const user = this._authState().user;
    return user?.role === role || user?.role === role.toString();
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: (UserRole | string)[]): boolean {
    const user = this._authState().user;
    if (!user) return false;

    return roles.some((role) => user.role === role || user.role === role.toString());
  }

  /**
   * Check if user has access to a specific service
   * Admins and Managers have access to all services
   * Regular users only have access to services in their linkedServiceNames array
   */
  hasServiceAccess(serviceId: string): boolean {
    const user = this._authState().user;

    if (!user) {
      return false;
    }

    // Admins and Managers have access to all services
    if (user.role === 'Admin' || user.role === 'Manager') {
      return true;
    }

    // Regular users only have access to their linked services
    return user.linkedServiceNames ? user.linkedServiceNames.includes(serviceId) : false;
  }

  /**
   * Get the list of service IDs the current user has access to
   */
  getUserServiceIds(): string[] {
    const user = this._authState().user;
    return user?.linkedServiceNames || [];
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
   * Set authentication data in state and localStorage
   */
  private setAuthData(user: User, token: string): void {
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
