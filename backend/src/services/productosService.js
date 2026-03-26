import { supabase } from "../config/supabase.js";

export async function listar() {
  const { data, error } = await supabase.from("productos").select("*").order("nombre");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crear(nombre, precio) {
  if (!nombre?.trim()) return { error: "Nombre es obligatorio" };
  const precioNum = Number(precio);
  if (!Number.isFinite(precioNum) || precioNum < 0) return { error: "Precio debe ser un numero mayor o igual a 0" };

  const nombreTrim = nombre.trim();

  // Intento 1: esquemas viejos (columna `precio`)
  const intentoPrecio = await supabase
    .from("productos")
    .insert({ nombre: nombreTrim, precio: precioNum })
    .select("*")
    .single();
  if (!intentoPrecio.error) return { data: intentoPrecio.data };

  const msg = String(intentoPrecio.error.message || "").toLowerCase();
  const errorColumnaPrecio =
    msg.includes("precio") &&
    (msg.includes("does not exist") || msg.includes("schema cache"));

  if (!errorColumnaPrecio) {
    throw new Error(intentoPrecio.error.message);
  }

  // Intento 2: esquemas nuevos (`precio_unitario`)
  const intentoUnitario = await supabase
    .from("productos")
    .insert({ nombre: nombreTrim, precio_unitario: precioNum })
    .select("*")
    .single();
  if (!intentoUnitario.error) return { data: intentoUnitario.data };

  // Intento 3: alternativa (`precio_por_mes`)
  const intentoMes = await supabase
    .from("productos")
    .insert({ nombre: nombreTrim, precio_por_mes: precioNum })
    .select("*")
    .single();
  if (!intentoMes.error) return { data: intentoMes.data };

  throw new Error(
    intentoMes.error.message ||
      intentoUnitario.error.message ||
      intentoPrecio.error.message,
  );
}
