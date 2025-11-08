import imageCompression from 'browser-image-compression';

export interface CompressedImages {
  original: string; // dataURL de imagen comprimida
  thumbnail: string; // dataURL de thumbnail
}

/**
 * Comprime una imagen y genera su thumbnail
 */
export async function compressAndCreateThumbnail(file: File): Promise<CompressedImages> {
  try {
    // 1. Comprimir imagen original (calidad alta)
    const compressedOriginal = await imageCompression(file, {
      maxSizeMB: 1, // Máximo 1MB
      maxWidthOrHeight: 1920, // Máximo 1920px
      useWebWorker: true, // Usar web worker para mejor rendimiento
      fileType: 'image/jpeg',
      initialQuality: 0.85 // Calidad 85%
    });

    // 2. Generar thumbnail (miniatura pequeña)
    const thumbnail = await imageCompression(file, {
      maxSizeMB: 0.05, // Máximo 50KB
      maxWidthOrHeight: 300, // 300px para thumbnails
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.7 // Calidad menor para thumbnails
    });

    // 3. Convertir ambos a dataURL
    const originalDataUrl = await fileToDataURL(compressedOriginal);
    const thumbnailDataUrl = await fileToDataURL(thumbnail);

    return {
      original: originalDataUrl,
      thumbnail: thumbnailDataUrl
    };
  } catch (error) {
    console.error('Error comprimiendo imagen:', error);
    // Si falla, devolver la imagen original sin comprimir
    const originalDataUrl = await fileToDataURL(file);
    return {
      original: originalDataUrl,
      thumbnail: originalDataUrl // Usar la misma si falla
    };
  }
}

/**
 * Convierte un File a dataURL
 */
function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Procesa múltiples archivos en paralelo
 */
export async function processMultipleImages(files: FileList | File[]): Promise<CompressedImages[]> {
  const fileArray = Array.from(files);
  const promises = fileArray.map(file => compressAndCreateThumbnail(file));
  return Promise.all(promises);
}
