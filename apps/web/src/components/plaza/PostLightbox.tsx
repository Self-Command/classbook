import { useEffect } from 'react';
import { Button } from '@heroui/react';
import {
  IconChevronLeft,
  IconChevronRight,
  IconClose,
} from '@/components/icons';

interface PostLightboxProps {
  images: string[];
  index: number | null;
  onChange: (index: number) => void;
  onClose: () => void;
}

export function PostLightbox({
  images,
  index,
  onChange,
  onClose,
}: PostLightboxProps) {
  const open = index !== null && images.length > 0;
  const safeIndex = index ?? 0;
  const hasMany = images.length > 1;

  useEffect(() => {
    if (!open || index === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onChange((index - 1 + images.length) % images.length);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onChange((index + 1) % images.length);
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, index, images.length, onChange, onClose]);

  if (!open) return null;

  return (
    <div
      aria-label="查看图片"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/90 p-4"
      onClick={onClose}
      role="dialog"
    >
      <div className="absolute left-4 top-4 z-10 rounded-full bg-background/15 px-3 py-1 text-xs text-background/85">
        {safeIndex + 1} / {images.length}
      </div>

      <Button
        isIconOnly
        aria-label="关闭大图"
        className="absolute right-4 top-4 z-10 text-background/80 hover:bg-background/15 hover:text-background"
        size="md"
        variant="ghost"
        onPress={onClose}
      >
        <IconClose className="size-5" />
      </Button>

      {hasMany && (
        <Button
          isIconOnly
          aria-label="上一张"
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 text-background/80 hover:bg-background/15 hover:text-background sm:left-6"
          size="lg"
          variant="ghost"
          onPress={() => onChange((safeIndex - 1 + images.length) % images.length)}
        >
          <IconChevronLeft className="size-6" />
        </Button>
      )}

      <img
        alt=""
        className="max-h-[86dvh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        src={images[safeIndex]}
      />

      {hasMany && (
        <Button
          isIconOnly
          aria-label="下一张"
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 text-background/80 hover:bg-background/15 hover:text-background sm:right-6"
          size="lg"
          variant="ghost"
          onPress={() => onChange((safeIndex + 1) % images.length)}
        >
          <IconChevronRight className="size-6" />
        </Button>
      )}
    </div>
  );
}