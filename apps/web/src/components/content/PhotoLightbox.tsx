import { useEffect } from 'react';
import type { PhotoDto } from '@classbook/shared';
import { Button, Modal } from '@heroui/react';
import { formatDate } from '@/lib/format';
import { IconChevronLeft, IconChevronRight, IconClose } from '@/components/icons';

interface PhotoLightboxProps {
  photos: PhotoDto[];
  index: number | null;
  albumTitle: string;
  onChange: (index: number) => void;
  onClose: () => void;
}

export function PhotoLightbox({
  photos,
  index,
  albumTitle,
  onChange,
  onClose,
}: PhotoLightboxProps) {
  const open = index !== null && photos.length > 0;
  const safeIndex = index ?? 0;
  const photo = index !== null ? photos[index] : undefined;
  const hasMany = photos.length > 1;

  useEffect(() => {
    if (!open || index === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onChange((index - 1 + photos.length) % photos.length);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onChange((index + 1) % photos.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, index, photos.length, onChange]);

  const goPrevious = () => onChange((safeIndex - 1 + photos.length) % photos.length);
  const goNext = () => onChange((safeIndex + 1) % photos.length);

  return (
    <Modal.Backdrop
      className="bg-foreground/90 backdrop-blur-md"
      isOpen={open}
      variant="blur"
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Modal.Container placement="center" size="full">
        <Modal.Dialog
          aria-label="查看相册照片"
          className="relative h-full w-full max-w-none items-center justify-center gap-0 overflow-hidden rounded-none bg-transparent p-0 shadow-none"
        >
          {({ close }) => (
            <>
              <div className="absolute left-4 top-4 z-10 rounded-full bg-background/15 px-3 py-1 text-xs text-background/85">
                {photo ? `${safeIndex + 1} / ${photos.length}` : ''}
              </div>

              <Button
                isIconOnly
                aria-label="关闭大图"
                className="absolute right-4 top-4 z-10 text-background/80 hover:bg-background/15 hover:text-background"
                size="md"
                variant="ghost"
                onPress={close}
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
                  onPress={goPrevious}
                >
                  <IconChevronLeft className="size-6" />
                </Button>
              )}

              {photo && (
                <figure className="flex max-h-full w-full max-w-5xl flex-col items-center gap-3 px-4 py-16 sm:px-12">
                  <img
                    alt={photo.caption ?? albumTitle}
                    className="max-h-[72dvh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
                    src={photo.url}
                  />
                  <figcaption className="max-w-2xl text-center text-xs leading-5 text-background/70">
                    {photo.caption && <span>{photo.caption}</span>}
                    {photo.caption && (
                      <span className="mx-2 text-background/30">·</span>
                    )}
                    <span className="text-background/50">{formatDate(photo.createdAt)}</span>
                  </figcaption>
                </figure>
              )}

              {hasMany && (
                <Button
                  isIconOnly
                  aria-label="下一张"
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 text-background/80 hover:bg-background/15 hover:text-background sm:right-6"
                  size="lg"
                  variant="ghost"
                  onPress={goNext}
                >
                  <IconChevronRight className="size-6" />
                </Button>
              )}
            </>
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
