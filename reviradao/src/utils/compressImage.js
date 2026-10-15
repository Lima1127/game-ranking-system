/**
 * Reduz fotos antes do envio (ex.: 5 MB do celular -> ~200 KB), mantendo legivel.
 * Importante na nuvem: as imagens ficam no banco, que tem espaco limitado no plano gratis.
 *
 * - Redimensiona para no maximo `maxSize` px no maior lado e converte para JPEG.
 * - GIFs e arquivos que o navegador nao consegue abrir sao enviados como estao
 *   (o backend valida o formato de qualquer jeito).
 * - Se a versao comprimida ficar maior que a original, envia a original.
 */
export async function compressImage(file, { maxSize = 1600, quality = 0.82 } = {}) {
  if (!file || !file.type?.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  // Fundo branco: PNG com transparencia ficaria preto ao virar JPEG.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob || blob.size >= file.size) {
    return file;
  }

  const baseName = (file.name || 'imagem').replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
}

/** Limite antes de comprimir (a foto original do celular pode ser grande). */
export const MAX_ORIGINAL_IMAGE_SIZE = 20 * 1024 * 1024;
