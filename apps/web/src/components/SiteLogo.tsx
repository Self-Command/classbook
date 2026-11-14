import { useState } from 'react';
import type { SiteCopy } from '@classbook/shared';

interface SiteLogoProps {
  copy: SiteCopy;
  className?: string;
}

export function SiteLogo({ copy, className = '' }: SiteLogoProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageUrl = copy.logoImageUrl.trim();
  const showImage =
    copy.logoMode === 'image' && imageUrl.length > 0 && failedUrl !== imageUrl;

  if (showImage) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className={`size-9 shrink-0 object-contain ${className}`}
        onError={() => setFailedUrl(imageUrl)}
        src={imageUrl}
      />
    );
  }

  if (copy.logoMode === 'emoji') {
    return (
      <span
        aria-hidden="true"
        className={`grid size-9 shrink-0 place-items-center text-2xl leading-none ${className}`}
      >
        {copy.logoEmoji.trim() || '🎓'}
      </span>
    );
  }

  const text = copy.logoText.trim() || copy.siteEmoji.trim() || '拾';

  return (
    <span
      aria-hidden="true"
      className={`grid size-9 shrink-0 place-items-center font-display leading-none text-accent ${
        text.length > 2 ? 'text-base' : 'text-2xl'
      } ${className}`}
    >
      {text}
    </span>
  );
}
