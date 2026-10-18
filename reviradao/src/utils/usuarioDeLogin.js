/**
 * Usuario de login (ex.: samy): 3 a 20 caracteres, letras minusculas, numeros, ponto e sublinhado.
 * Mesma regra do servidor (UsuarioDeLogin.java) e do banco (V27).
 */
export const REGRA_USUARIO = '3 a 20 caracteres: letras, números, ponto ou sublinhado.';

/** Enquanto digita: deixa minusculo e tira o que nao e permitido ("Samy Gamer!" -> "samygamer"). */
export function limparUsuario(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 20);
}

export const usuarioValido = (usuario) => /^[a-z0-9._]{3,20}$/.test(usuario || '');
