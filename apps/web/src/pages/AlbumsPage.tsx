import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Chip } from '@heroui/react';
import { albumsApi, getErrorMessage } from '@/lib/api';
import { useAsyncData } from '@/lib/useAsyncData';
import { useAuth } from '@/lib/auth';
import { useSiteCopy } from '@/lib/siteCopy';
import { IconAlbum, IconCamera, IconPlus } from '@/components/icons';
import { AlbumCard } from '@/components/content/AlbumCard';
import { AlbumFormModal, type AlbumFormValues } from '@/components/content/AlbumFormModal';
import { EmptyPanel, ErrorPanel } from '@/components/content/ContentStates';
import { AlbumGridSkeleton } from '@/components/content/ContentSkeletons';
import { PageShell } from '@/components/content/PageShell';
import { useToast } from '@/components/Toast';

export default function AlbumsPage() {
  const { copy } = useSiteCopy();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data, loading, error, reload } = useAsyncData(() => albumsApi.list(), []);

  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const handleCreate = async (values: AlbumFormValues) => {
    setBusy(true);
    setFormError('');
    try {
      const result = await albumsApi.create({
        title: values.title,
        description: values.description,
      });
      showToast(`相册「${result.album.title}」已创建`);
      navigate(`/albums/${result.album.id}`);
    } catch (cause) {
      setFormError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      action={
        <div className="flex items-center gap-2">
          {user && (
            <Button onPress={() => setCreateOpen(true)} size="sm" variant="secondary">
              <IconPlus className="size-4" />
              创建相册
            </Button>
          )}
          {data && (
            <Chip color="accent" size="sm" variant="soft">
              <IconAlbum className="size-3.5" />
              <Chip.Label>{data.items.length} 本相册</Chip.Label>
            </Chip>
          )}
        </div>
      }
      description={copy.albumsDescription}
      eyebrow="光影留存"
      title={copy.albumsTitle}
    >
      {loading && !data && <AlbumGridSkeleton />}

      {!loading && error && <ErrorPanel message={error} title="相册暂时打不开" onRetry={reload} />}

      {!loading && !error && data && data.items.length === 0 && (
        <EmptyPanel
          description={copy.albumsEmptyDescription}
          icon={<IconCamera className="size-5" />}
          title={copy.albumsEmptyTitle}
        />
      )}

      {data && data.items.length > 0 && (
        <div
          className={`grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 ${
            loading ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          {data.items.map((album) => (
            <AlbumCard album={album} key={album.id} />
          ))}
        </div>
      )}

      <AlbumFormModal
        busy={busy}
        error={formError}
        mode="create"
        onClose={() => {
          if (!busy) setCreateOpen(false);
        }}
        onSubmit={handleCreate}
        open={createOpen}
      />
    </PageShell>
  );
}
