import { normalizeVehicle } from '../../lib/vehicles';

describe('normalizeVehicle', () => {
  it('normaliza campos mínimos', () => {
    const raw = { id: 1, placa: 'ABC123', cliente: 'Juan' };
    const v = normalizeVehicle(raw);
    expect(v.imagenes).toEqual([]);
    expect(v.actualizaciones).toEqual([]);
    expect(v.estado).toBe('En proceso');
  });

  it('mantiene actualizaciones válidas', () => {
    const raw = { id: 'x', placa: 'ABC', cliente: 'Ana', actualizaciones: [{ id: 'u1', descripcion: 'Cambio aceite', imagenes: ['a'] }] };
    const v = normalizeVehicle(raw);
    expect(v.actualizaciones.length).toBe(1);
    expect(v.actualizaciones[0].descripcion).toBe('Cambio aceite');
  });
});
