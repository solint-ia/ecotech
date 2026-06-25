import { auth } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function apiFetch(path: string, options: RequestInit = {}) {
  // Se estiver no servidor Next.js, tenta extrair a sessão e token
  const session = typeof window === 'undefined' ? await auth() : null;
  const token = session ? (session.user as any).accessToken : null;

  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const credentialsOption: RequestInit =
    typeof window !== 'undefined' ? { credentials: 'include' } : {};

  const response = await fetch(`${API_URL}${path}`, {
    ...credentialsOption,
    ...options,
    headers,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Erro na chamada de API: ${response.status}`);
  }

  return response.json();
}
