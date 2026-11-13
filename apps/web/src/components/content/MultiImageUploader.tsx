import { useRef, useState, type ChangeEvent } from 'react';
import { ALLOWED_IMAGE_MIME, IMAGE_MAX_BYTES } from '@classbook/shared';
import { ProgressBar, Spinner } from '@heroui/react';
import { uploadsApi, settingsApi, getErrorMessage, type PhotoUpload } from '@/lib/api';
import {
  compressImage,
  DEFAULT_IMAGE_COMPRESSION,
  type ImageCompressionConfig,
} from '@/lib/compressImage';
import { useToast } from '@/components/Toast';
import { IconCamera } from '@/components/icons';

const ACCEPT = ALLOWED_IMAGE_MIME.join(',');
const MULTI_ACCEPT = `${ACCEPT},video/mp4,video/quicktime,.mov`;
const ALLOWED_MIME: readonly string[] = ALLOWED_IMAGE_MIME;

const MAX_SOURCE_BYTES = 30 * 1024 * 1024;

const VIDEO_MIME = ['video/mp4', 'video/quicktime'];
const VIDEO_MAX_BYTES = 80 * 1024 * 1024;

function validateFile(file: File): string | null {
  if (!ALLOWED_MIME.includes(file.type)) return '仅支持 JPG / PNG / WebP 格式';
  if (file.size > MAX_SOURCE_BYTES) return '图片大小不能超过 30MB';
  return null;
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '').toLowerCase();
}

async function isMotionPhoto(file: File): Promise<boolean> {
  try {
    const buffer = await file.slice(0, 262144).arrayBuffer();
    const head = new TextDecoder('latin1').decode(buffer);
    return head.includes('MotionPhoto') || head.includes('MicroVideo');
  } catch {
    return false;
  }
}

let compressionConfigPromise: Promise<ImageCompressionConfig> | null = null;

function getCompressionConfig(): Promise<ImageCompressionConfig> {
  if (!compressionConfigPromise) {
    compressionConfigPromise = settingsApi
      .getPublic()
      .then((settings) => ({
        enabled: settings.imageCompressEnabled,
        thresholdKb: settings.imageCompressThresholdKb,
        maxDimension: settings.imageMaxDimension,
        quality: settings.imageQuality,
      }))
      .catch(() => DEFAULT_IMAGE_COMPRESSION);
  }
  return compressionConfigPromise;
}

interface MultiImageUploaderProps {
  onUploaded: (photos: PhotoUpload[]) => Promise<void> | void;
  disabled?: boolean;
  label?: string;
}

export function MultiImageUploader({
  onUploaded,
  disabled = false,
  label = '点击选择照片上传',
}: MultiImageUploaderProps) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const handleInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    const images: File[] = [];
    const videos = new Map<string, File>();
    const invalid: string[] = [];

    for (const file of files) {
      if (VIDEO_MIME.includes(file.type) || /\.(mp4|mov)$/i.test(file.name)) {
        if (file.size > VIDEO_MAX_BYTES) {
          invalid.push(`${file.name}（视频不能超过 80MB）`);
        } else {
          videos.set(baseName(file.name), file);
        }
        continue;
      }

      const problem = validateFile(file);
      if (problem) invalid.push(`${file.name}（${problem}）`);
      else images.push(file);
    }

    if (invalid.length > 0) {
      const preview = invalid.slice(0, 2).join('、');
      const suffix = invalid.length > 2 ? ` 等 ${invalid.length} 个文件` : '';
      showToast(`${preview}${suffix} 未上传`, 'error');
    }

    if (images.length === 0) {
      if (videos.size > 0) showToast('请同时选择实况照片的 JPG 图片', 'error');
      return;
    }

    setUploading(true);
    setProgress({ done: 0, total: images.length });
    const uploadedPhotos: PhotoUpload[] = [];

    try {
      const config = await getCompressionConfig();
      for (let index = 0; index < images.length; index += 1) {
        const image = images[index];
        const pairedVideo = videos.get(baseName(image.name));

        if (pairedVideo) {
          uploadedPhotos.push(await uploadsApi.livePhoto(image, pairedVideo));
          videos.delete(baseName(image.name));
        } else if (await isMotionPhoto(image)) {
          uploadedPhotos.push(await uploadsApi.image(image));
        } else {
          const prepared = await compressImage(image, config, IMAGE_MAX_BYTES);
          uploadedPhotos.push(await uploadsApi.image(prepared));
        }

        setProgress({ done: index + 1, total: images.length });
      }

      if (videos.size > 0) {
        showToast(`${videos.size} 个视频未找到同名图片，已跳过`, 'error');
      }

      await onUploaded(uploadedPhotos);
      showToast(`已上传 ${uploadedPhotos.length} 张照片`);
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const openPicker = () => {
    if (!disabled && !uploading) inputRef.current?.click();
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={MULTI_ACCEPT}
        multiple
        onChange={handleInput}
        className="hidden"
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled || uploading}
        className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-default/40 px-4 py-8 text-center transition-colors hover:border-accent/40 hover:bg-default/70 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-surface text-foreground shadow-sm">
          {uploading ? <Spinner /> : <IconCamera className="size-5" />}
        </span>
        <span className="mt-3 text-sm font-medium text-foreground">
          {uploading && progress
            ? `正在上传 ${progress.done} / ${progress.total}`
            : uploading
              ? '正在上传…'
              : label}
        </span>
        <span className="mt-1 text-xs text-muted">
          支持 JPG / PNG / WebP，iPhone 实况照片可同时选择 JPG 与同名 MOV
        </span>
        {uploading && progress ? (
          <ProgressBar
            aria-label="上传进度"
            value={progress.done}
            maxValue={progress.total}
            color="accent"
            className="mt-3 w-full max-w-sm"
          >
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
        ) : null}
      </button>
    </div>
  );
}
