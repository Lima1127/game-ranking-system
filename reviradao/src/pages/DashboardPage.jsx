import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ImagePreviewModal from '../components/ImagePreviewModal';

export default function DashboardPage() {
  const { user, updateAvatar } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const avatarUrl = user?.avatarUploadedAt
    ? `${api.defaults.baseURL}/users/${user.id}/avatar?v=${encodeURIComponent(user.avatarUploadedAt)}`
    : null;

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file) => {
      const payload = new FormData();
      payload.append('file', file);
      const response = await api.post('/users/me/avatar', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: (data) => {
      updateAvatar(data.avatarUploadedAt);
      setSelectedFile(null);
      alert('Avatar atualizado com sucesso.');
    },
    onError: (error) => {
      alert(error.response?.data?.message || 'Erro ao atualizar avatar');
    },
  });

  const handleAvatarSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert('Selecione apenas arquivos de imagem.');
      event.target.value = '';
      return;
    }
    setSelectedFile(file);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

      <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-lg shadow-lg p-8 mb-8">
        <h2 className="text-3xl font-bold mb-2">
          Bem-vindo, {localStorage.getItem('user_display_name') || user?.email}!
        </h2>
        <p className="opacity-90">Acompanhe seu progresso no sistema de ranking</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-8 border border-gray-100 dark:border-slate-800 mb-8">
        <h3 className="text-2xl font-bold mb-4">Foto de Perfil</h3>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              <button
                type="button"
                onClick={() =>
                  setPreviewImage({
                    src: avatarUrl,
                    alt: `Avatar de ${user?.displayName || user?.email}`,
                  })
                }
                className="inline-block"
              >
                <img
                  src={avatarUrl}
                  alt={`Avatar de ${user?.displayName || user?.email}`}
                  className="h-20 w-20 rounded-full object-cover border border-slate-300 dark:border-slate-700 cursor-zoom-in"
                />
              </button>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-slate-400 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 text-xs font-semibold text-center px-2">
                Sem foto
              </div>
            )}
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Escolha uma imagem para usar como avatar. Se nao enviar, seu perfil continua sem foto.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarSelection}
              className="block w-full text-sm text-slate-700 dark:text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-secondary"
            />
            <button
              type="button"
              disabled={!selectedFile || uploadAvatarMutation.isPending}
              onClick={() => uploadAvatarMutation.mutate(selectedFile)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-secondary disabled:opacity-50"
            >
              {uploadAvatarMutation.isPending ? 'Enviando avatar...' : 'Salvar avatar'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-gray-100 dark:border-slate-800">
          <h3 className="text-gray-600 dark:text-slate-300 font-semibold mb-2">Seu Email</h3>
          <p className="text-2xl font-bold text-primary">{user?.email}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-gray-100 dark:border-slate-800">
          <h3 className="text-gray-600 dark:text-slate-300 font-semibold mb-2">ID do Usuario</h3>
          <p className="text-sm font-mono text-gray-700 dark:text-slate-200">{user?.id}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-gray-100 dark:border-slate-800">
          <h3 className="text-gray-600 dark:text-slate-300 font-semibold mb-2">Status</h3>
          <p className="text-2xl font-bold text-green-600">Ativo</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-8 border border-gray-100 dark:border-slate-800">
        <h3 className="text-2xl font-bold mb-6">Acoes Rapidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/ranking"
            className="bg-primary hover:bg-secondary text-white px-6 py-3 rounded-lg font-bold text-center transition duration-200"
          >
            Ver Ranking
          </Link>
          <Link
            to="/completion"
            className="bg-secondary hover:bg-primary text-white px-6 py-3 rounded-lg font-bold text-center transition duration-200"
          >
            Registrar Conclusao
          </Link>
          <Link
            to="/requests"
            className="bg-slate-700 hover:bg-slate-900 text-white px-6 py-3 rounded-lg font-bold text-center transition duration-200"
          >
            Ver Solicitacoes
          </Link>
          <Link
            to="/obligations"
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-bold text-center transition duration-200"
          >
            Gerenciar Obrigacoes
          </Link>
        </div>
      </div>

      <ImagePreviewModal
        isOpen={Boolean(previewImage)}
        imageSrc={previewImage?.src}
        imageAlt={previewImage?.alt}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}
