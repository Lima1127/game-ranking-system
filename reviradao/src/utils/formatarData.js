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
