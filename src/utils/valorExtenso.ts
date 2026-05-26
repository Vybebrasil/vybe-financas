/** Converte valor monetário BRL para extenso (simplificado, até milhões). */
export function valorMonetarioExtenso(value: number): string {
  const reais = Math.floor(Math.abs(value));
  const centavos = Math.round((Math.abs(value) - reais) * 100);

  const unidades = [
    '',
    'um',
    'dois',
    'três',
    'quatro',
    'cinco',
    'seis',
    'sete',
    'oito',
    'nove',
    'dez',
    'onze',
    'doze',
    'treze',
    'quatorze',
    'quinze',
    'dezesseis',
    'dezessete',
    'dezoito',
    'dezenove',
  ];
  const dezenas = [
    '',
    '',
    'vinte',
    'trinta',
    'quarenta',
    'cinquenta',
    'sessenta',
    'setenta',
    'oitenta',
    'noventa',
  ];
  const centenas = [
    '',
    'cento',
    'duzentos',
    'trezentos',
    'quatrocentos',
    'quinhentos',
    'seiscentos',
    'setecentos',
    'oitocentos',
    'novecentos',
  ];

  const ate999 = (n: number): string => {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    if (n < 20) return unidades[n];
    if (n < 100) {
      const d = Math.floor(n / 10);
      const u = n % 10;
      return u ? `${dezenas[d]} e ${unidades[u]}` : dezenas[d];
    }
    const c = Math.floor(n / 100);
    const r = n % 100;
    if (!r) return centenas[c] === 'cento' ? 'cem' : centenas[c];
    return `${centenas[c]} e ${ate999(r)}`;
  };

  const grupo = (n: number, singular: string, plural: string): string => {
    if (!n) return '';
    const txt = ate999(n);
    return n === 1 ? `${txt} ${singular}` : `${txt} ${plural}`;
  };

  const milhoes = Math.floor(reais / 1_000_000);
  const milhares = Math.floor((reais % 1_000_000) / 1000);
  const resto = reais % 1000;

  const partes: string[] = [];
  if (milhoes) partes.push(grupo(milhoes, 'milhão', 'milhões'));
  if (milhares) partes.push(grupo(milhares, 'mil', 'mil'));
  if (resto) partes.push(ate999(resto));

  let reaisTxt = 'zero real';
  if (reais === 1) reaisTxt = 'um real';
  else if (reais > 1) reaisTxt = `${partes.join(' e ')} reais`;

  if (!centavos) return reaisTxt;
  const centTxt =
    centavos === 1 ? 'um centavo' : `${ate999(centavos)} centavos`;
  return `${reaisTxt} e ${centTxt}`;
}
