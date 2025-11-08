"use client";
import { useCallback, useEffect, useState } from 'react';
import initStorage from '../app/storage';
import { Vehicle, VehicleUpdate, normalizeVehicle, sortVehicles, generateAccessCode } from '../lib/vehicles';
import { cacheVehicles, getCachedVehicles } from '../lib/offlineCache';
import { useOnlineStatus } from './useOnlineStatus';

interface UseVehiclesResult {
  vehicles: Vehicle[];
  loading: boolean;
  saveStatus: string;
  isOnline: boolean;
  isFromCache: boolean;
  reload: () => Promise<void>;
  saveVehicle: (v: Vehicle) => Promise<boolean>;
  addVehicle: (partial: Omit<Vehicle, 'id' | 'fechaIngreso' | 'estado' | 'actualizaciones'>) => Promise<boolean>;
  addUpdate: (vehicleId: string, update: Omit<VehicleUpdate, 'id' | 'fecha'>) => Promise<boolean>;
}

export function useVehicles(): UseVehiclesResult {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');
  const [isFromCache, setIsFromCache] = useState(false);
  const isOnline = useOnlineStatus();

  const ensureStorage = async () => {
    if (!('storage' in window)) await initStorage();
  };

  const reload = useCallback(async () => {
    setLoading(true);
    setIsFromCache(false);
    await ensureStorage();
    try {
      // Intentar cargar desde Supabase
      const listResult = await (window as any).storage.list('vehicle:', true);
      if (listResult?.items) {
        const parsed = listResult.items
          .map((it: any) => {
            try { return JSON.parse(it.value); } catch { return null; }
          })
          .filter(Boolean)
          .map(normalizeVehicle);
        const sorted = sortVehicles(parsed);
        setVehicles(sorted);
        // Guardar en cache para uso offline
        await cacheVehicles(sorted);
      } else {
        setVehicles([]);
      }
    } catch (e) {
      console.error('Error recargando vehículos:', e);
      // Si falla, intentar cargar desde cache
      const cached = await getCachedVehicles();
      if (cached) {
        console.log('📦 Mostrando datos del cache offline');
        setVehicles(cached);
        setIsFromCache(true);
      } else {
        setVehicles([]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Cuando vuelve la conexión, recargar automáticamente
  useEffect(() => {
    if (isOnline && isFromCache) {
      console.log('🔄 Conexión restaurada, sincronizando...');
      reload();
    }
  }, [isOnline, isFromCache, reload]);

  const saveVehicle = useCallback(async (vehicle: Vehicle) => {
    setSaveStatus('Guardando...');
    await ensureStorage();
    try {
      await (window as any).storage.set(`vehicle:${vehicle.id}`, JSON.stringify(vehicle), true);
      await reload();
      setSaveStatus('✓ Guardado');
      setTimeout(() => setSaveStatus(''), 2000);
      return true;
    } catch (e: any) {
      console.error('Error al guardar vehículo:', e);
      setSaveStatus('Error: ' + e.message);
      setTimeout(() => setSaveStatus(''), 3000);
      return false;
    }
  }, [reload]);

  const addVehicle = useCallback(async (partial: Omit<Vehicle, 'id' | 'fechaIngreso' | 'estado' | 'actualizaciones' | 'accessCode'>) => {
    const vehicle: Vehicle = {
      ...partial,
      id: Date.now().toString(),
      fechaIngreso: new Date().toISOString(),
      estado: 'En proceso',
      actualizaciones: [],
      imagenes: partial.imagenes || [],
      accessCode: generateAccessCode(), // Generar código único
    };
    return saveVehicle(vehicle);
  }, [saveVehicle]);

  const addUpdate = useCallback(async (vehicleId: string, updatePartial: Omit<VehicleUpdate, 'id' | 'fecha'>) => {
    const target = vehicles.find(v => v.id === vehicleId);
    if (!target) return false;
    const update: VehicleUpdate = {
      ...updatePartial,
      id: Date.now().toString(),
      fecha: new Date().toISOString(),
      imagenes: updatePartial.imagenes || []
    };
    const updated: Vehicle = { ...target, actualizaciones: [...target.actualizaciones, update] };
    return saveVehicle(updated);
  }, [vehicles, saveVehicle]);

  return { vehicles, loading, saveStatus, isOnline, isFromCache, reload, saveVehicle, addVehicle, addUpdate };
}
