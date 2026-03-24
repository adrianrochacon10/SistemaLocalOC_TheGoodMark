import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client;

function getClient() {
  if (!url || !key) {
    const err = new Error(
      "Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env"
    );
    err.code = "SUPABASE_CONFIG";
    throw err;
  }
  if (!client) {
    client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}

export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      const c = getClient();
      const v = c[prop];
      return typeof v === "function" ? v.bind(c) : v;
    },
  }
);
