import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export interface QRLabelData {
    serial: string;
    site?: string;
    date?: string;
}

/**
 * Dibuja el contenido de una etiqueta en el documento PDF proporcionado.
 */
async function drawLabelContent(doc: jsPDF, data: QRLabelData) {
    const { serial, site, date } = data;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
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

        if (site) {
            let readableSite = site.toUpperCase();
            if (readableSite === 'NAVES') readableSite = 'Naves';
            if (readableSite === 'FRONTERA') readableSite = 'Frontera';
            if (readableSite === 'R1') readableSite = 'R1';
            if (readableSite === 'R2') readableSite = 'R2';
            if (readableSite === 'R3') readableSite = 'R3';
            
            const siteText = `Sitio: ${readableSite}`;
            doc.text(siteText, centerX, qrY + qrSize + 25, { align: 'center' });
        }

        // Fecha en la parte inferior derecha, horizontal, letra pequeña
        if (date) {
            const dateObj = new Date(date);
            const formattedDate = !isNaN(dateObj.getTime()) 
                ? dateObj.toLocaleDateString() 
                : date;
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139); // Slate-500 approx
            doc.text(`F. Entrada: ${formattedDate}`, pageWidth - 5, pageHeight - 5, { align: 'right' });
        }

    } catch (error) {
        console.error('Error drawing QR label content:', error);
        throw error;
    }
}

/**
 * Genera un PDF con una sola etiqueta.
 */
export async function generateQRLabel(data: QRLabelData) {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [100, 130],
    });

    await drawLabelContent(doc, data);

    const fileName = `QR_${data.serial.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    doc.save(fileName);

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
}

/**
 * Genera un PDF con múltiples etiquetas (una por página).
 */
export async function generateMultipleQRLabels(items: QRLabelData[], fileName: string = 'Etiquetas_Entrada.pdf') {
    if (items.length === 0) return;

    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [100, 130],
    });

    for (let i = 0; i < items.length; i++) {
        if (i > 0) {
            doc.addPage([100, 130], 'p');
        }
        await drawLabelContent(doc, items[i]);
    }

    doc.save(fileName);

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
}
