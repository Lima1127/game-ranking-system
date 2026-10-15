import { useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import { Check, X, ZoomIn, ZoomOut } from 'lucide-react';

const OUTPUT_SIZE = 512;

/** Recorta a area escolhida e devolve um JPEG quadrado de 512x512. */
async function cropToFile(imageUrl, area, originalName) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  if (!blob) {
    throw new Error('Não foi possível recortar a imagem.');
  }
  const baseName = (originalName || 'avatar').replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
}

/**
 * Janela para posicionar e dar zoom no avatar antes de enviar.
 * Chama onConfirm(arquivoRecortado) ou onCancel().
 */
export default function AvatarCropModal({ file, isSaving, onConfirm, onCancel }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) {
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setError('');
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!file) {
      return undefined;
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !isSaving) {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [file, isSaving, onCancel]);

  if (!file || !imageUrl) {
    return null;
  }

  const handleConfirm = async () => {
    if (!croppedArea) {
      return;
    }
    try {
      setError('');
      onConfirm(await cropToFile(imageUrl, croppedArea, file.name));
    } catch {
      setError('Não foi possível usar esta imagem. Tente outra foto.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ajustar foto de perfil"
        className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Ajustar foto de perfil</h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            aria-label="Cancelar"
            className="rounded-full p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative h-72 bg-slate-900 sm:h-80">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            minZoom={1}
            maxZoom={4}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, areaPixels) => setCroppedArea(areaPixels)}
          />
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">Arraste para posicionar e use o zoom para ajustar.</p>
          <label className="flex items-center gap-3">
            <ZoomOut className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
            <input
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              aria-label="Zoom"
              className="w-full accent-primary"
            />
            <ZoomIn className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSaving || !croppedArea}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-secondary disabled:opacity-50"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              {isSaving ? 'Salvando...' : 'Usar esta foto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
