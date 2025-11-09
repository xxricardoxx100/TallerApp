"use client";
import React, { useState } from 'react';
import { Search, Lock, Car } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ClientePortal() {
  const router = useRouter();
  const [placa, setPlaca] = useState('');
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!placa.trim() || !codigo.trim()) {
      setError('Por favor ingresa la placa y el código de acceso');
      return;
    }

    setLoading(true);

    // Redirigir a la página de consulta
    router.push(`/cliente/consulta?placa=${encodeURIComponent(placa.toUpperCase())}&codigo=${encodeURIComponent(codigo.toUpperCase())}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <div className="bg-blue-600 text-white py-8 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-3">
            <img 
              src="/images/logo.png" 
              alt="Mecatronica Caltimer Logo" 
              className="h-12 w-auto"
            />
            <div>
              <h1 className="text-3xl font-bold">MECATRONICA CALTIMER</h1>
              <p className="text-blue-100 text-sm">Portal del Cliente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario de consulta */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Search size={32} className="text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Consulta tu Vehículo
              </h2>
              <p className="text-gray-600 text-sm">
                Ingresa tu placa y código de acceso para ver el historial de servicio
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Placa del Vehículo
                </label>
                <div className="relative">
                  <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors uppercase"
                    maxLength={10}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Código de Acceso
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    placeholder="CAL-2025-XXXX"
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors uppercase font-mono"
                    maxLength={20}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  El código te fue proporcionado por el taller
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {loading ? 'Buscando...' : 'Consultar Historial'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-center text-xs text-gray-500">
                ¿No tienes un código de acceso?<br />
                Solicítalo a Mecatronica Caltimer
              </p>
            </div>
          </div>

          {/* Información adicional */}
          <div className="mt-8 bg-white rounded-xl shadow-md p-6">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Lock size={18} className="text-blue-600" />
              Seguridad y Privacidad
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Tu información está protegida y solo es accesible con tu código único</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>El código es personal y no debe ser compartido</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Puedes consultar el estado de tu vehículo 24/7</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
