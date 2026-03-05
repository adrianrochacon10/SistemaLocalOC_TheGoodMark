import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import readline from "readline";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const preguntar = (t) => new Promise((r) => rl.question(t, r));

async function main() {
  console.log("\nCrear primer administrador\n");
  const email = process.env.ADMIN_EMAIL || (await preguntar("Email del admin: "));
  const password = process.env.ADMIN_PASSWORD || (await preguntar("Contraseña: "));
  const nombre = process.env.ADMIN_NOMBRE || (await preguntar("Nombre: ")) || "Admin";

  if (!email?.trim()) { console.error("Email obligatorio."); rl.close(); process.exit(1); }
  if (!password || password.length < 6) { console.error("Contraseña min 6 caracteres."); rl.close(); process.exit(1); }

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { nombre: nombre.trim() || "Admin", rol: "admin" },
    });
    if (error) {
      if (error.message.includes("already been registered")) {
        const { data: list } = await supabase.auth.admin.listUsers();
        const u = list?.users?.find((x) => x.email === email.trim());
        if (u) {
          await supabase.from("perfiles").upsert({ id: u.id, nombre: nombre.trim() || "Admin", email: u.email, rol: "admin" }, { onConflict: "id" });
          console.log("Usuario existente actualizado a admin.");
        }
        rl.close();
        return;
      }
      console.error("Error:", error.message);
      rl.close();
      process.exit(1);
    }
    const user = data.user;
    await supabase.from("perfiles").insert({ id: user.id, nombre: nombre.trim() || "Admin", email: user.email, rol: "admin" });
    console.log("Admin creado. Email:", user.email);
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
  rl.close();
}
main();
