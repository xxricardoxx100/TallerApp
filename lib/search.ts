import { Vehicle } from './vehicles';

export interface SearchFilters {
  searchType: 'placa' | 'cliente' | 'marca' | 'modelo';
  searchValue: string;
  estado: string;
  fechaDesde: string;
  fechaHasta: string;
}

export function filterVehicles(vehicles: Vehicle[], filters: SearchFilters): Vehicle[] {
  return vehicles.filter(v => {
    // Filtro por búsqueda general (según el tipo seleccionado)
    if (filters.searchValue) {
      const searchLower = filters.searchValue.toLowerCase();
      let matchesSearch = false;
      
      switch (filters.searchType) {
        case 'placa':
          matchesSearch = v.placa.toLowerCase().includes(searchLower);
          break;
        case 'cliente':
          matchesSearch = v.cliente.toLowerCase().includes(searchLower);
          break;
        case 'marca':
          matchesSearch = (v.marca || '').toLowerCase().includes(searchLower);
          break;
        case 'modelo':
          matchesSearch = (v.modelo || '').toLowerCase().includes(searchLower);
          break;
      }
      
      if (!matchesSearch) return false;
    }
    
    // Filtro por estado (exact match, o "todos" para mostrar todo)
    if (filters.estado && filters.estado !== 'todos' && v.estado !== filters.estado) {
      return false;
    }
    
    // Filtro por fecha desde
    if (filters.fechaDesde) {
      const vehicleFecha = new Date(v.fechaIngreso);
      const desde = new Date(filters.fechaDesde);
      if (vehicleFecha < desde) return false;
    }
    
    // Filtro por fecha hasta
    if (filters.fechaHasta) {
      const vehicleFecha = new Date(v.fechaIngreso);
      const hasta = new Date(filters.fechaHasta);
      hasta.setHours(23, 59, 59, 999); // Incluir todo el día
      if (vehicleFecha > hasta) return false;
    }
    
    return true;
  });
}

export const ESTADOS_DISPONIBLES = [
  'En proceso',
  'Esperando piezas',
  'Listo para entrega',
  'Entregado'
] as const;
