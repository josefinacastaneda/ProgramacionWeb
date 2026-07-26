// Compresión de imágenes en el navegador, antes de subirlas.
//
// Por qué: Vercel corta cualquier request de más de 4,5 MB (error 413), y una
// foto de celular tranquilamente pesa 4 u 8 MB. Además no tiene sentido servir
// fotos de 4000px en una grilla donde se ven a 600px: achicarlas acelera la
// tienda y baja el consumo de Storage.
//
// Solo corre en el cliente (usa canvas). No importar desde código de server.

// Lado máximo (ancho o alto). Las fotos de producto son 3:4, así que 1600
// deja ~1200x1600, de sobra para verse nítidas incluso en pantallas retina.
const LADO_MAX = 1600;
const CALIDAD = 0.85;

export interface ResultadoCompresion {
  archivo: File;
  bytesOriginal: number;
  bytesFinal: number;
}

// Lee el archivo a un bitmap sin bloquear el hilo principal cuando se puede.
async function cargarBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Safari viejo puede fallar con algunos formatos: caemos al <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasABlob(canvas: HTMLCanvasElement, tipo: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, tipo, CALIDAD));
}

// Devuelve una versión achicada y comprimida. Si algo falla, devuelve el
// archivo original: preferimos intentar subirlo antes que perder la foto.
export async function comprimirImagen(file: File): Promise<ResultadoCompresion> {
  const bytesOriginal = file.size;
  const sinCambios: ResultadoCompresion = { archivo: file, bytesOriginal, bytesFinal: bytesOriginal };

  // Los GIF pueden estar animados y el canvas se quedaría con un solo cuadro.
  if (file.type === 'image/gif') return sinCambios;

  try {
    const bitmap = await cargarBitmap(file);
    const anchoOrig = 'width' in bitmap ? bitmap.width : 0;
    const altoOrig = 'height' in bitmap ? bitmap.height : 0;
    if (!anchoOrig || !altoOrig) return sinCambios;

    const escala = Math.min(1, LADO_MAX / Math.max(anchoOrig, altoOrig));
    const ancho = Math.round(anchoOrig * escala);
    const alto = Math.round(altoOrig * escala);

    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext('2d');
    if (!ctx) return sinCambios;
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, ancho, alto);
    if ('close' in bitmap) bitmap.close();

    // WebP pesa bastante menos que JPEG. Si el browser no lo soporta,
    // canvas.toBlob devuelve un PNG y lo detectamos por el type.
    let blob = await canvasABlob(canvas, 'image/webp');
    let tipo = 'image/webp';
    let ext = 'webp';
    if (!blob || blob.type !== 'image/webp') {
      blob = await canvasABlob(canvas, 'image/jpeg');
      tipo = 'image/jpeg';
      ext = 'jpg';
    }
    if (!blob) return sinCambios;

    // Si comprimir no ayudó (imágenes ya optimizadas o muy chicas), nos
    // quedamos con la original.
    if (blob.size >= bytesOriginal) return sinCambios;

    const nombreBase = file.name.replace(/\.[^.]+$/, '');
    const archivo = new File([blob], `${nombreBase}.${ext}`, { type: tipo });
    return { archivo, bytesOriginal, bytesFinal: archivo.size };
  } catch {
    return sinCambios;
  }
}
