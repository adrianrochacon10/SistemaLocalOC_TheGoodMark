export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const message =
    err.message || "Error interno del servidor";

  // Log sencillo en servidor
  console.error("[ERROR]", {
    status,
    message,
  });

  res.status(status).json({
    status,
    message,
    timestamp: new Date().toISOString(),
  });
}

