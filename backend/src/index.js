import express from "express";
import cors from "cors";
import "dotenv/config";

import authRoutes from "./routes/auth.js";
import tipoPagoRoutes from "./routes/tipoPago.js";
import colaboradoresRoutes from "./routes/colaboradores.js";
import ventasRoutes from "./routes/ventas.js";
import pantallasRoutes from "./routes/pantallas.js";
import ordenesRoutes from "./routes/ordenes.js";
import vendedoresRoutes from "./routes/vendedores.js";
import codigosRoutes from "./routes/codigos.js";
import productosRoutes from "./routes/productos.js";
import porcentajesRoutes from "./routes/porcentajes.js";
import diagnosticoRoutes from "./routes/diagnostico.js";
import configuracionRoutes from "./routes/configuracion.js";
import asignacionesRoutes from "./routes/asignaciones.js";

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
app.use("/api/configuracion", configuracionRoutes);
app.use("/api/asignaciones", asignacionesRoutes);

app.listen(PORT, () => {
  console.log("The Good Mark (BACKEND) en http://localhost:" + PORT);
});
