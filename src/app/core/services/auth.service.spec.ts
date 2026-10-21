import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { API_CONFIG, DEFAULT_API_CONFIG } from '../config/api.config';
import { ApiError } from '../errors/api-error';
import { AuthService } from './auth.service';

const CREDENTIALS = { userServer: 'cooluruz', userId: 'admin', userPassword: 'admin' };

const OK_BODY = {
  status: 'OK',
  token: 'token-123',
  data: [
    {
      id: 'admin',
      name: 'Admin',
      email: 'admin@example.com',
      group_id: 'ADMIN',
      jabatan_name: 'Big Boss',
      branch_id: 'PUSAT',
      branch_name: 'CABANG PUSAT',
    },
  ],
};

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_CONFIG, useValue: DEFAULT_API_CONFIG },
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    try {
      http.verify({ ignoreCancelled: true });
    } finally {
      vi.useRealTimers();
    }
  });

  it('sends the payload expected by authV5', () => {
    service.login(CREDENTIALS).subscribe();

    const req = http.expectOne(DEFAULT_API_CONFIG.authUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      from_origin: '*',
      userServer: 'cooluruz',
      userId: 'admin',
      userPassword: 'admin',
      envServer: 'dev',
      referrer: 'bodev.uruz.id',
    });
    req.flush(OK_BODY);
  });

  it('stores the session when the API reports OK', () => {
    let result: string | undefined;
    service.login(CREDENTIALS).subscribe((session) => (result = session.token));

    http.expectOne(DEFAULT_API_CONFIG.authUrl).flush(OK_BODY);

    expect(result).toBe('token-123');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.session()?.user.jabatanName).toBe('Big Boss');
  });

  it('maps a success status with an empty body to a clear invalidResponse error', () => {
    let error: unknown;
    service.login(CREDENTIALS).subscribe({ error: (e: unknown) => (error = e) });

    http.expectOne(DEFAULT_API_CONFIG.authUrl).flush(null);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe('invalidResponse');
    expect((error as ApiError).message).toBe('Login gagal: respons server tidak valid.');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('maps HTTP 401 to an unauthorized ApiError with the server message', () => {
    let error: unknown;
    service.login(CREDENTIALS).subscribe({ error: (e: unknown) => (error = e) });

    http
      .expectOne(DEFAULT_API_CONFIG.authUrl)
      .flush(
        { status: 'NOT OK', message: 'Kombinasi id dan password yang anda masukkan salah.' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe('unauthorized');
    expect((error as ApiError).message).toBe('Kombinasi id dan password yang anda masukkan salah.');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('treats HTTP 200 with status "NOT OK" as a failed login', () => {
    let error: unknown;
    service.login(CREDENTIALS).subscribe({ error: (e: unknown) => (error = e) });

    http
      .expectOne(DEFAULT_API_CONFIG.authUrl)
      .flush({ status: 'NOT OK', message: 'Akun tidak aktif.', data: [] });

    expect((error as ApiError).kind).toBe('invalidResponse');
    expect((error as ApiError).message).toBe('Akun tidak aktif.');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('fails with a timeout ApiError when the server does not respond within 5 seconds', () => {
    vi.useFakeTimers();
    let error: unknown;
    service.login(CREDENTIALS).subscribe({ error: (e: unknown) => (error = e) });

    vi.advanceTimersByTime(DEFAULT_API_CONFIG.timeoutMs - 1);
    expect(error).toBeUndefined();

    vi.advanceTimersByTime(1);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe('timeout');
    expect((error as ApiError).message).toContain('5 detik');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('maps a dropped connection (status 0) to a network ApiError', () => {
    let error: unknown;
    service.login(CREDENTIALS).subscribe({ error: (e: unknown) => (error = e) });

    http.expectOne(DEFAULT_API_CONFIG.authUrl).error(new ProgressEvent('error'));

    expect((error as ApiError).kind).toBe('network');
  });

  it('maps HTTP 5xx to a server ApiError', () => {
    let error: unknown;
    service.login(CREDENTIALS).subscribe({ error: (e: unknown) => (error = e) });

    http
      .expectOne(DEFAULT_API_CONFIG.authUrl)
      .flush('<html>502</html>', { status: 502, statusText: 'Bad Gateway' });

    expect((error as ApiError).kind).toBe('server');
    expect((error as ApiError).status).toBe(502);
  });

  it('uses a clear fallback message for unhandled HTTP statuses', () => {
    let error: unknown;
    service.login(CREDENTIALS).subscribe({ error: (e: unknown) => (error = e) });

    http.expectOne(DEFAULT_API_CONFIG.authUrl).flush({}, { status: 404, statusText: 'Not Found' });

    expect((error as ApiError).kind).toBe('unknown');
    expect((error as ApiError).status).toBe(404);
    expect((error as ApiError).message).toBe(
      'Terjadi kesalahan saat memproses permintaan Anda (HTTP 404). Silakan coba lagi setelah beberapa saat.',
    );
  });
});
