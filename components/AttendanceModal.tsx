"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { X, Clock } from 'lucide-react';
import type { Session } from '../lib/auth';
import {
  AttendanceEmployee,
  AttendanceEvent,
  getCurrentAttendanceLocation,
  getLocalDateString,
  getNextEventTypeForUser,
  listAttendanceEmployees,
  listAttendanceEventsForDate,
  recordAttendanceEvent,
  syncPendingAttendanceEvents,
} from '../lib/attendance';

interface AttendanceModalProps {
  session: Session;
  isAdmin: boolean;
  isOnline: boolean;
  onClose: () => void;
}

export default function AttendanceModal({ session, isAdmin, isOnline, onClose }: AttendanceModalProps) {
  const [localDate, setLocalDate] = useState<string>(() => getLocalDateString());
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(session.userId);
  const [selectedUserName, setSelectedUserName] = useState<string>(session.name);
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [note, setNote] = useState('');
  const [info, setInfo] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [syncSummary, setSyncSummary] = useState<{ synced: number; remaining: number } | null>(null);

  const nextEventType = useMemo(() => {
    return getNextEventTypeForUser(events, selectedUserId);
  }, [events, selectedUserId]);

  const load = async () => {
    setLoading(true);
    setError('');
    setInfo('');

    try {
      if (isAdmin) {
        const list = await listAttendanceEmployees();
        setEmployees(list);

        // Si el user seleccionado ya no existe, volver al usuario actual
        const stillExists = list.some(e => e.id === selectedUserId);
        if (!stillExists) {
          setSelectedUserId(session.userId);
          setSelectedUserName(session.name);
        } else {
          const emp = list.find(e => e.id === selectedUserId);
          if (emp?.name) setSelectedUserName(emp.name);
        }
      }

      if (isOnline) {
        const sync = await syncPendingAttendanceEvents();
        setSyncSummary(sync.remaining > 0 || sync.synced > 0 ? sync : null);
      }

      const dayEvents = await listAttendanceEventsForDate(localDate);
      setEvents(dayEvents);
    } catch (e: any) {
      setError(e?.message || 'Error cargando asistencia');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localDate]);

  useEffect(() => {
    // Mantener el nombre sincronizado si cambia el usuario seleccionado
    if (selectedUserId === session.userId) {
      setSelectedUserName(session.name);
      return;
    }
    const emp = employees.find(e => e.id === selectedUserId);
    if (emp?.name) setSelectedUserName(emp.name);
  }, [selectedUserId, employees, session.userId, session.name]);

  const handleMark = async () => {
    setError('');
    setInfo('');

    setMarking(true);
    let location = null;
    try {
      setInfo('Obteniendo ubicación...');
      location = await getCurrentAttendanceLocation();
    } catch {
      location = null;
    }

    // Ubicación obligatoria
    if (!location || (location as any).error) {
      const reason = (location as any)?.error ? `: ${(location as any).error}` : '';
      setInfo('');
      setError(`Para marcar asistencia debes habilitar la ubicación (GPS)${reason}.`);
      setMarking(false);
      return;
    }

    const res = await recordAttendanceEvent({
      userId: selectedUserId,
      userName: selectedUserName,
      eventType: nextEventType,
      createdBy: session.username,
      note: note.trim() || undefined,
      location,
    });

    setMarking(false);

    if (!res.success) {
      setError(res.error || 'No se pudo registrar');
      return;
    }

    setNote('');

    const locationMsg = ' (ubicación guardada)';
    if (res.queued) {
      setInfo(`Registro guardado localmente (pendiente de sincronizar)${locationMsg}.`);
    } else {
      setInfo(`Registro guardado correctamente${locationMsg}.`);
    }

    await load();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">Asistencia del personal</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" title="Cerrar">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!isOnline && (
            <div className="p-3 rounded border bg-yellow-50 border-yellow-200 text-yellow-900 text-sm">
              Sin conexión: los registros se guardarán como pendientes.
            </div>
          )}

          {syncSummary && (
            <div className="p-3 rounded border bg-blue-50 border-blue-200 text-blue-900 text-sm">
              Sincronización: {syncSummary.synced} enviados, {syncSummary.remaining} pendientes.
            </div>
          )}

          {error && (
            <div className="p-3 rounded border bg-red-50 border-red-200 text-red-900 text-sm">{error}</div>
          )}
          {info && (
            <div className="p-3 rounded border bg-green-50 border-green-200 text-green-900 text-sm">{info}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1 font-medium">Fecha</label>
              <input
                type="date"
                value={localDate}
                onChange={e => setLocalDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-gray-600 mb-1 font-medium">Empleado</label>
              {isAdmin ? (
                <select
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm bg-white"
                >
                  <option value={session.userId}>{session.name} (tú)</option>
                  {employees
                    .filter(e => e.id !== session.userId)
                    .map(e => (
                      <option key={e.id} value={e.id}>
                        {e.name}{e.role ? ` — ${e.role}` : ''}
                      </option>
                    ))}
                </select>
              ) : (
                <div className="w-full px-3 py-2 border rounded-xl text-sm bg-gray-50 text-gray-800">
                  {session.name}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1 font-medium">Nota (opcional)</label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
              placeholder="Ej: Llegó tarde por tráfico"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleMark}
              disabled={loading || marking}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {marking ? 'Marcando...' : `Marcar ${nextEventType === 'IN' ? 'Ingreso' : 'Salida'}`}
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium transition-colors disabled:bg-gray-200 disabled:cursor-not-allowed"
            >
              {loading ? 'Cargando...' : 'Actualizar'}
            </button>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Registros del día</h3>
            {loading ? (
              <p className="text-gray-500 text-sm">Cargando registros...</p>
            ) : events.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay registros para esta fecha.</p>
            ) : (
              <div className="space-y-2">
                {events.map(ev => {
                  const time = ev.event_time ? new Date(ev.event_time).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '';
                  const hasLocation = typeof ev.location_lat === 'number' && typeof ev.location_lng === 'number';
                  const mapsUrl = hasLocation ? `https://www.google.com/maps?q=${ev.location_lat},${ev.location_lng}` : '';
                  return (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800">{ev.user_name}</span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              ev.event_type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {ev.event_type === 'IN' ? 'Ingreso' : 'Salida'}
                          </span>
                          {ev.synced === false && (
                            <span className="text-[10px] px-2 py-1 rounded bg-yellow-100 text-yellow-800">Pendiente</span>
                          )}
                        </div>
                        {ev.note && <p className="text-xs text-gray-500 mt-1">{ev.note}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-700 font-medium">{time}</p>
                        {ev.created_by && <p className="text-[10px] text-gray-400">por {ev.created_by}</p>}
                        {isAdmin && hasLocation && (
                          <div className="mt-1">
                            <p className="text-[10px] text-gray-500">{ev.location_lat.toFixed(6)}, {ev.location_lng.toFixed(6)}</p>
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block mt-1 text-[10px] px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                            >
                              Ver en mapa
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
