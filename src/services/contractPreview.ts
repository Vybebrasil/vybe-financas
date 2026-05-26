import { ContractTemplateContext } from './contractTemplates';

/** Pré-visualização HTML do contrato com parâmetros aplicados. */
export function buildContractHtmlPreview(ctx: ContractTemplateContext): string {
  return `
<article class="contract-preview-doc">
  <h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MARKETING ESTRATÉGICO (METODOLOGIA VYBE OS)</h1>
  <p class="lead">Pelo presente instrumento particular, de um lado, a <strong>CONTRATADA</strong>, e de outro lado, a <strong>CONTRATANTE</strong>, qualificadas a seguir, celebram o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas e condições abaixo estipuladas.</p>

  <h2>1. QUALIFICAÇÃO DAS PARTES</h2>
  <p><strong>1.1. CONTRATADA:</strong> ${ctx.contratada_nome}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${ctx.contratada_cnpj}, com sede na ${ctx.contratada_endereco}, neste ato representada por seus administradores, ${ctx.contratada_representantes}.</p>
  <p><strong>1.2. CONTRATANTE:</strong> ${ctx.cliente_nome}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${ctx.cliente_cnpj}, com sede na ${ctx.cliente_endereco}, neste ato representada por seu representante legal, ${ctx.cliente_representante}, portador(a) do CPF nº ${ctx.cliente_cpf}.</p>

  <h2>2. DO OBJETO DO CONTRATO</h2>
  <p>2.1. O presente contrato tem como objeto a prestação de serviços especializados em marketing e inteligência de negócios, operados exclusivamente sob a metodologia proprietária denominada "VYBE OS" (Vybe Operating System).</p>
  <p>2.2. A metodologia Vybe OS estrutura-se em três pilares fundamentais (Estratégico, Operacional e Performance), conforme escopo descrito no ANEXO I.</p>

  <h2>6. DA REMUNERAÇÃO E FORMA DE PAGAMENTO</h2>
  <p>6.1. Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA o valor mensal fixo de <strong>${ctx.valor_mensal}</strong> (${ctx.valor_mensal_extenso}).</p>
  <p>6.2. O pagamento deverá ser efetuado até o dia <strong>${ctx.dia_pagamento}</strong> de cada mês vigente, mediante Nota Fiscal e pagamento via PIX ou Boleto Bancário.</p>

  <h2>8. DO PRAZO E DA RESCISÃO</h2>
  <p>8.1. O presente contrato é celebrado pelo prazo determinado de <strong>${ctx.prazo_meses} meses</strong>, iniciando-se na data de sua assinatura.</p>

  <h2>11. DO FORO</h2>
  <p>As partes elegem o foro da Comarca de ${ctx.cidade_foro}, para dirimir quaisquer dúvidas oriundas deste contrato.</p>

  <p class="signature">E por estarem assim justas e contratadas, as partes assinam o presente instrumento.</p>
  <p class="signature"><strong>${ctx.cidade_foro}, ${ctx.data_assinatura}.</strong></p>
  <p class="signature">${ctx.contratada_nome}<br/>CONTRATADA (CNPJ: ${ctx.contratada_cnpj})</p>
  <p class="signature">${ctx.cliente_assinatura_linha}<br/>CONTRATANTE (CNPJ: ${ctx.cliente_cnpj})</p>

  <h3>TESTEMUNHAS</h3>
  <p>1. Nome: ${ctx.testemunha1_nome || '________________'} — CPF: ${ctx.testemunha1_cpf || '________________'}</p>
  <p>2. Nome: ${ctx.testemunha2_nome || '________________'} — CPF: ${ctx.testemunha2_cpf || '________________'}</p>
</article>
  `.trim();
}
