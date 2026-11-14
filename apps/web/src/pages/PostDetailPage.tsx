import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { MessageCommentDto, MessageDto } from '@classbook/shared';
import { Button, Skeleton, toast } from '@heroui/react';
import { getErrorMessage, plazaApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAsyncData } from '@/lib/useAsyncData';
import { ErrorPanel } from '@/components/content/ContentStates';
import { PageShell } from '@/components/content/PageShell';
import { useSiteCopy } from '@/lib/siteCopy';
import { IconChevronLeft, IconMessage } from '@/components/icons';
import { PostCard } from '@/components/plaza/PostCard';
import { CommentComposer } from '@/components/plaza/CommentComposer';
import { CommentList } from '@/components/plaza/CommentList';
import { PostLightbox } from '@/components/plaza/PostLightbox';
import { PlazaDeleteDialog } from '@/components/plaza/PlazaDeleteDialog';
import { fetchAllMembers, type MentionMember } from '@/components/plaza/mentions';

type DeleteTarget =
  | { kind: 'post'; post: MessageDto }
  | { kind: 'comment'; comment: MessageCommentDto }
  | null;

export default function PostDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { copy } = useSiteCopy();
  const isAdmin = user?.role === 'ADMIN';
  const currentUserId = user?.id;

  const [members, setMembers] = useState<MentionMember[]>([]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [postOverride, setPostOverride] = useState<MessageDto | null>(null);

  const loadDetail = useCallback(() => plazaApi.get(id), [id]);
  const { data, loading, error, reload } = useAsyncData(loadDetail, [id]);

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

  const post = postOverride ?? data?.post ?? null;
  const comments = data?.comments ?? [];

  useEffect(() => {
    setPostOverride(null);
  }, [data]);

  useEffect(() => {
    if (!post) return;
    const hash = location.hash;
    if (hash.startsWith('#comment-')) {
      const element = document.getElementById(hash.slice(1));
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [post, location.hash]);

  const toggleLike = async () => {
    if (!post) return;
    const previous = post;
    const next = !post.likedByMe;

    setPostOverride({
      ...post,
      likedByMe: next,
      likeCount: post.likeCount + (next ? 1 : -1),
    });

    try {
      const result = await plazaApi.like(post.id, post.likedByMe);
      setPostOverride({
        ...post,
        likedByMe: result.likedByMe,
        likeCount: result.likeCount,
      });
    } catch (likeError) {
      setPostOverride(previous);
      toast.danger(getErrorMessage(likeError));
    }
  };

  const removePost = async () => {
    if (!post) return;
    await plazaApi.remove(post.id);
    navigate('/plaza');
  };

  const removeComment = async () => {
    if (!deleteTarget || deleteTarget.kind !== 'comment') return;
    await plazaApi.removeComment(deleteTarget.comment.id);
    await reload();
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-10 sm:px-6">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="mt-4 h-24 w-full rounded-3xl" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-10 sm:px-6">
        <ErrorPanel message={error ?? '帖子不存在或已被删除'} onRetry={reload} />
      </div>
    );
  }

  return (
    <PageShell
      back={
        <Button
          size="sm"
          variant="ghost"
          onPress={() => navigate(-1)}
        >
          <IconChevronLeft className="size-4" />
          返回
        </Button>
      }
      title="帖子详情"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <PostCard
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          members={members}
          onDelete={(target) => setDeleteTarget({ kind: 'post', post: target })}
          onLike={() => void toggleLike()}
          onOpenImage={(_, index) => setLightboxIndex(index)}
          post={post}
        />

        <section className="rounded-3xl border border-border/70 bg-surface p-4 shadow-sm sm:p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-base font-semibold text-foreground">
            <IconMessage className="size-4 text-accent" />
            {`评论 ${post.commentCount}`}
          </h2>

          <div className="mb-5">
            <CommentComposer
              postId={post.id}
              placeholder={copy.plazaCommentPlaceholder}
              onCreated={() => void reload()}
            />
          </div>

          <CommentList
            comments={comments}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            members={members}
            postId={post.id}
            replyTo={replyTo}
            onCommentCreated={() => void reload()}
            onCommentDeleted={(comment) =>
              setDeleteTarget({ kind: 'comment', comment })
            }
            onReplyChange={setReplyTo}
          />

          {comments.length === 0 && (
            <p className="py-6 text-center text-xs text-muted">
              还没有评论，来抢沙发吧
            </p>
          )}
        </section>
      </div>

      <PostLightbox
        images={post.images}
        index={lightboxIndex}
        onChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />

      <PlazaDeleteDialog
        description={copy.plazaDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
        onDeleted={
          deleteTarget?.kind === 'post'
            ? removePost
            : deleteTarget?.kind === 'comment'
              ? removeComment
              : async () => {}
        }
        open={Boolean(deleteTarget)}
        preview={
          deleteTarget?.kind === 'post'
            ? deleteTarget.post.content
            : (deleteTarget?.kind === 'comment'
              ? deleteTarget.comment.content
              : null)
        }
        title={deleteTarget?.kind === 'post' ? '删除这条帖子？' : '删除这条评论？'}
      />
    </PageShell>
  );
}