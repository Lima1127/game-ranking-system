import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function formatFileSize(size) {
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export default function CompletionUpdatePage() {
  const { completionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [proofFile, setProofFile] = useState(null);

  const { data: completion, isLoading, error } = useQuery({
    queryKey: ['completion-details', completionId],
    queryFn: async () => {
      const response = await api.get(`/completions/${completionId}`, {
        headers: { 'X-User-Id': user.id },
      });
      return response.data;
    },
    enabled: Boolean(user?.id && completionId),
  });

  const [form, setForm] = useState(null);

  const uploadProof = async () => {
    const payload = new FormData();
    payload.append('file', proofFile);

    const response = await api.post('/uploads/platinum', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data.proofId;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const proofId = await uploadProof();
      return api.post(
        `/completions/${completionId}/update-requests`,
        {
          completedAt: form.completedAt,
          hoursPlayed: form.hoursPlayed,
          firstTimeEver: form.firstTimeEver,
          completedInReleaseYear: form.completedInReleaseYear,
          platinum: form.platinum,
          proofId,
          coop: false,
          coopPlayers: null,
          hypeParticipation: false,
          hypeCompletedBonus: false,
          rotativeList: false,
          notes: form.notes,
        },
        {
          headers: { 'X-User-Id': user.id },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['completion-update-requests'] });
      queryClient.invalidateQueries({ queryKey: ['completion-requests'] });
      queryClient.invalidateQueries({ queryKey: ['completion-submissions'] });
      navigate('/requests');
    },
    onError: (error) => alert(error.response?.data?.message || error.message),
  });

  useEffect(() => {
    if (completion) {
      setForm({
        completedAt: completion.completedAt,
        hoursPlayed: completion.hoursPlayed,
        firstTimeEver: completion.firstTimeEver,
        completedInReleaseYear: completion.completedInReleaseYear,
        platinum: completion.platinum,
        notes: completion.notes || '',
      });
    }
  }, [completion]);

  if (isLoading) {
    return <div className="text-slate-600 dark:text-slate-300">Carregando registro...</div>;
  }

  if (error) {
    return <div className="text-red-600">Erro ao carregar registro: {error.message}</div>;
  }

  if (!completion) {
    return <div className="text-slate-600 dark:text-slate-300">Registro nao encontrado.</div>;
  }

  if (!form) {
    return <div className="text-slate-600 dark:text-slate-300">Preparando formulario...</div>;
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      setProofFile(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Envie apenas arquivos de imagem.');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      alert(`A imagem excede o limite de ${formatFileSize(MAX_IMAGE_SIZE)}.`);
      e.target.value = '';
      return;
    }

    setProofFile(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!proofFile) {
      alert('Anexe uma nova imagem para a solicitacao de atualizacao.');
      return;
    }

    mutation.mutate();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link to="/requests" className="text-sm font-bold text-primary hover:text-secondary">
          Voltar para solicitacoes
        </Link>
        <h1 className="mt-2 text-4xl font-black text-slate-900 dark:text-slate-100">Atualizar Registro</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Use esta tela para pedir novos pontos em um jogo que ja foi aprovado, como uma futura platina ou ajuste de horas.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="text-sm text-slate-500 dark:text-slate-400">Jogo</div>
        <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{completion.gameName}</div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl bg-white dark:bg-slate-900 p-8 shadow-sm space-y-6 border border-slate-100 dark:border-slate-800">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block font-bold text-slate-700 dark:text-slate-200">Data de Conclusao</label>
            <input
              type="date"
              name="completedAt"
              value={form.completedAt}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-bold text-slate-700 dark:text-slate-200">Horas Jogadas</label>
            <input
              type="number"
              name="hoursPlayed"
              value={form.hoursPlayed}
              onChange={handleChange}
              step="0.5"
              min="0"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <label className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 p-4">
            <input type="checkbox" name="firstTimeEver" checked={form.firstTimeEver} onChange={handleChange} className="h-5 w-5" />
            <span className="ml-3 font-semibold text-slate-700 dark:text-slate-200">Primeira Experiencia</span>
          </label>

          <label className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 p-4">
            <input type="checkbox" name="completedInReleaseYear" checked={form.completedInReleaseYear} onChange={handleChange} className="h-5 w-5" />
            <span className="ml-3 font-semibold text-slate-700 dark:text-slate-200">Em Dia</span>
          </label>

          <label className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 p-4 md:col-span-2">
            <input type="checkbox" name="platinum" checked={form.platinum} onChange={handleChange} className="h-5 w-5" />
            <span className="ml-3 font-semibold text-slate-700 dark:text-slate-200">Platina (100%)</span>
          </label>
        </div>

        <div>
          <label className="mb-2 block font-bold text-slate-700 dark:text-slate-200">Observacoes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={4}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Explique o que mudou neste registro."
          />
        </div>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-400/35 dark:bg-[#243247]">
          <label className="mb-2 block font-bold text-indigo-900 dark:text-indigo-100">
            Novo anexo da atualizacao <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-indigo-900 dark:text-indigo-100 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-indigo-700"
          />
          <p className="mt-2 text-sm text-indigo-800 dark:text-indigo-200">Envie uma nova imagem para comprovar a atualizacao, ate {formatFileSize(MAX_IMAGE_SIZE)}.</p>
          {proofFile && (
            <p className="mt-2 text-sm text-indigo-900 dark:text-indigo-100">
              Arquivo selecionado: <strong>{proofFile.name}</strong> ({formatFileSize(proofFile.size)})
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-lg bg-primary py-3 font-bold text-white hover:bg-secondary disabled:opacity-50"
        >
          {mutation.isPending ? 'Enviando atualizacao...' : 'Enviar solicitacao de atualizacao'}
        </button>
      </form>
    </div>
  );
}
