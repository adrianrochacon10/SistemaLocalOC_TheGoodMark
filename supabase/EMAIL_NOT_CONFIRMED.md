# "Email not confirmed" – Cómo solucionarlo

Supabase no deja iniciar sesión hasta que el correo esté confirmado **o** desactives esa exigencia.

## Opción A – Desactivar confirmación de correo (recomendado en desarrollo)

1. Entra a [Supabase](https://supabase.com) → tu proyecto.
2. **Authentication** → **Providers** → **Email**.
3. Busca **"Confirm email"** y **desactívalo** (toggle en OFF).
4. Guarda si hace falta.
5. (Opcional) Para que los usuarios que ya creaste puedan entrar, en **SQL Editor** ejecuta:

```sql
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;
```

Luego intenta iniciar sesión de nuevo en la app.

## Opción B – Confirmar el correo

1. En Supabase: **Authentication** → **Users**.
2. Abre el usuario y usa **"Send magic link"** o **"Resend confirmation"** (según tu versión).
3. Revisa el correo y haz clic en el enlace de confirmación.
4. Vuelve a la app e inicia sesión.
