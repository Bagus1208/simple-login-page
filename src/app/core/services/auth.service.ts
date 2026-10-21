import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, tap, throwError, timeout } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { ApiError, toApiError } from '../errors/api-error';
import {
  AuthSession,
  LoginApiResponse,
  LoginCredentials,
  LoginRequest,
} from '../models/auth.model';

const SESSION_KEY = 'simple-login.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly router = inject(Router);

  private readonly sessionState = signal<AuthSession | null>(this.readStoredSession());

  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionState() !== null);

  login(credentials: LoginCredentials): Observable<AuthSession> {
    const body: LoginRequest = {
      from_origin: this.config.defaults.fromOrigin,
      userServer: credentials.userServer,
      userId: credentials.userId,
      userPassword: credentials.userPassword,
      envServer: this.config.defaults.envServer,
      referrer: this.config.defaults.referrer,
    };

    return this.http.post<LoginApiResponse>(this.config.authUrl, body).pipe(
      timeout({
        first: this.config.timeoutMs,
        with: () =>
          throwError(
            () =>
              new ApiError(
                'timeout',
                0,
                `Server tidak merespons dalam ${this.config.timeoutMs / 1000} detik. Periksa kembali User Server yang Anda masukkan.`,
              ),
          ),
      }),
      map((response) => this.toSession(response)),
      tap((session) => this.storeSession(session)),
      catchError((error: unknown) => throwError(() => toApiError(error))),
    );
  }

  logout(): void {
    this.sessionState.set(null);
    sessionStorage.removeItem(SESSION_KEY);
    void this.router.navigateByUrl('/login');
  }

  private toSession(response: LoginApiResponse | null): AuthSession {
    const user = response?.data?.[0];

    if (
      !response ||
      response.status !== 'OK' ||
      typeof response.token !== 'string' ||
      response.token.trim() === '' ||
      !user
    ) {
      throw new ApiError(
        'invalidResponse',
        200,
        response?.message ?? 'Login gagal: respons server tidak valid.',
      );
    }

    return {
      token: response.token,
      user: {
        id: user.id,
        name: user.name,
        jabatanName: user.jabatan_name,
        branchName: user.branch_name,
      },
    };
  }

  private storeSession(session: AuthSession): void {
    this.sessionState.set(session);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  private readStoredSession(): AuthSession | null {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }

    try {
      const session = JSON.parse(raw) as AuthSession;
      if (!session.token || !session.user || isExpired(session.token)) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  }
}

function isExpired(token: string): boolean {
  const payload = token.split('.')[1];
  if (!payload) {
    return true;
  }

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(base64)) as { exp?: number };
    return claims.exp !== undefined && claims.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}
