import { HttpErrorResponse } from '@angular/common/http';

/**
 * Spring Boot's ApiExceptionHandler always returns { "error": "..." } (plus
 * an optional "fields" map for validation failures) -- unwrap that instead of
 * showing the generic HttpErrorResponse message.
 */
export function apiErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error;
    if (body && typeof body === 'object' && typeof body.error === 'string') {
      if (body.fields && typeof body.fields === 'object') {
        const fieldMessages = Object.entries(body.fields)
          .map(([field, message]) => `${field}: ${message}`)
          .join(', ');
        return `${body.error} (${fieldMessages})`;
      }
      return body.error;
    }
    if (err.status === 0) {
      return 'Could not reach the API. Is the Spring Boot service running?';
    }
    return `Request failed (HTTP ${err.status})`;
  }
  return 'Unexpected error';
}
