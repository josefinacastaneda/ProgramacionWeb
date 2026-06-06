import { cargarEnv } from './_env';
cargarEnv();
import { readFileSync } from 'fs';
import path from 'path';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

// Permite elegir la migración: `npm run migrate 003_unique_payment.sql`.
const ARCHIVO = process.argv[2] ?? '001_initial.sql';
const SQL_FILE = path.join(process.cwd(), 'supabase', 'migrations', ARCHIVO);

// Construye la connection string de Supabase a partir de la URL del proyecto
// y SUPABASE_DB_PASSWORD, si el usuario no dio SUPABASE_DB_URL completa.
function resolverDbUrl(): string | null {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  const pass = process.env.SUPABASE_DB_PASSWORD;
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (pass && projectUrl) {
    const ref = new URL(projectUrl).hostname.split('.')[0];
    return `postgresql://postgres:${encodeURIComponent(pass)}@db.${ref}.supabase.co:5432/postgres`;
  }
  return null;
}

async function viaPg(dbUrl: string, sql: string) {
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log('✓ Migración ejecutada vía conexión Postgres directa.');
}

async function viaRpc(sql: string) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { error } = await sb.rpc('exec_sql', { sql });
  if (error) throw new Error(error.message);
  console.log('✓ Migración ejecutada vía RPC exec_sql.');
}

async function main() {
  const sql = readFileSync(SQL_FILE, 'utf-8');
  const dbUrl = resolverDbUrl();

  if (dbUrl) {
    await viaPg(dbUrl, sql);
    return;
  }

  try {
    await viaRpc(sql);
  } catch (err) {
    console.error('\nNo se pudo ejecutar la migración automáticamente.');
    console.error('Razón:', (err as Error).message);
    console.error(
      '\nLa service_role key NO permite ejecutar DDL vía supabase-js.\n' +
        'Elegí UNA opción:\n' +
        '  A) Agregá SUPABASE_DB_URL (Dashboard → Project Settings → Database →\n' +
        '     Connection string → URI) a .env.local y volvé a correr este script.\n' +
        '  B) Agregá SUPABASE_DB_PASSWORD a .env.local (la pass de la base).\n' +
        '  C) Pegá el contenido de supabase/migrations/001_initial.sql en el\n' +
        '     SQL Editor del dashboard de Supabase y ejecutalo.\n',
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
