import { useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { invalidateBackendAuthCache } from "../lib/backendApi";

export type Rol = "admin" | "usuario" | "vendedor";

export interface Perfil {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string, email: string) => {
    const fallback = async () => {
      const metadata = (await supabase.auth.getUser()).data.user?.user_metadata;
      const rolRaw = String(metadata?.rol ?? "usuario").toLowerCase();
      const rol: Rol =
        rolRaw === "admin"
          ? "admin"
          : rolRaw === "vendedor"
            ? "vendedor"
            : "usuario";
      setProfile({
        id: userId,
        nombre: metadata?.nombre ?? email.split("@")[0],
        email,
        rol,
      });
    };

    try {
      const { data } = await supabase
        .from("perfiles")
        .select("id, nombre, rol")
        .eq("id", userId)
        .maybeSingle();

      if (data) {
        const rolRaw = String(data.rol ?? "usuario").toLowerCase();
        const rol: Rol =
          rolRaw === "admin"
            ? "admin"
            : rolRaw === "vendedor"
              ? "vendedor"
              : "usuario";
        setProfile({
          id: data.id,
          nombre: data.nombre ?? email,
          email,
          rol,
        });
        return;
      }
      await fallback();
    } catch {
      await fallback();
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id, s.user.email ?? "")
          .catch(() => {
            // Evita expulsar al login por un fallo temporal de perfiles.
          })
          .finally(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id, s.user.email ?? "").catch(() => {
          // Conserva sesión activa aunque falle consulta de perfil.
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) {
        const msg =
          err.message.toLowerCase().includes("email not confirmed") ||
          err.message.toLowerCase().includes("email_not_confirmed")
            ? "Correo no confirmado. En Supabase: Authentication → Providers → Email → desactiva «Confirm email», o confirma el correo desde el enlace que te enviaron."
            : err.message;
        setError(msg);
        return { error: err };
      }
      if (data.user) {
        await fetchProfile(data.user.id, data.user.email ?? "");
      }
      return { data, error: null };
    },
    [fetchProfile]
  );

  const signOut = useCallback(async () => {
    setError(null);
    invalidateBackendAuthCache();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  return {
    user,
    session,
    profile,
    loading,
    error,
    signIn,
    signOut,
    isAdmin: profile?.rol === "admin",
  };
}
