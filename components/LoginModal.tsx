import { useState } from 'react';
import { X, Lock, User } from 'lucide-react';

interface LoginModalProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
}

export default function LoginModal({ onLogin }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validaciones básicas
    if (!username.trim() || !password.trim()) {
      setError('Por favor ingrese usuario y contraseña');
      setIsLoading(false);
      return;
    }

    // Intentar login
    const success = await onLogin(username, password);
    
    if (!success) {
      setError('Usuario o contraseña incorrectos');
      setPassword('');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold text-center">Mecatronica Caltimer</h2>
          <p className="text-center text-blue-100 mt-2">Ingrese sus credenciales</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Username */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Usuario
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ingrese su usuario"
                autoComplete="username"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-medium mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ingrese su contraseña"
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>

          {/* Help Text */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 font-medium mb-1">Usuario administrador:</p>
            <p className="text-xs text-blue-700">
              • <code className="bg-blue-100 px-1 rounded">admin / admin123</code>
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Los mecánicos deben usar las credenciales asignadas por el administrador
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
