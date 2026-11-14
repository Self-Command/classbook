import { useCallback, useEffect, useRef, useState } from 'react';
import type { MessageDto } from '@classbook/shared';
import { Button, Skeleton } from '@heroui/react';
import { getErrorMessage, plazaApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useSiteCopy } from '@/lib/siteCopy';
import { EmptyPanel, ErrorPanel } from '@/components/content/ContentStates';
import { PageShell } from '@/components/content/PageShell';
import { IconMessage } from '@/components/icons';
import { PostCard } from '@/components/plaza/PostCard';
import { PostComposer } from '@/components/plaza/PostComposer';
import { PostLightbox } from '@/components/plaza/PostLightbox';
import { PlazaDeleteDialog } from '@/components/plaza/PlazaDeleteDialog';
import {
  fetchAllMembers,
  memberByUsername,
  type MentionMember,
} from '@/components/plaza/mentions';

const PAGE_SIZE = 20;

export default function PlazaPage() {
  const { user } = useAuth();
  const { copy } = useSiteCopy();
  const isAdmin = user?.role === 'ADMIN';
  const currentUserId = user?.id;

  const [members, setMembers] = useState<MentionMember[]>([]);
  const [posts, setPosts] = useState<MessageDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [nonce, setNonce] = useState(0);

  const [lightbox, setLightbox] = useState<{
    post: MessageDto;
    index: number;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MessageDto | null>(null);

  const loadingPage = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

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

  const loadPage = useCallback(
    async (nextCursor?: string | null) => {
      if (loadingPage.current) return;
      loadingPage.current = true;

      try {
        const result = await plazaApi.list(nextCursor ?? undefined, PAGE_SIZE);
        setPosts((previous) =>
          nextCursor ? [...previous, ...result.items] : result.items,
        );
        setCursor(result.nextCursor);
        setDone(result.nextCursor === null);
        setError('');
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      } finally {
        loadingPage.current = false;
        setInitialLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    setInitialLoading(true);
    setPosts([]);
    setCursor(null);
    setDone(false);
    void loadPage(null);
  }, [loadPage, nonce]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || done || initialLoading || error) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && cursor) {
          void loadPage(cursor);
        }
      },
      { rootMargin: '400px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [cursor, done, initialLoading, error, loadPage]);

  const toggleLike = async (post: MessageDto) => {
    const next = !post.likedByMe;
    setPosts((previous) =>
      previous.map((item) =>
        item.id === post.id
          ? {
              ...item,
              likedByMe: next,
              likeCount: item.likeCount + (next ? 1 : -1),
            }
          : item,
      ),
    );

    try {
      await plazaApi.like(post.id, post.likedByMe);
    } catch (likeError) {
      setPosts((previous) =>
        previous.map((item) =>
          item.id === post.id
            ? {
                ...item,
                likedByMe: post.likedByMe,
                likeCount: post.likeCount,
              }
            : item,
        ),
      );
      if (likeError instanceof Error) {
        // 保留错误提示但不打断列表
      }
    }
  };

  const removePost = async () => {
    if (!deleteTarget) return;
    await plazaApi.remove(deleteTarget.id);
    setPosts((previous) =>
      previous.filter((item) => item.id !== deleteTarget.id),
    );
  };

  const lightboxImages = lightbox
    ? posts.find((item) => item.id === lightbox.post.id)?.images ?? lightbox.post.images
    : [];

  return (
    <PageShell
      description={copy.plazaDescription}
      eyebrow={copy.plazaEyebrow}
      title={copy.plazaTitle}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <PostComposer
          members={members}
          onCreated={(post) => {
            setPosts((previous) => [post, ...previous]);
          }}
          placeholder={copy.plazaComposerPlaceholder}
          publicLabel={copy.plazaPublicLabel}
          privateLabel={copy.plazaPrivateLabel}
          submitLabel={copy.plazaPostButton}
        />

        {initialLoading ? (
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((index) => (
              <Skeleton
                key={index}
                className="h-40 w-full rounded-3xl"
              />
            ))}
          </div>
        ) : error && posts.length === 0 ? (
          <ErrorPanel
            message={error}
            onRetry={() => setNonce((value) => value + 1)}
          />
        ) : posts.length === 0 ? (
          <EmptyPanel
            description={copy.plazaEmptyDescription}
            icon={<IconMessage className="size-6" />}
            title={copy.plazaEmptyTitle}
          />
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {posts.map((post) => (
                <PostCard
                  compact
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  key={post.id}
                  members={members}
                  onDelete={setDeleteTarget}
                  onLike={(target) => void toggleLike(target)}
                  onOpenImage={(target, index) =>
                    setLightbox({ post: target, index })
                  }
                  post={post}
                />
              ))}
            </div>

            <div ref={sentinelRef} className="h-2" />

            {!done && cursor && !error && (
              <div className="flex justify-center py-2">
                <Button
                  isPending={false}
                  size="sm"
                  variant="ghost"
                  onPress={() => void loadPage(cursor)}
                >
                  加载更多
                </Button>
              </div>
            )}
            {done && posts.length > 0 && (
              <p className="py-4 text-center text-xs text-muted">
                到底啦，去发一条新帖子吧
              </p>
            )}
            {error && posts.length > 0 && (
              <ErrorPanel message={error} onRetry={() => setNonce((value) => value + 1)} />
            )}
          </>
        )}
      </div>

      <PostLightbox
        images={lightboxImages}
        index={lightbox?.index ?? null}
        onChange={(index) =>
          setLightbox((previous) => (previous ? { ...previous, index } : previous))
        }
        onClose={() => setLightbox(null)}
      />

      <PlazaDeleteDialog
        description={copy.plazaDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
        onDeleted={removePost}
        open={Boolean(deleteTarget)}
        preview={deleteTarget?.content ?? null}
        title="删除这条帖子？"
      />
    </PageShell>
  );
}