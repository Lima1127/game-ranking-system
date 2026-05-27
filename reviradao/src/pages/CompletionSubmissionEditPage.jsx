import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function formatFileSize(size) {
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export default function CompletionSubmissionEditPage() {
  const { kind, submissionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [proofFile, setProofFile] = useState(null);
  const [form, setForm] = useState(null);

  const { data: games = [] } = useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const response = await api.get('/games');
      return response.data;
    },
  });

  const { data: submission, isLoading, error } = useQuery({
    queryKey: ['completion-submission-details', kind, submissionId],
    queryFn: async () => {
      const response = await api.get(`/completions/submissions/${kind}/${submissionId}`, {
        headers: { 'X-User-Id': user.id },
      });
      return response.data;
    },
    enabled: Boolean(user?.id && kind && submissionId),
  });

  useEffect(() => {
    if (submission) {
      setForm({
        gameName: submission.gameName,
        completedAt: submission.completedAt,
        hoursPlayed: submission.hoursPlayed,
        firstTimeEver: submission.firstTimeEver,
        completedInReleaseYear: submission.completedInReleaseYear,
        platinum: submission.platinum,
        notes: submission.notes || '',
      });
    }
  }, [submission]);

  const resolveGameId = async () => {
    if (kind !== 'NEW_COMPLETION') {
      return submission.gameId;
    }

    const normalizedName = form.gameName.trim().toLowerCase();
    const existingGame = games.find((game) => game.name.trim().toLowerCase() === normalizedName);

    if (existingGame) {
      return existingGame.id;
    }

    const response = await api.post('/games', {
      name: form.gameName.trim(),
      releaseYear: Number(form.completedAt.slice(0, 4)),
      estimatedHoursMain: null,
      estimatedHoursPlatinum: null,
      genres: ['Nao informado'],
    });

    queryClient.invalidateQueries({ queryKey: ['games'] });
    return response.data.id;
  };

  const uploadProof = async () => {
    if (!proofFile) {
      return submission.proofId;
    }

    const payload = new FormData();
    payload.append('file', proofFile);

    const response = await api.post('/uploads/platinum', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data.proofId;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const gameId = await resolveGameId();
      const proofId = await uploadProof();

      return api.put(
        `/completions/submissions/${kind}/${submissionId}`,
        {
          gameId,
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
      queryClient.invalidateQueries({ queryKey: ['completion-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['completion-submission-details', kind, submissionId] });
      queryClient.invalidateQueries({ queryKey: ['completion-requests'] });
      queryClient.invalidateQueries({ queryKey: ['completion-update-requests'] });
      navigate('/requests');
    },
    onError: (error) => alert(error.response?.data?.message || error.message),
  });

  const suggestions = useMemo(() => {
    if (kind !== 'NEW_COMPLETION' || !form?.gameName?.trim()) {
      return [];
    }

    const normalized = form.gameName.trim().toLowerCase();
    return games.filter((game) => game.name.toLowerCase().includes(normalized)).slice(0, 6);
  }, [form?.gameName, games, kind]);

  if (isLoading || !form) {
    return <div className="text-slate-600 dark:text-slate-300">Carregando solicitacao...</div>;
  }

  if (error) {
    return <div className="text-red-600">Erro ao carregar solicitacao: {error.message}</div>;
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

    if (kind === 'NEW_COMPLETION' && !form.gameName.trim()) {
      alert('Preencha o nome do jogo.');
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
        <h1 className="mt-2 text-4xl font-black text-slate-900 dark:text-slate-100">Editar Solicitacao</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Ajuste as informacoes enquanto a solicitacao ainda estiver pendente. O admin vai revisar a versao atualizada.
        </p>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off" className="bg-white dark:bg-slate-900 rounded-lg shadow p-8 border border-gray-100 dark:border-slate-800 space-y-6">
        {kind === 'NEW_COMPLETION' ? (
          <div>
            <label className="block text-gray-700 dark:text-slate-200 font-bold mb-2">
              Jogo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="gameName"
              value={form.gameName}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            {suggestions.length > 0 && (
              <div className="mt-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                {suggestions.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, gameName: game.name }))}
                    className="block w-full border-b border-gray-100 dark:border-slate-700 px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 last:border-b-0"
                  >
                    {game.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-5">
            <div className="text-sm text-slate-500 dark:text-slate-400">Jogo vinculado</div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{submission.gameName}</div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-gray-700 dark:text-slate-200 font-bold mb-2">Data de Conclusao</label>
            <input
              type="date"
              name="completedAt"
              value={form.completedAt}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 dark:text-slate-200 font-bold mb-2">Horas Jogadas</label>
            <input
              type="number"
              name="hoursPlayed"
              value={form.hoursPlayed}
              onChange={handleChange}
              step="0.5"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <label className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 p-4">
            <input type="checkbox" name="firstTimeEver" checked={form.firstTimeEver} onChange={handleChange} className="h-5 w-5" />
            <span className="ml-3 font-semibold text-slate-700 dark:text-slate-200">Primeira Experiencia</span>
          </label>
          <label className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 p-4 md:col-span-2">
            <input type="checkbox" name="completedInReleaseYear" checked={form.completedInReleaseYear} onChange={handleChange} className="h-5 w-5" />
            <span className="ml-3 font-semibold text-slate-700 dark:text-slate-200">Em Dia</span>
          </label>
          <label className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 p-4 md:col-span-2">
            <input type="checkbox" name="platinum" checked={form.platinum} onChange={handleChange} className="h-5 w-5" />
            <span className="ml-3 font-semibold text-slate-700 dark:text-slate-200">Platina (100%)</span>
          </label>
        </div>

        <div>
          <label className="block text-gray-700 dark:text-slate-200 font-bold mb-2">Observacoes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-400/35 dark:bg-[#243247]">
          <label className="block text-indigo-900 dark:text-indigo-100 font-bold mb-2">Anexo da solicitacao</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-indigo-900 dark:text-indigo-100 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-indigo-700"
          />
          <p className="mt-2 text-sm text-indigo-800 dark:text-indigo-200">
            Se nao enviar um novo arquivo, o anexo atual sera mantido.
          </p>
          {submission.proofId && !proofFile && (
            <p className="mt-2 text-sm text-indigo-900 dark:text-indigo-100">Anexo atual mantido.</p>
          )}
          {proofFile && (
            <p className="mt-2 text-sm text-indigo-900 dark:text-indigo-100">
              Novo arquivo selecionado: <strong>{proofFile.name}</strong> ({formatFileSize(proofFile.size)})
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-lg bg-primary py-3 font-bold text-white hover:bg-secondary disabled:opacity-50"
        >
          {mutation.isPending ? 'Salvando...' : 'Salvar solicitacao'}
        </button>
      </form>
    </div>
  );
}
