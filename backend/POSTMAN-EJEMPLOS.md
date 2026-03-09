# Postman – Backend TGM

URL base: `http://localhost:4000`

1. **Login:** POST `/api/auth/login` Body: `{"email":"admin@tgm.com","password":"TuContraseña"}` → copiar `session.access_token`.
2. En el resto de peticiones: **Authorization** → Bearer Token → pegar el token.

**Endpoints:** GET/POST `/api/tipo-pago`, `/api/clientes`, `/api/pantallas`, `/api/ventas`, `/api/ordenes`, `/api/ordenes/ventas?mes=3&anio=2025`. POST `/api/vendedores` (solo admin). Usar UUIDs reales de la BD, no texto tipo "UUID-DEL-TIPO-PAGO".

---

## Código de edición (vendedor → admin)

Cuando un **vendedor** quiere editar un cliente o una venta, debe usar un código que el admin le pasa (el admin lo recibe por correo).

1. **Vendedor solicita código** (con token del vendedor):
   - **POST** `/api/codigos/solicitar`
   - Body: `{"entidad":"cliente","entidad_id":"<uuid-del-cliente>"}` o `{"entidad":"orden","entidad_id":"<uuid-de-la-venta>"}`
   - El admin recibe un correo con el código (válido 15 min). Respuesta: `{ "mensaje": "Codigo generado y enviado al correo del administrador", "expira_at": "..." }`

2. **Admin** recibe el correo y le pasa el código al vendedor.

3. **Vendedor edita** enviando el código en el body:
   - **PATCH** `/api/clientes/:id` Body: `{ "nombre": "Nuevo nombre", "codigo_edicion": "ABC123" }` (el código que le dio el admin)
   - **PATCH** `/api/ventas/:id` Body: `{ "estado": "aceptado", "codigo_edicion": "ABC123" }`
   - Si el código es inválido, expirado o ya usado → 400 con `{ "error": "..." }`.

El **admin** no necesita código: puede hacer PATCH en clientes/ventas sin `codigo_edicion`.
