import { useEffect, useState } from 'react';
import type { MessageDto } from '@classbook/shared';
import { Spinner } from '@heroui/react';
import { messagesApi, plazaApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAsyncData } from '@/lib/useAsyncData';
import { useSiteCopy } from '@/lib/siteCopy';
import { IconMessage } from '@/components/icons';
import { EmptyPanel, ErrorPanel } from './ContentStates';
import { MessageListSkeleton } from './ContentSkeletons';
import { PaginationBar } from './PaginationBar';
import { PostCard } from '@/components/plaza/PostCard';
import { PostComposer } from '@/components/plaza/PostComposer';
import { PostLightbox } from '@/components/plaza/PostLightbox';
import { PlazaDeleteDialog } from '@/components/plaza/PlazaDeleteDialog';
import { fetchAllMembers, type MentionMember } from '@/components/plaza/mentions';

interface MessageBoardProps {
  toUserId?: string;
  toName?: string;
  heading: string;
  description?: string;
  emptyTitle: string;
  emptyDescription: string;
}

export function MessageBoard({
  toUserId,
  toName,
  heading,
  description,
  emptyTitle,
  emptyDescription,
}: MessageBoardProps) {
  const { user } = useAuth();
  const { copy } = useSiteCopy();
  const [page, setPage] = useState(1);
  const [members, setMembers] = useState<MentionMember[]>([]);
  const [pendingDelete, setPendingDelete] = useState<MessageDto | null>(null);
  const [lightbox, setLightbox] = useState<{
    images: string[];
    index: number;
  } | null>(null);

  useEffect(() => {
    setPage(1);
    setPendingDelete(null);
  }, [toUserId]);

  useEffect(() => {
    let active = true;
    fetchAllMembers()
      .then((result) => {
        if (active) setMembers(result);
      })
      .catch(() => {
        if (active) setMembers([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const messageState = useAsyncData(
    () => messagesApi.list({ page, pageSize: 10, toUserId }),
    [page, toUserId],
  );

  const items = messageState.data?.items ?? [];

  const handleCreated = () => {
    if (page !== 1) {
      setPage(1);
    } else {
      messageState.reload();
    }
  };

  const handleDeleted = () => {
    setPendingDelete(null);
    if (page > 1 && messageState.data && messageState.data.items.length === 1) {
      setPage(page - 1);
    } else {
      messageState.reload();
    }
  };

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl leading-8 text-foreground">{heading}</h2>
          {description && <p className="mt-1 text-xs text-muted">{description}</p>}
        </div>
        <span className="shrink-0 text-xs text-muted">
          {messageState.data
            ? `共 ${messageState.data.total} 条`
            : messageState.error
              ? '暂时无法统计'
              : '正在数留言…'}
        </span>
      </div>

      <PostComposer
        members={members}
        onCreated={handleCreated}
        placeholder={copy.profileMessagePlaceholder}
        publicLabel={copy.plazaPublicLabel}
        privateLabel={copy.plazaPrivateLabel}
        submitLabel={copy.plazaPostButton}
        toName={toName}
        toUserId={toUserId}
      />

      <div className="mt-6">
        {messageState.loading && !messageState.data && <MessageListSkeleton />}

        {!messageState.loading && messageState.error && (
          <ErrorPanel
            message={messageState.error}
            title="留言板暂时打不开"
            onRetry={messageState.reload}
          />
        )}

        {!messageState.loading &&
          !messageState.error &&
          messageState.data &&
          messageState.data.items.length === 0 && (
            <EmptyPanel
              description={emptyDescription}
              icon={<IconMessage className="size-5" />}
              title={emptyTitle}
            />
          )}

        {messageState.data && messageState.data.items.length > 0 && (
          <div className={messageState.loading ? 'pointer-events-none opacity-60' : ''}>
            <div className="space-y-3">
              {messageState.data.items.map((message) => (
                <PostCard
                  compact={false}
                  currentUserId={user?.id}
                  isAdmin={user?.role === 'ADMIN'}
                  key={message.id}
                  members={members}
                  onDelete={setPendingDelete}
                  onLike={(target) => {
                    void plazaApi.like(target.id, target.likedByMe).then(() => {
                      messageState.reload();
                    });
                  }}
                  onOpenImage={(target, index) => {
                    const found = items.find((item) => item.id === target.id);
                    if (found) setLightbox({ images: found.images, index });
                  }}
                  post={message}
                />
              ))}
            </div>
            <PaginationBar
              onChange={setPage}
              page={messageState.data.page}
              pageSize={messageState.data.pageSize}
              total={messageState.data.total}
            />
          </div>
        )}

        {messageState.loading && messageState.data && (
          <p
            className="mt-3 flex items-center justify-center gap-2 text-xs text-muted"
            role="status"
          >
            <Spinner size="sm" />
            正在刷新留言…
          </p>
        )}
      </div>

      <PostLightbox
        images={lightbox?.images ?? []}
        index={lightbox?.index ?? null}
        onChange={(index) =>
          setLightbox((previous) => (previous ? { ...previous, index } : previous))
        }
        onClose={() => setLightbox(null)}
      />

      <PlazaDeleteDialog
        description={copy.plazaDeleteConfirm}
        onClose={() => setPendingDelete(null)}
        onDeleted={async () => {
          if (pendingDelete) await messagesApi.remove(pendingDelete.id);
          handleDeleted();
        }}
        open={Boolean(pendingDelete)}
        preview={pendingDelete?.content ?? null}
        title="删除这条留言？"
      />
    </section>
  );
}