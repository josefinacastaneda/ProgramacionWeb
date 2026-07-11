// Validaciones compartidas entre el front (UX inmediata) y el backend
// (seguridad real). Son funciones puras: las mismas reglas corren en ambos
// lados, así no se desincronizan. Mensajes de error en español.

// Solo letras (con tildes y ñ, cualquier idioma) y espacios.
export const REGEX_NOMBRE = /^[\p{L}\s]+$/u;
export const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Teléfono: dígitos, espacios, guiones y el "+" del código de país.
export const REGEX_TELEFONO = /^[\d\s+-]+$/;
// Número de puerta: solo dígitos.
export const REGEX_NUMERO = /^\d+$/;
// Código postal argentino: 4 dígitos ("1425") o formato CPA ("C1425AAB").
export const REGEX_CP = /^[A-Za-z]?\d{4}[A-Za-z]{0,3}$/;

export function nombreValido(v: string): boolean {
  const s = (v ?? '').trim();
  return s.length >= 2 && s.length <= 60 && REGEX_NOMBRE.test(s);
}

export function emailValido(v: string): boolean {
  return REGEX_EMAIL.test((v ?? '').trim());
}

// El teléfono es opcional: vacío se considera válido. Si viene, debe cumplir
// el formato y tener al menos 8 dígitos numéricos.
export function telefonoValido(v: string): boolean {
  const s = (v ?? '').trim();
  if (s === '') return true;
  if (!REGEX_TELEFONO.test(s)) return false;
  return (s.match(/\d/g)?.length ?? 0) >= 8;
}

export function calleValida(v: string): boolean {
  return (v ?? '').trim().length >= 3;
}

export function numeroValido(v: string): boolean {
  return REGEX_NUMERO.test((v ?? '').trim());
}

export function cpValido(v: string): boolean {
  return REGEX_CP.test((v ?? '').trim());
}

// Ciudad y provincia: no vacíos, solo letras y espacios.
export function ciudadProvinciaValida(v: string): boolean {
  const s = (v ?? '').trim();
  return s.length >= 2 && s.length <= 60 && REGEX_NOMBRE.test(s);
}

// Mensajes de error (mismos en front y back).
export const MSG_VALIDACION = {
  nombre: 'Ingresá un nombre válido (solo letras).',
  email: 'Ingresá un email válido.',
  telefono: 'Ingresá un teléfono válido.',
  calle: 'Ingresá una calle válida (mínimo 3 caracteres).',
  numero: 'El número debe contener solo dígitos.',
  ciudad: 'Ingresá una ciudad válida (solo letras).',
  provincia: 'Ingresá una provincia válida (solo letras).',
  cp: 'Ingresá un código postal válido.',
} as const;

export interface CompradorInput {
  nombre?: string;
  email?: string;
  telefono?: string;
  calle?: string;
  numero?: string;
  ciudad?: string;
  provincia?: string;
  cp?: string;
}

// Valida todos los datos del comprador. Devuelve el primer mensaje de error o
// null si está todo bien. Con entrega "retiro" no se exige dirección.
export function validarComprador(c: CompradorInput, entrega: string): string | null {
  if (!nombreValido(c.nombre ?? '')) return MSG_VALIDACION.nombre;
  if (!emailValido(c.email ?? '')) return MSG_VALIDACION.email;
  if (!telefonoValido(c.telefono ?? '')) return MSG_VALIDACION.telefono;
  if (entrega !== 'retiro') {
    if (!calleValida(c.calle ?? '')) return MSG_VALIDACION.calle;
    if (!numeroValido(c.numero ?? '')) return MSG_VALIDACION.numero;
    if (!ciudadProvinciaValida(c.ciudad ?? '')) return MSG_VALIDACION.ciudad;
    if (!ciudadProvinciaValida(c.provincia ?? '')) return MSG_VALIDACION.provincia;
    if (!cpValido(c.cp ?? '')) return MSG_VALIDACION.cp;
  }
  return null;
}
