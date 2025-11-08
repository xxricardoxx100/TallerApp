"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { Car, Plus, ChevronRight, Save, X, CheckCircle, Search, FileText, Share2, Download } from 'lucide-react';
import { useVehicles } from '../hooks/useVehicles';
import { useUploadImages } from '../hooks/useUploadImages';
import { Vehicle } from '../lib/vehicles';
import { filterVehicles, SearchFilters, ESTADOS_DISPONIBLES } from '../lib/search';
import { downloadVehiclePDF, shareVehiclePDFWhatsApp } from '../lib/pdfGenerator';

const STATUS_TABS = [
  { label: 'Todos', value: '' },
  { label: 'En proceso', value: 'En proceso' },
  { label: 'Esperando piezas', value: 'Esperando piezas' },
  { label: 'Listo para entrega', value: 'Listo para entrega' },
  { label: 'Finalizado', value: 'Entregado' }
] as const;

export default function TallerMecanicoApp() {
  const { vehicles, loading, saveStatus, isOnline, isFromCache, addVehicle, addUpdate, saveVehicle } = useVehicles();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showNewVehicle, setShowNewVehicle] = useState(false);
  const [showNewUpdate, setShowNewUpdate] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  // Estado de filtros de búsqueda
  const [filters, setFilters] = useState<SearchFilters>({
    searchType: 'placa',
    searchValue: '',
    estado: '',
    fechaDesde: '',
    fechaHasta: ''
  });

  // Estado para notificaciones toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Sincronizar selectedVehicle cuando cambian los vehicles
  useEffect(() => {
    if (selectedVehicle) {
      const updated = vehicles.find(v => v.id === selectedVehicle.id);
      if (updated) {
        setSelectedVehicle(updated);
      }
    }
  }, [vehicles]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000); // Se oculta después de 3 segundos
  };

  // Manejar navegación del botón "Atrás" del navegador/teléfono
  useEffect(() => {
    const handlePopState = () => {
      // Cuando el usuario usa el botón "Atrás"
      if (selectedVehicle) {
        setSelectedVehicle(null);
      } else if (showNewVehicle) {
        setShowNewVehicle(false);
      } else if (showNewUpdate) {
        setShowNewUpdate(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedVehicle, showNewVehicle, showNewUpdate]);

  // Agregar entrada al historial cuando se abre un modal/detalle
  useEffect(() => {
    if (selectedVehicle || showNewVehicle || showNewUpdate) {
      window.history.pushState({ modal: true }, '');
    }
  }, [selectedVehicle, showNewVehicle, showNewUpdate]);

  // Vehículos filtrados (memoizados para no recalcular en cada render)
  const filteredVehicles = useMemo(() => {
    return filterVehicles(vehicles, filters);
  }, [vehicles, filters]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_TABS.forEach(tab => {
      counts[tab.value] = 0;
    });
    vehicles.forEach(vehicle => {
      counts[vehicle.estado] = (counts[vehicle.estado] ?? 0) + 1;
    });
    counts[''] = vehicles.length;
    return counts;
  }, [vehicles]);

  const hasActiveFilters = filters.searchValue || filters.estado || filters.fechaDesde || filters.fechaHasta;

  const clearFilters = () => {
    setFilters({ searchType: 'placa', searchValue: '', estado: '', fechaDesde: '', fechaHasta: '' });
  };

  // Form nuevo vehículo (usa hook de subida de imágenes)
  const NewVehicleForm: React.FC = () => {
    const { images, addFiles, removeAt, reset, isCompressing } = useUploadImages();
    const [formData, setFormData] = useState({
      placa: '', marca: '', modelo: '', año: '', cliente: '', telefono: '', problema: ''
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async () => {
      if (!formData.placa || !formData.cliente) { 
        showToast('La placa y el cliente son obligatorios', 'error'); 
        return; 
      }
      
      // Mostrar mensaje de "guardando" inmediatamente
      setSaving(true);
      showToast('Guardando vehículo...', 'success');
      
      // Separar imágenes originales y thumbnails
      const imagenes = images.map(img => img.original);
      const thumbnails = images.map(img => img.thumbnail);
      
      const success = await addVehicle({ ...formData, imagenes, thumbnails } as any);
      
      if (success) {
        showToast('✅ Vehículo registrado con éxito', 'success');
        // Esperar un momento para que el usuario vea el mensaje antes de cerrar
        setTimeout(() => {
          setSaving(false);
          setShowNewVehicle(false);
          setFormData({ placa: '', marca: '', modelo: '', año: '', cliente: '', telefono: '', problema: '' });
          reset();
        }, 1000);
      } else {
        setSaving(false);
        showToast('❌ Error al guardar el vehículo', 'error');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Nuevo Vehículo</h2>
            <button onClick={() => setShowNewVehicle(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Placa *</label>
                <input value={formData.placa} onChange={e => setFormData({ ...formData, placa: e.target.value.toUpperCase() })} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Año</label>
                <input value={formData.año} onChange={e => setFormData({ ...formData, año: e.target.value })} className="w-full p-2 border rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Marca</label>
                <input value={formData.marca} onChange={e => setFormData({ ...formData, marca: e.target.value })} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Modelo</label>
                <input value={formData.modelo} onChange={e => setFormData({ ...formData, modelo: e.target.value })} className="w-full p-2 border rounded" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cliente *</label>
              <input value={formData.cliente} onChange={e => setFormData({ ...formData, cliente: e.target.value })} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} className="w-full p-2 border rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Problema / Trabajo</label>
              <textarea value={formData.problema} onChange={e => setFormData({ ...formData, problema: e.target.value })} className="w-full p-2 border rounded h-24" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Imágenes</label>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                onChange={e => addFiles(e.target.files)} 
                className="w-full p-2 border rounded"
                disabled={isCompressing}
              />
              {isCompressing && (
                <p className="text-xs text-blue-600 mt-2">Comprimiendo imágenes...</p>
              )}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {images.map((img, i) => (
                    <div key={i} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.thumbnail} alt={`upload-${i}`} className="w-full h-24 object-cover rounded" />
                      <button onClick={() => removeAt(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded p-1"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button 
              onClick={handleSubmit} 
              disabled={saving}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save size={20} /> Guardar Vehículo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const NewUpdateForm: React.FC = () => {
    const { images, addFiles, removeAt, reset, isCompressing } = useUploadImages();
    const [descripcion, setDescripcion] = useState('');
    const [saving, setSaving] = useState(false);
    
    const handleSubmit = async () => {
      if (!descripcion || !selectedVehicle) { 
        showToast('Descripción requerida', 'error'); 
        return; 
      }
      
      // Mostrar mensaje de "guardando" inmediatamente
      setSaving(true);
      showToast('Guardando actualización...', 'success');
      
      // Separar imágenes originales y thumbnails
      const imagenes = images.map(img => img.original);
      const thumbnails = images.map(img => img.thumbnail);
      
      const success = await addUpdate(selectedVehicle.id, { descripcion, imagenes, thumbnails } as any);
      
      if (success && selectedVehicle) {
        showToast('✅ Actualización guardada con éxito', 'success');
        // Esperar un momento para que el usuario vea el mensaje antes de cerrar
        setTimeout(() => {
          setSaving(false);
          setShowNewUpdate(false); 
          setDescripcion(''); 
          reset();
        }, 1000);
      } else {
        setSaving(false);
        showToast('❌ Error al guardar la actualización', 'error');
      }
    };
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold">Nueva Actualización</h2>
            <button onClick={() => setShowNewUpdate(false)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} className="w-full p-2 border rounded h-32" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Imágenes del avance</label>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                onChange={e => addFiles(e.target.files)} 
                className="w-full p-2 border rounded"
                disabled={isCompressing}
              />
              {isCompressing && (
                <p className="text-xs text-blue-600 mt-2">Comprimiendo imágenes...</p>
              )}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {images.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img.thumbnail} alt={`update-${i}`} className="w-full h-24 object-cover rounded" />
                      <button onClick={() => removeAt(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded p-1"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button 
              onClick={handleSubmit} 
              disabled={saving}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={20} /> Guardar Actualización
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const VehicleDetail: React.FC = () => {
    const [modalImage, setModalImage] = useState<string | null>(null);
    const [generatingPDF, setGeneratingPDF] = useState(false);
    
    if (!selectedVehicle) return null;
    
    const updateStatus = async (estado: string) => {
      const updated = { ...selectedVehicle, estado } as Vehicle;
      const ok = await saveVehicle(updated);
      if (ok) setSelectedVehicle(updated);
    };

    const handleDownloadPDF = async () => {
      setGeneratingPDF(true);
      try {
        await downloadVehiclePDF(selectedVehicle);
        showToast('PDF descargado exitosamente');
      } catch (error) {
        console.error('Error generando PDF:', error);
        showToast('Error al generar PDF');
      } finally {
        setGeneratingPDF(false);
      }
    };

    const handleShareWhatsApp = async () => {
      setGeneratingPDF(true);
      try {
        await shareVehiclePDFWhatsApp(selectedVehicle, selectedVehicle.accessCode);
        showToast('Abriendo WhatsApp...');
      } catch (error) {
        console.error('Error compartiendo por WhatsApp:', error);
        showToast('Error al compartir por WhatsApp');
      } finally {
        setGeneratingPDF(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-white z-40 overflow-y-auto">
        <div className="sticky top-0 bg-blue-600 text-white p-4 flex items-center gap-3 shadow-md">
          <button onClick={() => setSelectedVehicle(null)} className="text-white"><X size={24} /></button>
          <div className="flex-1">
            <h2 className="text-lg font-bold">{selectedVehicle.placa}</h2>
            <p className="text-sm opacity-90">{selectedVehicle.marca} {selectedVehicle.modelo}</p>
          </div>
        </div>

        {/* Botones de acción PDF y WhatsApp */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 border-b border-blue-200">
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={generatingPDF}
              className="flex-1 flex items-center justify-center gap-2 bg-white text-blue-600 px-4 py-2.5 rounded-lg font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-blue-200"
            >
              {generatingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                  <span className="text-sm">Generando...</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span className="text-sm">Descargar PDF</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleShareWhatsApp}
              disabled={generatingPDF}
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm hover:shadow-md hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span className="text-sm">Preparando...</span>
                </>
              ) : (
                <>
                  <Share2 size={18} />
                  <span className="text-sm">Enviar WhatsApp</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-3">Información del Cliente</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Cliente:</span> {selectedVehicle.cliente}</p>
              {selectedVehicle.telefono && <p><span className="font-medium">Teléfono:</span> {selectedVehicle.telefono}</p>}
              <p><span className="font-medium">Ingreso:</span> {new Date(selectedVehicle.fechaIngreso).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              {selectedVehicle.accessCode && (
                <p>
                  <span className="font-medium">Código de acceso:</span>{' '}
                  <span className="font-mono text-blue-600 font-semibold">{selectedVehicle.accessCode}</span>
                </p>
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-2">Estado</h3>
            <select value={selectedVehicle.estado} onChange={e => updateStatus(e.target.value)} className="w-full p-2 border rounded">
              <option value="En proceso">En proceso</option>
              <option value="Esperando piezas">Esperando piezas</option>
              <option value="Listo para entrega">Listo para entrega</option>
              <option value="Entregado">Entregado</option>
            </select>
          </div>
          {!!selectedVehicle.problema && (
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-2">Trabajo a Realizar</h3>
              <p className="text-sm text-gray-700">{selectedVehicle.problema}</p>
            </div>)}
          {selectedVehicle.imagenes.length > 0 && (
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-3">Imágenes Iniciales</h3>
              <div className="grid grid-cols-3 gap-2">
                {selectedVehicle.imagenes.map((img, i) => {
                  // Usar thumbnail si está disponible, sino la imagen original
                  const thumbnailSrc = selectedVehicle.thumbnails?.[i] || img;
                  return (
                    <button key={i} onClick={() => setModalImage(img)} className="overflow-hidden rounded">
                      <img src={thumbnailSrc} alt={`vehiculo-${i}`} className="w-full h-20 object-cover rounded-sm" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </button>
                  );
                })}
              </div>
            </div>)}
          {modalImage && (
            <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={() => setModalImage(null)}>
              <button onClick={e => { e.stopPropagation(); setModalImage(null); }} className="absolute top-6 right-6 text-white bg-black bg-opacity-30 p-2 rounded-full" aria-label="Cerrar imagen"><X size={28} /></button>
              <img src={modalImage} alt="Imagen ampliada" className="max-h-[90vh] max-w-[90vw] object-contain rounded" onClick={e => e.stopPropagation()} />
            </div>)}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Actualizaciones</h3>
              <button onClick={() => setShowNewUpdate(true)} className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1"><Plus size={16} /> Nueva</button>
            </div>
            {selectedVehicle.actualizaciones.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No hay actualizaciones aún</p>
            ) : (
              <div className="space-y-3">
                {selectedVehicle.actualizaciones.map(upd => (
                  <div key={upd.id} className="border-l-4 border-blue-500 pl-3 py-2">
                    <p className="text-xs text-gray-500 mb-1">{new Date(upd.fecha).toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-sm text-gray-700">{upd.descripcion}</p>
                    {upd.imagenes.length > 0 && (
                      <div className="grid grid-cols-3 gap-1 mt-2">
                        {upd.imagenes.map((img, i) => {
                          const thumbnailSrc = upd.thumbnails?.[i] || img;
                          return (
                            <button key={i} onClick={() => setModalImage(img)} className="overflow-hidden rounded">
                              <img src={thumbnailSrc} alt={`update-${i}`} className="w-full h-20 object-cover rounded" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            </button>
                          );
                        })}
                      </div>)}
                  </div>
                ))}
              </div>)}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-30 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car size={28} />
            <div>
              <h1 className="text-xl font-bold">Taller Caltimer</h1>
              <p className="text-xs opacity-90">{filteredVehicles.length} de {vehicles.length} vehículos</p>
            </div>
          </div>
          <button 
            onClick={() => setShowSearch(!showSearch)} 
            className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-colors"
          >
            <Search size={20} />
          </button>
        </div>
      </div>

      {/* Banner de estado de conexión */}
      {!isOnline && (
        <div className="bg-red-500 text-white text-center py-2 px-4 text-sm font-medium shadow-md">
          ⚠️ Sin conexión - Mostrando datos offline
        </div>
      )}
      {isOnline && isFromCache && (
        <div className="bg-blue-500 text-white text-center py-2 px-4 text-sm font-medium shadow-md animate-pulse">
          🔄 Sincronizando con el servidor...
        </div>
      )}

        {/* Tabs de estados */}
        <div className="bg-white border-b shadow-sm">
          <div className="flex overflow-x-auto gap-2 px-4 py-3">
            {STATUS_TABS.map(tab => {
              const isActive = filters.estado === tab.value;
              const count = statusCounts[tab.value] ?? 0;
              return (
                <button
                  key={tab.value ?? 'all'}
                  onClick={() => setFilters(prev => ({ ...prev, estado: tab.value }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    isActive ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-2 py-0.5 rounded-full ${isActive ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-700'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      {/* Panel de Búsqueda */}
      {showSearch && (
        <div className="bg-white border-b shadow-sm p-4 sticky top-[72px] z-20">
          <div className="space-y-3">
            {/* Búsqueda flexible con selector de tipo */}
            <div className="grid grid-cols-3 gap-2">
              <select
                value={filters.searchType}
                onChange={e => setFilters({ ...filters, searchType: e.target.value as any })}
                className="px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200 cursor-pointer hover:from-blue-100 hover:to-blue-200 transition-all shadow-sm"
              >
                <option value="placa">Placa</option>
                <option value="cliente">Cliente</option>
                <option value="marca">Marca</option>
                <option value="modelo">Modelo</option>
              </select>
              <input
                type="text"
                placeholder={`Buscar por ${filters.searchType}...`}
                value={filters.searchValue}
                onChange={e => setFilters({ ...filters, searchValue: e.target.value })}
                className="col-span-2 px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
              />
            </div>
            <select
              value={filters.estado}
              onChange={e => setFilters({ ...filters, estado: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-400 bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300 cursor-pointer hover:from-gray-100 hover:to-gray-200 transition-all shadow-sm"
            >
              <option value="">Todos los estados</option>
              {ESTADOS_DISPONIBLES.map(estado => (
                <option key={estado} value={estado}>{estado}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1 font-medium">Desde:</label>
                <input
                  type="date"
                  value={filters.fechaDesde}
                  onChange={e => setFilters({ ...filters, fechaDesde: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1 font-medium">Hasta:</label>
                <input
                  type="date"
                  value={filters.fechaHasta}
                  onChange={e => setFilters({ ...filters, fechaHasta: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      )}

      <div className="p-4 space-y-3">
        {vehicles.length === 0 ? (
          <div className="text-center py-12">
            <Car size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">No hay vehículos registrados</p>
            <p className="text-sm text-gray-500">Comienza agregando el primer vehículo</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="text-center py-12">
            <Search size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">No se encontraron vehículos</p>
            <p className="text-sm text-gray-500">Intenta ajustar los filtros de búsqueda</p>
          </div>
        ) : (
          filteredVehicles.map(v => (
            <div key={v.id} onClick={() => setSelectedVehicle(v)} className="bg-white rounded-lg p-4 shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg">{v.placa}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      v.estado === 'Entregado' ? 'bg-gray-200 text-gray-700' :
                      v.estado === 'Listo para entrega' ? 'bg-green-100 text-green-700' :
                      v.estado === 'Esperando piezas' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                    }`}>{v.estado}</span>
                  </div>
                  <p className="text-sm text-gray-600">{v.marca} {v.modelo} {v.año}</p>
                  <p className="text-sm text-gray-800 font-medium">{v.cliente}</p>
                  <p className="text-xs text-gray-500 mt-1">{new Date(v.fechaIngreso).toLocaleDateString('es-PE')}</p>
                  {v.actualizaciones.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">{v.actualizaciones.length} actualización{v.actualizaciones.length !== 1 ? 'es' : ''}</p>
                  )}
                </div>
                <ChevronRight className="text-gray-400" size={20} />
              </div>
            </div>
          ))
        )}
      </div>
      <button 
        onClick={() => setShowNewVehicle(true)} 
        disabled={!isOnline}
        className={`fixed bottom-6 right-6 text-white p-4 rounded-full shadow-lg transition-colors z-30 ${
          isOnline ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
        }`}
        title={isOnline ? 'Agregar vehículo' : 'Sin conexión - No se pueden agregar vehículos'}
      >
        <Plus size={28} />
      </button>
      {showNewVehicle && <NewVehicleForm />}
      {showNewUpdate && <NewUpdateForm />}
      {selectedVehicle && <VehicleDetail />}
      
      {/* Toast de notificación */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={24} /> : <X size={24} />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
