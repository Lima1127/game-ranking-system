import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import JanelaFoco from './JanelaFoco';

const campoClasse =
  'w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

/** Troca da própria senha (pede a atual + a nova duas vezes). */
export default function JanelaAlterarSenha({ onFechar }) {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erroLocal, setErroLocal] = useState('');

  const mutation = useMutation({
    mutationFn: async () => api.put('/users/me/password', { currentPassword: atual, newPassword: nova }),
  });

  const enviar = (event) => {
    event.preventDefault();
    setErroLocal('');
    if (nova.length < 6) {
      setErroLocal('A nova senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (nova !== confirmacao) {
      setErroLocal('A confirmação não é igual à nova senha.');
      return;
    }
    mutation.mutate();
  };

  const erro = erroLocal || mutation.error?.message;

  return (
    <JanelaFoco titulo="Alterar senha" largura="max-w-md" onFechar={onFechar}>
      {mutation.isSuccess ? (
        <>
          <p className="rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-green-800 dark:bg-green-950/40 dark:text-green-300">
            Senha alterada! Use a nova senha no próximo login.
          </p>
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={onFechar} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-secondary">
              Pronto
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={enviar} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Senha atual</span>
            <input type="password" value={atual} onChange={(e) => setAtual(e.target.value)} autoComplete="current-password" required className={campoClasse} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Nova senha</span>
            <input type="password" value={nova} onChange={(e) => setNova(e.target.value)} autoComplete="new-password" required className={campoClasse} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-700 dark:text-slate-200">Confirme a nova senha</span>
            <input type="password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} autoComplete="new-password" required className={campoClasse} />
          </label>
          {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{erro}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onFechar} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              Cancelar
            </button>
            <button type="submit" disabled={mutation.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-secondary disabled:opacity-50">
              {mutation.isPending ? 'Salvando...' : 'Alterar senha'}
            </button>
          </div>
        </form>
      )}
    </JanelaFoco>
  );
}
