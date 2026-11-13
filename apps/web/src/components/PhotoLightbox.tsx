import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { PhotoDto } from '@classbook/shared';
import { formatDate } from '@/lib/format';
import { IconChevronLeft, IconChevronRight, IconClose } from './icons';

interface PhotoLightboxProps {
  photos: PhotoDto[];
  index: number | null;
  onChange: (index: number) => void;
  onClose: () => void;
}

export function PhotoLightbox({ photos, index, onChange, onClose }: PhotoLightboxProps) {
  useEffect(() => {
    if (index === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (photos.length <= 1) return;
      if (event.key === 'ArrowRight') {
        onChange((index + 1) % photos.length);
      }
      if (event.key === 'ArrowLeft') {
        onChange((index - 1 + photos.length) % photos.length);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [index, photos.length, onClose, onChange]);

  if (index === null) return null;
  const photo = photos[index];
  if (!photo) return null;

  const hasMany = photos.length > 1;
  const goPrevious = () => onChange((index - 1 + photos.length) % photos.length);
  const goNext = () => onChange((index + 1) % photos.length);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0c1622]/95 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="查看照片"
      onClick={onClose}
    >
      <div className="absolute left-5 top-5 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
        {index + 1} / {photos.length}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
        aria-label="关闭"
      >
        <IconClose className="h-5 w-5" />
      </button>

      {hasMany && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            goPrevious();
          }}
          className="absolute left-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white sm:left-6"
          aria-label="上一张"
        >
          <IconChevronLeft className="h-6 w-6" />
        </button>
      )}

      <figure
        className="flex max-h-full w-full max-w-4xl flex-col items-center"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={photo.url}
          alt={photo.caption ?? '相册照片'}
          className="max-h-[76vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
        />
        {(photo.caption || photo.createdAt) && (
          <figcaption className="mt-4 max-w-2xl text-center text-sm text-white/80">
            {photo.caption && <span>{photo.caption}</span>}
            {photo.caption && photo.createdAt && (
              <span className="mx-2 text-white/30">·</span>
            )}
            {photo.createdAt && (
              <span className="text-white/50">{formatDate(photo.createdAt)}</span>
            )}
          </figcaption>
        )}
      </figure>

      {hasMany && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            goNext();
          }}
          className="absolute right-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white sm:right-6"
          aria-label="下一张"
        >
          <IconChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>,
    document.body,
  );
}
