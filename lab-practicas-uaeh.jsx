
import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";

const toSnakeCase = (str) => str.replace(/([A-Z])/g, "_$1").toLowerCase();
const toCamelCase = (str) => str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const mapObjectKeys = (obj, transform) => {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  return Object.entries(obj).reduce((acc, [key, value]) => {
    acc[transform(key)] = value;
    return acc;
  }, {});
};

const sortAlpha = (field) => (a, b) => (String(a[field] || "")).localeCompare(String(b[field] || ""), "es", { sensitivity: "base" });

const DB_TABLE_COLUMNS = {
  asignaturas: ["nombre", "activo", "programa_id", "created_by_id"],
  practicas: ["nombre", "activo", "programa_id", "asignatura_id", "created_by_id"],
  laboratorios: ["nombre", "capacidad", "ubicacion", "activo"],
  programas: ["nombre", "activo"],
  profiles: ["username", "password", "name", "role", "active", "email", "auth_user_id", "asignaturas_ids"],
  programa_laboratorios: ["programa_id", "laboratorio_id"],
  responsable_laboratorios: ["responsable_id", "laboratorio_id"],
  programaciones: [
    "profesor_id", "laboratorio_id", "programa_id", "periodo", "asignatura_id", "asignatura",
    "semestre", "grupo", "dia", "hora_inicio", "hora_fin", "num_alumnos", "num_equipos",
    "validada", "validado_por", "fecha_validacion",
    "reprogramacion_pendiente", "reprogramacion_autorizada", "reprogramacion_solicitada_por", "reprogramacion_solicitada_by", "reprogramacion_aprobada_by", "fecha_solicitud_reprogramacion", "fecha_aprobacion",
    "practicas"
  ],
};

const normalizeDbRow = (row) => {
  const normalized = mapObjectKeys(row, toCamelCase);
  return {
    ...normalized,
    practicas: Array.isArray(normalized.practicas) ? normalized.practicas : [],
    role: typeof normalized.role === "string" ? normalized.role.toLowerCase() : normalized.role,
  };
};
const normalizeAppRowForDb = (table, row) => {
  if (!row || typeof row !== "object" || Array.isArray(row)) return row;
  const allowed = DB_TABLE_COLUMNS[table];
  return Object.entries(row).reduce((acc, [key, value]) => {
    if (value === undefined) return acc;
    const snakeKey = toSnakeCase(key);
    if (snakeKey === "id") return acc;
    if (allowed && !allowed.includes(snakeKey)) return acc;
    acc[snakeKey] = value;
    return acc;
  }, {});
};

const supabaseInsertRow = async (table, row) => {
  const dbRow = normalizeAppRowForDb(table, row);
  if (dbRow.id == null) dbRow.id = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
  const { data, error } = await supabase.from(table).insert(dbRow).select().maybeSingle();
  const normalizedData = data ? normalizeDbRow(data) : null;
  if (error) console.warn(`Supabase insert failed for ${table}:`, error.message);
  return { data: normalizedData, error };
};

const supabaseUpdateRow = async (table, id, row) => {
  const dbRow = normalizeAppRowForDb(table, row);
  const { data, error } = await supabase.from(table).update(dbRow).eq("id", id).select().maybeSingle();
  const normalizedData = data ? normalizeDbRow(data) : null;
  if (error) console.warn(`Supabase update failed for ${table} id=${id}:`, error.message);
  return { data: normalizedData, error };
};

const supabaseDeleteRow = async (table, id) => {
  try {
    const { data, error } = await supabase.from(table).delete().eq("id", id).select();
    if (error) console.warn(`Supabase delete failed for ${table} id=${id}:`, error.message, error);
    return { data, error };
  } catch (err) {
    console.warn(`Supabase delete exception for ${table} id=${id}:`, err);
    return { error: err };
  }
};

const INITIAL_USERS = [
  { id: 1, username: "admin", password: "admin123", name: "Administrador General", role: "admin", active: true, email: "admin@uaeh.edu.mx" },
];

var INITIAL_RESPONSABLE_LABORATORIOS = [
  // Imagen de responsables por laboratorio
  { responsableId: 6, laboratorioId: 1 },   // Bioquímica (1a Etapa) -> Gloria Téllez
  { responsableId: 7, laboratorioId: 2 },   // Histología -> Said Martínez
  { responsableId: 7, laboratorioId: 3 },   // Patología -> Said Martínez
  { responsableId: 8, laboratorioId: 4 },   // Fisiología (Nutrición) -> Alejandra Islas
  { responsableId: 8, laboratorioId: 5 },   // Bioquímica y Bromatología -> Alejandra Islas
  { responsableId: 9, laboratorioId: 6 },   // Embriología y Genética -> Angélica Mendoza
  { responsableId: 10, laboratorioId: 7 },  // CLEMPs -> Sergio Ocampo
  { responsableId: 11, laboratorioId: 8 },  // Quirófanos -> José Muñoz
  { responsableId: 11, laboratorioId: 9 },  // Taller de Cirugía -> José Muñoz
  { responsableId: 12, laboratorioId: 10 }, // Inmunología -> María Huesca
  { responsableId: 12, laboratorioId: 11 }, // Farmacognosia -> María Huesca
  { responsableId: 12, laboratorioId: 12 }, // Fisicoquímica fisiológica -> María Huesca
  { responsableId: 12, laboratorioId: 13 }, // Biofarmacia -> María Huesca
  { responsableId: 12, laboratorioId: 14 }, // Investigación (Farmacia) -> María Huesca
  { responsableId: 4, laboratorioId: 15 },  // Fisiología (1a Etapa) -> Patricia González
  { responsableId: 4, laboratorioId: 16 },  // Farmacología -> Patricia González
  { responsableId: 13, laboratorioId: 17 }, // Anatomía -> María Sánchez
  { responsableId: 14, laboratorioId: 18 }, // Microbiología y Parasitología -> Raúl Marines
  { responsableId: 15, laboratorioId: 19 }, // Desarrollo de Nuevos Productos -> Ivonne García
  { responsableId: 15, laboratorioId: 20 }, // Antropometría -> Ivonne García
  { responsableId: 19, laboratorioId: 21 }, // Evaluación del Estado Nutricio -> Jonathan Angeles
  { responsableId: 19, laboratorioId: 22 }, // Dietética y Arte culinario -> Jonathan Angeles
  { responsableId: 20, laboratorioId: 23 }, // Taller de Evaluación e Intervención Gerontológica -> Dulce Galindo
  { responsableId: 16, laboratorioId: 24 }, // Clínica Odontológica 1 -> Arturo Ascencio
  { responsableId: 16, laboratorioId: 25 }, // Clínica Odontológica 2 -> Arturo Ascencio
  { responsableId: 16, laboratorioId: 26 }, // Clínica Odontológica 3 -> Arturo Ascencio
  { responsableId: 16, laboratorioId: 27 }, // Clínica Odontológica 4 -> Arturo Ascencio
  { responsableId: 16, laboratorioId: 28 }, // Laboratorio Odontológico 1 -> Arturo Ascencio
  { responsableId: 16, laboratorioId: 29 }, // Laboratorio Odontológico 2 -> Arturo Ascencio
  { responsableId: 16, laboratorioId: 30 }, // Laboratorio Odontológico 3 -> Arturo Ascencio
  { responsableId: 16, laboratorioId: 31 }, // Laboratorio Odontológico Ramírez Ulloa -> Arturo Ascencio
  { responsableId: 17, laboratorioId: 32 }, // Psicofisiología -> Itzel Moreno
  { responsableId: 17, laboratorioId: 33 }, // Clínica de Psicodiagnóstico -> Itzel Moreno
  { responsableId: 18, laboratorioId: 34 }, // Cámara de Gesel -> Antonia Iglesias
];

var INITIAL_PROGRAMA_LABORATORIOS = [
  // Cirujano Dentista
  { programaId: 1, laboratorioId: 1 },
  { programaId: 1, laboratorioId: 2 },
  { programaId: 1, laboratorioId: 3 },
  { programaId: 1, laboratorioId: 6 },
  { programaId: 1, laboratorioId: 7 },
  { programaId: 1, laboratorioId: 15 },
  { programaId: 1, laboratorioId: 17 },
  { programaId: 1, laboratorioId: 18 },
  { programaId: 1, laboratorioId: 24 },
  { programaId: 1, laboratorioId: 25 },
  { programaId: 1, laboratorioId: 26 },
  { programaId: 1, laboratorioId: 27 },
  { programaId: 1, laboratorioId: 28 },
  { programaId: 1, laboratorioId: 29 },
  { programaId: 1, laboratorioId: 30 },
  { programaId: 1, laboratorioId: 31 },
  // Medicina
  { programaId: 2, laboratorioId: 1 },
  { programaId: 2, laboratorioId: 2 },
  { programaId: 2, laboratorioId: 3 },
  { programaId: 2, laboratorioId: 4 },
  { programaId: 2, laboratorioId: 5 },
  { programaId: 2, laboratorioId: 6 },
  { programaId: 2, laboratorioId: 7 },
  { programaId: 2, laboratorioId: 8 },
  { programaId: 2, laboratorioId: 9 },
  { programaId: 2, laboratorioId: 10 },
  { programaId: 2, laboratorioId: 15 },
  { programaId: 2, laboratorioId: 16 },
  { programaId: 2, laboratorioId: 17 },
  { programaId: 2, laboratorioId: 18 },
  { programaId: 2, laboratorioId: 23 },
  // Farmacia
  { programaId: 3, laboratorioId: 6 },
  { programaId: 3, laboratorioId: 7 },
  { programaId: 3, laboratorioId: 10 },
  { programaId: 3, laboratorioId: 11 },
  { programaId: 3, laboratorioId: 12 },
  { programaId: 3, laboratorioId: 13 },
  { programaId: 3, laboratorioId: 14 },
  { programaId: 3, laboratorioId: 19 },
  { programaId: 3, laboratorioId: 16 },
  // Nutrición
  { programaId: 4, laboratorioId: 4 },
  { programaId: 4, laboratorioId: 5 },
  { programaId: 4, laboratorioId: 6 },
  { programaId: 4, laboratorioId: 7 },
  { programaId: 4, laboratorioId: 15 },
  { programaId: 4, laboratorioId: 20 },
  { programaId: 4, laboratorioId: 21 },
  { programaId: 4, laboratorioId: 22 },
  // Psicología
  { programaId: 5, laboratorioId: 5 },
  { programaId: 5, laboratorioId: 6 },
  { programaId: 5, laboratorioId: 7 },
  { programaId: 5, laboratorioId: 32 },
  { programaId: 5, laboratorioId: 33 },
  { programaId: 5, laboratorioId: 34 },
  // Enfermería
  { programaId: 6, laboratorioId: 2 },
  { programaId: 6, laboratorioId: 6 },
  { programaId: 6, laboratorioId: 7 },
  { programaId: 6, laboratorioId: 10 },
  { programaId: 6, laboratorioId: 11 },
  { programaId: 6, laboratorioId: 12 },
  { programaId: 6, laboratorioId: 13 },
  { programaId: 6, laboratorioId: 14 },
  { programaId: 6, laboratorioId: 15 },
  // Gerontología
  { programaId: 7, laboratorioId: 7 },
  { programaId: 7, laboratorioId: 23 },
  { programaId: 7, laboratorioId: 2 },
];

var INITIAL_LABORATORIOS = [
  { id: 1, nombre: "Bioquímica (1a Etapa)", capacidad: 40, ubicacion: "Edificio A, Planta Baja", activo: true },
  { id: 2, nombre: "Histología", capacidad: 35, ubicacion: "Edificio B, Piso 2", activo: true },
  { id: 3, nombre: "Patología", capacidad: 30, ubicacion: "Edificio C, Planta Baja", activo: true },
  { id: 4, nombre: "Fisiología (Nutrición)", capacidad: 32, ubicacion: "Edificio A, Piso 1", activo: true },
  { id: 5, nombre: "Bioquímica y Bromatología", capacidad: 36, ubicacion: "Edificio B, Piso 3", activo: true },
  { id: 6, nombre: "Embriología y Genética", capacidad: 28, ubicacion: "Edificio C, Piso 2", activo: true },
  { id: 7, nombre: "Centro Latinoamericano de Educación Médica Por Simulación (CLEMPs)", capacidad: 30, ubicacion: "Edificio D, Planta Baja", activo: true },
  { id: 8, nombre: "Quirófanos", capacidad: 25, ubicacion: "Edificio E, Piso 1", activo: true },
  { id: 9, nombre: "Taller de Cirugía", capacidad: 30, ubicacion: "Edificio E, Piso 2", activo: true },
  { id: 10, nombre: "Inmunología", capacidad: 32, ubicacion: "Edificio F, Piso 1", activo: true },
  { id: 11, nombre: "Farmacognosia", capacidad: 30, ubicacion: "Edificio F, Piso 2", activo: true },
  { id: 12, nombre: "Fisicoquímica fisiológica", capacidad: 30, ubicacion: "Edificio G, Piso 1", activo: true },
  { id: 13, nombre: "Biofarmacia", capacidad: 28, ubicacion: "Edificio G, Piso 2", activo: true },
  { id: 14, nombre: "Investigación (Farmacia)", capacidad: 26, ubicacion: "Edificio G, Piso 3", activo: true },
  { id: 15, nombre: "Fisiología (1a Etapa)", capacidad: 34, ubicacion: "Edificio H, Planta Baja", activo: true },
  { id: 16, nombre: "Farmacología", capacidad: 32, ubicacion: "Edificio H, Piso 1", activo: true },
  { id: 17, nombre: "Anatomía", capacidad: 40, ubicacion: "Edificio I, Planta Baja", activo: true },
  { id: 18, nombre: "Microbiología y Parasitología", capacidad: 34, ubicacion: "Edificio I, Piso 1", activo: true },
  { id: 19, nombre: "Desarrollo de Nuevos Productos", capacidad: 28, ubicacion: "Edificio J, Piso 2", activo: true },
  { id: 20, nombre: "Antropometría", capacidad: 26, ubicacion: "Edificio J, Piso 1", activo: true },
  { id: 21, nombre: "Evaluación del Estado Nutricio", capacidad: 26, ubicacion: "Edificio J, Piso 2", activo: true },
  { id: 22, nombre: "Dietética y Arte culinario", capacidad: 26, ubicacion: "Edificio J, Piso 3", activo: true },
  { id: 23, nombre: "Taller de Evaluación e Intervención Gerontológica", capacidad: 28, ubicacion: "Edificio K, Piso 1", activo: true },
  { id: 24, nombre: "Clínica Odontológica 1", capacidad: 20, ubicacion: "Edificio L, Piso 1", activo: true },
  { id: 25, nombre: "Clínica Odontológica 2", capacidad: 20, ubicacion: "Edificio L, Piso 1", activo: true },
  { id: 26, nombre: "Clínica Odontológica 3", capacidad: 20, ubicacion: "Edificio L, Piso 2", activo: true },
  { id: 27, nombre: "Clínica Odontológica 4", capacidad: 20, ubicacion: "Edificio L, Piso 2", activo: true },
  { id: 28, nombre: "Laboratorio Odontológico 1", capacidad: 18, ubicacion: "Edificio L, Piso 3", activo: true },
  { id: 29, nombre: "Laboratorio Odontológico 2", capacidad: 18, ubicacion: "Edificio L, Piso 3", activo: true },
  { id: 30, nombre: "Laboratorio Odontológico 3", capacidad: 18, ubicacion: "Edificio L, Piso 4", activo: true },
  { id: 31, nombre: "Laboratorio Odontológico Ramírez Ulloa", capacidad: 18, ubicacion: "Edificio L, Piso 4", activo: true },
  { id: 32, nombre: "Psicofisiología", capacidad: 24, ubicacion: "Edificio M, Piso 1", activo: true },
  { id: 33, nombre: "Clínica de Psicodiagnóstico", capacidad: 22, ubicacion: "Edificio M, Piso 2", activo: true },
  { id: 34, nombre: "Cámara de Gesel", capacidad: 16, ubicacion: "Edificio M, Piso 3", activo: true },
];

const INITIAL_PROGRAMAS = [
  { id: 1, nombre: "Cirujano Dentista", activo: true },
  { id: 2, nombre: "Medicina", activo: true },
  { id: 3, nombre: "Farmacia", activo: true },
  { id: 4, nombre: "Nutrición", activo: true },
  { id: 5, nombre: "Psicología", activo: true },
  { id: 6, nombre: "Enfermería", activo: true },
  { id: 7, nombre: "Gerontología", activo: true },
];

const INITIAL_ASIGNATURAS = [

];

const INITIAL_PRACTICAS = [
  
];

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

var INITIAL_PROGRAMACIONES = [
  {
    id: 1, profesorId: 2, laboratorioId: 15, programaId: 1,
    periodo: "JULIO - DICIEMBRE 2026", asignatura: "Fisiología",
    semestre: "2", grupo: "1", dia: "Miércoles", horaInicio: "10:00", horaFin: "11:00",
    numAlumnos: 35, numEquipos: 6,
    validada: false, validadoPor: null, fechaValidacion: null, reprogramacionPendiente: false, reprogramacionAutorizada: false, reprogramacionSolicitadaBy: null, reprogramacionAprobadaBy: null, fechaAprobacion: null,
    practicas: [
      { id: 1, numero: 1, nombre: "Fenómenos de superficie", fecha: "2026-08-06", reprogramacion: "" },
      { id: 2, numero: 2, nombre: "Transporte a través de la membrana", fecha: "2026-08-13", reprogramacion: "" },
      { id: 3, numero: 3, nombre: "Reflejos", fecha: "2026-08-20", reprogramacion: "" },
      { id: 4, numero: 4, nombre: "Visión, campos visuales y agudeza visual", fecha: "2026-08-27", reprogramacion: "" },
      { id: 5, numero: 5, nombre: "Audición", fecha: "2026-09-10", reprogramacion: "" },
      { id: 6, numero: 6, nombre: "Pulso", fecha: "2026-09-17", reprogramacion: "" },
      { id: 7, numero: 7, nombre: "Presión Arterial", fecha: "2026-09-24", reprogramacion: "" },
      { id: 8, numero: 8, nombre: "Electrocardiograma", fecha: "2026-10-01", reprogramacion: "" },
      { id: 9, numero: 9, nombre: "Grupos sanguáneos", fecha: "2026-10-15", reprogramacion: "" },
      { id: 10, numero: 10, nombre: "Hemostasia", fecha: "2026-10-22", reprogramacion: "" },
      { id: 11, numero: 11, nombre: "Temperatura", fecha: "2026-10-29", reprogramacion: "" },
    ]
  }
];

const fmtDate = (d) => {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${parseInt(day)} ${meses[parseInt(m)-1]} ${y}`;
};

const colors = {
  admin: { bg: "#FBE5E5", text: "#511013", border: "#511013" },
  profesor: { bg: "#FFEEDD", text: "#E8641C", border: "#E8641C" },
  laboratorio: { bg: "#FFF4E8", text: "#F39200", border: "#F39200" },
  primaryRed: "#B91116",
  darkRed: "#841816",
  darkestRed: "#511013",
  orange: "#E8641C",
  orangeBright: "#F39200",
  beige: "#F8B688",
  darkGray: "#575756",
  lightGray: "#9D9D9C",
};

export default function App() {
  const USER_STORAGE_KEY = "labPracticasCurrentUser";
  const [users, setUsers] = useState(INITIAL_USERS);
  const [laboratorios, setLaboratorios] = useState(INITIAL_LABORATORIOS);
  const [programas, setProgramas] = useState(INITIAL_PROGRAMAS);
  const [asignaturas, setAsignaturas] = useState(INITIAL_ASIGNATURAS);
  const [practicasCatalogo, setPracticasCatalogo] = useState(INITIAL_PRACTICAS);
  const [programaciones, setProgramaciones] = useState([]);
  const [responsableLaboratorios, setResponsableLaboratorios] = useState(INITIAL_RESPONSABLE_LABORATORIOS);
  const [programaLaboratorios, setProgramaLaboratorios] = useState(INITIAL_PROGRAMA_LABORATORIOS);
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = window.localStorage.getItem(USER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (currentUser) {
      const { password, ...safeUser } = currentUser;
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(safeUser));
    } else {
      window.localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [currentUser]);

  const loadRemoteData = async () => {
    const mergeWithDefaults = (defaults, remote, key) => {
      if (!Array.isArray(remote) || remote.length === 0) return defaults;
      const merged = [];
      const seen = new Set();
      for (const row of remote) {
        if (!row || row[key] === undefined) continue;
        seen.add(row[key]);
        const base = defaults.find(item => item[key] === row[key]);
        if (!base) {
          merged.push(row);
          continue;
        }
        const combined = { ...base };
        for (const prop in row) {
          if (row[prop] !== undefined && row[prop] !== null) {
            combined[prop] = row[prop];
          }
        }
        merged.push(combined);
      }
      for (const item of defaults) {
        if (!seen.has(item[key])) merged.push(item);
      }
      return merged;
    };

    const fetchTable = async (table, fallback, mergeKey) => {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        console.warn(`Supabase load failed for ${table}:`, error.message);
        return fallback;
      }
      const rows = Array.isArray(data) ? data : [];
      const normalizedRows = rows.map(normalizeDbRow);
      if (mergeKey) return mergeWithDefaults(fallback, normalizedRows, mergeKey);
      return normalizedRows.length ? normalizedRows : fallback;
    };

    const [usersData, laboratoriosData, programasData, asignaturasData, practicasData, programacionesData, responsableLaboratoriosData, programaLaboratoriosData] = await Promise.all([
      fetchTable("profiles", INITIAL_USERS, "username"),
      fetchTable("laboratorios", INITIAL_LABORATORIOS),
      fetchTable("programas", INITIAL_PROGRAMAS),
      fetchTable("asignaturas", INITIAL_ASIGNATURAS),
      fetchTable("practicas", INITIAL_PRACTICAS),
      fetchTable("programaciones", []),
      fetchTable("responsable_laboratorios", INITIAL_RESPONSABLE_LABORATORIOS),
      fetchTable("programa_laboratorios", INITIAL_PROGRAMA_LABORATORIOS),
    ]);

    setUsers(usersData);
    setLaboratorios(laboratoriosData);
    setProgramas(programasData);
    setAsignaturas(asignaturasData);
    setPracticasCatalogo(practicasData);
    setProgramaciones(programacionesData);
    setResponsableLaboratorios(responsableLaboratoriosData);
    setProgramaLaboratorios(programaLaboratoriosData);
  };

  const initApp = async () => {
    setIsLoading(true);
    await loadRemoteData();
    setIsLoading(false);
  };

  useEffect(() => {
    initApp();
  }, []);

  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogin = async () => {
    setLoginError("");
    console.log("handleLogin", { loginData, usersLength: users.length });

    let localProfile = users.find(u => u.username === loginData.username && u.password);
    console.log("localProfile1", { profile: localProfile });
    if (!localProfile) {
      localProfile = INITIAL_USERS.find(u => u.username === loginData.username);
      console.log("localProfile2", { profile: localProfile });
    }

    if (localProfile) {
      if (!localProfile.active || localProfile.password !== loginData.password) {
        console.log("login failed details", { active: localProfile.active, expected: localProfile.password, provided: loginData.password });
        setLoginError("Usuario o contraseña incorrectos.");
        return;
      }
      setCurrentUser(localProfile);
      setActiveSection("dashboard");
      await loadRemoteData();
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, name, role, active, email, password")
      .eq("username", loginData.username)
      .single();

    if (profileError || !profile || !profile.active || profile.password !== loginData.password) {
      setLoginError("Usuario o contraseña incorrectos.");
      return;
    }

    const normalizedProfile = normalizeDbRow(profile);
    setCurrentUser(normalizedProfile);
    setActiveSection("dashboard");
    await loadRemoteData();
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    setLoginData({ username: "", password: "" });
    setActiveSection("dashboard");
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Helvetica', sans-serif" }}>
        <div style={{ textAlign: "center", color: "#511013", fontSize: 18, fontWeight: 700 }}>Cargando aplicación...</div>
      </div>
    );
  }

  if (!currentUser) return <LoginScreen loginData={loginData} setLoginData={setLoginData} loginError={loginError} onLogin={handleLogin} />;

  return (
    <MainApp
      currentUser={currentUser} users={users} setUsers={setUsers} setCurrentUser={setCurrentUser}
      laboratorios={laboratorios} setLaboratorios={setLaboratorios}
      programas={programas} setProgramas={setProgramas}
      asignaturas={asignaturas} setAsignaturas={setAsignaturas}
      practicasCatalogo={practicasCatalogo} setPracticasCatalogo={setPracticasCatalogo}
      programaciones={programaciones} setProgramaciones={setProgramaciones}
      responsableLaboratorios={responsableLaboratorios} setResponsableLaboratorios={setResponsableLaboratorios}
      programaLaboratorios={programaLaboratorios} setProgramaLaboratorios={setProgramaLaboratorios}
      activeSection={activeSection} setActiveSection={setActiveSection}
      onLogout={handleLogout} notify={notify} notification={notification}
    />
  );
}

function LoginScreen({ loginData, setLoginData, loginError, onLogin }) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%), url('/images/header-uaeh.png') center/cover no-repeat", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Helvetica', sans-serif" }}>
      <div style={{ background: "white", borderRadius: 25, padding: "2.5rem 3rem", width: 500, height: 550, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 100, marginBottom: 22, alignItems: "center" }}>
            <img src="/images/csa-logo.png" alt="CSa Logo" style={{ height: 60, objectFit: "contain" }} />
            <img src="/images/dl-logo.jpg" alt="DL Logo" style={{ height: 70, objectFit: "contain" }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" }}>Prácticas de Laboratorio</h1>
          <p style={{ fontSize: 13, color: "#666", margin: 0 }}>Dirección de Laboratorios  Instituto de Ciencias de la Salud</p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 15, color: "#555", fontWeight: 600, display: "block", marginBottom: 12 }}>Usuario</label>
          <input value={loginData.username} name="username" autoComplete="username"
            onChange={e => { console.log("username change", e.target.value); setLoginData(p => ({ ...p, username: e.target.value })); }}
            onKeyDown={e => e.key === "Enter" && onLogin()}
            style={{ width: "100%", padding: "10px 14px", border: "2px solid #867e7e", borderRadius: 8, fontSize: 15, boxSizing: "border-box", outline: "none" }}
            placeholder="nombre.apellido" />
        </div>
        <div style={{ marginBottom: loginError ? 8 : 20 }}>
          <label style={{ fontSize: 15, color: "#555", fontWeight: 600, display: "block", marginBottom: 12 }}>Contraseña</label>
          <input type="password" value={loginData.password} name="password" autoComplete="current-password"
            onChange={e => { console.log("password change", e.target.value); setLoginData(p => ({ ...p, password: e.target.value })); }}
            onKeyDown={e => e.key === "Enter" && onLogin()}
            style={{ width: "100%", padding: "10px 14px", border: "2px solid #867e7e", borderRadius: 8, fontSize: 15, boxSizing: "border-box" }}
            placeholder="" />
        </div>
        {loginError && <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 16, textAlign: "center" }}>{loginError}</p>}
        <button onClick={onLogin} style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg, #511013, #E8641C)", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          Iniciar sesión
        </button>
        
      </div>
    </div>
  );
}

function MainApp({ currentUser, users, setUsers, setCurrentUser, laboratorios, setLaboratorios, programas, setProgramas, asignaturas, setAsignaturas, practicasCatalogo, setPracticasCatalogo, programaciones, setProgramaciones, responsableLaboratorios, setResponsableLaboratorios, programaLaboratorios, setProgramaLaboratorios, activeSection, setActiveSection, onLogout, notify, notification }) {
  const role = currentUser?.role || "profesor";
  const rc = colors[role] || colors.profesor;

  const navItems = useMemo(() => {
    if (role === "admin") return [
      { id: "dashboard", label: "Panel General", icon: "" },
      { id: "programaciones", label: "Programaciones", icon: "" },
      { id: "laboratorios", label: "Laboratorios", icon: "" },
      { id: "programas", label: "Programas Educativos", icon: "" },
      { id: "profesores", label: "Profesores", icon: "" },
      { id: "asignaturas", label: "Asignaturas", icon: "" },
      { id: "practicas", label: "Prácticas", icon: "" },
      { id: "usuarios", label: "Usuarios", icon: "" },
      { id: "conflictos", label: "Conflictos de Horario", icon: "" },
    ];
    if (role === "profesor") return [
      { id: "dashboard", label: "Mi Panel", icon: "" },
      { id: "mis-programaciones", label: "Mis Programaciones", icon: "" },
      { id: "nueva-programacion", label: "Nueva Programación", icon: "+" },
      { id: "disponibilidad", label: "Disponibilidad de Labs", icon: "" },
    ];
    return [
      { id: "dashboard", label: "Mi Laboratorio", icon: "" },
      { id: "asignaturas", label: "Asignaturas", icon: "" },
      { id: "practicas", label: "Prácticas", icon: "" },
      { id: "mi-calendario", label: "Calendario de Prácticas", icon: "" },
      { id: "conflictos", label: "Horario de Prácticas", icon: "" },
    ];
  }, [role]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: "'Helvetica', sans-serif", background: "#f4f5f7" }}>
      {notification && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: notification.type === "success" ? "#511013" : "#575756", color: "white", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          {notification.msg}
        </div>
      )}

      <div style={{ display: "flex", flex: 1, minWidth: 0 }}>
        <aside style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 240, minWidth: 240, maxWidth: 240, background: "white", borderRight: "1.5px solid #9a9393", display: "flex", flexDirection: "column", flexShrink: 0, zIndex: 1000, overflow: "hidden" }}>
        <div style={{ padding: "1.5rem 1.2rem", borderBottom: "1px solid #cababa" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center", justifyContent: "center" }}>
            <img src="/images/csa-logo.png" alt="CSa Logo" style={{ height: 35, objectFit: "contain" }} />
            <img src="/images/dl-logo.jpg" alt="DL Logo" style={{ height: 50, objectFit: "contain" }} />
          </div>
          <p style={{ fontSize: 11, color: "#888", margin: 0, lineHeight: 1.4, textAlign: "center" }}>Dirección de Laboratorios</p>
        </div>
        <div style={{ padding: "1rem 0.8rem", borderBottom: "1px solid #c2bebe" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: rc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: rc.text, flexShrink: 0 }}>
              {(currentUser?.name || "?").split(" ").slice(0,2).map(n => n[0] || "").join("")}
            </div>
            <div style={{ overflow: "hidden" }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "#222", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{(currentUser?.name || "Usuario").split(" ").slice(-2).join(" ")}</p>
              <span style={{ fontSize: 11, background: rc.bg, color: rc.text, padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                {{ admin: "Administrador", profesor: "Profesor", laboratorio: "Resp. Laboratorio" }[role] || "Usuario"}
              </span>
            </div>
          </div>
          <button onClick={() => setActiveSection("perfil")}
            style={{ marginTop: 12, width: "100%", textAlign: "center", padding: "8px 10px", borderRadius: 12, border: "1px solid #ddd", background: "#fff5e8", color: "#511013", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
            Mi perfil
          </button>
        </div>
        <nav style={{ flex: 1, padding: "0.8rem 0.6rem", overflowY: "auto" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: activeSection === item.id ? 700 : 400, background: activeSection === item.id ? rc.bg : "transparent", color: activeSection === item.id ? rc.text : "#555", textAlign: "left", marginBottom: 2, transition: "all 0.15s", borderLeft: activeSection === item.id ? `3px solid ${rc.text}` : "3px solid transparent" }}>
              <span style={{ fontWeight: 800, fontSize: 12 }}>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "0.8rem" }}>
          <button onClick={onLogout} style={{ width: "100%", padding: "10px", border: "1px solid #ee542d", borderRadius: 6, background: "white", color: "#511013", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s" }}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main style={{ marginLeft: 240, flex: 1, overflowY: "auto", padding: "2rem", background: "#fafafa", minWidth: 0 }}>
        {activeSection === "dashboard" && <DashboardSection currentUser={currentUser} programaciones={programaciones} laboratorios={laboratorios} users={users} responsableLaboratorios={responsableLaboratorios} />}
        {activeSection === "programaciones" && role === "admin" && <ProgramacionesAdmin programaciones={programaciones} users={users} laboratorios={laboratorios} programas={programas} setProgramaciones={setProgramaciones} notify={notify} practicasCatalogo={practicasCatalogo} asignaturas={asignaturas} />}
        {activeSection === "laboratorios" && role === "admin" && <LaboratoriosAdmin laboratorios={laboratorios} setLaboratorios={setLaboratorios} users={users} responsableLaboratorios={responsableLaboratorios} setResponsableLaboratorios={setResponsableLaboratorios} notify={notify} />}
        {activeSection === "programas" && role === "admin" && <ProgramasAdmin programas={programas} setProgramas={setProgramas} laboratorios={laboratorios} programaLaboratorios={programaLaboratorios} setProgramaLaboratorios={setProgramaLaboratorios} notify={notify} />}
        {activeSection === "profesores" && <ProfesoresAdmin currentUser={currentUser} users={users} setUsers={setUsers} asignaturas={asignaturas} notify={notify} />}
        {activeSection === "asignaturas" && <AsignaturasAdmin currentUser={currentUser} asignaturas={asignaturas} setAsignaturas={setAsignaturas} programas={programas} notify={notify} />}
        {activeSection === "practicas" && <PracticasAdmin currentUser={currentUser} practicasCatalogo={practicasCatalogo} setPracticasCatalogo={setPracticasCatalogo} programas={programas} asignaturas={asignaturas} notify={notify} />}
        {activeSection === "perfil" && <ProfileSection currentUser={currentUser} users={users} setUsers={setUsers} setCurrentUser={setCurrentUser} notify={notify} />}
        {activeSection === "usuarios" && role === "admin" && <UsuariosAdmin users={users} setUsers={setUsers} notify={notify} />}
        {activeSection === "conflictos" && <ConflictosSection programaciones={programaciones} laboratorios={laboratorios} users={users} currentUser={currentUser} responsableLaboratorios={responsableLaboratorios} />}
        {activeSection === "mis-programaciones" && role === "profesor" && <MisProgramaciones currentUser={currentUser} users={users} programaciones={programaciones} setProgramaciones={setProgramaciones} laboratorios={laboratorios} programas={programas} notify={notify} setActiveSection={setActiveSection} responsableLaboratorios={responsableLaboratorios} asignaturas={asignaturas} practicasCatalogo={practicasCatalogo} />}
        {activeSection === "nueva-programacion" && role === "profesor" && <NuevaProgramacion currentUser={currentUser} programaciones={programaciones} setProgramaciones={setProgramaciones} laboratorios={laboratorios} programas={programas} programaLaboratorios={programaLaboratorios} responsableLaboratorios={responsableLaboratorios} users={users} asignaturas={asignaturas} practicasCatalogo={practicasCatalogo} notify={notify} setActiveSection={setActiveSection} />}
        {activeSection === "disponibilidad" && role === "profesor" && <DisponibilidadLabs programaciones={programaciones} laboratorios={laboratorios} programaLaboratorios={programaLaboratorios} programas={programas} />}
        {activeSection === "mi-calendario" && role === "laboratorio" && <CalendarioLaboratorio currentUser={currentUser} programaciones={programaciones} users={users} programas={programas} laboratorios={laboratorios} setProgramaciones={setProgramaciones} notify={notify} responsableLaboratorios={responsableLaboratorios} />}
      </main>
      </div>
      <div style={{ marginLeft: 240 }}>
        <Footer />
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ background: "url('/images/header-uaeh.png') center/cover", padding: "2rem", borderRadius: 12, marginBottom: "1.5rem", color:"white" , textShadow: "1px 1px 3px rgba(0,0,0,0.5)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "white", margin: "0 0 4px" }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 15, color: "rgba(255,255,255,0.9)", margin: 0 }}>{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

function Card({ children, style = {} }) {
  return <div style={{ background: "white", borderRadius: 8, border: "1px solid #e0e0e0", padding: "1.5rem", ...style }}>{children}</div>;
}

function StatCard({ label, value, color = "#511013", bg = "#FBE5E5" }) {
  return (
    <div style={{ background: bg, borderRadius: 8, padding: "1.2rem", minWidth: 0, border: `1px solid ${color}` }}>
      <p style={{ fontSize: 11, color: color, fontWeight: 700, margin: "0 0 6px", textTransform: "uppercase" }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, color: color, margin: 0 }}>{value}</p>
    </div>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  const version = "v1.0";
  return (
    <footer style={{ padding: 12, background: "white", borderTop: "1px solid #eee", fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img src="/images/csa-logo.png" alt="logo" style={{ height: 28, objectFit: "contain" }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#511013" }}>Prácticas de Laboratorio</div>
          <div style={{ fontSize: 12, color: "#555" }}>Instituto de Ciencias de la Salud (ICSa) — UAEH</div>
        </div>
      </div>
      <div style={{ color: "#555", textAlign: "center", flex: 1 }}>
        <div style={{ marginBottom: 6 }}>Dirección de Laboratorios </div>
        <div>
          <a href="/help" style={{ color: "#555", textDecoration: "none", marginRight: 10 }}>Ayuda</a>
          <a href="/privacy" style={{ color: "#555", textDecoration: "none", marginRight: 10 }}>Privacidad</a>
          <a href="/terms" style={{ color: "#555", textDecoration: "none" }}>Términos</a>
        </div>
      </div>
      <div style={{ color: "#777", textAlign: "right", minWidth: 200 }}>
        <div>Desarrollo: Rogelio Rocha — <a href="mailto:ro475972@uaeh.edu.mx">ro475972@uaeh.edu.mx</a></div>
        <div style={{ marginTop: 4 }}>{version} · {year}</div>
        <div style={{ marginTop: 6, fontSize: 11, color: "#999" }}>© {year} Instituto de Ciencias de la Salud, Universidad Autónoma del Estado de Hidalgo. Todos los derechos reservados.</div>
      </div>
    </footer>
  );
}

function ProfileSection({ currentUser, users, setUsers, setCurrentUser, notify }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");

  const save = async () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError("Debes completar todos los campos para cambiar la contraseña.");
      return;
    }

    if (form.currentPassword !== currentUser.password) {
      setError("La contraseña actual no coincide. Ingresa tu contraseña anterior para autorizar el cambio.");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("Las contraseñas nuevas no coinciden. Ingresa la misma contraseña dos veces.");
      return;
    }

    if (form.newPassword === currentUser.password) {
      setError("La nueva contraseña debe ser diferente de la contraseña actual.");
      return;
    }

    const updatedUser = { ...currentUser, password: form.newPassword };
    const { data: updated, error } = await supabaseUpdateRow("profiles", currentUser.id, updatedUser);
    const nextUser = updated ? { ...currentUser, ...updated } : updatedUser;
    setUsers(prev => prev.map(u => u.id === currentUser.id ? nextUser : u));
    setCurrentUser(nextUser);
    notify(error ? "Contraseña actualizada localmente, no guardada en BD" : "Contraseña actualizada correctamente.");
    setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setError("");
  };

  const confirmSave = () => {
    if (window.confirm("¿Estás seguro de cambiar tu contraseña?")) {
      save();
    }
  };

  return (
    <div>
      <SectionHeader title="Mi Perfil" subtitle="Cambia tu contraseña con autorización" />
      <Card style={{ maxWidth: 520 }}>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "#fff4e8", border: "1px solid #f2d5c3", padding: 14, borderRadius: 10 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#7a3f28", lineHeight: 1.5 }}>
              No olvides tu contraseña. Si la pierdes, tendrás que solicitar soporte para restablecerla.
            </p>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>Nombre</label>
            <input value={currentUser.name} disabled style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #ddd", background: "#f7f7f7", fontSize: 14, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>Contraseña actual *</label>
            <input type="password" value={form.currentPassword} onChange={e => setForm(p => ({ ...p, currentPassword: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>Nueva contraseña *</label>
            <input type="text" value={form.newPassword} onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>Confirmar nueva contraseña *</label>
            <input type="text" value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14, boxSizing: "border-box" }} />
          </div>
          {error && <p style={{ color: "#c0392b", fontSize: 13, margin: 0 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={confirmSave} style={{ padding: "10px 20px", background: "#511013", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Guardar contraseña</button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function DashboardSection({ currentUser, programaciones, laboratorios, users, responsableLaboratorios }) {
  const role = currentUser?.role || "profesor";
  const getUserShortName = (name) => (name || "Usuario").split(" ").slice(-2).join(" ");
  const safePracticas = (prog) => Array.isArray(prog.practicas) ? prog.practicas : [];
  const misProg = role === "profesor"
    ? programaciones.filter(p => p.profesorId === currentUser.id)
    : role === "laboratorio"
      ? programaciones.filter(p => responsableLaboratorios
          .filter(rl => rl.responsableId === currentUser.id)
          .map(rl => rl.laboratorioId)
          .includes(p.laboratorioId))
      : programaciones;
  const totalPracticas = misProg.reduce((s, p) => s + safePracticas(p).length, 0);
  const progValidadas = misProg.filter(p => p.validada).length;
  const progPendientes = misProg.filter(p => !p.validada).length;
  const today = new Date().toISOString().split("T")[0];
  const proximas = misProg.flatMap(p => safePracticas(p).map(pr => ({ ...pr, prog: p }))).filter(pr => pr.fecha >= today).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 5);

  return (
    <div>
      <SectionHeader title={`Bienvenido/a, ${getUserShortName(currentUser?.name)}`} subtitle={`Periodo semestral activo - Sistema de Gestión de Prácticas de Laboratorio`} />
      
      {role === "laboratorio" && progPendientes > 0 && (
        <Card style={{ marginBottom: "1.5rem", background: "#FFFBF7", border: "2px solid #F39200", padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ fontSize: 24, color: "#F39200", fontWeight: 700 }}>⚠</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#F39200", margin: "0 0 6px" }}>Tienes {progPendientes} programación{progPendientes !== 1 ? "es" : ""} pendiente{progPendientes !== 1 ? "s" : ""} de validar</p>
              <p style={{ fontSize: 12, color: "#D97E15", margin: 0, lineHeight: 1.4 }}>
                Como responsable del laboratorio, debes revisar y validar las programaciones de los profesores usando tu usuario y contraseña. Esto reemplaza la firma física tradicional.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, marginBottom: "1.5rem" }}>   
        {role === "admin" && <>
          <StatCard label="Programaciones" value={programaciones.length} color="#511013" bg="#FBE5E5" />
          <StatCard label="Laboratorios" value={laboratorios.filter(l => l.activo).length} color="#F39200" bg="#FFF4E8" />
          <StatCard label="Profesores" value={users.filter(u => u.role === "profesor" && u.active).length} color="#E8641C" bg="#FFEEDD" />
          <StatCard label="Total prácticas" value={totalPracticas} color="#575756" bg="#F5F5F5" />
        </>}
        {role === "profesor" && <>
          <StatCard label="Mis programaciones" value={misProg.length} color="#E8641C" bg="#FFEEDD" />
          <StatCard label="Validadas" value={progValidadas} color="#2E7D32" bg="#C8E6C9" />
          <StatCard label="Pendientes" value={progPendientes} color="#F39200" bg="#FFF4E8" />
          <StatCard label="Total prácticas" value={totalPracticas} color="#511013" bg="#FBE5E5" />
        </>}
        {role === "laboratorio" && <>
          <StatCard label="Programaciones asignadas" value={misProg.length} color="#F39200" bg="#FFF4E8" />
          <StatCard label="Validadas" value={progValidadas} color="#2E7D32" bg="#C8E6C9" />
          <StatCard label="Pendientes" value={progPendientes} color="#E8641C" bg="#FFEEDD" />
          <StatCard label="Prácticas programadas" value={totalPracticas} color="#511013" bg="#FBE5E5" />
        </>}
      </div>
      <Card>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 1rem", color: "#333" }}>Próximas prácticas</h3>
        {proximas.length === 0 ? <p style={{ color: "#aaa", fontSize: 14 }}>No hay prácticas próximas registradas.</p> :
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
                <th style={{ textAlign: "left", padding: "10px 10px", background: "#FBE5E5", color: "#511013", fontWeight: 700, borderBottom: "2px solid #511013" }}>Fecha</th>
                <th style={{ textAlign: "left", padding: "10px 10px", background: "#FBE5E5", color: "#511013", fontWeight: 700, borderBottom: "2px solid #511013" }}>Práctica</th>
                <th style={{ textAlign: "left", padding: "10px 10px", background: "#FBE5E5", color: "#511013", fontWeight: 700, borderBottom: "2px solid #511013" }}>Asignatura</th>
                {role !== "profesor" && <th style={{ textAlign: "left", padding: "10px 10px", background: "#FBE5E5", color: "#511013", fontWeight: 700, borderBottom: "2px solid #511013" }}>Profesor</th>}
                <th style={{ textAlign: "left", padding: "10px 10px", background: "#FBE5E5", color: "#511013", fontWeight: 700, borderBottom: "2px solid #511013" }}>Lab</th>
              </tr>
            </thead>
            <tbody>
              {proximas.map((pr, i) => {
                const prof = users.find(u => u.id === pr.prog.profesorId);
                const lab = laboratorios.find(l => l.id === pr.prog.laboratorioId);
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 600, color: "#511013" }}>{fmtDate(pr.fecha)}</td>
                    <td style={{ padding: "8px 10px" }}><span style={{ fontSize: 11, background: "#cf3e46", color: "white", padding: "3px 8px", borderRadius: 4, marginRight: 6, fontWeight: 600 }}>#{pr.numero}</span>{pr.nombre}</td>
                    <td style={{ padding: "8px 10px", color: "#555" }}>{pr.prog.asignatura}</td>
                    {role !== "profesor" && <td style={{ padding: "8px 10px", color: "#555" }}>{prof?.name.split(" ").slice(-2).join(" ")}</td>}
                    <td style={{ padding: "8px 10px", color: "#555" }}>{lab?.nombre.replace("Laboratorio de ", "Lab. ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>}
      </Card>
    </div>
  );
}

function ProgramacionesAdmin({ programaciones, users, laboratorios, programas, setProgramaciones, notify, practicasCatalogo = [], asignaturas = [] }) {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = programaciones.filter(p => {
    const prof = users.find(u => u.id === p.profesorId);
    return !filter || [p.asignatura, p.periodo, prof?.name].join(" ").toLowerCase().includes(filter.toLowerCase());
  });
  const safePracticas = (p) => Array.isArray(p.practicas) ? p.practicas : [];

  return (
    <div>
      <SectionHeader title="Programaciones" subtitle={`${programaciones.length} programaciones registradas`} />
      <div style={{ marginBottom: "1rem" }}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Buscar por asignatura, periodo, profesor..." style={{ padding: "10px 16px", borderRadius: 8, border: "1.5px solid #ddd", width: 340, fontSize: 14, outline: "none" }} />
      </div>
      {selected ? (
      <ProgramacionDetail prog={selected} users={users} laboratorios={laboratorios} programas={programas} onBack={() => setSelected(null)} setProgramaciones={setProgramaciones} programaciones={programaciones} notify={notify} readOnly practicasCatalogo={practicasCatalogo} asignaturas={asignaturas} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(p => {
            const prof = users.find(u => u.id === p.profesorId);
            const lab = laboratorios.find(l => l.id === p.laboratorioId);
            const practicas = Array.isArray(p.practicas) ? p.practicas : [];
            return (
              <Card key={p.id} style={{ cursor: "pointer", transition: "box-shadow 0.15s" }} onClick={() => setSelected({ ...p, practicas: practicas.map(pr => ({ ...pr })) })}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px", color: "#222" }}>{p.asignatura}</h3>
                    <p style={{ fontSize: 13, color: "#666", margin: "0 0 8px" }}>{p.periodo}  Grupo {p.grupo}  Semestre {p.semestre}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <span style={{ fontSize: 12, background: "#FFEEDD", color: "#E8641C", padding: "3px 10px", borderRadius: 20 }}>{prof?.name.split(" ").slice(-2).join(" ")}</span>
                      <span style={{ fontSize: 12, background: "#FBE5E5", color: "#511013", padding: "3px 10px", borderRadius: 20 }}>{lab?.nombre}</span>
                      <span style={{ fontSize: 12, background: "#FFF4E8", color: "#F39200", padding: "3px 10px", borderRadius: 20 }}>{p.dia} {p.horaInicio}{p.horaFin}</span>
                      <span style={{ fontSize: 12, background: "#f5f5f5", color: "#555", padding: "3px 10px", borderRadius: 20 }}>{p.numAlumnos} alumnos</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#511013" }}>{practicas.length}</div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>prácticas</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProgramacionDetail({ prog, users = [], laboratorios, programas, onBack, setProgramaciones, programaciones, notify, readOnly = false, isEdit = false, currentUser, practicasCatalogo = [], asignaturas = [] }) {
  const [editMode, setEditMode] = useState(isEdit && !readOnly);
  const [data, setData] = useState({ ...prog, practicas: (prog.practicas || []).map(p => ({ ...p })) });

  useEffect(() => {
    setData({ ...prog, practicas: (prog.practicas || []).map(p => ({ ...p })) });
  }, [prog]);

  const prof = users.find(u => String(u.id) === String(data.profesorId));
  const lab = laboratorios.find(l => String(l.id) === String(data.laboratorioId));
  const programa = programas.find(p => String(p.id) === String(data.programaId));
  const validador = users.find(u => String(u.id) === String(data.validadoPor));

  // Defensive guards to avoid runtime errors that leave the screen en blanco
  useEffect(() => {
    if (!prog) {
      console.error("ProgramacionDetail mounted without prog");
    }
    if (!Array.isArray(users)) {
      console.warn("ProgramacionDetail: users prop is not an array", users);
    }
  }, [prog, users]);

  const selectedProgramaId = data.programaId ? Number(data.programaId) : null;
  const selectedAsignaturaId = data.asignaturaId ? Number(data.asignaturaId) : null;
  const practicasDisponibles = (selectedProgramaId && selectedAsignaturaId
    ? practicasCatalogo.filter(p => {
        const practicaAsignaturaId = Number(p.asignaturaId ?? p.asignatura_id);
        const practicaProgramaId = Number(p.programaId ?? p.programa_id);
        return practicaAsignaturaId === selectedAsignaturaId && p.activo && practicaProgramaId === selectedProgramaId;
      })
    : []
  ).slice().sort(sortAlpha("nombre"));

  const requestReprogramacion = async () => {
    const fecha = new Date().toISOString().split("T")[0];
    const nextData = {
      ...data,
      reprogramacionPendiente: true,
      reprogramacionSolicitadaPor: currentUser?.id || data.profesorId,
      fechaSolicitudReprogramacion: fecha
    };
    const { data: updated, error } = await supabaseUpdateRow("programaciones", data.id, nextData);
    const persisted = updated ? { ...nextData, ...updated } : nextData;
    setProgramaciones(prev => prev.map(p => p.id === data.id ? persisted : p));
    setData(persisted);
    notify(error ? "Solicitud enviada localmente, no guardada en BD" : "Solicitud de reprogramación enviada al responsable");
  };

  const save = async () => {
    const nextData = data.reprogramacionAutorizada ? {
      ...data,
      validada: false,
      validadoPor: null,
      fechaValidacion: null,
      reprogramacionPendiente: false,
      reprogramacionAutorizada: false,
      reprogramacionSolicitadaPor: null,
      reprogramacionSolicitadaBy: null,
      reprogramacionAprobadaBy: null,
      fechaAprobacion: null
    } : data;

    const { data: updated, error } = await supabaseUpdateRow("programaciones", data.id, nextData);
    const persisted = updated ? { ...nextData, ...updated } : nextData;
    setProgramaciones(prev => prev.map(p => p.id === data.id ? persisted : p));
    setData(persisted);
    notify(error ? "Programación actualizada localmente, no guardada en BD" : "Programación actualizada correctamente");
    setEditMode(false);
  };

  const updatePractica = (idx, field, value) => {
    setData(prev => {
      const ps = [...prev.practicas];
      if (field === "practicaId") {
        const sel = practicasCatalogo.find(x => String(x.id) === String(value) || x.id === value);
        ps[idx] = { ...ps[idx], practicaId: value, nombre: sel ? sel.nombre : ps[idx].nombre };
      } else {
        ps[idx] = { ...ps[idx], [field]: value };
      }
      return { ...prev, practicas: ps };
    });
  };

  const addPractica = () => {
    setData(prev => ({
      ...prev,
      practicas: [...prev.practicas, { id: Date.now(), numero: prev.practicas.length + 1, nombre: "", fecha: "", reprogramacion: "" }]
    }));
  };

  const removePractica = (idx) => {
    setData(prev => ({ ...prev, practicas: prev.practicas.filter((_, i) => i !== idx) }));
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem" }}>
        <button onClick={onBack} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #ddd", background: "white", cursor: "pointer", fontSize: 13, color: "#555" }}> Volver</button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{data.asignatura}</h2>
        {data.validada && <span style={{ marginLeft: "auto", fontSize: 11, background: "#C8E6C9", color: "#2E7D32", padding: "4px 10px", borderRadius: 4, fontWeight: 700 }}>✓ Validada</span>}
        {!readOnly && !editMode && <button onClick={() => setEditMode(true)} style={{ marginLeft: "auto", padding: "8px 18px", borderRadius: 8, border: "none", background: "#511013", color: "white", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Editar</button>}
        {editMode && <button onClick={save} style={{ marginLeft: "auto", padding: "8px 18px", borderRadius: 8, border: "none", background: "#E8641C", color: "white", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Guardar</button>}
      </div>

      {readOnly && (
        <Card style={{ marginBottom: "1.5rem", background: "#FFFBF7", border: "1px solid #F39200", padding: "12px 16px" }}>
          <p style={{ fontSize: 12, color: "#F39200", fontWeight: 700, margin: 0 }}>🔒 Esta programación ha sido validada</p>
          {data.reprogramacionPendiente ? (
            <p style={{ fontSize: 11, color: "#D97E15", margin: "4px 0 0" }}>
              Se ha enviado una solicitud de reprogramación al responsable. Espera su aprobación para poder editar la programación.
            </p>
          ) : (
            <p style={{ fontSize: 11, color: "#D97E15", margin: "4px 0 0" }}>Validada por <strong>{validador?.name}</strong> el {fmtDate(data.fechaValidacion)}. No se pueden realizar cambios.</p>
          )}
          {currentUser?.role === "profesor" && data.validada && !data.reprogramacionPendiente && (
            <button onClick={requestReprogramacion} style={{ marginTop: 12, padding: "8px 18px", borderRadius: 8, border: "none", background: "#F39200", color: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              Solicitar reprogramación
            </button>
          )}
        </Card>
      )}

      {data.reprogramacionAutorizada && !data.validada && (
        <Card style={{ marginBottom: "1.5rem", background: "#E8F5E9", border: "1px solid #C8E6C9", padding: "12px 16px" }}>
          <p style={{ fontSize: 12, color: "#2E7D32", fontWeight: 700, margin: 0 }}>✅ Reprogramación autorizada</p>
          <p style={{ fontSize: 11, color: "#2E7D32", margin: "4px 0 0" }}>
            El responsable ha aprobado la reprogramación. Ahora puedes editar los detalles y guardar la nueva programación.
          </p>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1.5rem" }}>
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 1rem", color: "#333" }}>Información General</h3>
          <InfoRow label="Periodo" value={data.periodo} />
          <InfoRow label="Programa Educativo" value={programa?.nombre} />
          <InfoRow label="Asignatura" value={data.asignatura} />
          <InfoRow label="Profesor" value={prof?.name} />
          <InfoRow label="Semestre / Grupo" value={`${data.semestre}  Grupo ${data.grupo}`} />
        </Card>
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 1rem", color: "#333" }}>Laboratorio y Horario</h3>
          <InfoRow label="Laboratorio" value={lab?.nombre} />
          <InfoRow label="Horario" value={`${data.dia} ${data.horaInicio}-${data.horaFin}`} />
          <InfoRow label="No. alumnos" value={data.numAlumnos} />
          <InfoRow label="No. equipos" value={data.numEquipos} />
        </Card>
      </div>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#333" }}>Tabla de Prácticas del Semestre</h3>
          {editMode && <button onClick={addPractica} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#511013", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Agregar práctica</button>}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
              <th style={{ textAlign: "center", padding: "8px 10px", color: "#888", fontWeight: 600, width: 60 }}>No.</th>
              <th style={{ textAlign: "left", padding: "8px 10px", color: "#888", fontWeight: 600 }}>Nombre de la Páctica</th>
              <th style={{ textAlign: "center", padding: "8px 10px", color: "#888", fontWeight: 600, width: 140 }}>Fecha programada</th>
              <th style={{ textAlign: "center", padding: "8px 10px", color: "#888", fontWeight: 600, width: 140 }}>Reprogramación</th>
              {editMode && <th style={{ width: 40 }}></th>}
            </tr>
          </thead>
          <tbody>
            {data.practicas.map((pr, idx) => (
              <tr key={pr.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                <td style={{ textAlign: "center", padding: "8px 10px", fontWeight: 700, color: "#511013" }}>{pr.numero}</td>
                <td style={{ padding: "8px 10px" }}>
                  {editMode ? (
                    practicasDisponibles.length ? (
                      <select value={pr.practicaId ?? ""} onChange={e => updatePractica(idx, "practicaId", e.target.value)} style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13 }}>
                        <option value="">Seleccionar práctica...</option>
                        {practicasDisponibles.map(item => {
                          const asignaturaItem = asignaturas.find(a => a.id === (item.asignaturaId ?? item.asignatura_id));
                          const programaItem = programas.find(p => p.id === (item.programaId ?? item.programa_id));
                          const label = `${item.nombre}${asignaturaItem ? ` — ${asignaturaItem.nombre}` : ""}${programaItem ? ` (${programaItem.nombre})` : ""}`;
                          return <option key={item.id} value={item.id}>{label}</option>;
                        })}
                      </select>
                    ) : (
                      <input value={pr.nombre} onChange={e => updatePractica(idx, "nombre", e.target.value)} style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13, boxSizing: "border-box" }} />
                    )
                  ) : pr.nombre}
                </td>
                <td style={{ textAlign: "center", padding: "8px 10px" }}>
                  {editMode ? <input type="date" value={pr.fecha} onChange={e => updatePractica(idx, "fecha", e.target.value)} style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13 }} /> : <span style={{ color: "#511013", fontWeight: 600 }}>{fmtDate(pr.fecha)}</span>}
                </td>
                <td style={{ textAlign: "center", padding: "8px 10px" }}>
                  {editMode ? <input type="date" value={pr.reprogramacion} onChange={e => updatePractica(idx, "reprogramacion", e.target.value)} style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13 }} /> : (pr.reprogramacion ? <span style={{ color: "#F39200", fontWeight: 600 }}>{fmtDate(pr.reprogramacion)}</span> : <span style={{ color: "#ccc" }}></span>)}
                </td>
                {editMode && <td style={{ textAlign: "center" }}><button onClick={() => removePractica(idx)} style={{ border: "none", background: "none", color: "#c0392b", cursor: "pointer", fontSize: 16 }}>×</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f5f5f5", fontSize: 13 }}>
      <span style={{ color: "#888", fontWeight: 600 }}>{label}</span>
      <span style={{ color: "#222", textAlign: "right", maxWidth: "60%" }}>{value || ""}</span>
    </div>
  );
}

function LaboratoriosAdmin({ laboratorios, setLaboratorios, users, responsableLaboratorios, setResponsableLaboratorios, notify }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const empty = { nombre: "", capacidad: "", ubicacion: "", activo: true };
  const [form, setForm] = useState(empty);
  const [showResponsablesModal, setShowResponsablesModal] = useState(null);

  const openAdd = () => { setForm(empty); setEditing(null); setShowForm(true); };
  const openEdit = (lab) => { setForm({ ...lab }); setEditing(lab.id); setShowForm(true); };
  const save = async () => {
    if (!form.nombre) return;
    if (editing) {
      const row = { ...form, id: editing };
      const { data: updated, error } = await supabaseUpdateRow("laboratorios", editing, row);
      const next = laboratorios.map(l => l.id === editing ? (updated ? { ...row, ...updated } : row) : l);
      setLaboratorios(next);
      notify(error ? "Laboratorio actualizado localmente, no guardado en BD" : "Laboratorio actualizado");
    } else {
      const { data: inserted, error } = await supabaseInsertRow("laboratorios", { ...form, activo: true });
      const created = inserted ? inserted : { ...form, id: Date.now(), activo: true };
      setLaboratorios(prev => [...prev, created]);
      notify(error ? "Laboratorio agregado localmente, no guardado en BD" : "Laboratorio agregado");
    }
    setShowForm(false);
  };
  const removeLab = async (id) => { 
    const { error: errorLab } = await supabaseDeleteRow("laboratorios", id);
    const { error: errorResp } = await supabase.from("responsable_laboratorios").delete().eq("laboratorioId", id);
    setLaboratorios(prev => prev.filter(l => l.id !== id));
    setResponsableLaboratorios(prev => prev.filter(rl => rl.laboratorioId !== id));
    notify(errorLab || errorResp ? "Laboratorio eliminado localmente, no eliminado en BD" : "Laboratorio eliminado"); 
  };

  const toggleResponsable = async (labId, responsableId) => {
    const exists = responsableLaboratorios.find(rl => rl.laboratorioId === labId && rl.responsableId === responsableId);
    if (exists) {
      // use snake_case column names when calling Supabase
      const { error } = await supabase.from("responsable_laboratorios").delete().match({ laboratorio_id: labId, responsable_id: responsableId });
      setResponsableLaboratorios(prev => prev.filter(rl => !(rl.laboratorioId === labId && rl.responsableId === responsableId)));
      if (error) {
        notify("Responsable desasignado localmente, no eliminado en BD", "error");
      } else {
        notify("Responsable desasignado correctamente", "success");
      }
    } else {
      // use snake_case column names when inserting so RLS/column mapping matches DB
      const { error } = await supabase.from("responsable_laboratorios").insert({ responsable_id: responsableId, laboratorio_id: labId });
      setResponsableLaboratorios(prev => [...prev, { responsableId, laboratorioId: labId }]);
      if (error) {
        notify("Responsable asignado localmente, no guardado en BD", "error");
      } else {
        notify("Responsable asignado correctamente", "success");
      }
    }
  };

  const responsablesDelLab = (labId) => {
    return responsableLaboratorios.filter(rl => rl.laboratorioId === labId).map(rl => users.find(u => u.id === rl.responsableId && u.role === "laboratorio")).filter(Boolean);
  };

  return (
    <div>
      <SectionHeader title="Laboratorios" subtitle={`${laboratorios.filter(l => l.activo).length} activos`}
        action={<button onClick={openAdd} style={{ padding: "10px 18px", background: "#511013", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Agregar laboratorio</button>} />
      {showForm && (
        <Card style={{ marginBottom: "1.5rem", border: "2px solid #511013" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: 16, fontWeight: 700 }}>{editing ? "Editar" : "Nuevo"} Laboratorio</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Nombre *</label>
              <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14, boxSizing: "border-box" }} /></div>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Ubicación</label>
              <input value={form.ubicacion} onChange={e => setForm(p => ({ ...p, ubicacion: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14, boxSizing: "border-box" }} /></div>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Capacidad (alumnos)</label>
              <input type="number" value={form.capacidad} onChange={e => setForm(p => ({ ...p, capacidad: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14, boxSizing: "border-box" }} /></div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={save} style={{ padding: "9px 20px", background: "#511013", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}> Guardar</button>
            <button onClick={() => setShowForm(false)} style={{ padding: "9px 20px", background: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
          </div>
        </Card>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {laboratorios.filter(lab => lab.activo).slice().sort(sortAlpha("nombre")).map(lab => (
          <Card key={lab.id} style={{ opacity: lab.activo ? 1 : 0.6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px", color: "#222" }}> {lab.nombre}</h3>
              <span style={{ fontSize: 11, background: lab.activo ? "#FBE5E5" : "#f5f5f5", color: lab.activo ? "#511013" : "#888", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>{lab.activo ? "Activo" : "Inactivo"}</span>
            </div>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 8px" }}> {lab.ubicacion}</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 12, background: "#FBE5E5", color: "#511013", padding: "3px 10px", borderRadius: 20 }}>Cap. {lab.capacidad}</span>
            </div>
            {responsablesDelLab(lab.id).length > 0 && (
              <div style={{ marginBottom: 10, padding: "8px", background: "#f9f9f9", borderRadius: 6 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#555", margin: "0 0 6px" }}>Responsables:</p>
                {responsablesDelLab(lab.id).map(r => (
                  <div key={r.id} style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>• {r.name.split(" ").slice(-2).join(" ")}</div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => openEdit(lab)} style={{ flex: 1, padding: "7px", border: "1px solid #ddd", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Editar</button>
              <button onClick={() => setShowResponsablesModal(lab.id)} style={{ flex: 1, padding: "7px", border: "1px solid #F39200", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#F39200" }}>Responsables</button>
              <button onClick={() => removeLab(lab.id)} style={{ flex: 1, padding: "7px", border: "1px solid #ddd", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#c0392b" }}>Quitar</button>
            </div>
          </Card>
        ))}
      </div>

      <Card style={{ marginTop: "1.5rem" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 1rem" }}>Matriz de Laboratorios - Responsables</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #ddd", background: "#f9f9f9" }}>Laboratorio</th>
                {users.filter(u => u.role === "laboratorio" && u.active).slice().sort((a, b) => (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" })).map(resp => (
                  <th key={resp.id} style={{ textAlign: "center", padding: "10px 12px", borderBottom: "2px solid #ddd", background: "#f9f9f9" }}>{resp.name.split(" ").slice(-2).join(" ")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {laboratorios.filter(l => l.activo).slice().sort(sortAlpha("nombre")).map(lab => (
                <tr key={lab.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "10px 12px", color: "#222", fontWeight: 600, minWidth: 240 }}>{lab.nombre}</td>
                  {users.filter(u => u.role === "laboratorio" && u.active).slice().sort((a, b) => (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" })).map(resp => {
                    const assigned = responsableLaboratorios.some(rl => rl.laboratorioId === lab.id && rl.responsableId === resp.id);
                    return (
                      <td key={resp.id} style={{ textAlign: "center", padding: "10px 12px", background: assigned ? "#E8F7E8" : "#fff", color: assigned ? "#2E7D32" : "#bbb", fontWeight: assigned ? 700 : 400 }}>
                        {assigned ? "X" : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showResponsablesModal && (
        <Card style={{ marginTop: "2rem", border: "2px solid #F39200" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: 16, fontWeight: 700 }}>Asignar Responsables a {laboratorios.find(l => l.id === showResponsablesModal)?.nombre}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {users.filter(u => u.role === "laboratorio" && u.active).slice().sort((a, b) => (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" })).map(resp => {
              const isAssigned = responsableLaboratorios.some(rl => rl.laboratorioId === showResponsablesModal && rl.responsableId === resp.id);
              return (
                <label key={resp.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px", borderRadius: 6, border: "1px solid #eee" }}>
                  <input type="checkbox" checked={isAssigned} onChange={() => toggleResponsable(showResponsablesModal, resp.id)} style={{ cursor: "pointer" }} />
                  <span style={{ fontSize: 13, color: "#333" }}>{resp.name}</span>
                </label>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={() => setShowResponsablesModal(null)} style={{ padding: "9px 20px", background: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Cerrar</button>
          </div>
        </Card>
      )}
    </div>
  );
}

function ProgramasAdmin({ programas, setProgramas, laboratorios, programaLaboratorios, setProgramaLaboratorios, notify }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [nombre, setNombre] = useState("");
  const [showLabsModal, setShowLabsModal] = useState(null);

  const openAdd = () => { setNombre(""); setEditing(null); setShowForm(true); };
  const openEdit = (p) => { setNombre(p.nombre); setEditing(p.id); setShowForm(true); };
  const save = async () => {
    if (!nombre.trim()) return;
    if (editing) {
      const row = { nombre, activo: true };
      const { data: updated, error } = await supabaseUpdateRow("programas", editing, row);
      const next = programas.map(p => p.id === editing ? (updated ? { ...p, ...updated } : { ...p, nombre }) : p);
      setProgramas(next);
      notify(error ? "Programa actualizado localmente, no guardado en BD" : "Programa actualizado");
    } else {
      const { data: inserted, error } = await supabaseInsertRow("programas", { nombre, activo: true });
      const created = inserted ? inserted : { id: Date.now(), nombre, activo: true };
      setProgramas(prev => [...prev, created]);
      notify(error ? "Programa agregado localmente, no guardado en BD" : "Programa agregado");
    }
    setShowForm(false);
  };
  const removeProg = async (id) => { 
    const { error: errorProg } = await supabaseDeleteRow("programas", id);
    const { error: errorMapping } = await supabase.from("programa_laboratorios").delete().eq("programa_id", id);
    setProgramas(prev => prev.filter(p => p.id !== id));
    setProgramaLaboratorios(prev => prev.filter(pl => pl.programaId !== id));
    notify(errorProg || errorMapping ? "Programa eliminado localmente, no eliminado en BD" : "Programa eliminado"); 
  };

  const toggleLaboratorio = async (progId, labId) => {
    const exists = programaLaboratorios.find(pl => pl.programaId === progId && pl.laboratorioId === labId);
    if (exists) {
      const { error } = await supabase.from("programa_laboratorios").delete().match({ programa_id: progId, laboratorio_id: labId });
      setProgramaLaboratorios(prev => prev.filter(pl => !(pl.programaId === progId && pl.laboratorioId === labId)));
      if (error) notify("Asignación de laboratorio removida localmente, no eliminada en BD", "error");
    } else {
      const { error } = await supabase.from("programa_laboratorios").insert({ programa_id: progId, laboratorio_id: labId });
      setProgramaLaboratorios(prev => [...prev, { programaId: progId, laboratorioId: labId }]);
      if (error) notify("Laboratorio asignado localmente, no guardado en BD", "error");
    }
  };

  const labsDelPrograma = (progId) => {
    return programaLaboratorios.filter(pl => pl.programaId === progId).map(pl => laboratorios.find(l => l.id === pl.laboratorioId)).filter(Boolean);
  };

  return (
    <div>
      <SectionHeader title="Programas Educativos" subtitle="Gestión de los programas académicos"
        action={<button onClick={openAdd} style={{ padding: "10px 18px", background: "#511013", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Agregar programa</button>} />
      {showForm && (
        <Card style={{ marginBottom: "1.5rem", border: "2px solid #511013" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: 15, fontWeight: 700 }}>{editing ? "Editar" : "Nuevo"} Programa Educativo</h3>
          <div style={{ display: "flex", gap: 10 }}>
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del programa educativo" style={{ flex: 1, padding: "9px 14px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14 }} />
            <button onClick={save} style={{ padding: "9px 20px", background: "#511013", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}> Guardar</button>
            <button onClick={() => setShowForm(false)} style={{ padding: "9px 14px", background: "#f5f5f5", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
          </div>
        </Card>
      )}
      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
              <th style={{ textAlign: "left", padding: "8px 12px", color: "#888", fontWeight: 600 }}>Programa</th>
              <th style={{ textAlign: "left", padding: "8px 12px", color: "#888", fontWeight: 600 }}>Laboratorios</th>
              <th style={{ textAlign: "center", padding: "8px 12px", color: "#888", fontWeight: 600 }}>Estado</th>
              <th style={{ textAlign: "right", padding: "8px 12px", color: "#888", fontWeight: 600 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {programas.map(p => (
              <tr key={p.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600, color: "#222" }}>{p.nombre}</td>
                <td style={{ padding: "10px 12px", fontSize: 12 }}>
                  {labsDelPrograma(p.id).length > 0 ? (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {labsDelPrograma(p.id).map(lab => (
                        <span key={lab.id} style={{ fontSize: 11, background: "#FBE5E5", color: "#511013", padding: "2px 8px", borderRadius: 4 }}>
                          {lab.nombre.replace("Laboratorio de ", "")}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: "#aaa", fontSize: 12 }}>Sin laboratorios asignados</span>
                  )}
                </td>
                <td style={{ textAlign: "center", padding: "10px 12px" }}>
                  <span style={{ fontSize: 12, background: p.activo ? "#FBE5E5" : "#f5f5f5", color: p.activo ? "#511013" : "#888", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>{p.activo ? "Activo" : "Inactivo"}</span>
                </td>
                <td style={{ textAlign: "right", padding: "10px 12px" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => openEdit(p)} style={{ padding: "5px 12px", border: "1px solid #ddd", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Editar</button>
                    <button onClick={() => setShowLabsModal(p.id)} style={{ padding: "5px 12px", border: "1px solid #F39200", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#F39200" }}>Labs</button>
                    <button onClick={() => removeProg(p.id)} style={{ padding: "5px 12px", border: "1px solid #ddd", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#c0392b" }}>Quitar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card style={{ marginTop: "1.5rem" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 1rem" }}>Matriz de asignación Programa - Laboratorio</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #ddd", background: "#f9f9f9" }}>Laboratorio</th>
                {programas.map(prog => (
                  <th key={prog.id} style={{ textAlign: "center", padding: "10px 12px", borderBottom: "2px solid #ddd", background: "#f9f9f9" }}>{prog.nombre}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {laboratorios.filter(l => l.activo).map(lab => (
                <tr key={lab.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ padding: "10px 12px", color: "#222", fontWeight: 600, minWidth: 220 }}>{lab.nombre}</td>
                  {programas.map(prog => {
                    const assigned = programaLaboratorios.some(pl => pl.programaId === prog.id && pl.laboratorioId === lab.id);
                    return (
                      <td key={prog.id} style={{ textAlign: "center", padding: "10px 12px", background: assigned ? "#E8F7E8" : "#fff", color: assigned ? "#2E7D32" : "#bbb", fontWeight: assigned ? 700 : 400 }}>
                        {assigned ? "X" : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showLabsModal && (
        <Card style={{ marginTop: "2rem", border: "2px solid #F39200" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: 16, fontWeight: 700 }}>Asignar Laboratorios a {programas.find(p => p.id === showLabsModal)?.nombre}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {laboratorios.filter(l => l.activo).map(lab => {
              const isAssigned = programaLaboratorios.some(pl => pl.programaId === showLabsModal && pl.laboratorioId === lab.id);
              return (
                <label key={lab.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px", borderRadius: 6, border: "1px solid #eee" }}>
                  <input type="checkbox" checked={isAssigned} onChange={() => toggleLaboratorio(showLabsModal, lab.id)} style={{ cursor: "pointer" }} />
                  <span style={{ fontSize: 13, color: "#333" }}>{lab.nombre}</span>
                </label>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={() => setShowLabsModal(null)} style={{ padding: "9px 20px", background: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Cerrar</button>
          </div>
        </Card>
      )}
    </div>
  );
}

function ProfesoresAdmin({ currentUser, users, setUsers, asignaturas, notify }) {
  const profes = users
    .filter(u => u.role === "profesor")
    .slice()
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es", { sensitivity: "base" }));
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyForm = { username: "", password: "", email: "", name: "", asignaturasIds: [], role: "profesor", active: true };
  const [form, setForm] = useState(emptyForm);
  const [showAsignaturasDropdown, setShowAsignaturasDropdown] = useState(false);
  const canModifyProfessors = currentUser.role === "admin";

  const openAdd = () => { setForm(emptyForm); setEditing(null); setShowForm(true); setShowAsignaturasDropdown(false); };
  const openEdit = (u) => { setForm({ username: u.username || "", password: "", email: u.email || "", name: u.name, asignaturasIds: u.asignaturasIds || [], role: "profesor", active: u.active }); setEditing(u.id); setShowForm(true); setShowAsignaturasDropdown(false); };
  const save = async () => {
    if (!form.name || !form.username || !canModifyProfessors) return;
    const nextProfesor = { ...form, id: editing || Date.now() };
    if (editing) {
      const updateRow = { username: form.username, email: form.email, name: form.name, asignaturasIds: form.asignaturasIds, role: "profesor", active: form.active };
      if (form.password) updateRow.password = form.password;
      const { data: updated, error } = await supabaseUpdateRow("profiles", editing, updateRow);
      const next = users.map(u => u.id === editing ? (updated ? { ...u, ...updated } : { ...u, ...updateRow }) : u);
      setUsers(next);
      notify(error ? "Profesor actualizado localmente, no guardado en BD" : "Profesor actualizado");
    } else {
      if (!form.password) {
        notify("La contraseña es obligatoria para crear un profesor", "error");
        return;
      }
      const { data: inserted, error } = await supabaseInsertRow("profiles", nextProfesor);
      const created = inserted ? inserted : nextProfesor;
      setUsers(prev => [...prev, created]);
      notify(error ? "Profesor agregado localmente, no guardado en BD" : "Profesor agregado");
    }
    setShowForm(false);
    setShowAsignaturasDropdown(false);
  };
  const removeUser = async (id) => { if (!canModifyProfessors) return; const { error } = await supabaseDeleteRow("profiles", id); setUsers(prev => prev.filter(u => u.id !== id)); notify(error ? "Profesor eliminado localmente, no eliminado en BD" : "Profesor eliminado"); };

  return (
    <div>
      <SectionHeader title="Gestión de Profesores" subtitle={`${profes.length} profesores registrados`}
        action={canModifyProfessors ? <button onClick={openAdd} style={{ padding: "10px 18px", background: "#511013", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Agregar profesor</button> : null} />
      {showForm && (
        <Card style={{ marginBottom: "1.5rem", border: "2px solid #511013" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: 16, fontWeight: 700 }}>{editing ? "Editar" : "Nuevo"} Profesor</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Usuario *</label>
              <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="usuario.profesor"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Correo electrónico</label>
              <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="profesor@uaeh.edu.mx"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Nombre completo *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="MC Ana López García"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Contraseña {editing ? "(dejar vacío para no cambiar)" : "*"}</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Contraseña"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={form.active} onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} />
              <label style={{ fontSize: 13, color: "#333" }}>Activo</label>
            </div>
            <div style={{ position: "relative" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Asignaturas que imparte</label>
              <button type="button" onClick={() => setShowAsignaturasDropdown(prev => !prev)}
                style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #ddd", background: "white", fontSize: 14, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{form.asignaturasIds.length > 0 ? asignaturas.filter(a => form.asignaturasIds.includes(a.id)).map(a => a.nombre).join(", ") : "Selecciona una o varias asignaturas"}</span>
                <span style={{ fontSize: 12, color: "#666" }}>{showAsignaturasDropdown ? "▲" : "▼"}</span>
              </button>
              {showAsignaturasDropdown && (
                <div style={{ position: "absolute", top: 64, left: 0, width: "100%", maxHeight: 220, overflowY: "auto", background: "white", border: "1px solid #ddd", borderRadius: 8, boxShadow: "0 12px 25px rgba(0,0,0,0.08)", zIndex: 10 }}>
                  {asignaturas
                    .filter(a => a.activo)
                    .slice()
                    .sort(sortAlpha("nombre"))
                    .map(a => (
                    <label key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid #f4f4f4" }}>
                      <input type="checkbox" checked={form.asignaturasIds.includes(a.id)}
                        onChange={() => {
                          const selected = form.asignaturasIds.includes(a.id)
                            ? form.asignaturasIds.filter(id => id !== a.id)
                            : [...form.asignaturasIds, a.id];
                          setForm(p => ({ ...p, asignaturasIds: selected }));
                        }}
                        style={{ cursor: "pointer" }} />
                      <span style={{ fontSize: 14, color: "#333" }}>{a.nombre}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={save} style={{ padding: "9px 20px", background: "#511013", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}> Guardar</button>
            <button onClick={() => { setShowForm(false); setShowAsignaturasDropdown(false); }} style={{ padding: "9px 20px", background: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
          </div>
        </Card>
      )}
      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
              {["Nombre", "Asignaturas", "Estado", "Acciones"].map(h => <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "#888", fontWeight: 600 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {profes.map(u => {
              const asignaturasNombres = (u.asignaturasIds || []).map(id => asignaturas.find(a => a.id === id)?.nombre).filter(Boolean);
              return (
                <tr key={u.id} style={{ borderBottom: "1px solid #f5f5f5", opacity: u.active ? 1 : 0.55 }}>
                  <td style={{ padding: "10px 10px" }}>{u.name}</td>
                  <td style={{ padding: "10px 10px", color: "#555" }}>{asignaturasNombres.length ? asignaturasNombres.join(", ") : "Sin asignaturas"}</td>
                  <td style={{ padding: "10px 10px" }}><span style={{ fontSize: 11, background: u.active ? "#FBE5E5" : "#f5f5f5", color: u.active ? "#511013" : "#888", padding: "3px 8px", borderRadius: 20, fontWeight: 700 }}>{u.active ? "Activo" : "Inactivo"}</span></td>
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {canModifyProfessors && <button onClick={() => openEdit(u)} style={{ padding: "4px 10px", border: "1px solid #ddd", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Editar</button>}
                      {canModifyProfessors && <button onClick={() => removeUser(u.id)} style={{ padding: "4px 10px", border: "1px solid #ddd", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#c0392b" }}>Quitar</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function AsignaturasAdmin({ currentUser, asignaturas, setAsignaturas, programas, notify }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyForm = { nombre: "", programaId: "", activo: true };
  const [form, setForm] = useState(emptyForm);
  const visibleAsignaturas = asignaturas
    .slice()
    .sort(sortAlpha("nombre"));

  const canDeleteAsignatura = (a) => true;
  const canModifyAsignatura = (a) => true;
  const openAdd = () => { setForm(emptyForm); setEditing(null); setShowForm(true); };
  const openEdit = (a) => {
    if (!canModifyAsignatura(a)) return;
    setForm({ ...a, programaId: a.programaId ?? a.programa_id ?? "" });
    setEditing(a.id);
    setShowForm(true);
  };
  const save = async () => {
    if (!form.nombre || !form.programaId) return;
    const programaId = Number(form.programaId) || null;
    const nextAsignatura = {
      ...form,
      programaId,
    };

    if (editing) {
      const { data: updated, error } = await supabaseUpdateRow("asignaturas", editing, nextAsignatura);
      const next = asignaturas.map(a => a.id === editing ? { ...a, ...nextAsignatura, id: editing, ...(updated || {}) } : a);
      setAsignaturas(next);
      notify(error ? `Asignatura actualizada: ${error.message || "Error BD"}` : "Asignatura actualizada", error ? "error" : "success");
    } else {
      const { data: inserted, error } = await supabaseInsertRow("asignaturas", {
        ...nextAsignatura,
        createdById: currentUser.role === "laboratorio" ? currentUser.id : null,
      });
      const createdRow = inserted ? { ...inserted } : { ...nextAsignatura, createdById: currentUser.role === "laboratorio" ? currentUser.id : null, id: Date.now() };
      const next = [...asignaturas, createdRow];
      setAsignaturas(next);
      notify(error ? `Asignatura agregada: ${error.message || "Error BD"}` : "Asignatura agregada", error ? "error" : "success");
    }
    setShowForm(false);
  };
  const removeAsignatura = async (id) => {
    const target = asignaturas.find(a => a.id === id);
    if (!canDeleteAsignatura(target)) return;
    const { error } = await supabase.from("asignaturas").delete().eq("id", id);
    const next = asignaturas.filter(a => a.id !== id);
    setAsignaturas(next);
    notify(error ? `Asignatura eliminada: ${error.message || "Error BD"}` : "Asignatura eliminada", error ? "error" : "success");
  };

  return (
    <div>
      <SectionHeader title="Gestión de Asignaturas" subtitle={`${visibleAsignaturas.filter(a => a.activo).length} asignaturas activas`}
        action={<button onClick={openAdd} style={{ padding: "10px 18px", background: "#511013", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Agregar asignatura</button>} />
      {showForm && (
        <Card style={{ marginBottom: "1.5rem", border: "2px solid #511013" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: 16, fontWeight: 700 }}>{editing ? "Editar" : "Nueva"} Asignatura</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Nombre *</label>
              <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Programa *</label>
              <select value={form.programaId} onChange={e => setForm(p => ({ ...p, programaId: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14 }}>
                <option value="">Seleccionar programa...</option>
                {programas.filter(p => p.activo).slice().sort(sortAlpha("nombre")).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={save} style={{ padding: "9px 20px", background: "#511013", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}> Guardar</button>
            <button onClick={() => setShowForm(false)} style={{ padding: "9px 20px", background: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
          </div>
        </Card>
      )}
      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
              {["Asignatura", "Programa", "Estado", "Acciones"].map(h => <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "#888", fontWeight: 600 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {visibleAsignaturas.map(a => {
              const programaIdValue = a.programaId ?? a.programa_id;
              const programa = programas.find(p => p.id === Number(programaIdValue));
              return (
                <tr key={a.id} style={{ borderBottom: "1px solid #f5f5f5", opacity: a.activo ? 1 : 0.55 }}>
                  <td style={{ padding: "10px 10px" }}>{a.nombre}</td>
                  <td style={{ padding: "10px 10px", color: "#555" }}>{programa?.nombre || "Sin programa"}</td>
                  <td style={{ padding: "10px 10px" }}><span style={{ fontSize: 11, background: a.activo ? "#FBE5E5" : "#f5f5f5", color: a.activo ? "#511013" : "#888", padding: "3px 8px", borderRadius: 20, fontWeight: 700 }}>{a.activo ? "Activo" : "Inactivo"}</span></td>
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {canModifyAsignatura(a) && <button onClick={() => openEdit(a)} style={{ padding: "4px 10px", border: "1px solid #ddd", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Editar</button>}
                      {canDeleteAsignatura(a) && <button onClick={() => removeAsignatura(a.id)} style={{ padding: "4px 10px", border: "1px solid #ddd", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#c0392b" }}>Quitar</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function PracticasAdmin({ currentUser, practicasCatalogo, setPracticasCatalogo, programas, asignaturas, notify }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyForm = { nombre: "", programaId: "", asignaturaId: "", activo: true };
  const [form, setForm] = useState(emptyForm);
  const visiblePracticas = (currentUser.role === "laboratorio"
    ? practicasCatalogo.filter(p => p.createdById === currentUser.id)
    : practicasCatalogo)
    .slice()
    .sort((a, b) => {
      const programaA = programas.find(pg => pg.id === parseInt(a.programaId, 10))?.nombre || "";
      const programaB = programas.find(pg => pg.id === parseInt(b.programaId, 10))?.nombre || "";
      const cmpPrograma = String(programaA).localeCompare(String(programaB), "es", { sensitivity: "base" });
      if (cmpPrograma !== 0) return cmpPrograma;
      const asignaturaA = asignaturas.find(x => x.id === parseInt(a.asignaturaId, 10))?.nombre || "";
      const asignaturaB = asignaturas.find(x => x.id === parseInt(b.asignaturaId, 10))?.nombre || "";
      const cmpAsignatura = String(asignaturaA).localeCompare(String(asignaturaB), "es", { sensitivity: "base" });
      if (cmpAsignatura !== 0) return cmpAsignatura;
      return String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", { sensitivity: "base", numeric: true });
    });

  const canModifyPractica = (p) => true;
  const asignaturasPorPrograma = (form.programaId
    ? asignaturas.filter(a => parseInt(a.programaId ?? a.programa_id, 10) === parseInt(form.programaId, 10))
    : asignaturas
  ).slice().sort(sortAlpha("nombre"));

  const openAdd = () => { setForm(emptyForm); setEditing(null); setShowForm(true); };
  const openEdit = (p) => {
    if (!canModifyPractica(p)) return;
    setForm({
      ...p,
      programaId: (p.programaId ?? p.programa_id) ? parseInt(p.programaId ?? p.programa_id, 10) : "",
      asignaturaId: (p.asignaturaId ?? p.asignatura_id) ? parseInt(p.asignaturaId ?? p.asignatura_id, 10) : "",
    });
    setEditing(p.id);
    setShowForm(true);
  };
  const save = async () => {
    if (!form.nombre || !form.programaId || !form.asignaturaId) return;
    const programaId = typeof form.programaId === "string" ? parseInt(form.programaId, 10) : form.programaId;
    const asignaturaId = typeof form.asignaturaId === "string" ? parseInt(form.asignaturaId, 10) : form.asignaturaId;
    const nextPractica = {
      ...form,
      programaId,
      asignaturaId,
    };

    if (editing) {
      const { data: updated, error } = await supabaseUpdateRow("practicas", editing, nextPractica);

      const next = practicasCatalogo.map(p => p.id === editing ? { ...nextPractica, id: editing, ...(updated || {}) } : p);
      setPracticasCatalogo(next);
      notify(error ? `Práctica actualizada: ${error.message || "Error BD"}` : "Práctica actualizada", error ? "error" : "success");
    } else {
      const { data: inserted, error } = await supabaseInsertRow("practicas", {
        ...nextPractica,
        createdById: currentUser.role === "laboratorio" ? currentUser.id : null,
      });

      const createdRow = inserted ? { ...inserted } : { ...nextPractica, createdById: currentUser.role === "laboratorio" ? currentUser.id : null, id: Date.now() };
      const next = [...practicasCatalogo, createdRow];
      setPracticasCatalogo(next);
      notify(error ? `Práctica agregada: ${error.message || "Error BD"}` : "Práctica agregada", error ? "error" : "success");
    }
    setShowForm(false);
  };
  const removePractica = async (id) => {
    const target = practicasCatalogo.find(p => p.id === id);
    if (currentUser.role === "laboratorio" && target?.createdById && target.createdById !== currentUser.id) return;
    const { error } = await supabase.from("practicas").delete().eq("id", id);
    const next = practicasCatalogo.filter(p => p.id !== id);
    setPracticasCatalogo(next);
    notify(error ? `Práctica eliminada: ${error.message || "Error BD"}` : "Práctica eliminada", error ? "error" : "success");
  };

  return (
    <div>
      <SectionHeader title="Gestión de Prácticas" subtitle={`${visiblePracticas.filter(p => p.activo).length} prácticas activas`}
        action={<button onClick={openAdd} style={{ padding: "10px 18px", background: "#511013", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Agregar práctica</button>} />
      {showForm && (
        <Card style={{ marginBottom: "1.5rem", border: "2px solid #511013" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: 16, fontWeight: 700 }}>{editing ? "Editar" : "Nueva"} Práctica</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Nombre *</label>
              <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Programa *</label>
              <select value={form.programaId} onChange={e => setForm(p => ({ ...p, programaId: parseInt(e.target.value, 10) || "", asignaturaId: "" }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14 }}>
                <option value="">Seleccionar programa...</option>
                {programas.filter(p => p.activo).slice().sort(sortAlpha("nombre")).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Asignatura *</label>
              <select value={form.asignaturaId} onChange={e => setForm(p => ({ ...p, asignaturaId: parseInt(e.target.value, 10) || "" }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14 }}>
                <option value="">Seleccionar asignatura...</option>
                {asignaturasPorPrograma.filter(a => a.activo).map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={save} style={{ padding: "9px 20px", background: "#511013", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}> Guardar</button>
            <button onClick={() => setShowForm(false)} style={{ padding: "9px 20px", background: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
          </div>
        </Card>
      )}
      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
              {["Práctica", "Programa", "Asignatura", "Estado", "Acciones"].map(h => <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "#888", fontWeight: 600 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {visiblePracticas.map(p => {
              const programa = programas.find(pg => pg.id === parseInt(p.programaId, 10));
              const asignatura = asignaturas.find(a => a.id === parseInt(p.asignaturaId, 10));
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid #f5f5f5", opacity: p.activo ? 1 : 0.55 }}>
                  <td style={{ padding: "10px 10px" }}>{p.nombre}</td>
                  <td style={{ padding: "10px 10px", color: "#555" }}>{programa?.nombre || "Sin programa"}</td>
                  <td style={{ padding: "10px 10px", color: "#555" }}>{asignatura?.nombre || "Sin asignatura"}</td>
                  <td style={{ padding: "10px 10px" }}><span style={{ fontSize: 11, background: p.activo ? "#FBE5E5" : "#f5f5f5", color: p.activo ? "#511013" : "#888", padding: "3px 8px", borderRadius: 20, fontWeight: 700 }}>{p.activo ? "Activo" : "Inactivo"}</span></td>
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {canModifyPractica(p) && <button onClick={() => openEdit(p)} style={{ padding: "4px 10px", border: "1px solid #ddd", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Editar</button>}
                      {canModifyPractica(p) && <button onClick={() => removePractica(p.id)} style={{ padding: "4px 10px", border: "1px solid #ddd", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#c0392b" }}>Quitar</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function UsuariosAdmin({ users, setUsers, notify }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyForm = { name: "", username: "", email: "", password: "", role: "profesor", active: true };
  const [form, setForm] = useState(emptyForm);

  const openAdd = () => { setForm(emptyForm); setEditing(null); setShowForm(true); };
  const openEdit = (u) => { setForm({ ...u }); setEditing(u.id); setShowForm(true); };
  const save = async () => {
    if (!form.name || !form.username) return;
    const row = { ...form, id: editing || Date.now() };
    if (editing) {
      const { data: updated, error } = await supabaseUpdateRow("profiles", editing, row);
      const next = users.map(u => u.id === editing ? (updated ? { ...u, ...updated } : row) : u);
      setUsers(next);
      notify(error ? "Usuario actualizado localmente, no guardado en BD" : "Usuario actualizado");
    } else {
      const { data: inserted, error } = await supabaseInsertRow("profiles", row);
      const created = inserted ? inserted : row;
      setUsers(prev => [...prev, created]);
      notify(error ? "Usuario creado localmente, no guardado en BD" : "Usuario creado");
    }
    setShowForm(false);
  };
  const removeUser = async (id) => { 
    const { error } = await supabaseDeleteRow("profiles", id);
    setUsers(prev => prev.filter(u => u.id !== id)); 
    notify(error ? "Usuario eliminado localmente, no eliminado en BD" : "Usuario eliminado"); 
  };

  return (
    <div>
      <SectionHeader title="Gestión de Usuarios" subtitle={`${users.filter(u => u.active).length} usuarios activos`}
        action={<button onClick={openAdd} style={{ padding: "10px 18px", background: "#511013", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Agregar usuario</button>} />
      {showForm && (
        <Card style={{ marginBottom: "1.5rem", border: "2px solid #511013" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: 16, fontWeight: 700 }}>{editing ? "Editar" : "Nuevo"} Usuario</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[["Nombre completo *", "name", "text", "MC Ana López García"],["Usuario *", "username", "text", "ana.lopez"],["Correo electrónico", "email", "email", "ana@uaeh.edu.mx"],["Contraseña", "password", "password", editing ? "(sin cambios)" : ""]].map(([lbl, key, type, ph]) => (
              <div key={key}><label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>{lbl}</label>
                <input type={type} value={form[key]} placeholder={ph} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14, boxSizing: "border-box" }} /></div>
            ))}
            <div><label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Rol *</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14 }}>
                <option value="admin">Administrador</option>
                <option value="profesor">Profesor</option>
                <option value="laboratorio">Responsable de Laboratorio</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={save} style={{ padding: "9px 20px", background: "#511013", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}> Guardar</button>
            <button onClick={() => setShowForm(false)} style={{ padding: "9px 20px", background: "#f5f5f5", color: "#555", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer" }}>Cancelar</button>
          </div>
        </Card>
      )}
      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
              {["Nombre", "Usuario", "Rol", "Estado", "Acciones"].map(h => <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "#888", fontWeight: 600 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const rc2 = colors[u.role];
              return (
                <tr key={u.id} style={{ borderBottom: "1px solid #f5f5f5", opacity: u.active ? 1 : 0.55 }}>
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: rc2.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: rc2.text, flexShrink: 0 }}>
                        {u.name.split(" ").slice(0,2).map(n => n[0]).join("")}
                      </div>
                      <span style={{ fontWeight: 600, color: "#222" }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 10px", color: "#555", fontFamily: "monospace" }}>{u.username}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <span style={{ fontSize: 11, background: rc2.bg, color: rc2.text, padding: "3px 8px", borderRadius: 20, fontWeight: 700 }}>{{ admin: "Admin", profesor: "Profesor", laboratorio: "Resp. Lab" }[u.role]}</span>
                  </td>
                  <td style={{ padding: "10px 10px" }}>
                    <span style={{ fontSize: 11, background: u.active ? "#FBE5E5" : "#f5f5f5", color: u.active ? "#511013" : "#888", padding: "3px 8px", borderRadius: 20, fontWeight: 700 }}>{u.active ? "Activo" : "Inactivo"}</span>
                  </td>
                  <td style={{ padding: "10px 10px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(u)} style={{ padding: "4px 10px", border: "1px solid #ddd", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Editar</button>
                      <button onClick={() => removeUser(u.id)} style={{ padding: "4px 10px", border: "1px solid #ddd", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#c0392b" }}>Quitar</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function detectConflictos(programaciones, laboratorios) {
  const conflictos = [];
  for (let i = 0; i < programaciones.length; i++) {
    for (let j = i + 1; j < programaciones.length; j++) {
      const a = programaciones[i], b = programaciones[j];
      if (a.laboratorioId !== b.laboratorioId || a.dia !== b.dia) continue;
      const startA = a.horaInicio, endA = a.horaFin, startB = b.horaInicio, endB = b.horaFin;
      if (startA < endB && startB < endA) {
        conflictos.push({ a, b, lab: laboratorios.find(l => l.id === a.laboratorioId) });
      }
    }
  }
  return conflictos;
}

function ConflictosSection({ programaciones, laboratorios, users, currentUser, responsableLaboratorios }) {
  const [selectedLab, setSelectedLab] = useState(null);
  const todos = detectConflictos(programaciones, laboratorios);
  const misLabs = currentUser.role === "laboratorio"
    ? responsableLaboratorios.filter(rl => rl.responsableId === currentUser.id).map(rl => rl.laboratorioId)
    : [];
  const availableLabs = laboratorios.filter(l => misLabs.includes(l.id));
  const misProg = currentUser.role === "laboratorio"
    ? programaciones.filter(p => misLabs.includes(p.laboratorioId))
    : [];
  const filteredProg = currentUser.role === "laboratorio"
    ? misProg.filter(p => !selectedLab || p.laboratorioId === selectedLab)
        .slice()
        .sort((a, b) => {
          const labA = laboratorios.find(l => l.id === a.laboratorioId)?.nombre || "";
          const labB = laboratorios.find(l => l.id === b.laboratorioId)?.nombre || "";
          if (labA !== labB) return labA.localeCompare(labB, "es");
          if (a.dia !== b.dia) return a.dia.localeCompare(b.dia, "es");
          return a.horaInicio.localeCompare(b.horaInicio);
        })
    : [];
  
  let conflictos = todos;
  if (currentUser.role === "laboratorio") {
    conflictos = todos.filter(c => misLabs.includes(c.a.laboratorioId) || misLabs.includes(c.b.laboratorioId));
  }

  const dayOrder = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
  const groupedByDay = filteredProg.reduce((acc, prog) => {
    const day = prog.dia || "Sin día";
    acc[day] = acc[day] || [];
    acc[day].push(prog);
    return acc;
  }, {});
  const sortedDays = dayOrder.filter(day => groupedByDay[day] && groupedByDay[day].length > 0);
  const [selectedDay, setSelectedDay] = useState(sortedDays[0] || "");

  useEffect(() => {
    if (!selectedDay || !groupedByDay[selectedDay]) {
      setSelectedDay(sortedDays[0] || "");
    }
  }, [sortedDays, selectedDay]);

  const subtitle = currentUser.role === "laboratorio"
    ? `${misProg.length} programaci${misProg.length === 1 ? "ón" : "ones"} asignada(s)`
    : `${conflictos.length} práctica(s) programada(s)`;

  return (
    <div>
      <SectionHeader title="Horario de Prácticas" subtitle={subtitle} />
      {currentUser.role === "laboratorio" && availableLabs.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontWeight: 700, color: "#511013" }}>Filtrar por laboratorio:</div>
            <select value={selectedLab || ""} onChange={e => setSelectedLab(e.target.value ? Number(e.target.value) : null)}
              style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", minWidth: 220 }}>
              <option value="">Todos los laboratorios</option>
              {availableLabs.map(lab => (
                <option key={lab.id} value={lab.id}>{lab.nombre}</option>
              ))}
            </select>
          </div>
        </Card>
      )}
      {conflictos.length === 0 ? (
        <>
          <Card><div style={{ textAlign: "center", padding: "3rem", color: "#511013" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}></div>
            <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>No hay conflictos de horario</p>
            <p style={{ fontSize: 14, color: "#888", margin: "8px 0 0" }}>Revisa los días y horarios asignados a tus prácticas.</p>
          </div></Card>
          {currentUser.role === "laboratorio" && filteredProg.length > 0 && (
            <>
              <Card style={{ marginBottom: 16, overflowX: "auto" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {dayOrder.map(day => (
                    <button key={day} onClick={() => setSelectedDay(day)}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: 999,
                        padding: "8px 16px",
                        background: selectedDay === day ? "#511013" : "white",
                        color: selectedDay === day ? "white" : "#333",
                        cursor: groupedByDay[day] ? "pointer" : "not-allowed",
                        opacity: groupedByDay[day] ? 1 : 0.35,
                        minWidth: 100,
                        textAlign: "center"
                      }}
                      disabled={!groupedByDay[day]}
                    >{day}</button>
                  ))}
                </div>
              </Card>
              {selectedDay ? (
                <Card>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 1rem", color: "#333" }}>{selectedDay}</h3>
                  <div style={{ display: "grid", gap: 10 }}>
                    {groupedByDay[selectedDay]?.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)).map(prog => {
                      const lab = laboratorios.find(l => l.id === prog.laboratorioId);
                      return (
                        <div key={prog.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, padding: 14, borderRadius: 10, background: "#fafafa", border: "1px solid #ececec" }}>
                          <div>
                            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Laboratorio</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>{lab?.nombre || "Sin laboratorio"}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Asignatura</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>{prog.asignatura}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Horario</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#333" }}>{prog.horaInicio} - {prog.horaFin}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ) : (
                <Card><p style={{ margin: 0, color: "#777" }}>Selecciona un día con programaciones para ver el horario.</p></Card>
              )}
            </>
          )}
        </>
      ) : conflictos.map((c, i) => {
        const profA = users.find(u => u.id === c.a.profesorId);
        const profB = users.find(u => u.id === c.b.profesorId);
        return (
          <Card key={i} style={{ borderLeft: "4px solid #E24B4A", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#A32D2D" }}>Conflicto en {c.lab?.nombre}</h3>
              <span style={{ fontSize: 12, background: "#FCEBEB", color: "#A32D2D", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>Solapamiento de horario</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center" }}>
              <div style={{ background: "#f8f9fa", borderRadius: 8, padding: "10px 14px" }}>
                <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>{c.a.asignatura}  Grupo {c.a.grupo}</p>
                <p style={{ fontSize: 12, color: "#666", margin: 0 }}>{profA?.name.split(" ").slice(-2).join(" ")}</p>
                <p style={{ fontSize: 12, color: "#511013", fontWeight: 600, margin: "4px 0 0" }}>{c.a.dia} {c.a.horaInicio}{c.a.horaFin}</p>
              </div>
              <div style={{ textAlign: "center", fontSize: 20 }}></div>
              <div style={{ background: "#f8f9fa", borderRadius: 8, padding: "10px 14px" }}>
                <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>{c.b.asignatura}  Grupo {c.b.grupo}</p>
                <p style={{ fontSize: 12, color: "#666", margin: 0 }}>{profB?.name.split(" ").slice(-2).join(" ")}</p>
                <p style={{ fontSize: 12, color: "#511013", fontWeight: 600, margin: "4px 0 0" }}>{c.b.dia} {c.b.horaInicio}{c.b.horaFin}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function MisProgramaciones({ currentUser, users, programaciones, setProgramaciones, laboratorios, programas, notify, setActiveSection, responsableLaboratorios, asignaturas = [], practicasCatalogo = [] }) {
  const [selected, setSelected] = useState(null);
  const safeProgramaciones = Array.isArray(programaciones) ? programaciones : [];
  const misProg = safeProgramaciones.filter(p => String(p.profesorId) === String(currentUser.id));

  const deleteProg = async (id) => {
    const prog = programaciones.find(p => p.id === id);
    if (prog?.validada) {
      notify("No puedes eliminar una programación validada", "error");
      return;
    }
    // Try delete normally, then with Number(id) and String(id) as fallback for type issues
    let deletedResp = null;
    let deleteErr = null;
    const tryDelete = async (delId) => {
      const resp = await supabaseDeleteRow("programaciones", delId);
      return resp;
    };
    // first attempt
    ({ data: deletedResp, error: deleteErr } = await tryDelete(id));
    console.log("supabase.delete response for programaciones", { id, deleted: deletedResp, error: deleteErr });
    if ((!deletedResp || (Array.isArray(deletedResp) && deletedResp.length === 0)) && !deleteErr) {
      // try Number(id)
      try {
        const n = Number(id);
        if (!Number.isNaN(n)) {
          const r2 = await tryDelete(n);
          deletedResp = r2.data; deleteErr = r2.error;
          console.log("supabase.delete retry with Number(id)", { n, deleted: deletedResp, error: deleteErr });
        }
      } catch (e) { console.warn("retry Number delete failed", e); }
    }
    if ((!deletedResp || (Array.isArray(deletedResp) && deletedResp.length === 0)) && !deleteErr) {
      // try String(id)
      try {
        const s = String(id);
        const r3 = await tryDelete(s);
        deletedResp = r3.data; deleteErr = r3.error;
        console.log("supabase.delete retry with String(id)", { s, deleted: deletedResp, error: deleteErr });
      } catch (e) { console.warn("retry String delete failed", e); }
    }
    const deleted = deletedResp;
    const error = deleteErr;
    // Always verify the record is gone from DB
    try {
      const { data: still, error: checkErr } = await supabase.from("programaciones").select("id").eq("id", id).maybeSingle();
      if (checkErr) {
        notify(`Error al verificar eliminación: ${checkErr.message || 'error desconocido'}`, "error");
        console.error("Error checking programacion after delete attempt:", checkErr);
        return;
      }
      if (still) {
        // Record still exists in DB
        notify(`No se pudo eliminar la programación en la BD. Sigue presente (id=${id}). Revisa permisos/RLS.`, "error");
        console.warn("Programacion still exists after delete attempt:", still, { deleted, error });
        return;
      }
      // Not found => deletion persisted
      setProgramaciones(prev => prev.filter(p => p.id !== id));
      notify("Programación eliminada");
    } catch (ex) {
      notify("Error al verificar eliminación en BD", "error");
      console.error("Exception while verifying delete:", ex);
    }
  };

  const selectedProg = selected ? safeProgramaciones.find(p => String(p.id) === String(selected)) : null;
  if (selected) {
    if (!selectedProg) {
      return (
        <div>
          <SectionHeader title="Mis Programaciones" subtitle="Programación no encontrada" />
          <Card><p style={{ color: "#777", textAlign: "center", padding: "2rem" }}>La programación seleccionada ya no está disponible.</p></Card>
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <button onClick={() => setSelected(null)} style={{ padding: "10px 18px", background: "#511013", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>Volver</button>
          </div>
        </div>
      );
    }
    return <ProgramacionDetail prog={selectedProg} users={users} laboratorios={laboratorios} programas={programas} onBack={() => setSelected(null)} setProgramaciones={setProgramaciones} programaciones={safeProgramaciones} notify={notify} readOnly={selectedProg.validada} currentUser={currentUser} practicasCatalogo={practicasCatalogo} asignaturas={asignaturas} />;
  }

  return (
    <div>
      <SectionHeader title="Mis Programaciones" subtitle={`${misProg.length} programaciones registradas`}
        action={<button onClick={() => setActiveSection("nueva-programacion")} style={{ padding: "10px 18px", background: "#511013", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>+ Nueva programación</button>} />
      {misProg.length === 0 ? (
        <Card><p style={{ color: "#aaa", textAlign: "center", padding: "2rem" }}>Aún no tienes programaciones registradas.</p></Card>
      ) : (
        <div>
          <Card style={{ marginBottom: "1.5rem", background: "#FFEEDD", border: "1px solid #E8641C" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ fontSize: 20, color: "#E8641C", fontWeight: 700 }}>ℹ</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#E8641C", margin: "0 0 4px" }}>Estado de Validación de Programaciones</p>
                <p style={{ fontSize: 12, color: "#D97E15", margin: "0 0 6px", lineHeight: 1.4 }}>
                  El responsable del laboratorio debe validar cada una de tus programaciones usando su usuario y contraseña como firma digital.
                </p>
                <p style={{ fontSize: 12, color: "#D97E15", margin: 0, lineHeight: 1.4 }}>
                  <strong>Importante:</strong> Una vez que el responsable valide tu programación, no podrá ser modificada. Si necesitas cambios, contacta al responsable del laboratorio.
                </p>
              </div>
            </div>
          </Card>
          {misProg.map(p => {
            const lab = laboratorios.find(l => l.id === p.laboratorioId);
            const practicas = Array.isArray(p.practicas) ? p.practicas : [];
            return (
              <Card key={p.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>{p.asignatura}</h3>
                    <p style={{ fontSize: 13, color: "#666", margin: "0 0 8px" }}>{p.periodo}  Semestre {p.semestre}  Grupo {p.grupo}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <span style={{ fontSize: 12, background: "#FBE5E5", color: "#511013", padding: "3px 10px", borderRadius: 20 }}>{lab?.nombre}</span>
                      <span style={{ fontSize: 12, background: "#FFF4E8", color: "#575756", padding: "3px 10px", borderRadius: 20 }}>{p.dia} {p.horaInicio}-{p.horaFin}</span>
                      <span style={{ fontSize: 12, background: "#f5f5f5", color: "#555", padding: "3px 10px", borderRadius: 20 }}>{p.numAlumnos} alumnos  {p.numEquipos} equipos</span>
                      {p.validada && (
                        <span style={{ fontSize: 12, background: "#C8E6C9", color: "#2E7D32", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>✓ Validada</span>
                      )}
                      {!p.validada && (
                        <span style={{ fontSize: 12, background: "#FFF4E8", color: "#F39200", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>⏳ Pendiente</span>
                      )}
                      {p.reprogramacionPendiente && (
                        <span style={{ fontSize: 12, background: "#FFF4E8", color: "#E8641C", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>🔔 Solicitud en revisión</span>
                      )}
                      {p.reprogramacionAutorizada && !p.validada && (
                        <span style={{ fontSize: 12, background: "#C8E6C9", color: "#2E7D32", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>✅ Reprogramación autorizada</span>
                      )}
                      {p.reprogramacionPendiente && (
                        <span style={{ fontSize: 12, background: "#FFF4E8", color: "#E8641C", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>🔔 Solicitud en revisión</span>
                      )}
                      {p.reprogramacionAutorizada && !p.validada && (
                        <span style={{ fontSize: 12, background: "#C8E6C9", color: "#2E7D32", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>✅ Reprogramación autorizada</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#511013" }}>{practicas.length}</div>
                    <div style={{ fontSize: 11, color: "#aaa", marginBottom: 10 }}>prácticas</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setSelected(p.id)} style={{ padding: "6px 14px", border: "1px solid #511013", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 12, color: "#511013", fontWeight: 600 }}>Ver{!p.validada && "/Editar"}</button>
                      {!p.validada && (
                        <button onClick={() => deleteProg(p.id)} style={{ padding: "6px 10px", border: "1px solid #e8e8e8", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 12, color: "#c0392b" }}>Eliminar</button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NuevaProgramacion({ currentUser, programaciones, setProgramaciones, laboratorios, programas, programaLaboratorios, responsableLaboratorios, users, asignaturas, practicasCatalogo, notify, setActiveSection }) {
  const [step, setStep] = useState(1);
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({
    periodoTipo: "Enero - Junio", periodoYear: String(currentYear), programaId: "", asignaturaId: "", asignatura: "", semestre: "1", grupo: "1",
    laboratorioId: "", dia: "Lunes", horaInicio: "08:00", horaFin: "10:00",
    numAlumnos: 30, numEquipos: 6
  });
  const [practicas, setPracticas] = useState([]);
  const [conflicto, setConflicto] = useState(null);

  const asignaturasDisponibles = (form.programaId
    ? asignaturas.filter(a => {
        const programaIdValue = a.programaId ?? a.programa_id;
        return Number(programaIdValue) === parseInt(form.programaId, 10) && a.activo;
      })
    : asignaturas.filter(a => a.activo)
  ).slice().sort(sortAlpha("nombre"));

  const selectedProgramaId = form.programaId ? parseInt(form.programaId, 10) : null;
  const selectedAsignaturaId = form.asignaturaId ? parseInt(form.asignaturaId, 10) : null;
  const selectedPrograma = programas.find(p => p.id === selectedProgramaId);
  const selectedAsignatura = asignaturas.find(a => a.id === selectedAsignaturaId);

  // Filtrar prácticas por programa + asignatura (priorizando materia y programa, no laboratorio)
  const practicasDisponibles = (selectedProgramaId && selectedAsignaturaId
    ? practicasCatalogo.filter(p => {
        const practicaAsignaturaId = Number(p.asignaturaId ?? p.asignatura_id);
        const practicaProgramaId = Number(p.programaId ?? p.programa_id);
        return practicaAsignaturaId === selectedAsignaturaId && p.activo && practicaProgramaId === selectedProgramaId;
      })
    : []
  ).slice().sort(sortAlpha("nombre"));

  const checkConflicto = () => {
    if (!form.laboratorioId || !form.dia) return;
    const conflictante = programaciones.find(p =>
      p.laboratorioId === parseInt(form.laboratorioId) && p.dia === form.dia &&
      form.horaInicio < p.horaFin && p.horaInicio < form.horaFin
    );
    setConflicto(conflictante || null);
  };

  useEffect(() => { checkConflicto(); }, [form.laboratorioId, form.dia, form.horaInicio, form.horaFin]);
  useEffect(() => { setPracticas([]); }, [form.laboratorioId, form.asignaturaId]);

  const addPractica = () => {
    setPracticas(prev => [...prev, { id: Date.now(), numero: prev.length + 1, practicaId: "", nombre: "", fecha: "", reprogramacion: "" }]);
  };

  const updatePracticaRow = (idx, field, value) => {
    setPracticas(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "practicaId") {
        const practicaSeleccionada = practicasCatalogo.find(p => p.id === parseInt(value));
        next[idx].nombre = practicaSeleccionada?.nombre || "";
      }
      return next;
    });
  };

  const removePractica = (idx) => {
    setPracticas(prev => {
      const next = prev.filter((_, index) => index !== idx);
      return next.map((item, index) => ({ ...item, numero: index + 1 }));
    });
  };

  const submit = async () => {
    if (!form.programaId || !form.asignaturaId || !form.laboratorioId) { notify("Completa todos los campos requeridos", "error"); return; }
    if (practicas.length === 0) { notify("Debes seleccionar al menos una práctica", "error"); return; }
    const invalid = practicas.some(pr => !pr.practicaId || !pr.fecha);
    if (invalid) { notify("Todas las prácticas deben tener una práctica seleccionada y una fecha", "error"); return; }
    if (conflicto) {
      notify("Este laboratorio ya está ocupado en el horario seleccionado", "error");
      return;
    }
    const periodoStr = `${form.periodoTipo} ${form.periodoYear}`;
    const nueva = {
      ...form,
      periodo: periodoStr,
      id: Date.now(),
      profesorId: currentUser.id,
      laboratorioId: parseInt(form.laboratorioId, 10),
      programaId: form.programaId ? parseInt(form.programaId, 10) : null,
      asignaturaId: form.asignaturaId ? parseInt(form.asignaturaId, 10) : null,
      practicas,
      validada: false,
      validadoPor: null,
      fechaValidacion: null,
      reprogramacionPendiente: false,
      reprogramacionAutorizada: false,
      reprogramacionSolicitadaPor: null,
      reprogramacionAprobadaBy: null,
      fechaAprobacion: null
    };
    const { data: inserted, error } = await supabaseInsertRow("programaciones", nueva);
    const created = inserted ? inserted : nueva;
    setProgramaciones(prev => [...prev, created]);
    notify(error ? "Programación creada localmente, no guardada en BD" : "Programación creada exitosamente");
    setActiveSection("mis-programaciones");
  };

  // Laboratorios disponibles para el programa seleccionado
  const labsDisponibles = (form.programaId 
    ? programaLaboratorios.filter(pl => (pl.programaId ?? pl.programa_id) === parseInt(form.programaId, 10))
        .map(pl => laboratorios.find(l => l.id === (pl.laboratorioId ?? pl.laboratorio_id) && l.activo))
        .filter(Boolean)
    : laboratorios.filter(l => l.activo)
  ).slice().sort(sortAlpha("nombre"));

  return (
    <div>
      <SectionHeader title="Nueva Programación" subtitle="Registra las prácticas del semestre" />
      <div style={{ display: "flex", gap: 8, marginBottom: "2rem" }}>
        {[["1", "Datos generales"], ["2", "Laboratorio y horario"], ["3", "Prácticas"]].map(([n, lbl]) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: step >= parseInt(n) ? "#511013" : "#e8e8e8", color: step >= parseInt(n) ? "white" : "#aaa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>{n}</div>
            <span style={{ fontSize: 13, fontWeight: step === parseInt(n) ? 700 : 400, color: step === parseInt(n) ? "#511013" : "#888" }}>{lbl}</span>
            {n !== "3" && <span style={{ color: "#ddd", margin: "0 4px" }}></span>}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 1.5rem" }}>Información General</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Periodo semestral *</label>
              <div style={{ display: "flex", gap: 8 }}>
                <select value={form.periodoTipo} onChange={e => setForm(p => ({ ...p, periodoTipo: e.target.value }))} style={{ flex: 1, padding: "9px 14px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14 }}>
                  <option value="Enero - Junio">Enero - Junio</option>
                  <option value="Julio - Diciembre">Julio - Diciembre</option>
                  <option value="Agosto - Diciembre">Agosto - Diciembre</option>
                </select>
                <input type="number" min="2000" max="2100" value={form.periodoYear} onChange={e => setForm(p => ({ ...p, periodoYear: e.target.value }))} style={{ width: 140, padding: "9px 14px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14 }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Programa educativo *</label>
              <select value={form.programaId} onChange={e => setForm(p => ({ ...p, programaId: e.target.value }))} style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14 }}>
                <option value="">Seleccionar...</option>
                {programas.filter(p => p.activo).slice().sort(sortAlpha("nombre")).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Asignatura *</label>
              <select value={form.asignaturaId} onChange={e => {
                const id = e.target.value;
                const asignaturaSeleccionada = asignaturas.find(a => a.id === parseInt(id));
                setForm(p => ({ ...p, asignaturaId: id, asignatura: asignaturaSeleccionada?.nombre || "" }));
              }} style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14 }}>
                <option value="">Seleccionar asignatura...</option>
                {asignaturasDisponibles.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Semestre</label>
              <select value={form.semestre} onChange={e => setForm(p => ({ ...p, semestre: e.target.value }))} style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14 }}>
                {["1","2","3","4","5","6","7","8","9","10"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Grupo</label>
              <input value={form.grupo} onChange={e => setForm(p => ({ ...p, grupo: e.target.value }))} style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14, boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => setStep(2)} style={{ padding: "10px 24px", background: "#511013", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Siguiente </button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 1.5rem" }}>Laboratorio y Horario</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Laboratorio a utilizar *</label>
              <select value={form.laboratorioId} onChange={e => setForm(p => ({ ...p, laboratorioId: e.target.value }))} style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14 }}>
                <option value="">Seleccionar laboratorio...</option>
                {labsDisponibles.map(l => <option key={l.id} value={l.id}>{l.nombre} (Cap. {l.capacidad})</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Día</label>
              <select value={form.dia} onChange={e => setForm(p => ({ ...p, dia: e.target.value }))} style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14 }}>
                {DIAS_SEMANA.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Hora inicio</label>
                <input type="time" value={form.horaInicio} onChange={e => setForm(p => ({ ...p, horaInicio: e.target.value }))} style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Hora fin</label>
                <input type="time" value={form.horaFin} onChange={e => setForm(p => ({ ...p, horaFin: e.target.value }))} style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>No. de alumnos</label>
              <input type="number" value={form.numAlumnos} onChange={e => setForm(p => ({ ...p, numAlumnos: e.target.value }))} style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>No. de equipos requeridos</label>
              <input type="number" value={form.numEquipos} onChange={e => setForm(p => ({ ...p, numEquipos: e.target.value }))} style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 14, boxSizing: "border-box" }} />
            </div>
          </div>
          {conflicto && (
            <div style={{ marginTop: 16, padding: "12px 16px", background: "#FCEBEB", border: "1px solid #F7C1C1", borderRadius: 8 }}>
              <p style={{ margin: 0, fontSize: 13, color: "#A32D2D", fontWeight: 700 }}>Conflicto de horario detectado</p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#791F1F" }}>Este laboratorio ya tiene asignada la asignatura <strong>{conflicto.asignatura}</strong> en ese horario. Considera cambiar el horario o el laboratorio.</p>
            </div>
          )}
          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep(1)} style={{ padding: "10px 20px", border: "1px solid #ddd", background: "white", borderRadius: 8, cursor: "pointer", fontSize: 14, color: "#555" }}> Anterior</button>
            <button onClick={() => !conflicto && setStep(3)} disabled={!!conflicto}
              style={{ padding: "10px 24px", background: conflicto ? "#ccc" : "#511013", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: conflicto ? "not-allowed" : "pointer", fontSize: 14 }}>
              Siguiente
            </button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Prácticas del Semestre</h3>
            <button onClick={addPractica} disabled={!practicasDisponibles.length} style={{ padding: "7px 16px", background: practicasDisponibles.length ? "#511013" : "#ccc", color: "white", border: "none", borderRadius: 6, fontWeight: 600, cursor: practicasDisponibles.length ? "pointer" : "not-allowed", fontSize: 13 }}>Agregar práctica</button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
                <th style={{ padding: "8px 10px", color: "#888", fontWeight: 600, width: 50, textAlign: "center" }}>No.</th>
                <th style={{ padding: "8px 10px", color: "#888", fontWeight: 600, textAlign: "left" }}>Práctica *</th>
                <th style={{ padding: "8px 10px", color: "#888", fontWeight: 600, width: 150, textAlign: "center" }}>Fecha programada</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {practicas.length === 0 && !practicasDisponibles.length ? (
                <tr>
                  <td colSpan={4} style={{ padding: "16px 10px", color: "#666", textAlign: "center" }}>
                    No hay prácticas disponibles para el laboratorio y la asignatura seleccionados.
                  </td>
                </tr>
              ) : practicas.map((pr, idx) => (
                <tr key={pr.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                  <td style={{ textAlign: "center", padding: "6px 10px", fontWeight: 700, color: "#511013" }}>{pr.numero}</td>
                  <td style={{ padding: "6px 10px" }}>
                    <select value={pr.practicaId} onChange={e => updatePracticaRow(idx, "practicaId", e.target.value)} style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13, boxSizing: "border-box" }}>
                      <option value="">Seleccionar práctica...</option>
                      {practicasDisponibles.map(item => {
                        const asignaturaItem = asignaturas.find(a => a.id === (item.asignaturaId ?? item.asignatura_id));
                        const programaItem = programas.find(p => p.id === (item.programaId ?? item.programa_id));
                        const programaLabel = programaItem ? ` (${programaItem.nombre})` : "";
                        const asignaturaLabel = asignaturaItem ? ` — ${asignaturaItem.nombre}` : "";
                        const label = `${item.nombre}${asignaturaLabel}${programaLabel}`;
                        return <option key={item.id} value={item.id}>{label}</option>;
                      })}
                    </select>
                  </td>
                  <td style={{ padding: "6px 10px" }}>
                    <input type="date" value={pr.fecha} onChange={e => updatePracticaRow(idx, "fecha", e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 13 }} />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button onClick={() => removePractica(idx)} style={{ border: "none", background: "none", color: "#c0392b", cursor: "pointer", fontSize: 16 }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => setStep(2)} style={{ padding: "10px 20px", border: "1px solid #ddd", background: "white", borderRadius: 8, cursor: "pointer", fontSize: 14, color: "#555" }}> Anterior</button>
            <button onClick={submit} style={{ padding: "10px 28px", background: "#511013", color: "white", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Guardar programación</button>
          </div>
        </Card>
      )}
    </div>
  );
}

function DisponibilidadLabs({ programaciones, laboratorios, programaLaboratorios, programas }) {
  const [dia, setDia] = useState("Lunes");
  const [programaId, setProgramaId] = useState("");

  const horarios = programaciones.filter(p => p.dia === dia).reduce((acc, p) => {
    const lab = laboratorios.find(l => l.id === p.laboratorioId);
    if (!lab) return acc;
    if (!acc[lab.id]) acc[lab.id] = { lab, slots: [] };
    acc[lab.id].slots.push({ inicio: p.horaInicio, fin: p.horaFin, asignatura: p.asignatura, grupo: p.grupo });
    return acc;
  }, {});

  const labsDisponibles = programaId 
    ? programaLaboratorios.filter(pl => pl.programaId === parseInt(programaId)).map(pl => pl.laboratorioId)
    : null;

  return (
    <div>
      <SectionHeader title="Disponibilidad de Laboratorios" subtitle="Consulta la disponibilidad por día y programa" />
      <Card style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1rem" }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 8 }}>Filtrar por programa (opcional)</label>
            <select value={programaId} onChange={e => setProgramaId(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #ddd", fontSize: 13 }}>
              <option value="">Todos los programas</option>
              {programas.filter(p => p.activo).slice().sort(sortAlpha("nombre")).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
        </div>
      </Card>
      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {DIAS_SEMANA.map(d => (
          <button key={d} onClick={() => setDia(d)} style={{ padding: "8px 16px", borderRadius: 20, border: dia === d ? "none" : "1.5px solid #ddd", background: dia === d ? "#511013" : "white", color: dia === d ? "white" : "#555", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>{d}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
        {laboratorios.filter(l => l.activo && (!labsDisponibles || labsDisponibles.includes(l.id))).map(lab => {
          const info = horarios[lab.id];
          const ocupado = info?.slots || [];
          return (
            <Card key={lab.id}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>{lab.nombre}</h3>
              <p style={{ fontSize: 12, color: "#888", margin: "0 0 10px" }}>Cap. {lab.capacidad} alumnos</p>
              {ocupado.length === 0 ? (
                <span style={{ fontSize: 12, background: "#FBE5E5", color: "#511013", padding: "4px 12px", borderRadius: 20, fontWeight: 700 }}> Disponible todo el día</span>
              ) : (
                <div>
                  <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>Horarios ocupados:</span>
                  {ocupado.map((s, i) => (
                    <div key={i} style={{ marginTop: 6, padding: "6px 10px", background: "#FCEBEB", borderRadius: 6, fontSize: 12 }}>
                      <span style={{ fontWeight: 700, color: "#A32D2D" }}>{s.inicio}-{s.fin}</span>
                      <span style={{ color: "#791F1F" }}>  {s.asignatura} (Grupo {s.grupo})</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ValidacionModal({ prog, responsable, onValidate, onCancel, users }) {
  const [credenciales, setCredenciales] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const handleValidate = () => {
    if (!credenciales.username || !credenciales.password) {
      setError("Ingresa usuario y contraseña");
      return;
    }
    const user = users.find(u => u.username === credenciales.username && u.password === credenciales.password && u.active);
    if (!user) {
      setError("Credenciales incorrectas");
      return;
    }
    onValidate(prog.id, user.id, new Date().toISOString().split("T")[0]);
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
      <Card style={{ width: 400 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 1rem", color: "#333" }}>
          ✓ Validar Programación
        </h3>
        <p style={{ fontSize: 13, color: "#666", margin: "0 0 1rem", lineHeight: 1.5 }}>
          Para validar esta programación, ingresa tu usuario y contraseña como firma digital. Una vez validada, no podrá ser modificada.
        </p>
        <p style={{ fontSize: 12, fontWeight: 600, background: "#FFF4E8", border: "1px solid #F39200", padding: "8px 12px", borderRadius: 6, margin: "0 0 1rem", color: "#E8641C" }}>
          <strong>Asignatura:</strong> {prog.asignatura}  <strong>Profesor:</strong> {prog.profesorNombre}
        </p>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>Usuario</label>
          <input value={credenciales.username} onChange={e => setCredenciales(p => ({ ...p, username: e.target.value }))}
            placeholder="Tu usuario"
            style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1.5px solid #ddd", fontSize: 13, boxSizing: "border-box", outline: "none" }} />
        </div>
        <div style={{ marginBottom: error ? 8 : 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 6 }}>Contraseña</label>
          <input type="password" value={credenciales.password} onChange={e => setCredenciales(p => ({ ...p, password: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handleValidate()}
            placeholder="Tu contraseña"
            style={{ width: "100%", padding: "9px 12px", borderRadius: 6, border: "1.5px solid #ddd", fontSize: 13, boxSizing: "border-box", outline: "none" }} />
        </div>
        {error && <p style={{ color: "#c0392b", fontSize: 12, marginBottom: 12, textAlign: "center", fontWeight: 600 }}>{error}</p>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px 12px", border: "1.5px solid #ddd", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 13, color: "#555", fontWeight: 600 }}>Cancelar</button>
          <button onClick={handleValidate} style={{ flex: 1, padding: "10px 12px", border: "none", borderRadius: 6, background: "#511013", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Validar y Firmar</button>
        </div>
      </Card>
    </div>
  );
}

function CalendarioLaboratorio({ currentUser, programaciones, users, programas, laboratorios, setProgramaciones, notify, responsableLaboratorios }) {
  const misLabIds = responsableLaboratorios.filter(rl => rl.responsableId === currentUser.id).map(rl => rl.laboratorioId);
  const misProg = programaciones.filter(p => misLabIds.includes(p.laboratorioId));
  const [filter, setFilter] = useState("");
  const [validacionModal, setValidacionModal] = useState(null);
  const [viewMode, setViewMode] = useState("tabla"); // "tabla" o "calendario"
  const [expandedProgIds, setExpandedProgIds] = useState([]);

  const handleValidar = (progId) => {
    const prog = programaciones.find(p => p.id === progId);
    const prof = users.find(u => u.id === prog.profesorId);
    setValidacionModal({ ...prog, profesorNombre: prof?.name });
  };

  const confirmarValidacion = async (progId, validadoPorId, fecha) => {
    try {
      const { data: updated, error } = await supabaseUpdateRow("programaciones", progId, {
        validada: true,
        validadoPor: validadoPorId,
        fechaValidacion: fecha,
        reprogramacionPendiente: false,
        reprogramacionAutorizada: false,
        reprogramacionAprobadaBy: null,
        fechaAprobacion: null
      });
      if (error) {
        console.error("Supabase error validating programacion:", error);
        notify(`Error al validar en BD: ${error.message || JSON.stringify(error)}`, "error");
        // leave a local optimistic update so user sees the change, but warn it's not persisted
        setProgramaciones(prev => prev.map(p => p.id === progId ? ({ ...p, validada: true, validadoPor: validadoPorId, fechaValidacion: fecha, reprogramacionPendiente: false, reprogramacionAutorizada: false, reprogramacionAprobadaBy: null, fechaAprobacion: null }) : p));
        setValidacionModal(null);
        return;
      }
      const persisted = updated ? updated : {
        id: progId,
        validada: true,
        validadoPor: validadoPorId,
        fechaValidacion: fecha,
        reprogramacionPendiente: false,
        reprogramacionAutorizada: false,
        reprogramacionAprobadaBy: null,
        fechaAprobacion: null
      };
      setProgramaciones(prev => prev.map(p => p.id === progId ? ({ ...p, ...persisted }) : p));
      // Verify persistence by querying the DB
      try {
        const { data: check, error: checkErr } = await supabase.from("programaciones").select("id, validada, validado_por, fecha_validacion").eq("id", progId).maybeSingle();
        if (checkErr || !check) {
          console.error("Validation not found after update:", checkErr);
          notify("Validación no encontrada en BD después de actualizar. Revisa permisos/RLS.", "error");
        }
      } catch (ex) {
        console.error("Exception checking validation persistence:", ex);
      }
      const responsable = users.find(u => u.id === validadoPorId);
      notify(`✓ Programación validada por ${responsable?.name}`);
      setValidacionModal(null);
    } catch (ex) {
      console.error("Exception validating programacion:", ex);
      notify(`Excepción al validar: ${ex?.message || String(ex)}`, "error");
    }
  };

  const aprobarReprogramacion = async (progId) => {
    try {
      const fecha = new Date().toISOString().split("T")[0];
      const { data: updated, error } = await supabaseUpdateRow("programaciones", progId, {
        validada: false,
        validadoPor: null,
        fechaValidacion: null,
        reprogramacionPendiente: false,
        reprogramacionAutorizada: true,
        reprogramacionAprobadaBy: currentUser.id,
        fechaAprobacion: fecha
      });
      if (error) {
        console.error("Supabase error approving reprogramacion:", error);
        notify(`Error al autorizar reprogramación en BD: ${error.message || JSON.stringify(error)}`, "error");
        setProgramaciones(prev => prev.map(p => p.id === progId ? ({ ...p, validada: false, validadoPor: null, fechaValidacion: null, reprogramacionPendiente: false, reprogramacionAutorizada: true, reprogramacionAprobadaBy: currentUser.id, fechaAprobacion: fecha }) : p));
        return;
      }
      const persisted = updated ? updated : {
        id: progId,
        validada: false,
        validadoPor: null,
        fechaValidacion: null,
        reprogramacionPendiente: false,
        reprogramacionAutorizada: true,
        reprogramacionAprobadaBy: currentUser.id,
        fechaAprobacion: fecha
      };
      setProgramaciones(prev => prev.map(p => p.id === progId ? ({ ...p, ...persisted }) : p));
      // Verify persistence by querying the DB
      try {
        const { data: check, error: checkErr } = await supabase.from("programaciones").select("id, reprogramacion_autorizada, reprogramacion_aprobada_by, fecha_aprobacion").eq("id", progId).maybeSingle();
        if (checkErr || !check) {
          console.error("Reprogramacion approval not found after update:", checkErr);
          notify("Aprobación de reprogramación no encontrada en BD después de actualizar. Revisa permisos/RLS.", "error");
        }
      } catch (ex) {
        console.error("Exception checking reprogram approval persistence:", ex);
      }
      const responsable = users.find(u => u.id === currentUser.id);
      notify(`✓ Reprogramación autorizada por ${responsable?.name}`);
    } catch (ex) {
      console.error("Exception approving reprogramacion:", ex);
      notify(`Excepción al autorizar reprogramación: ${ex?.message || String(ex)}`, "error");
    }
  };

  const filteredProg = misProg.filter(prog => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    const prof = users.find(u => u.id === prog.profesorId)?.name.toLowerCase() || "";
    const lab = laboratorios.find(l => l.id === prog.laboratorioId)?.nombre.toLowerCase() || "";
    const programaNombre = programas.find(pg => pg.id === prog.programaId)?.nombre.toLowerCase() || "";
    const practicaMatch = prog.practicas.some(pr => [pr.nombre, pr.reprogramacion].join(" ").toLowerCase().includes(q));
    return [prog.asignatura, prog.periodo, prog.grupo, prog.semestre, prof, lab, programaNombre].join(" ").includes(q) || practicaMatch;
  });

  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <SectionHeader title={`Mi Calendario de Prácticas`} subtitle={`${misProg.length} programaciones asignadas`} />
      
      <Card style={{ marginBottom: "1.5rem", background: "#FFF4E8", border: "1px solid #F39200" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ fontSize: 20, color: "#F39200", fontWeight: 700 }}>ℹ</div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#E8641C", margin: "0 0 4px" }}>Validación de Programaciones</p>
            <p style={{ fontSize: 12, color: "#D97E15", margin: "0 0 6px", lineHeight: 1.4 }}>
              Como responsable del laboratorio, debes validar cada programación ingresando tu usuario y contraseña. Esto actúa como tu firma digital y garantiza la aceptación de las prácticas del profesor.
            </p>
            <p style={{ fontSize: 12, color: "#D97E15", margin: 0, lineHeight: 1.4 }}>
              <strong>Nota importante:</strong> La programacion no puede ser modificada por el profesor a menos que este solicite una reprogramacion y como responsable usted la valide
            </p>
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 12, marginBottom: "1.5rem", alignItems: "center" }}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Buscar por práctica o asignatura..." style={{ padding: "10px 16px", borderRadius: 8, border: "1.5px solid #ddd", flex: 1, fontSize: 14 }} />
        <div style={{ display: "flex", gap: 6, background: "#f5f5f5", padding: 4, borderRadius: 6 }}>
          <button onClick={() => setViewMode("tabla")} style={{ padding: "8px 14px", borderRadius: 4, border: "none", background: viewMode === "tabla" ? "white" : "transparent", color: viewMode === "tabla" ? "#511013" : "#666", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Tabla</button>
          <button onClick={() => setViewMode("calendario")} style={{ padding: "8px 14px", borderRadius: 4, border: "none", background: viewMode === "calendario" ? "white" : "transparent", color: viewMode === "calendario" ? "#511013" : "#666", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Calendario</button>
        </div>
      </div>

      {viewMode === "tabla" && (
        <Card>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f0f0f0", background: "#FBE5E5" }}>
                {["Fecha", "Práctica", "Asignatura", "Grupo", "Profesor", "Lab", "Alumnos", "Estado", "Acciones"].map(h =>
                  <th key={h} style={{ textAlign: h === "Acciones" ? "center" : "left", padding: "10px 10px", color: "#511013", fontWeight: 700, fontSize: 12 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filteredProg.map(prog => {
                const prof = users.find(u => u.id === prog.profesorId);
                const lab = laboratorios.find(l => l.id === prog.laboratorioId);
                const programa = programas.find(pg => pg.id === prog.programaId);
                const isExpanded = expandedProgIds.includes(prog.id);
                return [
                  <tr key={`prog-${prog.id}`} style={{ borderBottom: "1px solid #f0f0f0", background: prog.validada ? "#f0f0f0" : prog.practicas.some(p => p.fecha >= today) ? "#FFFBF7" : "white", opacity: prog.validada ? 0.7 : 1 }}>
                    <td style={{ padding: "10px 10px", fontWeight: 600, color: "#511013" }}>{prog.periodo}</td>
                    <td style={{ padding: "10px 10px", fontWeight: 600 }}>
                      <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{prog.practicas.length} prácticas</div>
                    </td>
                    <td style={{ padding: "10px 10px", color: "#333", fontWeight: 600 }}>{prog.asignatura}</td>
                    <td style={{ padding: "10px 10px", textAlign: "center", fontWeight: 600 }}>{prog.grupo}</td>
                    <td style={{ padding: "10px 10px", color: "#555", fontSize: 12 }}>{prof?.name.split(" ").slice(-2).join(" ")}</td>
                    <td style={{ padding: "10px 10px", color: "#555", fontSize: 12 }}>{lab?.nombre.replace("Laboratorio de ", "Lab. ")}</td>
                    <td style={{ padding: "10px 10px", textAlign: "center", fontWeight: 600 }}>{prog.numAlumnos}</td>
                    <td style={{ padding: "10px 10px" }}>
                      {prog.reprogramacionPendiente && prog.validada ? (
                        <span style={{ fontSize: 11, background: "#FFF4E8", color: "#E8641C", padding: "3px 8px", borderRadius: 4, fontWeight: 700 }}>Reprogramación solicitada</span>
                      ) : prog.reprogramacionAutorizada && !prog.validada ? (
                        <span style={{ fontSize: 11, background: "#C8E6C9", color: "#2E7D32", padding: "3px 8px", borderRadius: 4, fontWeight: 700 }}>✅ Reprogramación autorizada</span>
                      ) : prog.validada ? (
                        <div>
                          <span style={{ fontSize: 11, background: "#C8E6C9", color: "#2E7D32", padding: "3px 8px", borderRadius: 4, fontWeight: 700 }}>✓ Validada</span>
                          <div style={{ fontSize: 9, color: "#666", marginTop: 4, lineHeight: 1.3 }}>
                            {users.find(u => u.id === prog.validadoPor)?.name.split(" ").slice(-1)[0]}<br/>
                            {fmtDate(prog.fechaValidacion)}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, background: "#FFF4E8", color: "#F39200", padding: "3px 8px", borderRadius: 4, fontWeight: 700 }}>⏳ Pendiente</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        {prog.reprogramacionPendiente && prog.validada ? (
                          <button onClick={() => aprobarReprogramacion(prog.id)} style={{ padding: "5px 10px", borderRadius: 4, border: "none", background: "#2E7D32", color: "white", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                            Aceptar reprogramación
                          </button>
                        ) : !prog.validada ? (
                          <button onClick={() => handleValidar(prog.id)} style={{ padding: "5px 10px", borderRadius: 4, border: "none", background: "#F39200", color: "white", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                            Validar
                          </button>
                        ) : null}
                        <button onClick={() => setExpandedProgIds(prev => prev.includes(prog.id) ? prev.filter(id => id !== prog.id) : [...prev, prog.id])}
                          style={{ padding: "5px 10px", borderRadius: 4, border: "1px solid #ddd", background: isExpanded ? "#f5f5f5" : "white", color: "#555", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                          {isExpanded ? "Ocultar" : "Ver detalles"}
                        </button>
                      </div>
                    </td>
                  </tr>,
                  isExpanded && (
                    <tr key={`detail-${prog.id}`}>
                      <td colSpan={9} style={{ padding: "0 10px 14px" }}>
                        <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 10, padding: "14px 16px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14, fontSize: 13 }}>
                            <div><strong>Programa educativo</strong><div style={{ marginTop: 4, color: "#555" }}>{programa?.nombre || "Sin asignar"}</div></div>
                            <div><strong>Día / Hora</strong><div style={{ marginTop: 4, color: "#555" }}>{prog.dia} {prog.horaInicio}-{prog.horaFin}</div></div>
                            <div><strong>Laboratorio</strong><div style={{ marginTop: 4, color: "#555" }}>{lab?.nombre || "-"}</div></div>
                            <div><strong>Profesor</strong><div style={{ marginTop: 4, color: "#555" }}>{prof?.name || "-"}</div></div>
                            <div><strong>Grupo / Semestre</strong><div style={{ marginTop: 4, color: "#555" }}>Grupo {prog.grupo} • Sem {prog.semestre}</div></div>
                            <div><strong>Alumnos / Equipos</strong><div style={{ marginTop: 4, color: "#555" }}>{prog.numAlumnos} / {prog.numEquipos}</div></div>
                            <div><strong>Estado</strong><div style={{ marginTop: 4, color: "#555" }}>{prog.validada ? "Validada" : "Pendiente de validación"}</div></div>
                            {prog.validada && (
                              <div><strong>Validado por</strong><div style={{ marginTop: 4, color: "#555" }}>{users.find(u => u.id === prog.validadoPor)?.name || "-"}</div></div>
                            )}
                          </div>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 700, color: "#333", margin: "0 0 8px" }}>Detalle de prácticas</p>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                              <thead>
                                <tr style={{ borderBottom: "1px solid #e8e8e8", background: "#fff" }}>
                                  <th style={{ textAlign: "left", padding: "8px 10px", color: "#666", fontWeight: 700, width: 60 }}>No.</th>
                                  <th style={{ textAlign: "left", padding: "8px 10px", color: "#666", fontWeight: 700 }}>Práctica</th>
                                  <th style={{ textAlign: "center", padding: "8px 10px", color: "#666", fontWeight: 700, width: 140 }}>Fecha</th>
                                  <th style={{ textAlign: "center", padding: "8px 10px", color: "#666", fontWeight: 700, width: 140 }}>Reprogramación</th>
                                </tr>
                              </thead>
                              <tbody>
                                {prog.practicas.map((pr, idx) => (
                                  <tr key={pr.id || idx} style={{ borderBottom: "1px solid #f2f2f2" }}>
                                    <td style={{ padding: "8px 10px", fontWeight: 700, color: "#511013" }}>{pr.numero}</td>
                                    <td style={{ padding: "8px 10px", color: "#333" }}>{pr.nombre || "—"}</td>
                                    <td style={{ padding: "8px 10px", textAlign: "center", color: "#555" }}>{fmtDate(pr.fecha)}</td>
                                    <td style={{ padding: "8px 10px", textAlign: "center", color: pr.reprogramacion ? "#F39200" : "#aaa" }}>{pr.reprogramacion ? fmtDate(pr.reprogramacion) : "No"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                ];
              })}
            </tbody>
          </table>
        </Card>
      )}

      {viewMode === "calendario" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {misProg.map(prog => {
            const prof = users.find(u => u.id === prog.profesorId);
            const lab = laboratorios.find(l => l.id === prog.laboratorioId);
            const programa = programas.find(pg => pg.id === prog.programaId);
            const practicas = Array.isArray(prog.practicas) ? prog.practicas : [];
            const proximaPractica = practicas.find(p => p.fecha >= today);
            
            return (
              <Card key={prog.id} style={{ borderLeft: `4px solid ${prog.validada ? "#2E7D32" : "#F39200"}`, background: prog.validada ? "#f9f9f9" : "white" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 11, color: "#888", fontWeight: 700, margin: "0 0 4px", textTransform: "uppercase" }}>Asignatura</p>
                    <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#333" }}>{prog.asignatura}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: "#888", fontWeight: 700, margin: "0 0 4px", textTransform: "uppercase" }}>Programa</p>
                    <p style={{ fontSize: 13, margin: 0, color: "#555" }}>{programa?.nombre || "Sin asignar"}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: "#888", fontWeight: 700, margin: "0 0 4px", textTransform: "uppercase" }}>Profesor</p>
                    <p style={{ fontSize: 13, margin: 0, color: "#555" }}>{prof?.name}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: "#888", fontWeight: 700, margin: "0 0 4px", textTransform: "uppercase" }}>Laboratorio</p>
                    <p style={{ fontSize: 13, margin: 0, color: "#555" }}>{lab?.nombre}</p>
                  </div>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #eee" }}>
                  <div>
                    <span style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>Período</span>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>{prog.periodo}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>Grupo</span>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>Grupo {prog.grupo} • Sem {prog.semestre}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>Horario</span>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>{prog.dia} {prog.horaInicio}-{prog.horaFin}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>Capacidad</span>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>{prog.numAlumnos} alumnos • {prog.numEquipos} equipos</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>Estado</span>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>{prog.validada ? "Validada" : "Pendiente"}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#333", margin: "0 0 8px" }}>Prácticas ({prog.practicas.length} total)</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                    {prog.practicas.map((pr, idx) => {
                      const isPast = pr.fecha < today;
                      const isComing = pr.fecha >= today && pr.fecha <= new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
                      return (
                        <div key={idx} style={{ padding: "8px 12px", background: isPast ? "#f0f0f0" : isComing ? "#FFF4E8" : "#f9f9f9", borderRadius: 6, border: `1px solid ${isPast ? "#ddd" : isComing ? "#F39200" : "#eee"}`, opacity: isPast ? 0.6 : 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: isPast ? "#888" : isComing ? "#E8641C" : "#333", marginBottom: 2 }}>#{pr.numero}: {pr.nombre}</div>
                          <div style={{ fontSize: 11, color: "#666" }}>{fmtDate(pr.fecha)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid #eee" }}>
                  <div>
                    {prog.reprogramacionPendiente && prog.validada ? (
                      <span style={{ fontSize: 12, background: "#FFF4E8", color: "#E8641C", padding: "4px 12px", borderRadius: 20, fontWeight: 700 }}>🔔 Reprogramación solicitada</span>
                    ) : prog.reprogramacionAutorizada && !prog.validada ? (
                      <span style={{ fontSize: 12, background: "#C8E6C9", color: "#2E7D32", padding: "4px 12px", borderRadius: 20, fontWeight: 700 }}>✅ Reprogramación autorizada</span>
                    ) : prog.validada ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, background: "#C8E6C9", color: "#2E7D32", padding: "4px 12px", borderRadius: 20, fontWeight: 700 }}>✓ Validada</span>
                        <span style={{ fontSize: 11, color: "#888" }}>por {users.find(u => u.id === prog.validadoPor)?.name.split(" ").slice(-1)[0]} el {fmtDate(prog.fechaValidacion)}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, background: "#FFF4E8", color: "#F39200", padding: "4px 12px", borderRadius: 20, fontWeight: 700 }}>⏳ Pendiente de validar</span>
                    )}
                  </div>
                  {prog.reprogramacionPendiente && prog.validada ? (
                    <button onClick={() => aprobarReprogramacion(prog.id)} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#2E7D32", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                      ✓ Aceptar reprogramación
                    </button>
                  ) : !prog.validada && (
                    <button onClick={() => handleValidar(prog.id)} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#F39200", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                      ✓ Validar ahora
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {validacionModal && (
        <ValidacionModal prog={validacionModal} responsable={currentUser} onValidate={confirmarValidacion} onCancel={() => setValidacionModal(null)} users={users} />
      )}
    </div>
  );
}


