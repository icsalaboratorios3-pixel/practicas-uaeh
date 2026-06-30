# Lab Prácticas UAEH

Proyecto React + Vite con integración a Supabase para login y datos remotos.

## Requisitos

- Node.js instalado
- Cuenta en Supabase

## Configuración local

1. Instalar dependencias:

```bash
npm install
```

2. Crear archivo `.env` en la raíz del proyecto con estos valores:

```env
VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu_anon_key>
```

3. Ejecutar en desarrollo:

```bash
npm run dev
```

## Supabase: estructura mínima de tablas

### Tabla `profiles`

Campos recomendados:
- `id` (uuid, primary key)
- `username` (text)
- `name` (text)
- `role` (text)
- `active` (boolean)
- `email` (text)
- `auth_user_id` (uuid)

### Tabla `laboratorios`

Campos recomendados:
- `id` (integer)
- `nombre` (text)
- `capacidad` (integer)
- `ubicacion` (text)
- `activo` (boolean)

### Tabla `programas`
- `id` (integer)
- `nombre` (text)
- `activo` (boolean)

### Tabla `programaciones`
- `id` (integer)
- `profesor_id` (integer)
- `laboratorio_id` (integer)
- `programa_id` (integer)
- `periodo` (text)
- `asignatura` (text)
- `semestre` (text)
- `grupo` (text)
- `dia` (text)
- `hora_inicio` (text)
- `hora_fin` (text)
- `num_alumnos` (integer)
- `num_equipos` (integer)
- `validada` (boolean)
- `validado_por` (integer)
- `fecha_validacion` (text)
- `reprogramacion_pendiente` (boolean)
- `reprogramacion_autorizada` (boolean)
- `reprogramacion_solicitada_by` (integer)
- `reprogramacion_aprobada_by` (integer)
- `fecha_aprobacion` (text)

### Tabla `responsable_laboratorios`
- `id` (integer)
- `responsable_id` (integer)
- `laboratorio_id` (integer)

### Tabla `programa_laboratorios`
- `id` (integer)
- `programa_id` (integer)
- `laboratorio_id` (integer)

## Crear usuarios en Supabase

1. En Supabase, ve a `Authentication > Users`.
2. Crea un usuario usando `email` y `password`.
3. Crea un registro en `profiles` con el mismo email y el `auth_user_id` igual al `id` del usuario auth.
4. Si quieres iniciar sesión con `username`, coloca el mismo valor en `username`.

## Despliegue (hosting)

Puedes usar cualquiera de estos servicios:

- Vercel
- Netlify
- Supabase Static Hosting
- GitHub Pages

### Flujo recomendado en Vercel

1. Conecta el repositorio a Vercel.
2. Configura variables de entorno en Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Define el comando de build:
   - `npm run build`
4. Define el directorio de salida:
   - `dist`

## Cómo probar la integración

- Abre la URL local `http://localhost:5173`
- Inicia sesión con un usuario válido de Supabase
- Verifica que la app carga datos sin depender de `localStorage`

## Nota

El proyecto todavía mantiene `localStorage` para fallback, pero la lógica principal está preparada para usar Supabase.
