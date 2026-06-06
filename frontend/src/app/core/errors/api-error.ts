import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

export interface ApiError {
  status: number;
  message: string;
  details?: string;
}

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (error instanceof TimeoutError) {
    return {
      status: 408,
      message: 'A requisição demorou mais do que o esperado. Tente novamente.'
    };
  }

  if (error instanceof HttpErrorResponse) {
    const rawMessage = extractMessage(error.error);

    return {
      status: error.status || 0,
      message: rawMessage || 'Não foi possível concluir a requisição.',
      details: error.message
    };
  }

  return {
    status: 0,
    message: 'Ocorreu um erro inesperado. Tente novamente.'
  };
}

function isApiError(error: unknown): error is ApiError {
  return !!error
    && typeof error === 'object'
    && 'status' in error
    && 'message' in error
    && typeof (error as ApiError).message === 'string';
}

function extractMessage(body: unknown): string | undefined {
  if (!body) {
    return undefined;
  }

  if (typeof body === 'string') {
    return body;
  }

  if (typeof body === 'object') {
    const candidate = body as Record<string, unknown>;
    if (typeof candidate['message'] === 'string') {
      return candidate['message'];
    }

    if (typeof candidate['detail'] === 'string') {
      return candidate['detail'];
    }

    if (typeof candidate['error'] === 'string') {
      return candidate['error'];
    }

    if (Array.isArray(candidate['errors'])) {
      return candidate['errors'].filter((item): item is string => typeof item === 'string').join(', ');
    }
  }

  return undefined;
}
