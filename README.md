## Backend TGM

Backend mínimo en Express que expone una API REST sobre las tablas de Supabase.

### 1. Configurar variables de entorno

- **App (Vite / Tauri):** en la raíz del repositorio, copia `.env.example` → `.env` y rellena `VITE_*` (ver secciones en ese archivo).
- **Backend:** dentro de `backend/`, copia el ejemplo del API:

```bash
cd backend
cp .env.example .env
```

2. Rellena `backend/.env` (lista completa y opcionales en `backend/.env.example`):

- `SUPABASE_URL`: URL de tu proyecto Supabase (Settings → API → Project URL)
- `SUPABASE_SERVICE_ROLE_KEY`: clave `service_role` de Supabase (NO la compartas)
- `PORT`: puerto del backend (por defecto 4000)
- `NODE_ENV`: p. ej. `development` o `production`
- **Opcional (correo / códigos de edición):** `RESEND_API_KEY` o `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`. Sin correo configurado, los códigos se guardan pero pueden no enviarse por email.
- **Scripts (`crear-primer-admin`, `crear-vendedor`):** `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NOMBRE`, `VENDEDOR_*` (opcionales si los escribes interactivo)

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

