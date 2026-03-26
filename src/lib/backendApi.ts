import { supabase } from "./supabaseClient";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

/** Evita golpear Supabase Auth en cada fetch paralelo */
let tokenCache: { accessToken: string; expiresAtSec: number } | null = null;

export function invalidateBackendAuthCache(): void {
  tokenCache = null;
}

/**
 * Cola única sobre lectura/refresh de sesión (por si el lock noop permite solapamiento interno).
 */
let authChain: Promise<void> = Promise.resolve();

function withAuthMutex<T>(fn: () => Promise<T>): Promise<T> {
  const previous = authChain;
  let release!: () => void;
  authChain = new Promise<void>((resolve) => {
    release = resolve;
  });
  return previous
    .catch(() => {
      /* no romper la cadena si un eslabón falló */
    })
    .then(() => fn().finally(release));
}

/** Token para el backend: caché + getSession (sin getUser en cada request) */
async function getAccessTokenForBackend(): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.expiresAtSec > now + 90) {
    return tokenCache.accessToken;
  }

  return withAuthMutex(async () => {
    if (tokenCache && tokenCache.expiresAtSec > now + 90) {
      return tokenCache.accessToken;
    }

    let {
      data: { session },
    } = await supabase.auth.getSession();

    const exp = session?.expires_at;
    const expiradoOProximo = exp != null ? exp <= now + 120 : false;

    if (!session?.access_token || expiradoOProximo) {
      const { data, error } = await supabase.auth.refreshSession();
      session = data.session ?? session;
      if (error || !session?.access_token) {
        tokenCache = null;
        return null;
      }
    }

    const at = session.access_token;
    const eat = session.expires_at ?? now + 3600;
    tokenCache = { accessToken: at, expiresAtSec: eat };
    return at;
  });
}

async function request(path: string, options: RequestInit = {}, isRetryAfterRefresh = false) {
  const token = await getAccessTokenForBackend();

  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await res.text();
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = text && isJson ? JSON.parse(text) : null;

  if (res.status === 401 && !isRetryAfterRefresh && token) {
    const msg = data && typeof data.error === "string" ? data.error : "";
    if (
      msg.includes("Token invalido") ||
      msg.includes("expirado") ||
      msg.includes("Token de autorizacion")
    ) {
      invalidateBackendAuthCache();
      await withAuthMutex(() => supabase.auth.refreshSession());
      return request(path, options, true);
    }
  }

  if (!res.ok) {
    const messageFromJson = data && typeof data.error === "string" ? data.error : null;
    const messageFromText = !isJson && text ? text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : null;
    const message = messageFromJson || messageFromText || `Error HTTP ${res.status}`;
    throw new Error(message);
  }

  if (isJson) return data;
  return text || null;
}

export const backendApi = {
  BACKEND_URL,
  get: (path: string) =>
    request(path, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    }),
  post: (path: string, body: unknown) =>
    request(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path: string, body: unknown) =>
    request(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: (path: string) => request(path, { method: "DELETE" }),
  put: (path: string, body: unknown) =>
    request(path, { method: "PUT", body: JSON.stringify(body) }),
};
