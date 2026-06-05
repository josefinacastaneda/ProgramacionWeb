// Carga .env.local en process.env para scripts standalone (no pasan por Next.js).
import { readFileSync } from 'fs';
import path from 'path';

export function cargarEnv(): void {
  try {
    const raw = readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
    for (const linea of raw.split('\n')) {
      const l = linea.trim();
      if (!l || l.startsWith('#')) continue;
      const i = l.indexOf('=');
      if (i === -1) continue;
      const key = l.slice(0, i).trim();
      let val = l.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // .env.local opcional
  }
}
