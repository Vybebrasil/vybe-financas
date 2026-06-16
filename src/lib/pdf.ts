import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function createPdfDocument(): jsPDF {
  return new jsPDF();
}

export { jsPDF, autoTable };
