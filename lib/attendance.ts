import { supabase, isSupabaseConfigured } from './supabase';
import { getAllUsers, User } from './auth';

export type AttendanceEventType = 'IN' | 'OUT';

export interface AttendanceLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  captured_at?: string; // ISO
  error?: string;
}

export interface AttendanceEvent {
  id: string;
  user_id: string;
  user_name: string;
  event_type: AttendanceEventType;
  local_date: string; // YYYY-MM-DD (local)
  event_time: string; // ISO
  created_by?: string;
  note?: string;
  location_lat?: number | null;
  location_lng?: number | null;
  location_accuracy?: number | null;
  location_captured_at?: string | null;
  location_error?: string | null;
  created_at?: string;
  synced?: boolean;
}

export interface AttendanceEmployee {
  id: string;
  username?: string;
  name: string;
  role?: string;
}

const PENDING_KEY = 'taller_attendance_pending_v1';

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateId(): string {
  return `att-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isOnlineNow(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export async function getCurrentAttendanceLocation(options?: {
  timeoutMs?: number;
  enableHighAccuracy?: boolean;
  maximumAgeMs?: number;
}): Promise<AttendanceLocation | null> {
  if (typeof navigator === 'undefined') return null;
  if (!('geolocation' in navigator)) return { lat: 0, lng: 0, error: 'Geolocalización no soportada' };

  const timeoutMs = options?.timeoutMs ?? 8000;
  const enableHighAccuracy = options?.enableHighAccuracy ?? true;
  const maximumAgeMs = options?.maximumAgeMs ?? 30_000;

  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy,
        timeout: timeoutMs,
        maximumAge: maximumAgeMs,
      });
    });

    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      captured_at: new Date().toISOString(),
    };
  } catch (err: any) {
    const code = typeof err?.code === 'number' ? err.code : undefined;
    const message = err?.message || 'No se pudo obtener ubicación';
    const reason = code === 1 ? 'Permiso denegado' : code === 2 ? 'Posición no disponible' : code === 3 ? 'Tiempo de espera agotado' : message;
    return {
      lat: 0,
      lng: 0,
      error: reason,
      captured_at: new Date().toISOString(),
    };
  }
}

function loadPending(): AttendanceEvent[] {
  if (typeof window === 'undefined') return [];
  const data = safeJsonParse<AttendanceEvent[]>(localStorage.getItem(PENDING_KEY));
  return Array.isArray(data) ? data : [];
}

function savePending(events: AttendanceEvent[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PENDING_KEY, JSON.stringify(events));
}

export async function listAttendanceEmployees(): Promise<AttendanceEmployee[]> {
  const users = await getAllUsers();
  return (users || [])
    .filter(u => (u as any).active !== false)
    .map((u: User) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
    }));
}

export async function syncPendingAttendanceEvents(): Promise<{ synced: number; remaining: number }> {
  const pending = loadPending();
  if (pending.length === 0) return { synced: 0, remaining: 0 };

  if (!isSupabaseConfigured() || !supabase || !isOnlineNow()) {
    return { synced: 0, remaining: pending.length };
  }

  const { error } = await supabase
    .from('attendance_events')
    .upsert(
      pending.map(e => ({
        id: e.id,
        user_id: e.user_id,
        user_name: e.user_name,
        event_type: e.event_type,
        local_date: e.local_date,
        event_time: e.event_time,
        created_by: e.created_by ?? null,
        note: e.note ?? null,
        location_lat: e.location_lat ?? null,
        location_lng: e.location_lng ?? null,
        location_accuracy: e.location_accuracy ?? null,
        location_captured_at: e.location_captured_at ?? null,
        location_error: e.location_error ?? null,
      })),
      { onConflict: 'id' }
    );

  if (error) {
    // Mantener pendientes si falla la sincronización
    console.error('Error syncing attendance pending events:', error);
    return { synced: 0, remaining: pending.length };
  }

  savePending([]);
  return { synced: pending.length, remaining: 0 };
}

export async function listAttendanceEventsForDate(localDate = getLocalDateString()): Promise<AttendanceEvent[]> {
  const pending = loadPending().filter(e => e.local_date === localDate);

  if (!isSupabaseConfigured() || !supabase) {
    return pending
      .map(e => ({ ...e, synced: false }))
      .sort((a, b) => (b.event_time || '').localeCompare(a.event_time || ''));
  }

  // Si no hay conexión, mostrar lo pendiente local únicamente
  if (!isOnlineNow()) {
    return pending
      .map(e => ({ ...e, synced: false }))
      .sort((a, b) => (b.event_time || '').localeCompare(a.event_time || ''));
  }

  // Mejor esfuerzo: intentar sync antes de leer
  await syncPendingAttendanceEvents();

  const { data, error } = await supabase
    .from('attendance_events')
    .select('*')
    .eq('local_date', localDate)
    .order('event_time', { ascending: false });

  if (error) {
    console.error('Error listing attendance events:', error);
    return pending
      .map(e => ({ ...e, synced: false }))
      .sort((a, b) => (b.event_time || '').localeCompare(a.event_time || ''));
  }

  const remote = (data as AttendanceEvent[]) || [];
  const remoteIds = new Set(remote.map(e => e.id));
  const merged = [
    ...remote.map(e => ({ ...e, synced: true })),
    ...pending.filter(e => !remoteIds.has(e.id)).map(e => ({ ...e, synced: false })),
  ];

  return merged.sort((a, b) => (b.event_time || '').localeCompare(a.event_time || ''));
}

export function getNextEventTypeForUser(events: AttendanceEvent[], userId: string): AttendanceEventType {
  const userEvents = events
    .filter(e => e.user_id === userId)
    .sort((a, b) => (b.event_time || '').localeCompare(a.event_time || ''));

  const last = userEvents[0];
  if (!last) return 'IN';
  return last.event_type === 'IN' ? 'OUT' : 'IN';
}

export async function recordAttendanceEvent(params: {
  userId: string;
  userName: string;
  eventType: AttendanceEventType;
  createdBy?: string;
  note?: string;
  when?: Date;
  location?: AttendanceLocation | null;
}): Promise<{ success: boolean; event?: AttendanceEvent; error?: string; queued?: boolean }> {
  const when = params.when ?? new Date();
  const localDate = getLocalDateString(when);

  const loc = params.location;
  const hasCoords = !!loc && !loc.error && Number.isFinite(loc.lat) && Number.isFinite(loc.lng);
  const location_lat = hasCoords ? loc!.lat : null;
  const location_lng = hasCoords ? loc!.lng : null;
  const location_accuracy = hasCoords && Number.isFinite(loc!.accuracy) ? (loc!.accuracy as number) : null;
  const location_captured_at = loc?.captured_at ?? null;
  const location_error = loc?.error ?? null;

  const event: AttendanceEvent = {
    id: generateId(),
    user_id: params.userId,
    user_name: params.userName,
    event_type: params.eventType,
    local_date: localDate,
    event_time: when.toISOString(),
    created_by: params.createdBy,
    note: params.note,
    location_lat,
    location_lng,
    location_accuracy,
    location_captured_at,
    location_error,
  };

  // Si no hay Supabase o no hay conexión, encolar localmente
  if (!isSupabaseConfigured() || !supabase || !isOnlineNow()) {
    const pending = loadPending();
    pending.unshift(event);
    savePending(pending);
    return { success: true, event: { ...event, synced: false }, queued: true };
  }

  const { error } = await supabase
    .from('attendance_events')
    .insert([
      {
        id: event.id,
        user_id: event.user_id,
        user_name: event.user_name,
        event_type: event.event_type,
        local_date: event.local_date,
        event_time: event.event_time,
        created_by: event.created_by ?? null,
        note: event.note ?? null,
        location_lat: event.location_lat ?? null,
        location_lng: event.location_lng ?? null,
        location_accuracy: event.location_accuracy ?? null,
        location_captured_at: event.location_captured_at ?? null,
        location_error: event.location_error ?? null,
      },
    ]);

  if (error) {
    console.error('Error inserting attendance event:', error);
    // Fallback: encolar local para no perder el marcado
    const pending = loadPending();
    pending.unshift(event);
    savePending(pending);
    return { success: true, event: { ...event, synced: false }, queued: true };
  }

  return { success: true, event: { ...event, synced: true }, queued: false };
}
