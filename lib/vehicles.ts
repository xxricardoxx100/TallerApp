export interface VehicleUpdate {
  id: string;
  fecha: string;
  descripcion: string;
  imagenes: string[];
  thumbnails?: string[]; // Thumbnails opcionales
  createdBy?: string; // Nombre del usuario que creó la actualización
}

export interface VehiclePending {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  placa: string;
  marca?: string;
  modelo?: string;
  año?: string;
  cliente: string;
  telefono?: string;
  problema?: string;
  imagenes: string[];
  thumbnails?: string[]; // Thumbnails opcionales
  cotizacionImagen?: string; // Imagen de cotización (URL o dataURL)
  cotizacionThumbnail?: string; // Thumbnail de cotización
  fechaIngreso: string;
  estado: string;
  actualizaciones: VehicleUpdate[];
  pendientes?: VehiclePending[]; // Lista de pendientes (checklist)
  accessCode?: string; // Código de acceso para portal del cliente
}

// Normaliza un objeto vehículo para asegurar arrays y orden
export function normalizeVehicle(raw: any): Vehicle {
  return {
    id: String(raw.id),
    placa: raw.placa || '',
    marca: raw.marca || '',
    modelo: raw.modelo || '',
    año: raw.año || '',
    cliente: raw.cliente || '',
    telefono: raw.telefono || '',
    problema: raw.problema || '',
    imagenes: Array.isArray(raw.imagenes) ? raw.imagenes.filter(Boolean) : [],
    thumbnails: Array.isArray(raw.thumbnails) ? raw.thumbnails.filter(Boolean) : [],
    cotizacionImagen: typeof raw.cotizacionImagen === 'string' ? raw.cotizacionImagen : undefined,
    cotizacionThumbnail: typeof raw.cotizacionThumbnail === 'string' ? raw.cotizacionThumbnail : undefined,
    fechaIngreso: raw.fechaIngreso || new Date().toISOString(),
    estado: raw.estado || 'En proceso',
    accessCode: raw.accessCode || undefined, // Incluir código de acceso si existe
    actualizaciones: Array.isArray(raw.actualizaciones)
      ? raw.actualizaciones.map((u: any) => ({
          id: String(u.id),
          fecha: u.fecha || new Date().toISOString(),
          descripcion: u.descripcion || '',
          imagenes: Array.isArray(u.imagenes) ? u.imagenes.filter(Boolean) : [],
          thumbnails: Array.isArray(u.thumbnails) ? u.thumbnails.filter(Boolean) : [],
          createdBy: u.createdBy || undefined
        }))
      : [],
    pendientes: Array.isArray(raw.pendientes)
      ? raw.pendientes
          .map((p: any) => ({
            id: String(p.id ?? ''),
            text: String(p.text ?? ''),
            done: Boolean(p.done),
            createdAt: p.createdAt || new Date().toISOString(),
          }))
          .filter((p: any) => p.id && p.text)
      : []
  };
}

export function sortVehicles(vehicles: Vehicle[]): Vehicle[] {
  return [...vehicles].sort(
    (a, b) => new Date(b.fechaIngreso).getTime() - new Date(a.fechaIngreso).getTime()
  );
}

/**
 * Genera un código de acceso único para el portal del cliente
 * Formato: CAL-YYYY-XXXX (ej: CAL-2025-7F3G)
 */
export function generateAccessCode(): string {
  const year = new Date().getFullYear();
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Sin I, O para evitar confusión
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CAL-${year}-${code}`;
}
