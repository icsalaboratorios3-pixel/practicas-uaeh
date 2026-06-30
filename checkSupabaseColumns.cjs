const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const envPath = path.join(process.cwd(), '.env');
const text = fs.readFileSync(envPath, 'utf8');
const env = {};
text.split(/\r?\n/).forEach(line => {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
});
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
(async () => {
  const tables = ['asignaturas', 'practicas'];
  for (const table of tables) {
    console.log('--- ' + table + ' ---');
    const selectors = [
      'id',
      'createdByLaboratorioId',
      'created_by_laboratorio_id',
      'programaId',
      'programa_id',
      'asignaturaId',
      'asignatura_id',
      'activo',
      'nombre',
      'email',
      'password'
    ];
    for (const sel of selectors) {
      const { data, error } = await supabase.from(table).select(sel).limit(1);
      console.log(sel, error ? error.message : 'OK');
    }
  }
  process.exit(0);
})();
