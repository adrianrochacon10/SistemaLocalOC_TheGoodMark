# Postman – Backend TGM

**URL base:** `http://localhost:4000`

**Paso 1:** Hacer **POST** `/api/auth/login` y copiar `session.access_token`.  
**Paso 2:** En el resto de peticiones: **Authorization** → Type: **Bearer Token** → pegar el token.

---

## 1. Health (sin auth)

```http
GET http://localhost:4000/api/health
```

---

## 2. Auth

### Login
```http
POST http://localhost:4000/api/auth/login
Content-Type: application/json

{
  "email": "admin@tgm.com",
  "password": "TuContraseña"
}
```
→ Respuesta: `user`, `session` (ahí está `session.access_token`), `perfil`. Copia el token para las demás peticiones.

### Perfil actual (requiere auth)
```http
GET http://localhost:4000/api/auth/me
Authorization: Bearer <TU_ACCESS_TOKEN>
```

---

## 3. Tipo de pago

```http
GET http://localhost:4000/api/tipo-pago
Authorization: Bearer <TU_ACCESS_TOKEN>
```

---

## 4. Pantallas

### Listar
```http
GET http://localhost:4000/api/pantallas
Authorization: Bearer <TU_ACCESS_TOKEN>
```

### Crear
```http
POST http://localhost:4000/api/pantallas
Authorization: Bearer <TU_ACCESS_TOKEN>
Content-Type: application/json

{
  "nombre": "Pantalla Centro"
}
```

### Obtener una
```http
GET http://localhost:4000/api/pantallas/<PANTALLA_UUID>
Authorization: Bearer <TU_ACCESS_TOKEN>
```

### Actualizar
```http
PATCH http://localhost:4000/api/pantallas/<PANTALLA_UUID>
Authorization: Bearer <TU_ACCESS_TOKEN>
Content-Type: application/json

{
  "nombre": "Pantalla Centro Actualizada"
}
```

---

## 5. Clientes (o Colaboradores)

### Listar
```http
GET http://localhost:4000/api/clientes
Authorization: Bearer <TU_ACCESS_TOKEN>
```
(Misma base: `/api/colaboradores` si usas esa ruta.)

### Crear
```http
POST http://localhost:4000/api/clientes
Authorization: Bearer <TU_ACCESS_TOKEN>
Content-Type: application/json

{
  "nombre": "Cliente Ejemplo",
  "telefono": "5551234567",
  "email": "cliente@ejemplo.com",
  "contacto": "Juan Pérez",
  "tipo_pago_id": "<UUID_TIPO_PAGO>",
  "pantalla_id": "<UUID_PANTALLA>"
}
```
`tipo_pago_id` y `pantalla_id` son obligatorios (usa UUIDs de GET tipo-pago y GET pantallas).

### Obtener uno
```http
GET http://localhost:4000/api/clientes/<CLIENTE_UUID>
Authorization: Bearer <TU_ACCESS_TOKEN>
```

### Actualizar (admin sin código; vendedor con código)
```http
PATCH http://localhost:4000/api/clientes/<CLIENTE_UUID>
Authorization: Bearer <TU_ACCESS_TOKEN>
Content-Type: application/json

{
  "nombre": "Cliente Actualizado",
  "codigo_edicion": "ABC123"
}
```
Solo vendedores envían `codigo_edicion` (el que recibe el admin por correo al solicitar el código).

---

## 6. Productos

### Listar
```http
GET http://localhost:4000/api/productos
Authorization: Bearer <TU_ACCESS_TOKEN>
```

### Crear (solo admin)
```http
POST http://localhost:4000/api/productos
Authorization: Bearer <TU_ACCESS_TOKEN>
Content-Type: application/json

{
  "nombre": "Producto Premium",
  "precio": 1500.50
}
```

---

## 7. Porcentajes

### Listar
```http
GET http://localhost:4000/api/porcentajes
Authorization: Bearer <TU_ACCESS_TOKEN>
```

### Crear (solo admin)
```http
POST http://localhost:4000/api/porcentajes
Authorization: Bearer <TU_ACCESS_TOKEN>
Content-Type: application/json

{
  "valor": 25,
  "descripcion": "Descuento temporada"
}
```

---

## 8. Ventas (unidas con Ordenes del mes)

Cada venta puede pertenecer a una **orden del mes** (`orden_mes_id`). Al generar una orden (POST `/api/ordenes/generar`), las ventas del mes quedan enlazadas a esa orden.

### Listar todas
```http
GET http://localhost:4000/api/ventas
Authorization: Bearer <TU_ACCESS_TOKEN>
```
Cada ítem incluye `orden_mes: { id, mes, anio }` si la venta está asignada a una orden del mes.

### Listar ventas por mes (desde Ventas)
```http
GET http://localhost:4000/api/ventas?mes=3&anio=2025
Authorization: Bearer <TU_ACCESS_TOKEN>
```
Filtra por ventas cuya `fecha_inicio`/`fecha_fin` caen en ese mes.

### Listar ventas de una orden del mes
```http
GET http://localhost:4000/api/ventas?orden_mes_id=<ORDEN_MES_UUID>
Authorization: Bearer <TU_ACCESS_TOKEN>
```
Devuelve solo las ventas asignadas a esa orden (la misma lista que al generar la orden).

### Crear
```http
POST http://localhost:4000/api/ventas
Authorization: Bearer <TU_ACCESS_TOKEN>
Content-Type: application/json

{
  "cliente_id": "<CLIENTE_UUID>",
  "estado": "pendiente",
  "pantalla_id": "<PANTALLA_UUID>",
  "fecha_inicio": "2025-03-01",
  "fecha_fin": "2025-03-31",
  "duracion_meses": 1,
  "cantidad": 2,
  "producto_id": "<PRODUCTO_UUID>",
  "comisiones": 250.00
}
```
O con precio manual (sin producto):
```json
{
  "cliente_id": "<CLIENTE_UUID>",
  "estado": "pendiente",
  "pantalla_id": "<PANTALLA_UUID>",
  "fecha_inicio": "2025-03-01",
  "fecha_fin": "2025-03-31",
  "duracion_meses": 1,
  "cantidad": 1,
  "precio_unitario_manual": 500,
  "comisiones": 250.00
}
```
La respuesta incluye `precio_base`, `precio_total`, `tipo_pago_aplicado`, `fuente_precio`.

### Actualizar (admin sin código; vendedor con código)
```http
PATCH http://localhost:4000/api/ventas/<VENTA_UUID>
Authorization: Bearer <TU_ACCESS_TOKEN>
Content-Type: application/json

{
  "estado": "aceptado",
  "codigo_edicion": "ABC123"
}
```

### Renovar (solo admin)
```http
POST http://localhost:4000/api/ventas/<VENTA_UUID>/renovar
Authorization: Bearer <TU_ACCESS_TOKEN>
Content-Type: application/json

{
  "fecha_inicio": "2025-04-01",
  "fecha_fin": "2025-04-30",
  "duracion_meses": 1
}
```

---

## 9. Códigos de edición

### Solicitar código (vendedor; el admin recibe el correo)
```http
POST http://localhost:4000/api/codigos/solicitar
Authorization: Bearer <TOKEN_VENDEDOR>
Content-Type: application/json

{
  "entidad": "cliente",
  "entidad_id": "<CLIENTE_UUID>"
}
```
Para una venta/orden: `"entidad": "orden", "entidad_id": "<VENTA_UUID>"`. El código es válido 30 minutos.

### Validar código (sin consumir; opcional)
```http
POST http://localhost:4000/api/codigos/validar
Authorization: Bearer <TU_ACCESS_TOKEN>
Content-Type: application/json

{
  "codigo": "ABC123",
  "entidad": "cliente",
  "entidad_id": "<CLIENTE_UUID>"
}
```

### Listar códigos vigentes (solo admin)
```http
GET http://localhost:4000/api/codigos
Authorization: Bearer <TU_ACCESS_TOKEN>
```

---

## 10. Órdenes del mes (datos guardados en Ventas)

Las órdenes del mes agrupan ventas por mes/año. Al **generar** una orden, se crea/actualiza el registro en `ordenes_mes` y se asigna `orden_mes_id` a todas las ventas de ese mes (para verlas desde **Ventas** con `?orden_mes_id=` o `?mes=&anio=`).

### Listar órdenes (resumen mes/año + ventas embebidas)
```http
GET http://localhost:4000/api/ordenes
Authorization: Bearer <TU_ACCESS_TOKEN>
```
Opcional: `?mes=3&anio=2025`

### Ventas por mes (mismo filtro que GET /api/ventas?mes=&anio=)
```http
GET http://localhost:4000/api/ordenes/ventas?mes=3&anio=2025
Authorization: Bearer <TU_ACCESS_TOKEN>
```

### Generar orden del mes
```http
POST http://localhost:4000/api/ordenes/generar
Authorization: Bearer <TU_ACCESS_TOKEN>
Content-Type: application/json

{
  "mes": 3,
  "anio": 2025
}
```
Crea o actualiza la orden para ese mes, guarda los IDs de ventas en `ordenes_mes.ventas_ids` y asigna `ventas.orden_mes_id` a cada venta del mes. Respuesta: `{ orden, ventas_ids }`.

---

## 11. Vendedores (solo admin)

### Listar
```http
GET http://localhost:4000/api/vendedores
Authorization: Bearer <TU_ACCESS_TOKEN>
```

### Crear
```http
POST http://localhost:4000/api/vendedores
Authorization: Bearer <TU_ACCESS_TOKEN>
Content-Type: application/json

{
  "nombre": "María Vendedora",
  "email": "maria@tgm.com",
  "password": "UnaContraseñaSegura123",
  "rol": "vendedor"
}
```
`rol` puede ser `"vendedor"` o `"admin"`.

---

## 12. Diagnóstico (correo de prueba)

```http
GET http://localhost:4000/api/diagnostico/email?to=tu@email.com
```
No requiere auth. Envía un correo de prueba (Resend/SMTP configurado en `.env`).

---

## Resumen rápido

| Método | Ruta | Auth | Notas |
|--------|------|------|--------|
| GET | `/api/health` | No | OK del backend |
| POST | `/api/auth/login` | No | Body: email, password |
| GET | `/api/auth/me` | Sí | Perfil del token |
| GET | `/api/tipo-pago` | Sí | Lista tipos de pago |
| GET/POST | `/api/pantallas` | Sí | CRUD pantallas |
| GET/POST/PATCH | `/api/clientes` | Sí | CRUD; vendedor usa código para PATCH |
| GET/POST/PATCH | `/api/ventas` | Sí | Listar: opcional ?mes=&anio= o ?orden_mes_id=; crear con cliente_id, pantalla_id, fechas |
| POST | `/api/ventas/:id/renovar` | Sí Admin | Renovar venta |
| GET/POST | `/api/productos` | Sí; POST admin | Lista y crear producto |
| GET/POST | `/api/porcentajes` | Sí; POST admin | Lista y crear porcentaje |
| POST | `/api/codigos/solicitar` | Sí | Vendedor pide código |
| POST | `/api/codigos/validar` | Sí | Validar código |
| GET | `/api/codigos` | Sí Admin | Códigos vigentes |
| GET | `/api/ordenes` | Sí | Órdenes (opcional ?mes=&anio=) |
| GET | `/api/ordenes/ventas` | Sí | Query: mes, anio |
| POST | `/api/ordenes/generar` | Sí | Body: mes, anio |
| GET/POST | `/api/vendedores` | Sí Admin | Lista y crear vendedor |
| GET | `/api/diagnostico/email?to=` | No | Prueba de correo |

Sustituye `<TU_ACCESS_TOKEN>` y los `<..._UUID>` por valores reales de tu entorno.
