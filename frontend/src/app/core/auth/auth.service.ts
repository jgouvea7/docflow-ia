import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from './auth.model';

const TOKEN_STORAGE_KEY = 'docflow-ai.token';
const USER_STORAGE_KEY = 'docflow-ai.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authUrl = `${environment.apiUrl}/auth`;

  readonly token = signal<string | null>(this.loadToken());
  readonly user = signal<AuthUser | null>(this.loadUser());
  readonly isAuthenticated = computed(() => !!this.token() && !!this.user());

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authUrl}/login`, request).pipe(
      tap((response) => this.setSession(response))
    );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authUrl}/register`, request).pipe(
      tap((response) => this.setSession(response))
    );
  }

  logout(redirectToLogin = true): void {
    this.clearSession();
    if (redirectToLogin) {
      void this.router.navigate(['/login']);
    }
  }

  getToken(): string | null {
    const currentToken = this.token();
    if (!currentToken) {
      return null;
    }

    if (this.isExpired(currentToken)) {
      this.clearSession();
      return null;
    }

    return currentToken;
  }

  clearSession(): void {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
    this.token.set(null);
    this.user.set(null);
  }

  private setSession(response: AuthResponse): void {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, response.token);
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
    this.token.set(response.token);
    this.user.set(response.user);
  }

  private loadToken(): string | null {
    const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token || this.isExpired(token)) {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      return null;
    }
    return token;
  }

  private loadUser(): AuthUser | null {
    const raw = sessionStorage.getItem(USER_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      sessionStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }
  }

  private isExpired(token: string): boolean {
    try {
      const payload = JSON.parse(this.decodeBase64Url(token.split('.')[1] ?? ''));
      const exp = typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
      return exp > 0 && Date.now() >= exp;
    } catch {
      return true;
    }
  }

  private decodeBase64Url(segment: string): string {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return atob(padded);
  }
}
