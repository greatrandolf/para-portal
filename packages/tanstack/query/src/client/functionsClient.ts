/**
 * Minimal client for Firebase callable functions over plain HTTPS, so the
 * app does not need the Firebase JS SDK just to call them.
 * Protocol: POST {baseUrl}/{name} with {"data": ...} -> {"result": ...} | {"error": ...}
 */

export type FunctionsErrorCode =
  | 'unavailable'
  | 'unauthenticated'
  | 'permission-denied'
  | 'invalid-argument'
  | 'not-found'
  | 'already-exists'
  | 'failed-precondition'
  | 'internal'
  | (string & {});

export class FunctionsError extends Error {
  readonly code: FunctionsErrorCode;
  readonly httpStatus: number;
  readonly details?: unknown;

  constructor(code: FunctionsErrorCode, message: string, httpStatus = 0, details?: unknown) {
    super(message);
    this.name = 'FunctionsError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

/** Errors that will not succeed on retry. */
export const isPermanentError = (error: unknown) =>
  error instanceof FunctionsError &&
  [
    'unauthenticated',
    'permission-denied',
    'invalid-argument',
    'not-found',
    'already-exists',
    'failed-precondition',
  ].includes(error.code);

export type FunctionsClientConfig = {
  /** e.g. http://127.0.0.1:5001/<project>/asia-southeast1 or https://asia-southeast1-<project>.cloudfunctions.net */
  baseUrl: string;
  /** Firebase ID token of the signed-in user, if any. */
  getAuthToken?: () => Promise<string | null | undefined>;
};

export type FunctionsClient = {
  baseUrl: string;
  call<TResult, TData = unknown>(name: string, data: TData, signal?: AbortSignal): Promise<TResult>;
};

type CallableBody<T> = { result?: T; error?: { status?: string; message?: string; details?: unknown } };

export function createFunctionsClient({ baseUrl, getAuthToken }: FunctionsClientConfig): FunctionsClient {
  const base = baseUrl.replace(/\/+$/, '');
  return {
    baseUrl: base,
    async call<TResult, TData>(name: string, data: TData, signal?: AbortSignal) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = await getAuthToken?.();
      if (token) headers.Authorization = `Bearer ${token}`;

      let response: Response;
      try {
        response = await fetch(`${base}/${name}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ data: data ?? {} }),
          signal,
        });
      } catch (cause) {
        if (signal?.aborted) throw cause;
        throw new FunctionsError('unavailable', `Cannot reach the Para backend at ${base}.`);
      }

      const body = (await response.json().catch(() => null)) as CallableBody<TResult> | null;
      if (!response.ok || body?.error || !body || !('result' in body)) {
        const code =
          body?.error?.status?.toLowerCase().replace(/_/g, '-') ?? (response.ok ? 'internal' : 'unavailable');
        const message = body?.error?.message ?? `The backend answered HTTP ${response.status}.`;
        throw new FunctionsError(code, message, response.status, body?.error?.details);
      }
      return body.result as TResult;
    },
  };
}
