import { getProductos } from "@/lib/productos";
import Tienda from "./components/Tienda";

// Server Component: lee los productos desde productos.json (vía lib/productos)
// y los pasa al componente cliente que maneja toda la interactividad.
export default function Home() {
  const productos = getProductos();
  return <Tienda productos={productos} />;
}
