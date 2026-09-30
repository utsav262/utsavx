import axios from 'axios';

export const API_ERROR_EVENT = 'mxo:api-error';

/** Turn a failed request into one short sentence a person can act on. */
export function apiErrorMessage(error) {
    if (!error.response) return "Can't reach the server. Check your connection and try again.";
    const { status, data } = error.response;
    const body = data && typeof data === 'object' && !(data instanceof Blob) ? data : {};
    if (status === 401 && error.config?.headers?.Authorization) return 'Your session has expired. Please sign in again.';
    if (status === 429) return 'Too many requests. Please wait a moment and try again.';
    const firstField = body.errors && Object.values(body.errors).flat().find(Boolean);
    if (status === 422 && firstField) return String(firstField);
    if (body.message && typeof body.message === 'string') return body.message;
    if (status >= 500) return 'Something went wrong on our side. Please try again.';
    return 'Request failed. Please try again.';
}

/**
 * Decide whether a failed request deserves a global toast.
 * Page loads that 403/404 are often probes with their own fallback screen, so they stay quiet.
 * Pass { silentError: true } in a request config to opt out entirely.
 */
function shouldReport(error) {
    if (axios.isCancel(error) || error.config?.silentError) return false;
    const status = error.response?.status;
    const method = String(error.config?.method || 'get').toLowerCase();
    if (!status || status >= 500 || status === 429) return true;
    if (status === 401) return Boolean(error.config?.headers?.Authorization);
    return method !== 'get';
}

/** Axios response interceptor: announce the error, then let the caller handle it as before. */
export function reportApiError(error) {
    if (shouldReport(error)) {
        window.dispatchEvent(new CustomEvent(API_ERROR_EVENT, { detail: { message: apiErrorMessage(error), at: Date.now() } }));
    }
    return Promise.reject(error);
}
