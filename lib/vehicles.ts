export interface VehicleUpdate {
  id: string;
  fecha: string;
  descripcion: string;
  imagenes: string[];
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
  fechaIngreso: string;
  estado: string;
  actualizaciones: VehicleUpdate[];
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
    fechaIngreso: raw.fechaIngreso || new Date().toISOString(),
    estado: raw.estado || 'En proceso',
    actualizaciones: Array.isArray(raw.actualizaciones)
      ? raw.actualizaciones.map((u: any) => ({
          id: String(u.id),
          fecha: u.fecha || new Date().toISOString(),
          descripcion: u.descripcion || '',
          imagenes: Array.isArray(u.imagenes) ? u.imagenes.filter(Boolean) : []
        }))
      : []
  };
}

export function sortVehicles(vehicles: Vehicle[]): Vehicle[] {
  return [...vehicles].sort(
    (a, b) => new Date(b.fechaIngreso).getTime() - new Date(a.fechaIngreso).getTime()
  );
}
