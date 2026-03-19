import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Atención: Las credenciales de Supabase no se detectaron en el .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);