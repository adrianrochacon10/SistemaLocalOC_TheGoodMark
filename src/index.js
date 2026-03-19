import express from "express";
import cors from "cors";
import "dotenv/config";

import authRoutes from "./routes/auth.js";
import tipoPagoRoutes from "./routes/tipoPago.js";
import ventasRoutes from "./routes/ventas.js";
import pantallasRoutes from "./routes/pantallas.js";
import ordenesRoutes from "./routes/ordenes.js";
import vendedoresRoutes from "./routes/vendedores.js";
import codigosRoutes from "./routes/codigos.js";
import productosRoutes from "./routes/productos.js";
import porcentajesRoutes from "./routes/porcentajes.js";
import diagnosticoRoutes from "./routes/diagnostico.js";
import { supabase } from "./config/supabase.js";
import colaboradoresRoutes from "./routes/colaboradores.js";
import http from "http";

const PORT = Number(process.env.PORT) || 4000;
const app = express();

app.use(cors({ origin: true, credentials: false }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "Backend The Good Mark activo" });
});

app.use("/api/auth", authRoutes);
app.use("/api/tipo-pago", tipoPagoRoutes);
app.use("/api/colaboradores", colaboradoresRoutes);
app.use("/api/ventas", ventasRoutes);
app.use("/api/pantallas", pantallasRoutes);
app.use("/api/ordenes", ordenesRoutes);
app.use("/api/vendedores", vendedoresRoutes);
app.use("/api/codigos", codigosRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/porcentajes", porcentajesRoutes);
app.use("/api/diagnostico", diagnosticoRoutes);

// Verificación de conexión a BD al arrancar (best-effort)
void (async () => {
  try {
    await supabase.from("tipo_pago").select("id").limit(1);
    console.log("[DB] Conectado a la base de datos (Supabase) ✅");
  } catch (e) {
    console.error("[DB] No se pudo conectar a la base de datos (Supabase):", e?.message || e);
  }
})();

const MAX_PORT_TRIES = 50;

function startServer(port, tries = 0) {
  const server = http.createServer(app);

  server.once("error", (err) => {
    if (err?.code === "EADDRINUSE") {
      const nextPort = port + 1;
      const nextTries = tries + 1;

      if (nextTries > MAX_PORT_TRIES) {
        console.error(
          `[SERVER] No se pudo levantar después de ${MAX_PORT_TRIES} intentos. Último puerto: ${port}`
        );
        process.exit(1);
      }

      console.warn(
        `[SERVER] Puerto ${port} ocupado (EADDRINUSE). Intentando en ${nextPort}... (intento ${nextTries}/${MAX_PORT_TRIES})`
      );

      // Asegura limpieza antes de reintentar
      try {
        server.close(() => startServer(nextPort, nextTries));
      } catch {
        setTimeout(() => startServer(nextPort, nextTries), 100);
      }
      return;
    }

    console.error(`[SERVER] Error al iniciar en puerto ${port}:`, err);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`The Good Mark (BACKEND) en http://localhost:${port}`);
  });
}

startServer(PORT);
