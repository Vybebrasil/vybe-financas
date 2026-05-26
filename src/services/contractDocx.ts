import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import { ContractTemplateContext, CONTRACT_TEMPLATE_PATH } from './contractTemplates';

let templateCache: ArrayBuffer | null = null;

async function loadTemplate(): Promise<ArrayBuffer> {
  if (templateCache) return templateCache;
  const response = await fetch(CONTRACT_TEMPLATE_PATH);
  if (!response.ok) {
    throw new Error(
      'Modelo DOCX não encontrado. Execute: npm run contracts:template',
    );
  }
  templateCache = await response.arrayBuffer();
  return templateCache;
}

export async function generateContractDocx(
  context: ContractTemplateContext,
  fileName: string,
): Promise<void> {
  const buffer = await loadTemplate();
  const zip = new PizZip(buffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.setData(context);
  try {
    doc.render();
  } catch (error: unknown) {
    const err = error as { properties?: { errors?: { message: string }[] } };
    const details =
      err.properties?.errors?.map((e) => e.message).join('; ') ??
      (error instanceof Error ? error.message : 'Erro ao preencher modelo');
    throw new Error(details);
  }

  const blob = doc.getZip().generate({
    type: 'blob',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });

  saveAs(blob, fileName.endsWith('.docx') ? fileName : `${fileName}.docx`);
}

export function clearContractTemplateCache(): void {
  templateCache = null;
}
