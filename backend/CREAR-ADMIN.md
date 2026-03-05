# Crear el primer administrador

**Opción 1 – Script (recomendada):** Desde la carpeta backend ejecuta:
```bash
node scripts/crear-primer-admin.js
```
Te pide email, contraseña y nombre.

**Opción 2 – Manual:** En Supabase → Authentication → Users → Add user. Luego en SQL Editor:
```sql
INSERT INTO perfiles (id, nombre, email, rol)
VALUES ('UUID-DEL-USUARIO', 'Admin', 'admin@tgm.com', 'admin');
```
Usa el mismo email que el usuario creado en Auth.
