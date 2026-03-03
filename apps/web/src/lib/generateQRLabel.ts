import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface QRLabelData {
    serial: string;
}

export async function generateQRLabel(data: QRLabelData) {
    const { serial } = data;

    // Crear un PDF para la etiqueta (100mm x 130mm)
    // Usamos orientación portrait (p) para que sea 100 de ancho y 130 de alto
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [100, 130],
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;

    try {
        // Generación del código QR a partir ÚNICAMENTE del número de serie
        const qrImage = await QRCode.toDataURL(serial, {
            margin: 1,
            width: 500, // Mayor resolución para impresión
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });

        // Posicionamiento del QR (centrado)
        // El QR será de 80mm x 80mm
        const qrSize = 80;
        const qrX = (pageWidth - qrSize) / 2;
        const qrY = 15; // Espacio superior

        doc.addImage(qrImage, 'PNG', qrX, qrY, qrSize, qrSize);

        // Texto debajo del QR
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);

        // Centramos el texto "Número de serie: [serial]"
        const labelText = `Numero de serie: ${serial}`;
        doc.text(labelText, centerX, qrY + qrSize + 15, { align: 'center' });

        // Nombre del archivo
        const fileName = `QR_${serial.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

        // Guardar y Abrir
        doc.save(fileName);

        // Abrir en nueva pestaña
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');

    } catch (error) {
        console.error('Error generating QR label:', error);
        throw error;
    }
}
