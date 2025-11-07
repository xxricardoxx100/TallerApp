'use client'

import React, { useState, useEffect } from 'react';
import { Car, Camera, Clock, FileText, Plus, ChevronRight, Save, X, CheckCircle } from 'lucide-react';
import initStorage from '../app/storage';

export default function TallerMecanicoApp() {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showNewVehicle, setShowNewVehicle] = useState(false);
  const [showNewUpdate, setShowNewUpdate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');

  // Inicializar storage y cargar vehículos
  useEffect(() => {
    // Aseguramos inicialización antes de listar para evitar condiciones de carrera
    (async () => {
      await initStorage();
      await loadVehicles();
    })();
  }, []);

  const loadVehicles = async () => {
    try {
      if (!window.storage) {
        await initStorage();
      }
      const listResult = await window.storage.list('vehicle:', true);
      if (listResult && listResult.items) {
        const vehicleData = listResult.items.map(it => {
          try { return JSON.parse(it.value); } catch { return null; }
        }).filter(v => v !== null);
        const normalized = vehicleData.map(v => ({
          ...v,
          imagenes: Array.isArray(v.imagenes) ? v.imagenes : [],
          actualizaciones: Array.isArray(v.actualizaciones) ? v.actualizaciones : [],
        })).sort((a, b) => new Date(b.fechaIngreso || 0) - new Date(a.fechaIngreso || 0));
        setVehicles(normalized);
      }
    } catch (error) {
      console.log('Iniciando con lista vacía');
      setVehicles([]);
    }
    setLoading(false);
  };

  const saveVehicle = async (vehicleData) => {
    try {
      setSaveStatus('Guardando...');
      // Verificar que window.storage está disponible
      if (!window.storage) {
        await initStorage();
        if (!window.storage) {
          throw new Error('Storage no está disponible');
        }
      }
      
      await window.storage.set(
        `vehicle:${vehicleData.id}`,
        JSON.stringify(vehicleData),
        true
      );
      await loadVehicles();
      setSaveStatus('✓ Guardado');
      setTimeout(() => setSaveStatus(''), 2000);
      return true;
    } catch (error) {
      console.error('Error al guardar:', error);
      setSaveStatus('Error al guardar: ' + error.message);
      setTimeout(() => setSaveStatus(''), 3000);
      return false;
    }
  };

  const NewVehicleForm = () => {
    const [formData, setFormData] = useState({
      placa: '',
      marca: '',
      modelo: '',
      año: '',
      cliente: '',
      telefono: '',
      problema: '',
      imagenes: []
    });

    const handleImageUpload = (e) => {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFormData(prev => ({
            ...prev,
            imagenes: [...prev.imagenes, event.target.result]
          }));
        };
        reader.readAsDataURL(file);
      });
    };

    const removeImage = (index) => {
      setFormData(prev => ({
        ...prev,
        imagenes: prev.imagenes.filter((_, i) => i !== index)
      }));
    };

    const handleSubmit = async () => {
      if (!formData.placa || !formData.cliente) {
        alert('La placa y el nombre del cliente son obligatorios');
        return;
      }

      const newVehicle = {
        id: Date.now().toString(),
        ...formData,
        fechaIngreso: new Date().toISOString(),
        estado: 'En proceso',
        actualizaciones: []
      };

      const success = await saveVehicle(newVehicle);
      if (success) {
        setShowNewVehicle(false);
        setFormData({
          placa: '',
          marca: '',
          modelo: '',
          año: '',
          cliente: '',
          telefono: '',
          problema: '',
          imagenes: []
        });
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Nuevo Vehículo</h2>
            <button onClick={() => setShowNewVehicle(false)} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Placa *</label>
                <input
                  type="text"
                  value={formData.placa}
                  onChange={(e) => setFormData({...formData, placa: e.target.value.toUpperCase()})}
                  className="w-full p-2 border rounded-lg"
                  placeholder="ABC-123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                <input
                  type="text"
                  value={formData.año}
                  onChange={(e) => setFormData({...formData, año: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                  placeholder="2020"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                <input
                  type="text"
                  value={formData.marca}
                  onChange={(e) => setFormData({...formData, marca: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Toyota"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                <input
                  type="text"
                  value={formData.modelo}
                  onChange={(e) => setFormData({...formData, modelo: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Corolla"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <input
                type="text"
                value={formData.cliente}
                onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                className="w-full p-2 border rounded-lg"
                placeholder="Nombre del cliente"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                className="w-full p-2 border rounded-lg"
                placeholder="999-999-999"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Problema/Trabajo a realizar</label>
              <textarea
                value={formData.problema}
                onChange={(e) => setFormData({...formData, problema: e.target.value})}
                className="w-full p-2 border rounded-lg h-24"
                placeholder="Describe el problema o trabajo a realizar..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Imágenes del vehículo</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="w-full p-2 border rounded-lg"
              />
              {formData.imagenes.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {formData.imagenes.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img src={img} alt={`Upload ${idx}`} className="w-full h-24 object-cover rounded" />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Save size={20} />
              Guardar Vehículo
            </button>
          </div>
        </div>
      </div>
    );
  };

  const NewUpdateForm = () => {
    const [updateData, setUpdateData] = useState({
      descripcion: '',
      imagenes: []
    });

    const handleImageUpload = (e) => {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          setUpdateData(prev => ({
            ...prev,
            imagenes: [...prev.imagenes, event.target.result]
          }));
        };
        reader.readAsDataURL(file);
      });
    };

    const removeImage = (index) => {
      setUpdateData(prev => ({
        ...prev,
        imagenes: prev.imagenes.filter((_, i) => i !== index)
      }));
    };

    const handleSubmit = async () => {
      if (!updateData.descripcion) {
        alert('Debes agregar una descripción');
        return;
      }

      const newUpdate = {
        id: Date.now().toString(),
        fecha: new Date().toISOString(),
        ...updateData
      };

      const updatedVehicle = {
        ...selectedVehicle,
        actualizaciones: [...(selectedVehicle?.actualizaciones || []), newUpdate]
      };

      const success = await saveVehicle(updatedVehicle);
      if (success) {
        setSelectedVehicle(updatedVehicle);
        setShowNewUpdate(false);
        setUpdateData({ descripcion: '', imagenes: [] });
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Nueva Actualización</h2>
            <button onClick={() => setShowNewUpdate(false)} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del avance</label>
              <textarea
                value={updateData.descripcion}
                onChange={(e) => setUpdateData({...updateData, descripcion: e.target.value})}
                className="w-full p-2 border rounded-lg h-32"
                placeholder="Describe el trabajo realizado..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Imágenes del avance</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="w-full p-2 border rounded-lg"
              />
              {updateData.imagenes.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {updateData.imagenes.map((img, idx) => (
                    <div key={idx} className="relative">
                      <img src={img} alt={`Update ${idx}`} className="w-full h-24 object-cover rounded" />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <CheckCircle size={20} />
              Guardar Actualización
            </button>
          </div>
        </div>
      </div>
    );
  };

  const VehicleDetail = () => {
    const updateStatus = async (newStatus) => {
      const updatedVehicle = { ...selectedVehicle, estado: newStatus };
      const success = await saveVehicle(updatedVehicle);
      if (success) {
        setSelectedVehicle(updatedVehicle);
      }
    };

    // Estado para la imagen modal (imagen en tamaño completo)
    const [modalImage, setModalImage] = useState(null);

    return (
      <div className="fixed inset-0 bg-white z-40 overflow-y-auto">
        <div className="sticky top-0 bg-blue-600 text-white p-4 flex items-center gap-3">
          <button onClick={() => setSelectedVehicle(null)} className="text-white">
            <X size={24} />
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-bold">{selectedVehicle.placa}</h2>
            <p className="text-sm opacity-90">{selectedVehicle.marca} {selectedVehicle.modelo}</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-3">Información del Cliente</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Cliente:</span> {selectedVehicle.cliente}</p>
              {selectedVehicle.telefono && <p><span className="font-medium">Teléfono:</span> {selectedVehicle.telefono}</p>}
              <p><span className="font-medium">Ingreso:</span> {new Date(selectedVehicle.fechaIngreso).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold mb-2">Estado</h3>
            <select
              value={selectedVehicle.estado}
              onChange={(e) => updateStatus(e.target.value)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="En proceso">En proceso</option>
              <option value="Esperando piezas">Esperando piezas</option>
              <option value="Listo para entrega">Listo para entrega</option>
              <option value="Entregado">Entregado</option>
            </select>
          </div>

          {selectedVehicle.problema && (
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-2">Trabajo a Realizar</h3>
              <p className="text-sm text-gray-700">{selectedVehicle.problema}</p>
            </div>
          )}

          {Array.isArray(selectedVehicle.imagenes) && selectedVehicle.imagenes.length > 0 && (
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-3">Imágenes Iniciales</h3>
              <div className="grid grid-cols-3 gap-2">
                {selectedVehicle.imagenes.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setModalImage(img)}
                    className="overflow-hidden rounded focus:outline-none"
                    aria-label={`Abrir imagen ${idx} en tamaño completo`}
                  >
                    <img
                      src={img}
                      alt={`Vehicle ${idx}`}
                      className="w-full h-20 object-cover rounded-sm transform hover:scale-105 transition-transform"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Modal para mostrar imagen en tamaño completo */}
          {modalImage && (
            <div
              className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
              onClick={() => setModalImage(null)}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setModalImage(null); }}
                className="absolute top-6 right-6 text-white bg-black bg-opacity-30 p-2 rounded-full"
                aria-label="Cerrar imagen"
              >
                <X size={28} />
              </button>

              <img
                src={modalImage}
                alt="Imagen del vehículo ampliada"
                className="max-h-[90vh] max-w-[90vw] object-contain rounded"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <div className="bg-white rounded-lg border p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Actualizaciones</h3>
              <button
                onClick={() => setShowNewUpdate(true)}
                className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1"
              >
                <Plus size={16} />
                Nueva
              </button>
            </div>
            
            {(Array.isArray(selectedVehicle.actualizaciones) ? selectedVehicle.actualizaciones.length : 0) === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No hay actualizaciones aún</p>
            ) : (
              <div className="space-y-3">
                {(selectedVehicle.actualizaciones || []).map((update) => (
                  <div key={update.id} className="border-l-4 border-blue-500 pl-3 py-2">
                    <p className="text-xs text-gray-500 mb-1">
                      {new Date(update.fecha).toLocaleDateString('es-PE', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <p className="text-sm text-gray-700">{update.descripcion}</p>
                    {Array.isArray(update.imagenes) && update.imagenes.length > 0 && (
                      <div className="grid grid-cols-3 gap-1 mt-2">
                        {update.imagenes.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => setModalImage(img)}
                            className="overflow-hidden rounded focus:outline-none"
                            aria-label={`Abrir imagen de actualización ${idx} en tamaño completo`}
                          >
                            <img
                              src={img}
                              alt={`Update ${idx}`}
                              className="w-full h-20 object-cover rounded"
                              onError={(e) => { e.currentTarget.style.display = 'none' }}
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
              <p className="text-xs opacity-90">{vehicles.length} vehículos</p>
            </div>
          </div>
          {saveStatus && (
            <div className="bg-white text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
              {saveStatus}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {vehicles.length === 0 ? (
          <div className="text-center py-12">
            <Car size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">No hay vehículos registrados</p>
            <p className="text-sm text-gray-500">Comienza agregando el primer vehículo</p>
          </div>
        ) : (
          vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              onClick={() => setSelectedVehicle(vehicle)}
              className="bg-white rounded-lg p-4 shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg">{vehicle.placa}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      vehicle.estado === 'Entregado' ? 'bg-gray-200 text-gray-700' :
                      vehicle.estado === 'Listo para entrega' ? 'bg-green-100 text-green-700' :
                      vehicle.estado === 'Esperando piezas' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {vehicle.estado}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{vehicle.marca} {vehicle.modelo} {vehicle.año}</p>
                  <p className="text-sm text-gray-800 font-medium">{vehicle.cliente}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(vehicle.fechaIngreso).toLocaleDateString('es-PE')}
                  </p>
                  {(() => { const c = Array.isArray(vehicle.actualizaciones) ? vehicle.actualizaciones.length : 0; return c > 0; })() && (
                    <p className="text-xs text-blue-600 mt-1">
                      {(Array.isArray(vehicle.actualizaciones) ? vehicle.actualizaciones.length : 0)} actualización{(Array.isArray(vehicle.actualizaciones) ? vehicle.actualizaciones.length : 0) !== 1 ? 'es' : ''}
                    </p>
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
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-30"
      >
        <Plus size={28} />
      </button>

      {showNewVehicle && <NewVehicleForm />}
      {showNewUpdate && <NewUpdateForm />}
      {selectedVehicle && <VehicleDetail />}
    </div>
  );
}