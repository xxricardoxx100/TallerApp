"use client";
import { useCallback, useEffect, useState } from 'react';
import initStorage from '../app/storage';
import { Vehicle, VehicleUpdate, normalizeVehicle, sortVehicles, generateAccessCode } from '../lib/vehicles';
import { cacheVehicles, getCachedVehicles } from '../lib/offlineCache';
import { useOnlineStatus } from './useOnlineStatus';
import { supabase } from '../lib/supabase';

interface UseVehiclesResult {
  vehicles: Vehicle[];
  loading: boolean;
  saveStatus: string;
  isOnline: boolean;
  isFromCache: boolean;
  reload: () => Promise<void>;
  saveVehicle: (v: Vehicle) => Promise<boolean>;
  addVehicle: (partial: Omit<Vehicle, 'id' | 'fechaIngreso' | 'estado' | 'actualizaciones'>) => Promise<boolean>;
  addUpdate: (vehicleId: string, update: Omit<VehicleUpdate, 'id' | 'fecha'>, createdBy?: string) => Promise<boolean>;
  deleteVehicle: (vehicleId: string) => Promise<boolean>;
}

export function useVehicles(): UseVehiclesResult {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [isFromCache, setIsFromCache] = useState(false);
  const isOnline = useOnlineStatus();

  const ensureStorage = async () => {
    if (!('storage' in window)) await initStorage();
  };

  const refreshFromRemote = useCallback(async () => {
    if (!hasLoadedOnce) setLoading(true);
    await ensureStorage();
    try {
      const listResult = await (window as any).storage.list('vehicle:', true);
      if (listResult?.items) {
        const parsed = listResult.items
          .map((it: any) => {
            try {
              return JSON.parse(it.value);
            } catch {
              return null;
            }
          })
          .filter(Boolean)
          .map(normalizeVehicle);

        const sorted = sortVehicles(parsed);
        setVehicles(sorted);
        setIsFromCache(false);
        await cacheVehicles(sorted);
      }
    } catch (e) {
      console.error('Error cargando vehículos remotos:', e);
      // Mantener lo que ya se está mostrando (cache/local) sin blanquear.
    } finally {
      setHasLoadedOnce(true);
      setLoading(false);
    }
  }, [hasLoadedOnce]);

  const reload = useCallback(async () => {
    await refreshFromRemote();
  }, [refreshFromRemote]);

  // Local-first: cargar cache (IndexedDB) primero y refrescar en segundo plano
  useEffect(() => {
    void (async () => {
      try {
        const cached = await getCachedVehicles();
        if (cached && cached.length > 0) {
          setVehicles(cached);
          setIsFromCache(true);
          setHasLoadedOnce(true);
          setLoading(false);
        }
      } catch (e) {
        console.error('Error cargando cache local:', e);
      }
      await refreshFromRemote();
    })();
  }, [refreshFromRemote]);

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
      // Optimista: actualizar el estado local sin recargar todo (evita saltos y demora)
      let nextVehicles: Vehicle[] = [];
      setVehicles((prev) => {
        const exists = prev.some(v => v.id === vehicle.id);
        const updated = exists ? prev.map(v => (v.id === vehicle.id ? vehicle : v)) : [vehicle, ...prev];
        nextVehicles = sortVehicles(updated);
        return nextVehicles;
      });
      // Cache local en segundo plano (no bloquear UI)
      void cacheVehicles(nextVehicles);
      setSaveStatus('✓ Guardado');
      setTimeout(() => setSaveStatus(''), 2000);
      return true;
    } catch (e: any) {
      console.error('Error al guardar vehículo:', e);
      setSaveStatus('Error: ' + e.message);
      setTimeout(() => setSaveStatus(''), 3000);
      return false;
    }
  }, [isOnline, refreshFromRemote]);

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

  const addUpdate = useCallback(async (vehicleId: string, updatePartial: Omit<VehicleUpdate, 'id' | 'fecha'>, createdBy?: string) => {
    const target = vehicles.find(v => v.id === vehicleId);
    if (!target) return false;
    const update: VehicleUpdate = {
      ...updatePartial,
      id: Date.now().toString(),
      fecha: new Date().toISOString(),
      imagenes: updatePartial.imagenes || [],
      createdBy // Agregar el nombre del usuario que crea la actualización
    };
    const updated: Vehicle = { ...target, actualizaciones: [...target.actualizaciones, update] };
    return saveVehicle(updated);
  }, [vehicles, saveVehicle]);

  const deleteVehicle = useCallback(async (vehicleId: string) => {
    setSaveStatus('Eliminando...');
    await ensureStorage();
    try {
      const key = `vehicle:${vehicleId}`;
      
      if (supabase) {
        console.log('Intentando eliminar vehículo:', vehicleId);
        
        // Eliminar de la tabla vehicles en Supabase usando el cliente singleton
        const { error } = await supabase
          .from('vehicles')
          .delete()
          .eq('id', vehicleId)
          .select();
        
        if (error) {
          console.error('Error de Supabase al eliminar:', error);
          throw error;
        }
        
        console.log('Vehículo eliminado exitosamente de Supabase');
      } else {
        // Fallback a localStorage
        console.log('Eliminando de localStorage:', key);
        localStorage.removeItem(key);
      }
      
      // Optimista: remover del estado local y cache
      let nextVehicles: Vehicle[] = [];
      setVehicles((prev) => {
        nextVehicles = prev.filter(v => v.id !== vehicleId);
        return nextVehicles;
      });
      void cacheVehicles(nextVehicles);
      setSaveStatus('✓ Eliminado');
      setTimeout(() => setSaveStatus(''), 2000);
      return true;
    } catch (e: any) {
      console.error('Error al eliminar vehículo:', e);
      setSaveStatus('Error: ' + (e.message || 'Error desconocido'));
      setTimeout(() => setSaveStatus(''), 3000);
      return false;
    }
  }, [isOnline, refreshFromRemote]);

  return { vehicles, loading, saveStatus, isOnline, isFromCache, reload, saveVehicle, addVehicle, addUpdate, deleteVehicle };
}
