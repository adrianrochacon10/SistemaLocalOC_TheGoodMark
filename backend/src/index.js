import express from "express";
import cors from "cors";
import "dotenv/config";

import authRoutes from "./routes/auth.js";
import tipoPagoRoutes from "./routes/tipoPago.js";
import clientesRoutes from "./routes/clientes.js";
import ventasRoutes from "./routes/ventas.js";
import pantallasRoutes from "./routes/pantallas.js";
import ordenesRoutes from "./routes/ordenes.js";
import vendedoresRoutes from "./routes/vendedores.js";
import codigosRoutes from "./routes/codigos.js";

const PORT = Number(process.env.PORT) || 4000;
const app = express();

app.use(cors({ origin: true, credentials: false }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "Backend The Good Mark activo" });
});

app.use("/api/auth", authRoutes);
app.use("/api/tipo-pago", tipoPagoRoutes);
app.use("/api/clientes", clientesRoutes);
app.use("/api/colaboradores", clientesRoutes); 
app.use("/api/ventas", ventasRoutes);
app.use("/api/pantallas", pantallasRoutes);
app.use("/api/ordenes", ordenesRoutes);
app.use("/api/vendedores", vendedoresRoutes);
app.use("/api/codigos", codigosRoutes);

app.listen(PORT, () => {
  console.log("The Good Mark (BACKEND) en http://localhost:" + PORT);
});
