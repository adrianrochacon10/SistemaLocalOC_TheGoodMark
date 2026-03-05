import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) console.warn("[BACKEND] Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");

export const supabase = createClient(url || "", key || "", {
  auth: { autoRefreshToken: false, persistSession: false },
});
