/**
 * src/lib/api.ts
 *
 * Thin fetch wrapper for calling the SBP Chatbot backend
 * (VITE_API_BASE_URL).  Every request is automatically decorated with an
 * "Authorization: Bearer <token>" header from the current Supabase session.
 *
 * Usage:
 *   import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
 *   const chats = await apiGet<Chat[]>('/chats');
 *   const chat  = await apiPost<Chat>('/chats', {});
 */

import { supabase } from './supabaseClient';

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

if (!API_BASE) {
  console.warn(
    'VITE_API_BASE_URL is not set. Backend API calls will fail. ' +
    'Add it to .env.local.'
  );
}

/** Retrieves the current session's access token, or null if signed out. */
async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Builds the common headers for every backend request. */
async function buildHeaders(extra?: HeadersInit, isFormData?: boolean): Promise<Headers> {
  const headers = new Headers(extra);
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = await getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

/** Core request helper — throws on non-2xx responses. */
async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = await buildHeaders(undefined, isFormData);
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isFormData ? (body as FormData) : (body !== undefined ? JSON.stringify(body) : undefined),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const err = await res.json();
      detail = err.detail ?? JSON.stringify(err);
    } catch {
      // response body wasn't JSON — use statusText as-is
    }
    throw new Error(`API ${method} ${path} → ${res.status}: ${detail}`);
  }

  // 204 No Content — return undefined cast to T
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export const apiGet    = <T>(path: string)              => request<T>('GET',    path);
export const apiPost   = <T>(path: string, body: unknown) => request<T>('POST',   path, body);
export const apiPatch  = <T>(path: string, body: unknown) => request<T>('PATCH',  path, body);
export const apiDelete = <T>(path: string)              => request<T>('DELETE', path);
