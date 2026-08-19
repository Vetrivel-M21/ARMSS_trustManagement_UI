import type { APIResponse } from '../types';

// Overridable per-environment via VITE_API_BASE_URL (e.g. in a .env.production
// or the deployment host's build-time env vars) — falls back to the local dev
// backend so `npm run dev` keeps working with no setup.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

// Origin the backend serves static files from (e.g. /uploads/...) — same
// host as the API but without the /api/v1 prefix.
export const ASSET_BASE_URL = API_BASE_URL.replace(/\/api\/v1$/, '');

export const assetUrl = (path?: string | null) => (path ? `${ASSET_BASE_URL}${path}` : '');

export async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<APIResponse<T>> {
  const token = localStorage.getItem('auth_token');
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data: APIResponse<T> = await res.json();

    if (!res.ok && !data.error) {
      return {
        success: false,
        error: {
          code: `HTTP_${res.status}`,
          message: res.statusText || 'An unexpected network error occurred',
        },
      };
    }

    return data;
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err?.message || 'Failed to connect to the backend server',
      },
    };
  }
}
