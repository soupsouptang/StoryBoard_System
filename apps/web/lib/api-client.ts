/**
 * FrameForge Core API Client
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  || (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '');

export interface RequestOptions extends RequestInit {
  json?: unknown;
  token?: string | null;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.json);
  }

  const token = options.token || (typeof window !== 'undefined' ? localStorage.getItem('frameforge_token') : null);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  if (res.status === 204) return null as T;

  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json() : await res.text();

  if (!res.ok) {
    const detailObj = typeof data === 'object' && data !== null ? (data.detail || data.error) : null;
    const message = (typeof detailObj === 'object' && detailObj !== null ? detailObj.message : null)
      || (typeof detailObj === 'string' ? detailObj : null)
      || (typeof data === 'string' ? data : null)
      || `请求失败 (${res.status})`;
    const code = typeof detailObj === 'object' && detailObj !== null ? detailObj.code : undefined;
    const details = typeof detailObj === 'object' && detailObj !== null ? detailObj.details : undefined;
    throw new ApiError(res.status, message, code, details);
  }

  return data as T;
}

export async function apiDownload(path: string, fallbackFilename: string): Promise<{ blob: Blob; filename: string; pageCount: number }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('frameforge_token') : null;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: 'text/plain',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('json') ? await response.json() : await response.text();
    const detail = typeof body === 'object' && body !== null ? body.detail || body.error : body;
    const message = typeof detail === 'string' ? detail : detail?.message;
    throw new Error(message || `导出失败（${response.status}）`);
  }

  const disposition = response.headers.get('content-disposition') || '';
  const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  let filename = fallbackFilename;
  if (encodedName) {
    try { filename = decodeURIComponent(encodedName); } catch { /* keep safe fallback */ }
  }
  filename = filename.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/^\.+|\.+$/g, '') || fallbackFilename;
  return { blob: await response.blob(), filename, pageCount: Number(response.headers.get('X-Page-Count')) || 1 };
}

export async function apiImageBlob(assetId: string, signal?: AbortSignal, owner?: { owner_type: string; owner_id: string }): Promise<Blob> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('frameforge_token') : null;
  const response = await fetch(`${API_BASE}/api/v1/assets/${encodeURIComponent(assetId)}/content${owner ? `?${new URLSearchParams(owner)}` : ''}`, {
    signal,
    headers: {
      Accept: 'image/*',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });
  if (!response.ok) throw new ApiError(response.status, `图片加载失败 (${response.status})`);
  return response.blob();
}
