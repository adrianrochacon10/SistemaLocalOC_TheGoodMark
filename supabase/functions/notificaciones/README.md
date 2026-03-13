# Edge Function: notificaciones

Envía un correo "Venta Exitosa" al vendedor cuando el webhook recibe un registro de la tabla `ventas`.

## Configuración

### 1. Secrets (Supabase Dashboard o CLI)

```bash
supabase secrets set SMTP_HOSTNAME=smtp.gmail.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_SECURE=false
supabase secrets set SMTP_USERNAME=tu-correo@gmail.com
supabase secrets set SMTP_PASSWORD=tu-app-password-de-16-digitos
supabase secrets set SMTP_FROM="The Good Mark <tu-correo@gmail.com>"
```

- **Gmail:** Usa una [contraseña de aplicación](https://myaccount.google.com/apppasswords), no la contraseña normal. Requiere 2FA activada.

### 2. Webhook (Database Webhooks)

En Supabase: **Database → Webhooks → Create a new hook**

- **Table:** `ventas`
- **Events:** Insert (y opcionalmente Update)
- **URL:** `https://<PROJECT_REF>.supabase.co/functions/v1/notificaciones`
- **HTTP Headers:**  
  `Authorization: Bearer <SUPABASE_ANON_KEY>` o `Bearer <service_role_key>` si la función usa lógica privada

El payload que envía Supabase es de la forma:

```json
{
  "type": "INSERT",
  "record": {
    "id": "...",
    "vendedor_id": "...",
    "cliente_id": "...",
    "precio_total": 1500.00,
    "estado": "aceptado",
    "fecha_inicio": "2026-03-01",
    "fecha_fin": "2026-03-31"
  }
}
```

La función toma `record` (o el body directo), busca el email del vendedor en `perfiles` por `vendedor_id`, el nombre del cliente en `clientes` por `cliente_id`, y envía el correo con Nodemailer vía Gmail.

### 3. Despliegue

```bash
supabase functions deploy notificaciones
```

### 4. Prueba manual

```bash
curl -i -X POST 'https://<PROJECT_REF>.supabase.co/functions/v1/notificaciones' \
  -H 'Authorization: Bearer <ANON_OR_SERVICE_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{
    "vendedor_id": "uuid-del-vendedor",
    "cliente_id": "uuid-del-cliente",
    "precio_total": 2500.50
  }'
```
