import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ClipboardList,
  FileText,
  Gamepad2,
  House,
  Inbox,
  KeyRound,
  LogOut,
  Moon,
  Plus,
  RefreshCw,
  Shield,
  Sun,
  Trophy,
  Users,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { isStaffRole, roleLabel } from '../utils/roles';
import JanelaAlterarSenha from './JanelaAlterarSenha';

const ABAS = [
  { to: '/ranking', rotulo: 'Ranking', icone: Trophy },
  { to: '/completion', rotulo: 'Registrar', icone: Gamepad2 },
  { to: '/requests', rotulo: 'Solicitações', icone: Inbox },
  { to: '/obligations', rotulo: 'Obrigações', icone: ClipboardList },
  { to: '/rotative-list', rotulo: 'Lista Rotativa', icone: RefreshCw },
];

const ABAS_ADMIN = [
  { to: '/admin/records', rotulo: 'Registros', icone: FileText },
  { to: '/admin/users', rotulo: 'Usuários', icone: Users },
  { to: '/admin/logs', rotulo: 'Logs', icone: ClipboardList },
];

const classeAba = (ativa) =>
  `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition ${
    ativa
      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
  }`;

/** Fecha o menu ao clicar fora ou apertar Esc. */
function useFecharFora(aberto, setAberto) {
  const ref = useRef(null);
  useEffect(() => {
    if (!aberto) return undefined;
    const aoClicar = (event) => ref.current && !ref.current.contains(event.target) && setAberto(false);
    const aoTeclar = (event) => event.key === 'Escape' && setAberto(false);
    document.addEventListener('mousedown', aoClicar);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('mousedown', aoClicar);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto, setAberto]);
  return ref;
}

function Avatar({ user, tamanho = 'h-9 w-9' }) {
  const url = user?.avatarUploadedAt
    ? `${api.defaults.baseURL}/users/${user.id}/avatar?v=${encodeURIComponent(user.avatarUploadedAt)}`
    : null;
  const inicial = (user?.displayName || '?').trim().charAt(0).toUpperCase();
  return url ? (
    <img src={url} alt="" className={`${tamanho} shrink-0 rounded-full object-cover ring-2 ring-amber-400`} />
  ) : (
    <span className={`${tamanho} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-red-500 text-sm font-extrabold text-white ring-2 ring-amber-400`}>
      {inicial}
    </span>
  );
}

function ItemMenu({ icone: Icone, children, perigo, ...props }) {
  const Tag = props.to ? Link : 'button';
  return (
    <Tag
      {...(Tag === 'button' ? { type: 'button' } : {})}
      {...props}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
        perigo
          ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'
          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
      }`}
    >
      <Icone className="h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </Tag>
  );
}

const classeCaixaMenu =
  'absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900';

/**
 * Cabecalho do site: capsula flutuante com as abas num "trilho" e a conta no canto direito.
 * No celular as abas principais descem para uma barra no rodape (BarraInferior).
 */
export function CabecalhoSite({ isDarkMode, onToggleTheme }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const equipe = isStaffRole(user?.role);

  const [contaAberta, setContaAberta] = useState(false);
  const [adminAberto, setAdminAberto] = useState(false);
  const [alterandoSenha, setAlterandoSenha] = useState(false);
  const refConta = useFecharFora(contaAberta, setContaAberta);
  const refAdmin = useFecharFora(adminAberto, setAdminAberto);

  // Trocou de tela: fecha os menus
  useEffect(() => {
    setContaAberta(false);
    setAdminAberto(false);
  }, [pathname]);

  const sair = () => {
    logout();
    navigate('/login', { replace: true });
  };
  const naAreaAdmin = pathname.startsWith('/admin');

  return (
    <>
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-4">
        <div className="container mx-auto flex items-center gap-3 rounded-full border border-white/60 bg-white/80 py-1.5 pl-2 pr-1.5 shadow-[0_10px_30px_-14px_rgba(60,40,140,0.45)] backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/80">
          {/* O nome do site leva ao Menu (pagina inicial) */}
          <Link to="/menu" title="Ir para o Menu" className="flex shrink-0 items-center gap-2 rounded-full pr-1 hover:opacity-90">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white">
              <Gamepad2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Revira<span className="text-primary">dão</span>
            </span>
          </Link>

          <nav className="mx-auto hidden min-w-0 items-center gap-0.5 rounded-full bg-indigo-50 p-1 lg:flex dark:bg-slate-800" aria-label="Telas do site">
            {ABAS.map(({ to, rotulo, icone: Icone }) => (
              <NavLink key={to} to={to} className={({ isActive }) => classeAba(isActive)}>
                {({ isActive }) => (
                  <>
                    <Icone className={`h-4 w-4 ${isActive ? 'text-primary dark:text-indigo-300' : ''}`} aria-hidden="true" />
                    {rotulo}
                  </>
                )}
              </NavLink>
            ))}
            {equipe && (
              <div ref={refAdmin} className="relative">
                <button
                  type="button"
                  onClick={() => setAdminAberto((aberto) => !aberto)}
                  aria-haspopup="menu"
                  aria-expanded={adminAberto}
                  className={classeAba(naAreaAdmin)}
                >
                  <Shield className={`h-4 w-4 ${naAreaAdmin ? 'text-primary dark:text-indigo-300' : ''}`} aria-hidden="true" />
                  Admin
                  <ChevronDown className={`h-3.5 w-3.5 transition ${adminAberto ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {adminAberto && (
                  <div className={`${classeCaixaMenu} w-48`} role="menu" onClick={(event) => event.target.closest('a') && setAdminAberto(false)}>
                    {ABAS_ADMIN.map(({ to, rotulo, icone }) => (
                      <ItemMenu key={to} to={to} icone={icone} role="menuitem">
                        {rotulo}
                      </ItemMenu>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

          <div ref={refConta} className="relative ml-auto shrink-0 lg:ml-0">
            <button
              type="button"
              onClick={() => setContaAberta((aberto) => !aberto)}
              aria-haspopup="menu"
              aria-expanded={contaAberta}
              className="flex items-center gap-2.5 rounded-full bg-indigo-50 py-1 pl-1 pr-1 transition hover:bg-indigo-100 sm:pr-3 lg:pr-1 xl:pr-3 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <Avatar user={user} />
              <span className="hidden min-w-0 text-left sm:block lg:hidden xl:block">
                <span className="block max-w-[9rem] truncate text-sm font-bold leading-tight text-slate-900 dark:text-white">{user?.displayName}</span>
                <span className="block text-[10px] font-extrabold uppercase leading-tight tracking-[0.14em] text-amber-700 dark:text-amber-300">
                  {roleLabel(user?.role)}
                </span>
              </span>
              <ChevronDown className={`hidden h-4 w-4 text-slate-500 transition sm:block lg:hidden xl:block ${contaAberta ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {contaAberta && (
              <div className={classeCaixaMenu} role="menu" onClick={(event) => event.target.closest('a') && setContaAberta(false)}>
                <ItemMenu to="/menu" icone={House} role="menuitem">Meu menu</ItemMenu>
                {/* No celular e em telas medias, as abas que nao cabem ficam aqui */}
                <div className="lg:hidden">
                  {ABAS.filter((aba) => aba.to === '/rotative-list').map(({ to, rotulo, icone }) => (
                    <ItemMenu key={to} to={to} icone={icone} role="menuitem">{rotulo}</ItemMenu>
                  ))}
                  {equipe &&
                    ABAS_ADMIN.map(({ to, rotulo, icone }) => (
                      <ItemMenu key={to} to={to} icone={icone} role="menuitem">Admin · {rotulo}</ItemMenu>
                    ))}
                </div>
                <ItemMenu icone={KeyRound} role="menuitem" onClick={() => { setContaAberta(false); setAlterandoSenha(true); }}>
                  Alterar senha
                </ItemMenu>
                <ItemMenu icone={isDarkMode ? Sun : Moon} role="menuitem" onClick={onToggleTheme}>
                  {isDarkMode ? 'Tema claro' : 'Tema escuro'}
                </ItemMenu>
                <hr className="my-1 border-slate-200 dark:border-slate-700" />
                <ItemMenu icone={LogOut} perigo role="menuitem" onClick={sair}>Sair</ItemMenu>
              </div>
            )}
          </div>
        </div>
      </header>

      {alterandoSenha && <JanelaAlterarSenha onFechar={() => setAlterandoSenha(false)} />}
    </>
  );
}

const ABAS_RODAPE = [
  { to: '/menu', rotulo: 'Menu', icone: House },
  { to: '/ranking', rotulo: 'Ranking', icone: Trophy },
  { to: '/completion', rotulo: 'Registrar', icone: Plus, destaque: true },
  { to: '/requests', rotulo: 'Pedidos', icone: Inbox },
  { to: '/obligations', rotulo: 'Obrigações', icone: ClipboardList },
];

/** Barra de abas no rodape, so em telas pequenas (como nos apps de celular). */
export function BarraInferior() {
  return (
    <nav
      aria-label="Telas do site"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md lg:hidden dark:border-slate-800 dark:bg-slate-900/95"
    >
      {ABAS_RODAPE.map(({ to, rotulo, icone: Icone, destaque }) => (
        <NavLink
          key={to}
          to={to}
          aria-label={destaque ? rotulo : undefined}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[11px] font-bold ${isActive ? 'text-primary dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`
          }
        >
          {destaque ? (
            <span className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-[0_8px_18px_-6px_rgba(102,126,234,0.8)]">
              <Icone className="h-6 w-6" aria-hidden="true" />
            </span>
          ) : (
            <Icone className="h-5 w-5" aria-hidden="true" />
          )}
          {!destaque && rotulo}
        </NavLink>
      ))}
    </nav>
  );
}
