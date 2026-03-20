import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Atención: Las credenciales de Supabase no se detectaron en el .env");
}

/**
 * Lock noop: evita Navigator LockManager (Web Locks) que con React Strict Mode +
 * muchas peticiones en paralelo provoca "Lock broken by another request with the 'steal' option"
 * y locks huérfanos de 5s. En app de escritorio / una pestaña es aceptable.
 * @see https://github.com/supabase/supabase-js/issues (auth lock)
 */
const authLockNoop = async <R,>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> => fn();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    lock: authLockNoop,
  },
});