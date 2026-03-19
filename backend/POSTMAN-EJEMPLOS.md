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

## 5. Colaboradores

### Listar
```http
GET http://localhost:4000/api/colaboradores
Authorization: Bearer <TU_ACCESS_TOKEN>
```

### Crear
```http
POST http://localhost:4000/api/colaboradores
Authorization: Bearer <TU_ACCESS_TOKEN>
Content-Type: application/json

{
  "nombre": "Colaborador Ejemplo",
  "telefono": "5551234567",
  "email": "cliente@ejemplo.com",
  "contacto": "Juan Pérez",
  "tipo_pago_id": "<UUID_TIPO_PAGO>",
  "pantalla_id": "<UUID_PANTALLA>",
  "producto_id": "<UUID_PRODUCTO>"
}
```
`tipo_pago_id` y `pantalla_id` son obligatorios. `producto_id` es opcional al crear, pero **debe existir en el colaborador** para poder registrar ventas (también se puede asignar con PATCH).

### Obtener uno
```http
GET http://localhost:4000/api/colaboradores/<COLABORADOR_UUID>
Authorization: Bearer <TU_ACCESS_TOKEN>
```

### Actualizar (admin sin código; vendedor con código)
```http
PATCH http://localhost:4000/api/colaboradores/<COLABORADOR_UUID>
Authorization: Bearer <TU_ACCESS_TOKEN>
Content-Type: application/json

{
  "nombre": "Colaborador actualizado",
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

## 8. Ventas (unidas con orden de compra)

Cada venta puede pertenecer a una **orden de compra** (`orden_de_compra_id`). Al generar (POST `/api/ordenes/generar` con `colaborador_id`, `mes`, `anio`), las ventas de ese colaborador en el periodo quedan enlazadas a esa orden.

### Listar todas
```http
GET http://localhost:4000/api/ventas
Authorization: Bearer <TU_ACCESS_TOKEN>
```
Cada ítem incluye `orden_de_compra: { id, mes, anio, subtotal, iva, total }` si la venta está asignada.

### Listar ventas por mes (desde Ventas)
```http
GET http://localhost:4000/api/ventas?mes=3&anio=2025
Authorization: Bearer <TU_ACCESS_TOKEN>
```
Filtra por ventas cuya `fecha_inicio`/`fecha_fin` caen en ese mes.

### Listar ventas de una orden de compra
```http
GET http://localhost:4000/api/ventas?orden_de_compra_id=<ORDEN_DE_COMPRA_UUID>
Authorization: Bearer <TU_ACCESS_TOKEN>
```
También acepta el alias `orden_mes_id` por compatibilidad. Devuelve solo las ventas enlazadas a esa orden.

### Crear
La **pantalla** y el **producto** salen del colaborador (`colaborador_id`); no van en el body de la venta.

```http
POST http://localhost:4000/api/ventas
Authorization: Bearer <TU_ACCESS_TOKEN>
Content-Type: application/json

{
  "colaborador_id": "<COLABORADOR_UUID>",
  "estado_venta": "prospecto",
  "client_name": "Nombre del cliente en documento",
  "fecha_inicio": "2025-03-01",
  "fecha_fin": "2025-03-31",
  "duracion_meses": 1,
  "tipo_pago_id": "<UUID_OPCIONAL>",
  "precio_por_mes": 5000,
  "costos": 1000,
  "utilidad_neta": 4000,
  "comisiones": 250.00
}
```
`precio_por_mes`, `costos` y `utilidad_neta` son opcionales (el backend calcula si no vienen).  
La respuesta incluye `precio_base`, `precio_total`, `tipo_pago_aplicado`, `fuente_precio`.

### Actualizar (admin sin código; vendedor con código)
```http
PATCH http://localhost:4000/api/ventas/<VENTA_UUID>
Authorization: Bearer <TU_ACCESS_TOKEN>
Content-Type: application/json

{
  "estado_venta": "aceptado",
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

## 10. Órdenes de compra (`orden_de_compra`)

Tabla **`orden_de_compra`**: un registro por **colaborador + mes + año**, con **subtotal**, **IVA (16%)**, **total** y `ventas_ids`. Las filas de **ventas** usan **`orden_de_compra_id`**.

### Listar órdenes (colaborador + mes/año + ventas embebidas)
```http
GET http://localhost:4000/api/ordenes
Authorization: Bearer <TU_ACCESS_TOKEN>
```
Opcional: `?mes=3&anio=2025&colaborador_id=<UUID>`

### Ventas por mes (opcional por colaborador)
```http
GET http://localhost:4000/api/ordenes/ventas?mes=3&anio=2025
Authorization: Bearer <TU_ACCESS_TOKEN>
```
Opcional: `&colaborador_id=<UUID>`

### Generar orden de compra
```http
POST http://localhost:4000/api/ordenes/generar
Authorization: Bearer <TU_ACCESS_TOKEN>
Content-Type: application/json

{
  "colaborador_id": "<COLABORADOR_UUID>",
  "mes": 3,
  "anio": 2025
}
```
Crea o actualiza la fila en `orden_de_compra`, recalcula totales y asigna `ventas.orden_de_compra_id` a las ventas del colaborador que solapan ese mes. Respuesta: `{ orden, ventas_ids }`.

### PDF de la orden de compra
```http
GET http://localhost:4000/api/ordenes/<ORDEN_DE_COMPRA_UUID>/pdf
Authorization: Bearer <TU_ACCESS_TOKEN>
```
Devuelve un PDF con el detalle de ventas y subtotal / IVA / total.

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
| GET/POST/PATCH | `/api/colaboradores` | Sí | CRUD; vendedor usa código para PATCH |
| GET/POST/PATCH | `/api/ventas` | Sí | Listar: ?mes=&anio= o ?orden_de_compra_id=; crear con colaborador_id + fechas |
| POST | `/api/ventas/:id/renovar` | Sí Admin | Renovar venta |
| GET/POST | `/api/productos` | Sí; POST admin | Lista y crear producto |
| GET/POST | `/api/porcentajes` | Sí; POST admin | Lista y crear porcentaje |
| POST | `/api/codigos/solicitar` | Sí | Vendedor pide código |
| POST | `/api/codigos/validar` | Sí | Validar código |
| GET | `/api/codigos` | Sí Admin | Códigos vigentes |
| GET | `/api/ordenes` | Sí | Órdenes (opcional ?mes=&anio=&colaborador_id=) |
| GET | `/api/ordenes/ventas` | Sí | Query: mes, anio; opcional colaborador_id |
| POST | `/api/ordenes/generar` | Sí | Body: colaborador_id, mes, anio |
| GET | `/api/ordenes/:id/pdf` | Sí | PDF orden de compra |
| GET/POST | `/api/vendedores` | Sí Admin | Lista y crear vendedor |
| GET | `/api/diagnostico/email?to=` | No | Prueba de correo |

Sustituye `<TU_ACCESS_TOKEN>` y los `<..._UUID>` por valores reales de tu entorno.
