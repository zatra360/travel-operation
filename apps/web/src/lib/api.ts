const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3900';

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const payload = data?.data || data;
    const newToken = payload?.accessToken;
    if (newToken) {
      localStorage.setItem('accessToken', newToken);
      if (payload?.refreshToken) {
        localStorage.setItem('refreshToken', payload.refreshToken);
      }
    }
    return newToken;
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestConfig extends RequestInit {
  tenantId?: string;
  branchId?: string;
}

export async function apiRequest<T = unknown>(
  path: string,
  config: RequestConfig = {},
): Promise<T> {
  const { tenantId, branchId, headers: customHeaders, ...fetchConfig } = config;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  if (tenantId) headers['X-Tenant-Id'] = tenantId;
  if (branchId) headers['X-Branch-Id'] = branchId;

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchConfig,
    headers,
  });

  if (!response.ok) {
    if (response.status === 429 && typeof window !== 'undefined') {
      import('sonner').then(({ toast }) => {
        toast.error('Too many requests. Please wait a moment and try again.');
      }).catch(() => {});
    }
    if (response.status === 401) {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await fetch(`${API_URL}${path}`, { ...fetchConfig, headers });
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          return retryData?.data !== undefined ? retryData.data : retryData;
        }
      }
    }
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new ApiError(
      response.status,
      error.message || 'Request failed',
      error.errors,
    );
  }

  const data = await response.json();
  return data?.data !== undefined ? data.data : data;
}

export const api = {
  get: <T>(path: string, config?: RequestConfig) =>
    apiRequest<T>(path, { ...config, method: 'GET' }),

  post: <T>(path: string, body?: unknown, config?: RequestConfig) =>
    apiRequest<T>(path, { ...config, method: 'POST', body: JSON.stringify(body) }),

  put: <T>(path: string, body?: unknown, config?: RequestConfig) =>
    apiRequest<T>(path, { ...config, method: 'PUT', body: JSON.stringify(body) }),

  delete: <T>(path: string, config?: RequestConfig) =>
    apiRequest<T>(path, { ...config, method: 'DELETE' }),
};
