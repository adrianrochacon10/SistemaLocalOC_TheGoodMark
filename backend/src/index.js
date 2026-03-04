import express from "express";
import cors from "cors";
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const PORT = process.env.PORT || 4000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    " Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el .env del backend. El servidor arrancará, pero las rutas que usan la base de datos fallarán."
  );
}

const supabase = createClient(supabaseUrl ?? "", supabaseServiceKey ?? "", {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const app = express();

app.use(
  cors({
    origin: true,
    credentials: false,
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "Backend The Good Mark activo" });
});


app.get("/api/colaboradores", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("colaboradores")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (e) {
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

app.post("/api/colaboradores", async (req, res) => {
  const body = req.body;

  try {
    const payload = {
      nombre: body.nombre,
      contacto: body.contacto ?? null,
      telefono: body.telefono ?? null,
      email: body.email ?? null,
      color: body.color ?? null,
      porcentaje_socio:
        typeof body.porcentajeSocio === "number" ? body.porcentajeSocio : 0,
      activo: typeof body.activo === "boolean" ? body.activo : true,
      fecha_creacion: body.fechaCreacion ?? new Date().toISOString(),
      creado_por: body.creadoPor ?? null,
      actualizado_por: body.actualizadoPor ?? null,
    };

    if (body.id) {
      payload.id = body.id;
    }

    const { data, error } = await supabase
      .from("colaboradores")
      .upsert(
        payload,
        { onConflict: "id" }
      )
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (e) {
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});


app.get("/api/pantallas", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("pantallas")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (e) {
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

app.post("/api/pantallas", async (req, res) => {
  const body = req.body;

  try {
    const { data, error } = await supabase
      .from("pantallas")
      .insert({
        nombre_pantalla: body.nombre,
        ubicacion: body.ubicacion ?? null,
        creado_por: body.creadoPor ?? null,
        actualizado_por: body.actualizadoPor ?? null,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (e) {
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

app.delete("/api/pantallas/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase.from("pantallas").delete().eq("id", id);
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(204).send();
  } catch (e) {
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});


app.get("/api/ventas", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("ventas")
      .select("*")
      .order("fecha_registro", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (e) {
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

app.post("/api/ventas", async (req, res) => {
  const body = req.body;

  try {
    const { data, error } = await supabase
      .from("ventas")
      .insert({
        pantallas_ids: body.pantallas_ids,
        cliente_id: body.cliente_id,
        vendido_a: body.vendido_a,
        precio_general: body.precio_general,
        fecha_inicio: body.fecha_inicio,
        fecha_fin: body.fecha_fin,
        meses_renta: body.meses_renta,
        importe_total: body.importe_total,
        fecha_registro: new Date().toISOString(),
        activo: body.activo ?? true,
        usuario_registro_id: body.usuario_registro_id ?? null,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (e) {
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});


app.get("/api/configuracion", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("configuracion")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (e) {
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

app.get("/api/logs-auditoria", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("logs_auditoria")
      .select("*")
      .order("fecha", { ascending: false })
      .limit(200);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (e) {
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

app.get("/api/usuarios", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("perfiles")
      .select("id, nombre, email, rol")
      .order("nombre", { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (e) {
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

app.post("/api/usuarios", async (req, res) => {
  const { email, password, nombre, rol, creado_por } = req.body;

  if (!email || !password || !nombre) {
    return res
      .status(400)
      .json({ error: "email, password y nombre son obligatorios" });
  }

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre,
        rol,
      },
    });

    if (error || !data?.user) {
      return res
        .status(500)
        .json({ error: error?.message ?? "Error creando usuario" });
    }

    const user = data.user;

    // Asegurar que el perfil exista en la tabla perfiles
    try {
      await supabase.from("perfiles").upsert(
        {
          id: user.id,
          nombre,
          email,
          rol: rol || "usuario",
        },
        { onConflict: "id" }
      );
    } catch {
      // si falla perfiles, no rompemos la creación del usuario
    }

    try {
      await supabase.from("logs_auditoria").insert({
        tipo: "usuario_creado",
        descripcion: `Usuario creado: ${email} (${rol})`,
        entidad: "perfiles",
        entidad_id: user.id,
        usuario_id: creado_por ?? null,
        datos_anteriores: null,
        datos_nuevos: {
          id: user.id,
          email,
          nombre,
          rol,
        },
      });
    } catch {

    }

    res.json({
      id: user.id,
      nombre,
      email,
      rol: rol || "usuario",
    });
  } catch (e) {
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

app.post("/api/logs-auditoria", async (req, res) => {
  const body = req.body;

  try {
    const { data, error } = await supabase
      .from("logs_auditoria")
      .insert({
        tipo: body.tipo, 
        descripcion: body.descripcion ?? null,
        entidad: body.entidad ?? null, 
        entidad_id: body.entidad_id ?? null,
        usuario_id: body.usuario_id ?? null,
        datos_anteriores: body.datos_anteriores ?? null,
        datos_nuevos: body.datos_nuevos ?? null,
        fecha: body.fecha ?? new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (e) {
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

app.post("/api/configuracion", async (req, res) => {
  const body = req.body;

  try {
    const payload = {
      nombre_empresa: body.nombreEmpresa,
      rfc: body.rfc ?? null,
      direccion: body.direccion ?? null,
      telefono: body.telefono ?? null,
      email: body.email ?? null,
      iva_percentaje: body.ivaPercentaje ?? 16,
      activo: body.activo ?? true,
    };

    if (body.id) {
      payload.id = body.id;
    }

    const { data, error } = await supabase
      .from("configuracion")
      .upsert(
        payload,
        { onConflict: "id" }
      )
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (e) {
    res
      .status(500)
      .json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend The Good Mark escuchando en http://localhost:${PORT}`);
});

