# Lab Prácticas UAEH

## Resumen del proyecto
Este proyecto es una aplicación web de gestión de programaciones de prácticas de laboratorio para la Universidad Autónoma del Estado de Hidalgo (UAEH). Está desarrollada con React y Vite, y utiliza Supabase como backend para persistir datos.

La aplicación permite:
- Gestionar laboratorios, programas académicos, asignaturas y prácticas.
- Registrar programaciones de profesores para el uso de laboratorios.
- Asignar responsables de laboratorio y validar programaciones.
- Consultar disponibilidad de laboratorios.
- Revisar conflictos y calendario de prácticas.
- Manejar usuarios con roles.

## Tecnologías principales
- React 18
- Vite
- Supabase (base de datos, autenticación y API)
- JavaScript (ES Modules)

## Estructura principal
- `lab-practicas-uaeh.jsx`: componente principal de la aplicación, con la lógica de UI, permisos por rol y llamadas a Supabase.
- `supabaseClient.js`: cliente Supabase que instancia la conexión usando variables de entorno.
- `main.jsx`: punto de entrada de React.
- `index.html`: estructura HTML principal.
- `style.css`: estilos globales.
- `.env.example`: ejemplo de variables de entorno para conectar Supabase.
- `checkSupabaseColumns.js`: script auxiliar para verificar columnas en tablas Supabase.

## Uso y despliegue local
1. Copia `.env.example` a `.env`.
2. Define en `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Instala dependencias:
   ```bash
   npm install
   ```
4. Inicia la aplicación:
   ```bash
   npm run dev
   ```
5. Abre el navegador en la URL que indique Vite (normalmente `http://localhost:5173`).

## Configuración de Supabase
El proyecto utiliza Supabase como fuente de datos. El cliente se configura en `supabaseClient.js` con:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

La aplicación carga datos de varias tablas al iniciar, y también guarda actualizaciones y altas directamente en la base de datos.

## Roles y permisos
La app define tres roles principales:
- `admin`: puede ver y gestionar todos los módulos, tablas y relaciones.
- `profesor`: puede crear programaciones, ver su historial, consultar disponibilidad y su propio perfil.
- `laboratorio`: puede validar programaciones asignadas y ver el calendario de su laboratorio.

## Modelo de datos
A continuación se describen las tablas usadas y los campos principales detectados en el código.

### `profiles`
Usuarios de la aplicación.
- `id`
- `username`
- `password`
- `name`
- `role` (`admin`, `profesor`, `laboratorio`)
- `active`
- `email`
- `auth_user_id`
- `asignaturas_ids` (lista de asignaturas que imparte el profesor)

### `laboratorios`
Laboratorios del instituto.
- `id`
- `nombre`
- `capacidad`
- `ubicacion`
- `activo`

### `programas`
Programas educativos.
- `id`
- `nombre`
- `activo`

### `asignaturas`
Asignaturas asociadas a programas.
- `id`
- `nombre`
- `activo`
- `programa_id`
- `created_by_id`

### `practicas`
Catálogo de prácticas disponibles.
- `id`
- `nombre`
- `activo`
- `programa_id`
- `asignatura_id`
- `created_by_id`

### `programa_laboratorios`
Relación muchos a muchos entre programas y laboratorios.
- `programa_id`
- `laboratorio_id`

### `responsable_laboratorios`
Relación entre responsables y laboratorios.
- `responsable_id`
- `laboratorio_id`

### `programaciones`
Programaciones de prácticas en laboratorios.
Campos detectados en el código y ejemplos:
- `id`
- `profesorId`
- `laboratorioId`
- `programaId`
- `periodo`
- `asignatura`
- `semestre`
- `grupo`
- `dia`
- `horaInicio`
- `horaFin`
- `numAlumnos`
- `numEquipos`
- `validada`
- `validadoPor`
- `fechaValidacion`
- `reprogramacionPendiente`
- `reprogramacionAutorizada`
- `reprogramacionSolicitadaBy`
- `reprogramacionAprobadaBy`
- `fechaAprobacion`
- `practicas` (array de objetos con `id`, `numero`, `nombre`, `fecha`, `reprogramacion`)

## Flujo funcional principal
1. El usuario inicia sesión con `username` y `password`.
2. La aplicación carga datos de Supabase y un conjunto inicial de valores por defecto si la base de datos está vacía.
3. Según el rol, se muestran diferentes funcionalidades:
   - `admin`: gestión de laboratorios, programas, asignaciones, profesores, asignaturas, prácticas y conflictos.
   - `profesor`: creación de programaciones, revisión de sus prácticas y consulta de disponibilidad.
   - `laboratorio`: validación de programaciones y visualización de calendario de laboratorio.
4. Las operaciones de crear/editar/eliminar se realizan mediante llamadas a Supabase en `supabaseInsertRow`, `supabaseUpdateRow` y `supabaseDeleteRow`.

## Interfaz de usuario y secciones
La navegación incluye:
- Panel general / Mi Panel
- Programaciones
- Laboratorios
- Programas educativos
- Profesores
- Asignaturas
- Prácticas
- Usuarios
- Conflictos de horario
- Mi calendario / Disponibilidad
- Perfil

## Observaciones importantes
- Las contraseñas se manejan en texto plano en el prototipo actual. En producción se debe implementar hash seguro y autenticación real.
- El sistema almacena relaciones de programas y responsables de laboratorio mediante tablas intermedias.
- Existen datos iniciales embebidos para laboratorios, programas, responsables y asignaciones que facilitan pruebas sin depender totalmente de la base de datos.

## Siguientes pasos recomendados
- Agregar un esquema SQL formal basado en las tablas ya definidas.
- Asegurar integridad referencial en Supabase (claves foráneas y restricciones).
- Implementar autenticación segura usando Supabase Auth o JWT.
- Añadir validación de formularios y manejo de errores más robusto.
- Documentar las rutas de la API y los permisos de cada endpoint si se extiende a un backend.

---

## Estado actual del proyecto
- Proyecto funcional como SPA React.
- Conexión a Supabase lista.
- Lógica principal implementada en un único componente grande (`lab-practicas-uaeh.jsx`).
- Recomendado modularizar después de la entrega.

