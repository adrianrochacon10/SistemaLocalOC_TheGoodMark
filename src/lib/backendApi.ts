import { supabase } from "./supabaseClient";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

async function request(path: string, options: RequestInit = {}) {
  // ✅ Obtener token activo de Supabase
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      // ✅ Inyectar token si existe
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message =
      data && typeof data.error === "string"
        ? data.error
        : `Error HTTP ${res.status}`;
    throw new Error(message);
  }

  return data;
}

export const backendApi = {
  BACKEND_URL,
  get: (path: string) => request(path, { method: "GET" }),
  post: (path: string, body: unknown) =>
    request(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path: string, body: unknown) =>
    request(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: (path: string) => request(path, { method: "DELETE" }),
  put: (path: string, body: unknown) =>
    request(path, { method: "PUT", body: JSON.stringify(body) }),
};
