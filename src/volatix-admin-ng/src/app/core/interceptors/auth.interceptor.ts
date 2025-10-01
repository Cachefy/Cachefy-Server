import { inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (
  request: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);

  // Don't add token for public assets or auth endpoints
  const isPublicAsset =
    request.url.includes('/assets/') ||
    request.url.endsWith('.json') ||
    request.url.includes('/login');

  if (!isPublicAsset && authService.isAuthenticated()) {
    const token = authService.authState().token;

    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  }

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized responses
      if (error.status === 401 && authService.isAuthenticated()) {
        // Try to refresh token first
        return authService.refreshToken().pipe(
          switchMap(() => {
            // Retry the original request with new token
            const newToken = authService.authState().token;
            const retryRequest = request.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`,
              },
            });
            return next(retryRequest);
          }),
          catchError(() => {
            // Refresh failed, logout user
            authService.logout();
            return throwError(() => error);
          })
        );
      }

      return throwError(() => error);
    })
  );
};
