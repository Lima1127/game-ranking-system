import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Janela em foco: fundo escurecido, fecha com X, Esc ou clique fora.
 * Nunca tem barra de rolagem propria: se o conteudo nao couber, quem rola e a tela inteira.
 */
export default function JanelaFoco({ titulo, subtitulo, icone, largura = 'max-w-2xl', onFechar, children }) {
  const fecharRef = useRef(null);
  // Guarda a funcao mais recente sem refazer a preparacao da janela a cada atualizacao da pagina.
  const onFecharRef = useRef(onFechar);
  onFecharRef.current = onFechar;

  useEffect(() => {
    const fecharEsc = (event) => event.key === 'Escape' && onFecharRef.current();
    window.addEventListener('keydown', fecharEsc);
    // Trava a rolagem da pagina por tras enquanto a janela esta aberta.
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    fecharRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', fecharEsc);
      document.body.style.overflow = overflowAnterior;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm" onClick={onFechar}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={titulo}
          className={`w-full ${largura} rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6 dark:border-slate-700 dark:bg-slate-900`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {icone}
              <div className="min-w-0">
                <h2 className="truncate text-xl font-black text-slate-900 dark:text-slate-100">{titulo}</h2>
                {subtitulo && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitulo}</p>}
              </div>
            </div>
            <button
              ref={fecharRef}
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              className="shrink-0 rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
