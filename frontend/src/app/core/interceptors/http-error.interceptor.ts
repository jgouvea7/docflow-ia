import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { toApiError } from '../errors/api-error';
import { AuthService } from '../auth/auth.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        authService.clearSession();
        if (!router.url.startsWith('/login')) {
          void router.navigate(['/login']);
        }
      }

      return throwError(() => toApiError(error));
    })
  );
};
