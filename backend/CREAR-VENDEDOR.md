# Crear un vendedor

**Postman (como admin):** POST `/api/vendedores` con Authorization: Bearer \<token admin\>
Body:
```json
{
  "nombre": "María Vendedora",
  "email": "vendedor@tgm.com",
  "password": "ContraseñaSegura123",
  "rol": "vendedor"
}
```

**Script:** Desde backend: `node scripts/crear-vendedor.js` (pide nombre, email, contraseña).
