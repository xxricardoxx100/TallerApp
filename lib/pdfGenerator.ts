import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Vehicle } from './vehicles';

/**
 * Carga una imagen y la convierte a Base64
 */
async function loadImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error cargando imagen:', error);
    throw error;
  }
}

/**
 * Genera un PDF profesional con el historial del vehículo
 */
export async function generateVehiclePDF(vehicle: Vehicle): Promise<Blob> {
  const doc = new jsPDF();
  
  // Configuración de colores
  const primaryColor: [number, number, number] = [37, 99, 235]; // Blue-600
  const lightBlue: [number, number, number] = [219, 234, 254]; // Blue-100
  
  let yPosition = 20;

  // ========== HEADER ==========
  // Header más bajo y compacto
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 32, 'F');
  
  // Intentar cargar el logo
  try {
    const logoBase64 = await loadImageAsBase64('/images/logo.png');
    // Logo más ancho y mejor proporcionado
    doc.addImage(logoBase64, 'PNG', 12, 6, 45, 20);
  } catch (error) {
    console.log('Logo no encontrado, usando solo texto');
  }
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('MECATRONICA CALTIMER', 105, 15, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Historial de Servicio', 105, 23, { align: 'center' });
  
  yPosition = 42;

  // ========== INFORMACIÓN DEL VEHÍCULO ==========
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Información del Vehículo', 20, yPosition);
  
  yPosition += 10;
  
  // Tabla de información del vehículo
  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: [
      ['Placa', vehicle.placa],
      ['Marca', vehicle.marca || 'N/A'],
      ['Modelo', vehicle.modelo || 'N/A'],
      ['Año', vehicle.año || 'N/A'],
      ['Cliente', vehicle.cliente],
      ['Teléfono', vehicle.telefono || 'N/A'],
      ['Fecha de Ingreso', new Date(vehicle.fechaIngreso).toLocaleDateString('es-PE', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })],
      ['Estado Actual', vehicle.estado],
    ],
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: primaryColor },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 120 }
    },
    margin: { left: 20, right: 20 }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // ========== PROBLEMA INICIAL ==========
  if (vehicle.problema) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Problema Reportado', 20, yPosition);
    
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const problemLines = doc.splitTextToSize(vehicle.problema, 170);
    doc.text(problemLines, 20, yPosition);
    yPosition += problemLines.length * 5 + 10;
  }

  // ========== HISTORIAL DE ACTUALIZACIONES ==========
  if (vehicle.actualizaciones.length > 0) {
    // Verificar si necesitamos nueva página
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Historial de Actualizaciones', 20, yPosition);
    
    yPosition += 8;

    const actualizacionesData = vehicle.actualizaciones.map((upd, index) => [
      `#${index + 1}`,
      new Date(upd.fecha).toLocaleDateString('es-PE', { 
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      upd.descripcion,
      upd.imagenes.length > 0 ? `${upd.imagenes.length} imagen${upd.imagenes.length > 1 ? 'es' : ''}` : 'Sin imágenes'
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Fecha', 'Descripción', 'Imágenes']],
      body: actualizacionesData,
      theme: 'striped',
      styles: { fontSize: 9 },
      headStyles: { fillColor: primaryColor, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 40 },
        2: { cellWidth: 100 },
        3: { cellWidth: 25, halign: 'center' }
      },
      margin: { left: 20, right: 20 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('No hay actualizaciones registradas', 20, yPosition);
    yPosition += 10;
  }

  // ========== FOOTER ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Línea divisoria
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 280, 190, 280);
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generado el ${new Date().toLocaleDateString('es-PE', { 
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`,
      20,
      285
    );
    
    doc.text(
      `Página ${i} de ${pageCount}`,
      190,
      285,
      { align: 'right' }
    );
  }

  // Retornar como Blob
  return doc.output('blob');
}

/**
 * Descarga el PDF directamente
 */
export async function downloadVehiclePDF(vehicle: Vehicle): Promise<void> {
  const blob = await generateVehiclePDF(vehicle);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Historial_${vehicle.placa}_${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Abre WhatsApp Web con el PDF preparado para enviar
 * Nota: WhatsApp Web no permite adjuntar archivos automáticamente por seguridad,
 * pero descarga el PDF y prepara el mensaje con el enlace del portal del cliente
 */
export async function shareVehiclePDFWhatsApp(vehicle: Vehicle, accessCode?: string): Promise<void> {
  // Primero descargamos el PDF
  await downloadVehiclePDF(vehicle);
  
  // Preparar mensaje de WhatsApp
  const phoneNumber = vehicle.telefono?.replace(/\D/g, '') || '';
  const portalLink = `${window.location.origin}/cliente`;
  
  let message = `Hola ${vehicle.cliente}!\n\n`;
  message += `Te envio el historial de servicio de tu vehiculo ${vehicle.marca} ${vehicle.modelo} (${vehicle.placa}).\n\n`;
  
  if (accessCode) {
    message += `Tambien puedes consultar tu historial online:\n`;
    message += `${portalLink}\n`;
    message += `Placa: ${vehicle.placa}\n`;
    message += `Codigo: ${accessCode}\n\n`;
  }
  
  message += `Estado actual: ${vehicle.estado}\n\n`;
  message += `Gracias por confiar en Mecatronica Caltimer!`;
  
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = phoneNumber 
    ? `https://wa.me/${phoneNumber}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`;
  
  window.open(whatsappUrl, '_blank');
}
