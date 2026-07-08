const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3900';

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
