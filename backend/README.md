## Backend TGM

Backend mínimo en Express que expone una API REST sobre las tablas de Supabase.

### 1. Configurar variables de entorno

1. Copia el ejemplo del backend a `.env` en esta carpeta:

```bash
cd backend
cp .env.example .env
```

2. Rellena `.env` (todas las claves están documentadas en `backend/.env.example`):

- `SUPABASE_URL`: URL de tu proyecto Supabase (Settings → API → Project URL)
- `SUPABASE_SERVICE_ROLE_KEY`: clave `service_role` de Supabase (NO la compartas)
- `PORT`: puerto del backend (por defecto 4000)
- `NODE_ENV`: p. ej. `development` o `production`
- **Opcional (correo):** `RESEND_API_KEY` o `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`
- **Scripts:** `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NOMBRE`, `VENDEDOR_NOMBRE`, `VENDEDOR_EMAIL`, `VENDEDOR_PASSWORD` (opcionales)

### 2. Instalar dependencias y ejecutar

```bash
cd backend
npm install
npm run dev
```

El backend quedará escuchando en `http://localhost:4000`.

### 3. Rutas disponibles

- `GET /api/health` → estado del backend.
- `GET /api/clientes` → lista de clientes.
- `POST /api/colaboradores` → crea/actualiza colaborador.
- `GET /api/pantallas` → lista de pantallas.
- `POST /api/pantallas` → crea/actualiza pantalla.
- `DELETE /api/pantallas/:id` → elimina una pantalla.
- `GET /api/ventas` → lista de ventas.
- `POST /api/ventas` → registra una venta.

