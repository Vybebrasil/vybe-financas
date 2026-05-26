/**
 * Gera public/templates/contrato-vybe-os.docx com placeholders {campo} para docxtemplater.
 * Uso: node scripts/generate-vybe-contract-template.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  HeadingLevel,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'templates');
const outFile = path.join(outDir, 'contrato-vybe-os.docx');

const p = (text, opts = {}) =>
  new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 160 },
    children: [new TextRun({ text, size: 22, ...opts })],
  });

const h1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [new TextRun({ text, bold: true, size: 26 })],
  });

const h2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24 })],
  });

const clauses = [
  h1('CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MARKETING ESTRATÉGICO (METODOLOGIA VYBE OS)'),
  p('Pelo presente instrumento particular, de um lado, a CONTRATADA, e de outro lado, a CONTRATANTE, qualificadas a seguir, celebram o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas e condições abaixo estipuladas.'),
  h2('1. QUALIFICAÇÃO DAS PARTES'),
  p('1.1. CONTRATADA: {contratada_nome}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {contratada_cnpj}, com sede na {contratada_endereco}, neste ato representada por seus administradores, {contratada_representantes}.'),
  p('1.2. CONTRATANTE: {cliente_nome}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {cliente_cnpj}, com sede na {cliente_endereco}, neste ato representada por seu representante legal, {cliente_representante}, portador(a) do CPF nº {cliente_cpf}.'),
  h2('2. DO OBJETO DO CONTRATO'),
  p('2.1. O presente contrato tem como objeto a prestação de serviços especializados em marketing e inteligência de negócios, operados exclusivamente sob a metodologia proprietária denominada "VYBE OS" (Vybe Operating System).'),
  p('2.2. A metodologia Vybe OS estrutura-se em três pilares fundamentais, cujo detalhamento de volume e entregáveis encontra-se descrito no ANEXO I (Escopo de Serviços), parte integrante deste instrumento: Pilar Estratégico; Pilar Operacional; Pilar de Performance.'),
  h2('3. DAS OBRIGAÇÕES DA CONTRATADA (VYBE)'),
  p('3.1. Prestar os serviços descritos no Anexo I com zelo, pontualidade e excelência técnica, utilizando as melhores práticas do mercado.'),
  p('3.2. Manter absoluto sigilo sobre estratégias de negócios, dados financeiros e informações confidenciais fornecidas pela CONTRATANTE.'),
  p('3.3. Disponibilizar os relatórios de performance para acompanhamento das métricas do projeto.'),
  p('3.4. Cumprir rigorosamente os prazos estabelecidos no cronograma de conteúdo, desde que a CONTRATANTE cumpra os prazos de aprovação estipulados na Cláusula 5.'),
  h2('4. DAS OBRIGAÇÕES DA CONTRATANTE (CLIENTE)'),
  p('4.1. Fornecer todas as informações, logotipos, acessos a plataformas e materiais necessários para a execução do trabalho.'),
  p('4.2. Disponibilizar a verba de mídia para o tráfego pago, paga diretamente às plataformas pela CONTRATANTE.'),
  p('4.3. Cumprir os prazos de validação e aprovação dos materiais enviados, conforme o SLA da Cláusula 5.'),
  p('4.4. Centralizar toda a comunicação operacional nos canais oficiais da CONTRATADA.'),
  h2('5. DO ACORDO DE NÍVEL DE SERVIÇO (SLA) E APROVAÇÕES'),
  p('5.1. Prazos de Envio: antecedência mínima de 24 horas úteis da data programada para veiculação.'),
  p('5.2. Prazos de Aprovação: prazo máximo de 24 horas úteis após o envio.'),
  p('5.3. Aprovação Tácita: a ausência de resposta no prazo será considerada aprovação tácita.'),
  h2('6. DA REMUNERAÇÃO E FORMA DE PAGAMENTO'),
  p('6.1. Pelos serviços prestados mediante a metodologia Vybe OS, a CONTRATANTE pagará à CONTRATADA o valor mensal fixo de {valor_mensal} ({valor_mensal_extenso}).'),
  p('6.2. O pagamento deverá ser efetuado até o dia {dia_pagamento} de cada mês vigente, mediante emissão de Nota Fiscal e pagamento via PIX ou Boleto Bancário.'),
  p('6.3. O atraso no pagamento sujeitará a CONTRATANTE ao pagamento de multa moratória de 2% sobre o valor da parcela, além de juros de 1% ao mês.'),
  p('6.4. O atraso superior a 10 dias corridos faculta à CONTRATADA a suspensão imediata dos serviços até a regularização do débito.'),
  h2('7. DA PROPRIEDADE INTELECTUAL'),
  p('7.1. Os direitos patrimoniais sobre os materiais finais veiculados pertencerão à CONTRATANTE, após a devida quitação financeira do mês correspondente.'),
  p('7.2. A metodologia Vybe OS, estruturas de campanhas e arquivos editáveis são de propriedade intelectual exclusiva da CONTRATADA.'),
  h2('8. DO PRAZO E DA RESCISÃO'),
  p('8.1. O presente contrato é celebrado pelo prazo determinado de {prazo_meses} meses, iniciando-se na data de sua assinatura.'),
  p('8.2. Após o término do prazo, o contrato será renovado automaticamente por tempo indeterminado, salvo manifestação em contrário.'),
  p('8.3. Rescisão imotivada mediante aviso prévio formalizado por escrito com antecedência mínima de 30 dias.'),
  p('8.4. Rescisão antecipada pela CONTRATANTE antes do prazo: multa de 30% sobre as mensalidades restantes.'),
  h2('9. DAS DISPOSIÇÕES GERAIS E OBRIGAÇÃO DE MEIO'),
  p('9.1. Obrigação de Meio: a CONTRATADA emprega melhores técnicas e ferramentas, sem garantia de resultados fixos de faturamento.'),
  p('9.2. Demandas fora do escopo do Anexo I serão objeto de orçamentos específicos e aditivos contratuais.'),
  h2('10. FOCO EM RESULTADOS E INTELIGÊNCIA ESTRATÉGICA'),
  p('Fica estabelecido que a natureza do serviço é de Marketing de Performance e Inteligência de Negócios. O valor do contrato remunera o acesso à Mesa de Comando (Planejamento, Mídia, Dados, Redação e Direção de Arte).'),
  h2('11. DO FORO'),
  p('As partes elegem o foro da Comarca de {cidade_foro}, para dirimir quaisquer dúvidas oriundas deste contrato, com renúncia expressa a qualquer outro.'),
  p('E por estarem assim justas e contratadas, as partes assinam o presente instrumento em 02 (duas) vias de igual teor e forma, na presença de 02 (duas) testemunhas.'),
  p('{cidade_foro}, {data_assinatura}.'),
  p('{contratada_nome} — CONTRATADA (CNPJ: {contratada_cnpj})'),
  p('{cliente_assinatura_linha} — CONTRATANTE (CNPJ: {cliente_cnpj})'),
  h2('TESTEMUNHAS'),
  p('1. Nome: {testemunha1_nome} — CPF: {testemunha1_cpf}'),
  p('2. Nome: {testemunha2_nome} — CPF: {testemunha2_cpf}'),
];

const doc = new Document({
  sections: [{ properties: {}, children: clauses }],
});

fs.mkdirSync(outDir, { recursive: true });
const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outFile, buffer);
console.log('Modelo gerado:', outFile);
