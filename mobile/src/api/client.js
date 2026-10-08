import { API_ORIGIN, API_URL } from '../config';

let authToken = null;
let onUnauthorized = null;

export function setAuthToken(token) {
  authToken = token || null;
}

/** Called when a signed-in request comes back 401 (expired or revoked token). */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }

  /** Zod field errors from the API, as { field: 'first message' }. */
  get fieldErrors() {
    const errors = this.data?.errors;
    if (!errors || typeof errors !== 'object') return {};
    return Object.fromEntries(
      Object.entries(errors).map(([field, value]) => [
        field,
        Array.isArray(value) ? value[0] : String(value),
      ]),
    );
  }
}

/** Turn a failed response into one short sentence a person can act on (mirrors the web app). */
function messageFor(status, body, signedIn) {
  if (status === 401 && signedIn)
    return 'Your session has expired. Please sign in again.';
  if (status === 429)
    return 'Too many requests. Please wait a moment and try again.';
  const firstField =
    body?.errors && Object.values(body.errors).flat().find(Boolean);
  if (status === 422 && firstField) return String(firstField);
  if (typeof body?.message === 'string' && body.message) return body.message;
  if (status >= 500)
    return 'Something went wrong on our side. Please try again.';
  return 'Request failed. Please try again.';
}

function queryString(params) {
  if (!params) return '';
  const parts = Object.entries(params)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    )
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );
  return parts.length ? `?${parts.join('&')}` : '';
}

export async function request(
  path,
  { method = 'GET', params, body, form } = {},
) {
  const headers = { Accept: 'application/json' };
  const signedIn = Boolean(authToken);
  if (signedIn) headers.Authorization = `Bearer ${authToken}`;

  let payload;
  if (form) {
    payload = form; // fetch sets the multipart boundary itself
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}${queryString(params)}`, {
      method,
      headers,
      body: payload,
    });
  } catch {
    // In development, say which URL failed — usually the API isn't running or
    // `adb reverse tcp:5050 tcp:5050` is missing.
    throw new ApiError(
      __DEV__
        ? `Can't reach the API at ${API_URL}. Is the server running?`
        : "Can't reach the server. Check your connection and try again.",
    );
  }

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 && signedIn) onUnauthorized?.();
    throw new ApiError(
      messageFor(response.status, data, signedIn),
      response.status,
      data,
    );
  }
  return data;
}

/** The API wraps lists as { result: [...] } (sometimes { events | orders | tickets }). */
export function listOf(data) {
  const rows =
    data?.result ?? data?.events ?? data?.orders ?? data?.tickets ?? [];
  return Array.isArray(rows) ? rows : [];
}

/** Avatars and uploads come back as server-relative paths. */
export function absoluteUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (/^(https?:|data:|file:)/i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}
