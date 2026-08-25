const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(process.cwd(), '.env');
const text = fs.readFileSync(envPath, 'utf8');
const env = {};

text.split(/\r?\n/).forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const TABLE_COLUMN_CANDIDATES = {
  profiles: [
    'id', 'username', 'name', 'role', 'active', 'email', 'password', 'auth_user_id', 'authUserId',
    'asignaturas_ids', 'asignaturasIds'
  ],
  asignaturas: [
    'id', 'nombre', 'activo', 'programa_id', 'programaId', 'created_by_id', 'createdById', 'created_by_laboratorio_id', 'createdByLaboratorioId'
  ],
  practicas: [
    'id', 'nombre', 'activo', 'programa_id', 'programaId', 'asignatura_id', 'asignaturaId', 'created_by_id', 'createdById'
  ],
  programaciones: [
    'id', 'profesor_id', 'profesorId', 'laboratorio_id', 'laboratorioId', 'programa_id', 'programaId',
    'periodo', 'asignatura_id', 'asignaturaId', 'asignatura', 'semestre', 'grupo', 'dia',
    'hora_inicio', 'horaInicio', 'hora_fin', 'horaFin', 'num_alumnos', 'numAlumnos', 'num_equipos', 'numEquipos',
    'validada', 'validado_por', 'validadoPor', 'fecha_validacion', 'fechaValidacion',
    'reprogramacion_pendiente', 'reprogramacion_pendiente', 'reprogramacion_autorizada', 'reprogramacionAutorizada',
    'reprogramacion_solicitada_by', 'reprogramacionSolicitadaBy', 'reprogramacion_aprobada_by', 'reprogramacionAprobadaBy',
    'fecha_aprobacion', 'fechaAprobacion', 'asistencia_profesor', 'asistenciaProfesor', 'asistencia_responsable', 'asistenciaResponsable', 'practicas'
  ],
  responsable_laboratorios: [
    'responsable_id', 'responsableId', 'laboratorio_id', 'laboratorioId'
  ],
  programa_laboratorios: [
    'programa_id', 'programaId', 'laboratorio_id', 'laboratorioId'
  ]
};

async function validateTableColumns(table, selectors = []) {
  const candidates = selectors.length ? selectors : TABLE_COLUMN_CANDIDATES[table] || [];
  const available = [];
  const missing = [];

  console.log(`--- ${table} ---`);

  for (const selector of candidates) {
    const { error } = await supabase.from(table).select(selector).limit(1);
    if (error) {
      missing.push(selector);
      console.log(`✖ ${selector}: ${error.message}`);
    } else {
      available.push(selector);
      console.log(`✔ ${selector}: OK`);
    }
  }

  return { table, available, missing };
}

(async () => {
  const tables = ['profiles', 'asignaturas', 'practicas', 'programaciones', 'responsable_laboratorios', 'programa_laboratorios'];
  const results = [];

  for (const table of tables) {
    results.push(await validateTableColumns(table));
  }

  console.log('\nResumen:');
  for (const result of results) {
    console.log(`${result.table}: ${result.available.length} columnas disponibles, ${result.missing.length} no disponibles`);
  }

  process.exit(0);
})();
