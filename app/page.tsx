import { supabaseAdmin } from "@/lib/supabase-admin";
import { getProductos, type Producto } from "@/lib/productos";
import Tienda from "./components/Tienda";

// La tienda lee stock en vivo, así que se renderiza en cada request.
export const dynamic = "force-dynamic";

// Lee los productos activos desde Supabase. Si la tabla todavía no existe
// o falla la consulta, cae al productos.json local para no romper el sitio.
async function obtenerProductos(): Promise<Producto[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("productos")
      .select("*")
      .eq("activo", true)
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.warn("Supabase productos, uso JSON local:", error.message);
      return getProductos();
    }

    return data.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      precio: p.precio,
      imagenes: p.imagenes ?? [],
      talles: p.talles ?? [],
      stock: p.stock ?? {},
      descripcion: p.descripcion ?? "",
      material: p.material ?? "",
      badge: p.badge ?? null,
    }));
  } catch (e) {
    console.warn("Fallo al leer Supabase, uso JSON local:", (e as Error).message);
    return getProductos();
  }
}

export default async function Home() {
  const productos = await obtenerProductos();
  return <Tienda productos={productos} />;
}
