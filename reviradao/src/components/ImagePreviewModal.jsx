import { useEffect, useState } from 'react';

const CLOSE_ANIMATION_MS = 180;

export default function ImagePreviewModal({ isOpen, imageSrc, imageAlt, onClose }) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => setIsVisible(true));
      return undefined;
    }

    if (!shouldRender) {
      return undefined;
    }

    setIsVisible(false);
    const timeoutId = setTimeout(() => {
      setShouldRender(false);
    }, CLOSE_ANIMATION_MS);

    return () => clearTimeout(timeoutId);
  }, [isOpen, shouldRender]);

  useEffect(() => {
    if (!shouldRender) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [shouldRender, onClose]);

  if (!shouldRender || !imageSrc) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-[1200] flex items-center justify-center p-4 transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-[1px]" />

      <div
        className={`relative z-[1201] max-h-[92vh] max-w-[92vw] transition duration-200 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-1'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={imageSrc}
          alt={imageAlt || 'Preview da imagem'}
          className="max-h-[92vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
        />
      </div>
    </div>
  );
}
