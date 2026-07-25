// Rate limiting básico en memoria (por instancia serverless). No es un
// reemplazo de un rate limiter distribuido (Redis, etc.), pero corta abuso
// obvio (fuerza bruta al admin, spam de webhooks/formularios) sin agregar
// infraestructura nueva. Se resetea cada vez que Vercel recicla la instancia.
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Evita que el Map crezca indefinidamente si hay muchas IPs distintas.
const MAX_BUCKETS = 5000;

export function rateLimit(key: string, limite: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || ahora > bucket.resetAt) {
    if (buckets.size >= MAX_BUCKETS) buckets.clear();
    buckets.set(key, { count: 1, resetAt: ahora + ventanaMs });
    return true;
  }

  if (bucket.count >= limite) return false;
  bucket.count += 1;
  return true;
}
