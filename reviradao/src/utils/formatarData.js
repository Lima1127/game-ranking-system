/**
 * "2026-09-02" -> "02/09/2026".
 * Nao converte para Date de proposito: evita o dia "voltar um" por causa do fuso horario.
 */
export function formatarData(data) {
  // Usa so a parte da data (ignora um eventual horario: "2026-09-02T10:00:00").
  const [ano, mes, dia] = String(data || '').slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : '';
}

/** 30 -> "30h", 12.5 -> "12,5h" */
export function formatarHoras(horas) {
  const valor = Number(horas || 0);
  return `${Number.isInteger(valor) ? valor : valor.toFixed(1).replace('.', ',')}h`;
}

/**
 * Momento exato vindo do servidor ("2026-09-29T02:12:06.349538Z") -> "28/09/2026 às 23:12".
 * Aqui a conversao para Date e correta: o valor e um instante (com fuso), entao mostramos no horario de quem esta vendo.
 */
export function formatarDataHora(dataHora) {
  const data = new Date(dataHora);
  if (!dataHora || Number.isNaN(data.getTime())) return '';
  const dia = data.toLocaleDateString('pt-BR');
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} às ${hora}`;
}
