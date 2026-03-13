import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const PORT = Number(process.env.PORT) || 4000;

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "The Good Mark - Sistema Local",
      version: "1.0.0",
      description: "Documentación de la API del sistema local de The Good Mark.",
      contact: {
        name: "Equipo de Desarrollo DevWare",
        email: "devware@gmail.com",
      },
      license: {
        name: "ISC",
        url: "https://opensource.org/licenses/ISC",
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}/api`,
        description: "Servidor de desarrollo local",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Token JWT obtenido del endpoint /api/auth/login",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            status: { type: "integer" },
            message: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        UnauthorizedError: {
          type: "object",
          properties: {
            error: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
      },
    },
  },
  // Rutas donde están tus archivos de rutas (usados por swagger-jsdoc)
  apis: ["./src/routes/*.js"],
};

const specs = swaggerJsdoc(options);

const swaggerUrl = `http://localhost:${PORT}/api-docs`;
console.log("\n" + "=".repeat(60));
console.log("📚 DOCUMENTACIÓN API (Swagger UI)");
console.log("=".repeat(60));
console.log(`🔗 Swagger UI: ${swaggerUrl}`);
console.log("=".repeat(60) + "\n");

export { swaggerUi, specs };