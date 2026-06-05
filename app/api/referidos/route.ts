import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const FILE = path.join(process.cwd(), 'data', 'referidos.json');

interface Referido {
  codigo: string;
  email: string;
  fecha: string;
}

async function leer(): Promise<Referido[]> {
  try {
    const raw = await fs.readFile(FILE, 'utf-8');
    return JSON.parse(raw) as Referido[];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { codigo?: string; email?: string };
  const codigo = (body.codigo ?? '').trim();
  const email = (body.email ?? '').trim().toLowerCase();

  if (!codigo || !email) {
    return NextResponse.json({ error: 'Faltan datos del referido.' }, { status: 400 });
  }

  const referidos = await leer();
  if (!referidos.some((r) => r.codigo === codigo)) {
    referidos.push({ codigo, email, fecha: new Date().toISOString().slice(0, 10) });
    try {
      await fs.writeFile(FILE, JSON.stringify(referidos, null, 2), 'utf-8');
    } catch (err) {
      console.error('No se pudo guardar el referido:', err);
      return NextResponse.json({ error: 'No se pudo guardar el referido.' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, codigo });
}
