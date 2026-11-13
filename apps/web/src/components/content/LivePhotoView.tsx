import { useEffect, useRef } from 'react';
import { LivePhotoViewer } from 'live-photo';

interface LivePhotoViewProps {
  photoSrc: string;
  videoSrc: string;
  className?: string;
  height?: string;
  fit?: 'cover' | 'contain';
  onOpen?: () => void;
}

export function LivePhotoView({
  photoSrc,
  videoSrc,
  className,
  height = '100%',
  fit = 'cover',
  onOpen,
}: LivePhotoViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const viewer = new LivePhotoViewer({
      photoSrc,
      videoSrc,
      container,
      width: '100%',
      height,
      autoplay: true,
      muted: true,
      lazyLoadVideo: true,
      imageCustomization: { styles: { objectFit: fit } },
      videoCustomization: { styles: { objectFit: fit } },
    });

    return () => viewer.destroy();
  }, [photoSrc, videoSrc, height, fit]);

  return (
    <div
      ref={containerRef}
      className={className}
      onClickCapture={(event) => {
        const target = event.target as HTMLElement;
        if (onOpen && !target.closest('button')) onOpen();
      }}
    />
  );
}
