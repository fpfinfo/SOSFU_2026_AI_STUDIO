import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// ==================== TYPES ====================

interface ExportOptions {
  /** Filename for the downloaded PDF */
  filename?: string;
  /** Image quality (0-1) */
  quality?: number;
  /** Scale factor for rendering */
  scale?: number;
  /** Open in new tab instead of downloading */
  openInNewTab?: boolean;
  /** Page margin in mm */
  margin?: number;
}

interface DossierExportOptions extends ExportOptions {
  /** Process number for header */
  processNumber?: string;
  /** Beneficiary name */
  beneficiary?: string;
  /** Include page numbers */
  includePageNumbers?: boolean;
}

// ==================== CONSTANTS ====================

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

// ==================== SINGLE ELEMENT EXPORT ====================

/**
 * Captures a single HTML element as a PDF page.
 * Used for printing individual documents from the Dossier.
 */
export const exportElementToPdf = async (
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> => {
  const {
    filename = 'documento.pdf',
    quality = 0.92,
    scale = 2,
    openInNewTab = false,
    margin = 0,
  } = options;

  try {
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      // Ignore cross-origin iframes (uploaded PDFs)
      ignoreElements: (el) => el.tagName === 'IFRAME',
    });

    const imgWidth = A4_WIDTH_MM - (margin * 2);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const pdf = new jsPDF({
      orientation: imgHeight > A4_HEIGHT_MM ? 'portrait' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/jpeg', quality);
    
    // Calculate pages needed
    const pageHeight = A4_HEIGHT_MM - (margin * 2);
    let yPosition = 0;
    let pageNumber = 1;

    while (yPosition < imgHeight) {
      if (pageNumber > 1) {
        pdf.addPage();
      }

      pdf.addImage(
        imgData,
        'JPEG',
        margin,
        margin - yPosition,
        imgWidth,
        imgHeight
      );

      yPosition += pageHeight;
      pageNumber++;
    }

    if (openInNewTab) {
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } else {
      pdf.save(filename);
    }
  } catch (err) {
    console.error('Erro ao exportar PDF:', err);
    throw err;
  }
};

// ==================== MULTI-PAGE DOSSIER EXPORT ====================

/**
 * Captures multiple HTML elements as a multi-page PDF (Unified Dossier).
 * Each element becomes one or more pages depending on its height.
 */
export const exportDossierToPdf = async (
  elements: HTMLElement[],
  options: DossierExportOptions = {}
): Promise<void> => {
  const {
    filename = 'dossie_digital.pdf',
    quality = 0.92,
    scale = 2,
    processNumber,
    beneficiary,
    includePageNumbers = true,
    margin = 5,
  } = options;

  if (elements.length === 0) {
    throw new Error('Nenhum documento para exportar.');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = A4_WIDTH_MM - (margin * 2);
  const pageHeight = A4_HEIGHT_MM - (margin * 2);
  let totalPages = 0;
  let isFirstPage = true;

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];

    try {
      const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (el) => el.tagName === 'IFRAME',
      });

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/jpeg', quality);

      let yPosition = 0;

      while (yPosition < imgHeight) {
        if (!isFirstPage) {
          pdf.addPage();
        }
        isFirstPage = false;
        totalPages++;

        pdf.addImage(
          imgData,
          'JPEG',
          margin,
          margin - yPosition,
          imgWidth,
          imgHeight
        );

        // Clip content to page boundaries
        pdf.setFillColor(255, 255, 255);
        // Top clip (for subsequent pages of same doc)
        if (yPosition > 0) {
          pdf.rect(0, 0, A4_WIDTH_MM, margin, 'F');
        }
        // Bottom clip
        pdf.rect(0, A4_HEIGHT_MM - margin, A4_WIDTH_MM, margin, 'F');

        yPosition += pageHeight;
      }
    } catch (err) {
      console.error(`Erro ao capturar documento ${i + 1}:`, err);
      // Continue with remaining documents
    }
  }

  // Add page numbers footer
  if (includePageNumbers) {
    const pageCount = pdf.getNumberOfPages();
    for (let page = 1; page <= pageCount; page++) {
      pdf.setPage(page);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);

      // Footer with page number
      const footerText = `FLS. ${String(page).padStart(2, '0')}/${String(pageCount).padStart(2, '0')}`;
      pdf.text(footerText, A4_WIDTH_MM - margin - 2, A4_HEIGHT_MM - 2, { align: 'right' });

      // Process info on footer left
      if (processNumber) {
        const infoText = `${processNumber}${beneficiary ? ` — ${beneficiary}` : ''}`;
        pdf.text(infoText, margin + 2, A4_HEIGHT_MM - 2, { align: 'left' });
      }
    }
  }

  // Save
  const pdfBlob = pdf.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);

  // Also trigger download
  pdf.save(filename);
};

// ==================== UTILITY: PRINT SINGLE DOCUMENT ====================

/**
 * Opens a print-optimized view of a single document element.
 * Creates a temporary window with only the document content.
 */
export const printDocumentElement = async (
  element: HTMLElement,
  title: string = 'Documento'
): Promise<void> => {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      ignoreElements: (el) => el.tagName === 'IFRAME',
    });

    const imgData = canvas.toDataURL('image/png');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Popup bloqueado. Permita popups para imprimir.');
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; display: flex; justify-content: center; }
          img { width: 210mm; max-width: 100%; height: auto; }
          @media print {
            body { margin: 0; }
            img { width: 100%; page-break-after: always; }
          }
        </style>
      </head>
      <body>
        <img src="${imgData}" onload="window.print(); setTimeout(() => window.close(), 500);" />
      </body>
      </html>
    `);
    printWindow.document.close();
  } catch (err) {
    console.error('Erro ao imprimir:', err);
    throw err;
  }
};
