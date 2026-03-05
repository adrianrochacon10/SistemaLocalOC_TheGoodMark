# Postman – Backend TGM

URL base: `http://localhost:4000`

1. **Login:** POST `/api/auth/login` Body: `{"email":"admin@tgm.com","password":"TuContraseña"}` → copiar `session.access_token`.
2. En el resto de peticiones: **Authorization** → Bearer Token → pegar el token.

**Endpoints:** GET/POST `/api/tipo-pago`, `/api/clientes`, `/api/pantallas`, `/api/ventas`, `/api/ordenes`, `/api/ordenes/ventas?mes=3&anio=2025`. POST `/api/vendedores` (solo admin). Usar UUIDs reales de la BD, no texto tipo "UUID-DEL-TIPO-PAGO".
