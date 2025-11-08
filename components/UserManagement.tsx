/**
 * Componente para gestionar usuarios mecánicos (solo admin)
 */
import React, { useState, useEffect } from 'react';
import { User, getAllUsers, createMechanic, deactivateUser } from '../lib/auth';

interface UserManagementProps {
  currentUsername: string;
  onClose: () => void;
}

export default function UserManagement({ currentUsername, onClose }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Cargar usuarios
  const loadUsers = async () => {
    setLoading(true);
    const userList = await getAllUsers();
    setUsers(userList);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Crear nuevo mecánico
  const handleCreateMechanic = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    const result = await createMechanic(username, password, name, currentUsername);

    if (result.success) {
      setSuccess(`Usuario "${username}" creado exitosamente`);
      setUsername('');
      setPassword('');
      setName('');
      setShowCreateForm(false);
      loadUsers();
    } else {
      setError(result.error || 'Error al crear el usuario');
    }

    setSubmitting(false);
  };

  // Desactivar usuario
  const handleDeactivate = async (userId: string, userName: string) => {
    if (!confirm(`¿Estás seguro de desactivar al usuario "${userName}"?`)) {
      return;
    }

    const result = await deactivateUser(userId);
    if (result.success) {
      setSuccess(`Usuario "${userName}" desactivado`);
      loadUsers();
    } else {
      setError(result.error || 'Error al desactivar el usuario');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Mensajes */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {success}
            </div>
          )}

          {/* Botón crear nuevo */}
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              + Crear Nuevo Mecánico
            </button>
          )}

          {/* Formulario crear mecánico */}
          {showCreateForm && (
            <form onSubmit={handleCreateMechanic} className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Nuevo Mecánico</h3>
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de Usuario
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="usuario123"
                  required
                  minLength={3}
                  disabled={submitting}
                />
                <p className="text-xs text-gray-500 mt-1">Mínimo 3 caracteres, solo letras y números</p>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••"
                  required
                  minLength={6}
                  disabled={submitting}
                />
                <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Juan Pérez"
                  required
                  minLength={3}
                  disabled={submitting}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creando...' : 'Crear Usuario'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setUsername('');
                    setPassword('');
                    setName('');
                    setError('');
                  }}
                  disabled={submitting}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Lista de usuarios */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Usuarios Activos</h3>
            
            {loading ? (
              <p className="text-gray-500">Cargando usuarios...</p>
            ) : users.length === 0 ? (
              <p className="text-gray-500">No hay usuarios registrados</p>
            ) : (
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800">{user.name}</p>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {user.role === 'admin' ? 'Admin' : 'Mecánico'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                      {user.created_at && (
                        <p className="text-xs text-gray-400">
                          Creado: {new Date(user.created_at).toLocaleDateString('es-ES')}
                          {user.created_by && ` por ${user.created_by}`}
                        </p>
                      )}
                    </div>
                    
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => handleDeactivate(user.id, user.name)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200"
                      >
                        Desactivar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
