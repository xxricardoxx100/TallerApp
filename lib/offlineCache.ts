import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Vehicle } from './vehicles';

interface TallerDB extends DBSchema {
  vehicles: {
    key: string;
    value: Vehicle[];
  };
  metadata: {
    key: string;
    value: {
      lastSync: string;
      vehicleCount: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<TallerDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<TallerDB>('TallerAppDB', 1, {
      upgrade(db) {
        // Store para la lista de vehículos
        if (!db.objectStoreNames.contains('vehicles')) {
          db.createObjectStore('vehicles');
        }
        // Store para metadata (última sincronización, etc)
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata');
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Guarda la lista de vehículos en IndexedDB
 */
export async function cacheVehicles(vehicles: Vehicle[]): Promise<void> {
  try {
    const db = await getDB();
    await db.put('vehicles', vehicles, 'list');
    await db.put('metadata', {
      lastSync: new Date().toISOString(),
      vehicleCount: vehicles.length,
    }, 'sync-info');
    console.log(`✅ Cached ${vehicles.length} vehicles offline`);
  } catch (error) {
    console.error('Error caching vehicles:', error);
  }
}

/**
 * Obtiene la lista de vehículos del cache
 */
export async function getCachedVehicles(): Promise<Vehicle[] | null> {
  try {
    const db = await getDB();
    const cached = await db.get('vehicles', 'list');
    if (cached) {
      console.log(`📦 Loaded ${cached.length} vehicles from cache`);
    }
    return cached || null;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

/**
 * Obtiene información sobre la última sincronización
 */
export async function getLastSyncInfo(): Promise<{ lastSync: string; vehicleCount: number } | null> {
  try {
    const db = await getDB();
    const metadata = await db.get('metadata', 'sync-info');
    return metadata || null;
  } catch (error) {
    console.error('Error reading sync info:', error);
    return null;
  }
}

/**
 * Limpia el cache
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear('vehicles');
    await db.clear('metadata');
    console.log('🗑️ Cache cleared');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}
