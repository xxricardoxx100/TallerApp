# Taller Mecánico – Deploy a Vercel y PWA

Este proyecto es una aplicación Next.js para gestionar vehículos con imágenes.

Objetivo: usar Supabase (DB + Storage) para sincronizar datos entre dispositivos y, luego, hacerla instalable como PWA.

---

## 1) Crear proyecto en Supabase
1. Ve a https://app.supabase.com y crea un nuevo proyecto (plan gratuito).
2. Crea un bucket en Storage (por ejemplo `CaltimerApp`). Puedes marcarlo como Public si quieres URLs públicas.
3. Crea la tabla `public.vehicles` (si no existe):

```sql
create table if not exists public.vehicles (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

4. Habilita RLS y crea políticas. Este repo incluye:
- `supabase/policies.sql` (para la tabla `vehicles`)
- `supabase/storage_policies.sql` (para el bucket `CaltimerApp`)

Ejecuta su contenido en el SQL Editor del proyecto.

## 2) Variables de entorno locales
Crea `.env.local` con:

```
NEXT_PUBLIC_SUPABASE_URL=TU_URL_SUPABASE
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=CaltimerApp
```

Reinicia el server de desarrollo tras cambios.

## 3) Deploy en Vercel (gratuito)
1. Crea cuenta en https://vercel.com.
2. Sube el proyecto a un repo (GitHub/GitLab/Bitbucket).
3. En Vercel → New Project → selecciona el repo.
4. En Project Settings → Environment Variables (Production/Preview) añade:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`
5. Deploy. Obtendrás una URL pública.
6. Abre la URL en tu teléfono: la app estará operativa.

## 4) PWA (siguiente paso tras confirmar deploy)
Para hacerla instalable:
- manifest.json con nombre, short_name, theme_color, start_url.
- Íconos 192x192 y 512x512.
- Service worker con `next-pwa` para cache básico.

Flujo de instalación:
- Android (Chrome): Menú → "Agregar a pantalla de inicio".
- iOS (Safari): Compartir → "Agregar a pantalla de inicio".

## 5) Capacitor (APK opcional)
Si necesitas APK:
- Añadir Capacitor, generar proyecto Android y compilar APK en Android Studio.

## 6) Notas de seguridad
- En desarrollo usamos acceso “anon”. Para producción:
  - Usa Supabase Auth y políticas por usuario.
  - Considera storage privado y URLs firmadas (ya soportado en el código).

## 7) Solución de problemas rápida
- “new row violates row-level security policy”: ejecuta `supabase/policies.sql` y `supabase/storage_policies.sql`.
- Imágenes no cargan: verifica que el bucket exista, que haya políticas, y que en la DB se guarde una URL válida (no null).