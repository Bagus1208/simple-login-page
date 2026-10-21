import { HttpErrorResponse } from '@angular/common/http';

export type ApiErrorKind =
  | 'timeout'
  | 'network'
  | 'unauthorized'
  | 'badRequest'
  | 'server'
  | 'invalidResponse'
  | 'unknown';

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const GENERIC_MESSAGE = 'Terjadi kesalahan. Silakan coba lagi.';

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (!(error instanceof HttpErrorResponse)) {
    return new ApiError('unknown', 0, GENERIC_MESSAGE);
  }

  const { status } = error;

  if (status === 0) {
    return new ApiError(
      'network',
      0,
      'Tidak dapat terhubung ke server. Periksa koneksi internet Anda lalu coba lagi.',
    );
  }

  const serverMessage = extractServerMessage(error.error);

  if (status === 401 || status === 403) {
    return new ApiError('unauthorized', status, serverMessage ?? 'ID pengguna atau password tidak sesuai.');
  }

  if (status === 400 || status === 422) {
    return new ApiError('badRequest', status, serverMessage ?? 'Data yang dikirim tidak valid.');
  }

  if (status >= 500) {
    return new ApiError(
      'server',
      status,
      `Server sedang bermasalah (HTTP ${status}). Silakan coba beberapa saat lagi.`,
    );
  }

  if (status >= 200 && status < 300) {
    return new ApiError('invalidResponse', status, 'Respons server tidak dapat dibaca.');
  }

  return new ApiError(
    'unknown',
    status,
    serverMessage ??
      'Terjadi kesalahan saat memproses permintaan Anda. Silakan coba lagi setelah beberapa saat.',
  );
}

function extractServerMessage(body: unknown): string | undefined {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const { message } = body;
    if (typeof message === 'string' && message.trim() !== '') {
      return message;
    }
  }
  return undefined;
}
