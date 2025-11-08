"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Car, Calendar, User, Phone, FileText, Clock, ArrowLeft, Download, AlertCircle } from 'lucide-react';
import initStorage from '../../storage';
import { Vehicle, normalizeVehicle } from '../../../lib/vehicles';
import { downloadVehiclePDF } from '../../../lib/pdfGenerator';

function ConsultaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const placa = searchParams.get('placa');
  const codigo = searchParams.get('codigo');

  useEffect(() => {
    const fetchVehicle = async () => {
      if (!placa || !codigo) {
        setError('Faltan datos de consulta');
        setLoading(false);
        return;
      }

      try {
        await initStorage();
        const listResult = await (window as any).storage.list('vehicle:', true);
        
        if (!listResult?.items) {
          setError('No se encontró el vehículo');
          setLoading(false);
          return;
        }

        const vehicles = listResult.items
          .map((it: any) => {
            try { return JSON.parse(it.value); } catch { return null; }
          })
          .filter(Boolean)
          .map(normalizeVehicle);

        // Buscar vehículo por placa y código
        const found = vehicles.find((v: Vehicle) => 
          v.placa.toUpperCase() === placa.toUpperCase() && 
          v.accessCode === codigo.toUpperCase()
        );

        if (found) {
          setVehicle(found);
        } else {
          setError('Vehículo no encontrado. Verifica tu placa y código de acceso.');
        }
      } catch (e) {
        console.error('Error cargando vehículo:', e);
        setError('Error al cargar la información. Intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicle();
  }, [placa, codigo]);

  const handleDownloadPDF = async () => {
    if (!vehicle) return;
    setDownloadingPDF(true);
    try {
      await downloadVehiclePDF(vehicle);
    } catch (error) {
      console.error('Error descargando PDF:', error);
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="bg-blue-600 text-white py-6 shadow-lg">
          <div className="container mx-auto px-4">
            <button
              onClick={() => router.push('/cliente')}
              className="flex items-center gap-2 text-white hover:text-blue-100 transition-colors mb-4"
            >
              <ArrowLeft size={20} />
              <span>Volver</span>
            </button>
            <h1 className="text-2xl font-bold">Portal del Cliente</h1>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <AlertCircle size={32} className="text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">No encontrado</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={() => router.push('/cliente')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Intentar nuevamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <div className="bg-blue-600 text-white py-6 shadow-lg sticky top-0 z-30">
        <div className="container mx-auto px-4">
          <button
            onClick={() => router.push('/cliente')}
            className="flex items-center gap-2 text-white hover:text-blue-100 transition-colors mb-3"
          >
            <ArrowLeft size={20} />
            <span>Volver</span>
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{vehicle.placa}</h1>
              <p className="text-blue-100 text-sm">{vehicle.marca} {vehicle.modelo} {vehicle.año}</p>
            </div>
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {downloadingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="hidden sm:inline">Generando...</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span className="hidden sm:inline">Descargar PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Estado actual */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Estado Actual</h2>
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                vehicle.estado === 'Entregado' ? 'bg-gray-200 text-gray-700' :
                vehicle.estado === 'Listo para entrega' ? 'bg-green-100 text-green-700' :
                vehicle.estado === 'Esperando piezas' ? 'bg-yellow-100 text-yellow-700' : 
                'bg-blue-100 text-blue-700'
              }`}>
                {vehicle.estado}
              </span>
            </div>
          </div>
        </div>

        {/* Información del cliente */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User size={20} className="text-blue-600" />
            Información del Cliente
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Cliente</p>
              <p className="font-medium text-gray-800">{vehicle.cliente}</p>
            </div>
            {vehicle.telefono && (
              <div>
                <p className="text-gray-500 mb-1">Teléfono</p>
                <p className="font-medium text-gray-800">{vehicle.telefono}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500 mb-1">Fecha de Ingreso</p>
              <p className="font-medium text-gray-800">
                {new Date(vehicle.fechaIngreso).toLocaleDateString('es-PE', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Problema inicial */}
        {vehicle.problema && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <FileText size={20} className="text-blue-600" />
              Trabajo Solicitado
            </h3>
            <p className="text-gray-700 text-sm leading-relaxed">{vehicle.problema}</p>
          </div>
        )}

        {/* Imágenes iniciales */}
        {vehicle.imagenes.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Imágenes Iniciales</h3>
            <div className="grid grid-cols-3 gap-3">
              {vehicle.imagenes.map((img, i) => {
                const thumbnailSrc = vehicle.thumbnails?.[i] || img;
                return (
                  <button
                    key={i}
                    onClick={() => setModalImage(img)}
                    className="overflow-hidden rounded-lg hover:opacity-75 transition-opacity"
                  >
                    <img
                      src={thumbnailSrc}
                      alt={`Imagen inicial ${i + 1}`}
                      className="w-full h-24 object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Historial de actualizaciones */}
        {vehicle.actualizaciones.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock size={20} className="text-blue-600" />
              Historial de Actualizaciones
            </h3>
            <div className="space-y-4">
              {vehicle.actualizaciones.map((upd) => (
                <div key={upd.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <p className="text-xs text-gray-500 mb-2">
                    {new Date(upd.fecha).toLocaleDateString('es-PE', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                  <p className="text-sm text-gray-700 mb-2">{upd.descripcion}</p>
                  {upd.imagenes.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {upd.imagenes.map((img, i) => {
                        const thumbnailSrc = upd.thumbnails?.[i] || img;
                        return (
                          <button
                            key={i}
                            onClick={() => setModalImage(img)}
                            className="overflow-hidden rounded hover:opacity-75 transition-opacity"
                          >
                            <img
                              src={thumbnailSrc}
                              alt={`Actualización ${i + 1}`}
                              className="w-full h-20 object-cover"
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de imagen */}
      {modalImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setModalImage(null)}
        >
          <img
            src={modalImage}
            alt="Imagen ampliada"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  );
}

export default function ConsultaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    }>
      <ConsultaContent />
    </Suspense>
  );
}
