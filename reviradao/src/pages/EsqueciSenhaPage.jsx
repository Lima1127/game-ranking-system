import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { limparUsuario } from '../utils/usuarioDeLogin';

const campoClasse =
  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400';

/**
 * "Esqueci minha senha" (sem e-mail: o codigo vem de um admin):
 * 1) o jogador pede (só o usuário) e avisa um admin do grupo;
 * 2) o admin gera um código na tela Usuários e passa para ele;
 * 3) o jogador volta aqui, em "Já tenho um código", e escolhe a senha nova.
 */
export default function EsqueciSenhaPage() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState('pedir'); // 'pedir' | 'pedido-enviado' | 'codigo' | 'pronto'
  const [usuario, setUsuario] = useState('');
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const pedirCodigo = async (event) => {
    event.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await api.post('/auth/password-reset/request', { username: usuario });
      setEtapa('pedido-enviado');
    } catch (err) {
      setErro(err.message || 'Não foi possível enviar o pedido. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const redefinir = async (event) => {
    event.preventDefault();
    setErro('');
    if (senha.length < 6) {
      setErro('A nova senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmacao) {
      setErro('A confirmação não é igual à nova senha.');
      return;
    }
    setEnviando(true);
    try {
      await api.post('/auth/password-reset/confirm', { username: usuario, code: codigo, newPassword: senha });
      setEtapa('pronto');
    } catch (err) {
      setErro(err.message || 'Não foi possível redefinir a senha.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary to-secondary px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl dark:bg-slate-900 dark:text-slate-100">
        <h1 className="mb-2 text-center text-3xl font-bold text-primary">Esqueci minha senha</h1>

        {erro && <div className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">{erro}</div>}

        {etapa === 'pedir' && (
          <form onSubmit={pedirCodigo}>
            <p className="mb-6 text-center text-gray-600 dark:text-slate-300">
              Informe seu usuário. Um admin do grupo vai aprovar e te passar um <strong>código</strong> para criar uma senha nova.
            </p>
            <label className="mb-2 block font-bold text-gray-700 dark:text-slate-200">Usuário</label>
            <input type="text" value={usuario} onChange={(e) => setUsuario(limparUsuario(e.target.value))} className={campoClasse} placeholder="ex.: samy" autoComplete="username" autoCapitalize="none" spellCheck={false} required />
            <button type="submit" disabled={enviando} className="mt-6 w-full rounded-lg bg-primary py-2 font-bold text-white transition hover:bg-secondary disabled:opacity-50">
              {enviando ? 'Enviando...' : 'Pedir código'}
            </button>
            <button type="button" onClick={() => setEtapa('codigo')} className="mt-3 w-full text-sm font-semibold text-primary hover:underline">
              Já tenho um código
            </button>
          </form>
        )}

        {etapa === 'pedido-enviado' && (
          <div className="text-center">
            <p className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-300">
              Pedido enviado! Se o usuário estiver cadastrado, um admin já consegue ver o seu pedido.
            </p>
            <p className="mb-6 text-sm text-gray-600 dark:text-slate-300">
              <strong>Avise um admin do grupo</strong> (pelo WhatsApp, por exemplo). Ele vai gerar um código que vale por <strong>30 minutos</strong>.
            </p>
            <button type="button" onClick={() => setEtapa('codigo')} className="w-full rounded-lg bg-primary py-2 font-bold text-white transition hover:bg-secondary">
              Já recebi o código
            </button>
          </div>
        )}

        {etapa === 'codigo' && (
          <form onSubmit={redefinir} className="space-y-4">
            <p className="text-center text-sm text-gray-600 dark:text-slate-300">Use o código que o admin te passou e escolha a senha nova.</p>
            <label className="block">
              <span className="mb-1 block font-bold text-gray-700 dark:text-slate-200">Usuário</span>
              <input type="text" value={usuario} onChange={(e) => setUsuario(limparUsuario(e.target.value))} className={campoClasse} placeholder="ex.: samy" autoComplete="username" autoCapitalize="none" spellCheck={false} required />
            </label>
            <label className="block">
              <span className="mb-1 block font-bold text-gray-700 dark:text-slate-200">Código</span>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                className={`${campoClasse} text-center font-mono text-lg tracking-widest`}
                placeholder="ABCD-1234"
                autoComplete="one-time-code"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-bold text-gray-700 dark:text-slate-200">Nova senha</span>
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className={campoClasse} autoComplete="new-password" required />
            </label>
            <label className="block">
              <span className="mb-1 block font-bold text-gray-700 dark:text-slate-200">Confirme a nova senha</span>
              <input type="password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} className={campoClasse} autoComplete="new-password" required />
            </label>
            <button type="submit" disabled={enviando} className="w-full rounded-lg bg-primary py-2 font-bold text-white transition hover:bg-secondary disabled:opacity-50">
              {enviando ? 'Salvando...' : 'Criar senha nova'}
            </button>
            <button type="button" onClick={() => setEtapa('pedir')} className="w-full text-sm font-semibold text-primary hover:underline">
              Ainda não tenho um código
            </button>
          </form>
        )}

        {etapa === 'pronto' && (
          <div className="text-center">
            <p className="mb-6 rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-800 dark:bg-green-950/40 dark:text-green-300">
              Senha alterada! Agora é só entrar com a senha nova.
            </p>
            <button type="button" onClick={() => navigate('/login')} className="w-full rounded-lg bg-primary py-2 font-bold text-white transition hover:bg-secondary">
              Ir para o login
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-gray-600 dark:text-slate-300">
          Lembrou?{' '}
          <Link to="/login" className="font-bold text-primary hover:underline">
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
