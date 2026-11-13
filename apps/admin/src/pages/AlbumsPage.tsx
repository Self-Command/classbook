import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AlbumSummaryDto } from '@classbook/shared';
import { Button, Card, Chip, toast } from '@heroui/react';
import { albums, getErrorMessage, type AlbumCreateInput } from '../lib/api';
import { formatDate } from '../lib/format';
import { useAsyncData } from '../lib/useAsyncData';
import { AlbumFormModal } from '../components/albums/AlbumFormModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorBlock, LoadingBlock } from '../components/ui/States';

export function AlbumsPage() {
  const { data, loading, error, reload } = useAsyncData(() => albums.list(), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AlbumSummaryDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AlbumSummaryDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const albumList = data ?? [];

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (album: AlbumSummaryDto) => {
    setEditing(album);
    setFormOpen(true);
  };

  const handleSubmit = async (input: AlbumCreateInput) => {
    if (editing) {
      await albums.update(editing.id, {
        title: input.title,
        description: input.description ?? null,
      });
      toast.success('相册信息已更新');
    } else {
      await albums.create(input);
      toast.success('相册已创建');
    }
    reload();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await albums.remove(deleteTarget.id);
      toast.success(`相册「${deleteTarget.title}」已删除`);
      setDeleteTarget(null);
      reload();
    } catch (cause) {
      toast.danger(getErrorMessage(cause));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="相册管理"
        description="创建相册、上传照片，并挑选一张作为封面。照片会出现在展示站的班级相册中。"
        actions={
          <>
            <Button variant="secondary" isPending={loading} onPress={reload}>
              {({ isPending }) => (
                <>
                  <Icon name="refresh" className={isPending ? 'size-4 animate-spin' : 'size-4'} />
                  刷新
                </>
              )}
            </Button>
            <Button onPress={openCreate}>
              <Icon name="plus" className="size-4" />
              新建相册
            </Button>
          </>
        }
      />

      {loading && !data ? (
        <LoadingBlock label="正在读取相册…" />
      ) : error && !data ? (
        <ErrorBlock message={getErrorMessage(error)} onRetry={reload} />
      ) : albumList.length === 0 ? (
        <EmptyState
          icon="album"
          title="还没有相册"
          description="创建第一本相册，把毕业典礼、春游和日常片段收进来。"
          action={
            <Button onPress={openCreate}>
              <Icon name="plus" className="size-4" />
              创建第一本相册
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {albumList.map((album) => (
            <Card key={album.id} className="group overflow-hidden p-0 transition-shadow hover:shadow-lg">
              <Link
                to={`/albums/${album.id}`}
                className="relative block aspect-[4/3] overflow-hidden bg-default"
                aria-label={`打开相册 ${album.title}`}
              >
                {album.coverUrl ? (
                  <img
                    src={album.coverUrl}
                    alt={album.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted">
                    <Icon name="image" className="size-8" />
                    <span className="text-xs">暂无封面</span>
                  </div>
                )}
                <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] text-white backdrop-blur">
                  {album.photoCount} 张照片
                </span>
              </Link>

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/albums/${album.id}`}
                      className="line-clamp-1 font-display text-lg font-semibold text-foreground transition hover:text-accent"
                    >
                      {album.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-muted">
                      {album.description || '这本相册还没有描述。'}
                    </p>
                  </div>
                  <Chip size="sm" variant="soft" className="shrink-0">
                    {formatDate(album.createdAt)}
                  </Chip>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-separator pt-3">
                  <Link
                    to={`/albums/${album.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-accent transition hover:opacity-80"
                  >
                    进入相册
                    <Icon name="chevronRight" className="size-3.5" />
                  </Link>
                  <div className="flex items-center gap-1">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label={`编辑相册 ${album.title}`}
                      onPress={() => openEdit(album)}
                    >
                      <Icon name="edit" className="size-4" />
                    </Button>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      className="text-danger"
                      aria-label={`删除相册 ${album.title}`}
                      onPress={() => setDeleteTarget(album)}
                    >
                      <Icon name="trash" className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlbumFormModal
        open={formOpen}
        mode={editing ? 'edit' : 'create'}
        initial={
          editing ? { title: editing.title, description: editing.description } : undefined
        }
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除相册"
        description={
          deleteTarget ? (
            <>
              确定要删除相册{' '}
              <span className="font-medium text-foreground">「{deleteTarget.title}」</span> 吗？其中的{' '}
              {deleteTarget.photoCount} 张照片记录会一并删除，且不可恢复。
            </>
          ) : null
        }
        confirmLabel="确认删除"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </>
  );
}
