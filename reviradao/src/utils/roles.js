// Cargos do Reviradão (mesma ordem e nomes do backend: UserRole.java).
export const ROLES = {
  USER: { label: 'Jogador', nivel: 0 },
  ADMIN: { label: 'Admin', nivel: 1 },
  COFUNDADOR: { label: 'Co-fundador', nivel: 2 },
  FUNDADOR: { label: 'Fundador', nivel: 3 },
};

/** Equipe = Admin ou acima (acessa o painel Admin, aprova pedidos...). */
export function isStaffRole(role) {
  return (ROLES[role]?.nivel ?? 0) >= ROLES.ADMIN.nivel;
}

/** Só o Fundador faz a virada de edição. */
export function isFundadorRole(role) {
  return role === 'FUNDADOR';
}

export function roleLabel(role) {
  return ROLES[role]?.label || 'Jogador';
}
