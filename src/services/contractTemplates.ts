import { Client, CompanySettings, Contract, ContractParameters } from '../../types';
import { formatCurrency } from '../../utils';
import { valorMonetarioExtenso } from '../utils/valorExtenso';

export const VYBE_CONTRACT_TEMPLATE_KEY = 'vybe-os-marketing';

export const DEFAULT_VYBE_CONTRACTOR = {
  nome: 'VYBE BRASIL LTDA',
  cnpj: '58.039.328/0001-00',
  endereco:
    'Rua São Francisco, 194, Irecê, BA, CEP 44860-422',
  representantes: 'PAULO MARTINS e THIAGO RAMOS',
  cidadeForo: 'Irecê - BA',
};

export const DEFAULT_CONTRACT_PARAMETERS: ContractParameters = {
  prazoMeses: 6,
  cidadeForo: DEFAULT_VYBE_CONTRACTOR.cidadeForo,
  clienteLogradouro: '',
  clienteNumero: '',
  clienteBairro: '',
  clienteCidade: '',
  clienteUf: '',
  clienteCep: '',
  clienteRepresentante: '',
  clienteCpf: '',
  testemunha1Nome: '',
  testemunha1Cpf: '',
  testemunha2Nome: '',
  testemunha2Cpf: '',
};

export function mergeContractParameters(
  base?: ContractParameters | null,
): ContractParameters {
  return { ...DEFAULT_CONTRACT_PARAMETERS, ...base };
}

export function parametersFromClient(client: Client): ContractParameters {
  return mergeContractParameters({
    clienteRepresentante: client.contactPerson || '',
  });
}

export function formatClientAddress(params: ContractParameters): string {
  const parts = [
    [params.clienteLogradouro, params.clienteNumero].filter(Boolean).join(', '),
    params.clienteBairro,
    [params.clienteCidade, params.clienteUf].filter(Boolean).join(' - '),
    params.clienteCep ? `CEP ${params.clienteCep}` : '',
  ].filter(Boolean);
  return parts.join(', ') || 'Endereço a completar';
}

export interface ContractTemplateContext {
  [key: string]: string;
}

export function buildContractTemplateContext(
  contract: Contract,
  client: Client | undefined,
  company: CompanySettings,
  parameters: ContractParameters,
): ContractTemplateContext {
  const params = mergeContractParameters(parameters);
  const contractor = {
    nome: company.name?.trim() || DEFAULT_VYBE_CONTRACTOR.nome,
    cnpj: company.cnpj?.trim() || DEFAULT_VYBE_CONTRACTOR.cnpj,
    endereco: company.address?.trim() || DEFAULT_VYBE_CONTRACTOR.endereco,
    representantes: DEFAULT_VYBE_CONTRACTOR.representantes,
    cidadeForo: params.cidadeForo || DEFAULT_VYBE_CONTRACTOR.cidadeForo,
  };

  const assinatura = contract.startDate
    ? new Date(`${contract.startDate}T12:00:00`)
    : new Date();
  const dataAssinatura = assinatura.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const prazoMeses = String(params.prazoMeses ?? 6).padStart(2, '0');

  return {
    contratada_nome: contractor.nome,
    contratada_cnpj: contractor.cnpj,
    contratada_endereco: contractor.endereco,
    contratada_representantes: contractor.representantes,
    cliente_nome: client?.name || 'CLIENTE',
    cliente_cnpj: client?.cnpj || '00.000.000/0000-00',
    cliente_endereco: formatClientAddress(params),
    cliente_representante: params.clienteRepresentante || client?.contactPerson || 'Nome e Sobrenome',
    cliente_cpf: params.clienteCpf || '000.000.000-00',
    valor_mensal: formatCurrency(contract.amount),
    valor_mensal_extenso: valorMonetarioExtenso(contract.amount),
    dia_pagamento: String(contract.dueDay),
    prazo_meses: prazoMeses,
    data_assinatura: dataAssinatura,
    cidade_foro: contractor.cidadeForo,
    contrato_titulo: contract.title,
    testemunha1_nome: params.testemunha1Nome || '',
    testemunha1_cpf: params.testemunha1Cpf || '',
    testemunha2_nome: params.testemunha2Nome || '',
    testemunha2_cpf: params.testemunha2Cpf || '',
    cliente_assinatura_linha: client?.name || 'CLIENTE AQUI',
  };
}

export const CONTRACT_TEMPLATE_PATH = '/templates/contrato-vybe-os.docx';
