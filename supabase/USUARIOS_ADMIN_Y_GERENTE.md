# Crear usuarios Administrador y Gerente de Ventas en Supabase

1. En el **Dashboard de Supabase** → **Authentication** → **Users** → **Add user** → **Create new user**.

2. **Administrador**
   - Email: `admin@empresa.com`
   - Password: (elige una y guárdala)
   - User Metadata (opcional pero recomendado):  
     `{ "nombre": "Admin", "rol": "admin" }`

3. **Gerente de Ventas**
   - Email: `ventas@empresa.com`
   - Password: (elige una y guárdala)
   - User Metadata:  
     `{ "nombre": "Gerente de Ventas", "rol": "usuario" }`

Al guardar, el trigger `on_auth_user_created` crea (o actualiza) la fila en `perfiles` con ese `nombre` y `rol`.  
Si ya tenías esos usuarios creados, ejecuta la migración `001_ventas_auditoria_y_perfiles.sql`; el `INSERT ... ON CONFLICT` al final rellena `perfiles` desde los usuarios existentes (y desde `raw_user_meta_data` si lo configuraste).
