/**
 * Crear un vendedor. Uso (desde backend): node scripts/crear-vendedor.js
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import readline from "readline";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env"); process.exit(1); }

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const preguntar = (t) => new Promise((r) => rl.question(t, r));

async function main() {
  console.log("\n--- Crear vendedor ---\n");
  const nombre = process.env.VENDEDOR_NOMBRE || (await preguntar("Nombre del vendedor: "));
  const email = process.env.VENDEDOR_EMAIL || (await preguntar("Email del vendedor: "));
  const password = process.env.VENDEDOR_PASSWORD || (await preguntar("Contraseña (min 6): "));

  if (!nombre?.trim()) { console.error("Nombre obligatorio."); rl.close(); process.exit(1); }
  if (!email?.trim()) { console.error("Email obligatorio."); rl.close(); process.exit(1); }
  if (!password || password.length < 6) { console.error("Contraseña min 6 caracteres."); rl.close(); process.exit(1); }

  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { nombre: nombre.trim(), rol: "vendedor" },
    });
    if (authError) {
      if (authError.message.includes("already been registered")) {
        const { data: list } = await supabase.auth.admin.listUsers();
        const user = list?.users?.find((u) => u.email === email.trim());
        if (user) {
          await supabase.from("perfiles").upsert({ id: user.id, nombre: nombre.trim(), email: user.email, rol: "vendedor" }, { onConflict: "id" });
          console.log("Usuario existente actualizado a vendedor.");
        }
        rl.close();
        return;
      }
      console.error("Error:", authError.message);
      rl.close();
      process.exit(1);
    }
    const user = authData.user;
    await supabase.from("perfiles").upsert({ id: user.id, nombre: nombre.trim(), email: user.email, rol: "vendedor" }, { onConflict: "id" });
    console.log("\nVendedor creado. Email:", user.email, "Rol: vendedor\n");
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
  rl.close();
}
main();
