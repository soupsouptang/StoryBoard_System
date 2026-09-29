'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button, Card, Icons, TextArea } from '@frameforge/ui';
import { useProduction, useShots } from '@/lib/hooks/useProduction';
import {
  useCreateReviewComment,
  useResolveReviewComment,
  useReviewComments,
  useReviewDecisions
} from '@/lib/hooks/useReview';
import { StatusBadge } from '@/components/shot/StatusBadge';
import { MethodBadge } from '@/components/shot/MethodBadge';
import { shotMovementLabel } from '@/lib/shot-display';

export default function ReviewPage() {
  const params = useParams();
  const productionId = typeof params?.id === 'string' ? params.id : '';

  const { data: production } = useProduction(productionId);
  const { data: shots = [], isLoading } = useShots(productionId);

  const [activeShotIndex, setActiveShotIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    if (activeShotIndex >= shots.length) setActiveShotIndex(0);
  }, [activeShotIndex, shots.length]);

  const currentShot = shots[activeShotIndex] || shots[0];
  const shotId = currentShot?.id || '';

  const { data: comments = [], isLoading: commentsLoading } = useReviewComments(shotId);
  const { data: decisions = [], isLoading: decisionsLoading } = useReviewDecisions(shotId);
  const createComment = useCreateReviewComment(shotId);
  const resolveComment = useResolveReviewComment(shotId);

  const handleAddComment = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = commentText.trim();
    if (!body || !currentShot) return;

    setCommentError(null);
    try {
      await createComment.mutateAsync(body);
      setCommentText('');
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : '发送批注失败');
    }
  };

  if (isLoading || !production) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        正在加载审片工作区...
      </div>
    );
  }

  if (!currentShot) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        当前项目还没有可审阅的镜头。
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden lg:flex-row">
      <aside className="flex max-h-52 w-full shrink-0 flex-col border-b border-border bg-background lg:max-h-none lg:w-72 lg:border-b-0 lg:border-r">
        <div className="border-b border-border bg-card/60 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            审片镜头队列 ({shots.length})
          </h3>
        </div>

        <div className="flex-1 divide-y divide-border overflow-y-auto">
          {shots.map((shot, index) => (
            <button
              key={shot.id}
              type="button"
              onClick={() => {
                setActiveShotIndex(index);
                setCommentError(null);
              }}
              className={`flex w-full items-center justify-between gap-3 p-3 text-left text-xs transition-colors ${
                index === activeShotIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground hover:bg-accent/70'
              }`}
            >
              <span className="min-w-0 space-y-0.5">
                <span className="flex items-center gap-2 font-mono font-bold">
                  <span className="shrink-0">{shot.display_number}</span>
                  <span className="truncate">{shot.name || `镜头 ${shot.display_number}`}</span>
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  {shot.duration_frames}f · {shot.primary_method}
                </span>
              </span>
              <StatusBadge status={shot.status} />
            </button>
          ))}
        </div>
      </aside>

      <main className="min-h-0 flex-1 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
          <Card className="flex aspect-video min-h-[280px] flex-col justify-between overflow-hidden p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-sm font-bold text-foreground">
                SHOT {currentShot.display_number}
              </span>
              <div className="flex items-center gap-2">
                <MethodBadge method={currentShot.primary_method} />
                <StatusBadge status={currentShot.status} />
              </div>
            </div>

            <div className="mx-auto max-w-2xl space-y-3 text-center">
              <h2 className="text-lg font-semibold text-foreground">
                {currentShot.name || `镜头 ${currentShot.display_number}`}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {currentShot.description || '暂无画面描述'}
              </p>
              {currentShot.voice_over && (
                <div className="rounded-md border border-border bg-muted/40 p-3 text-left text-sm text-foreground">
                  <span className="mr-2 font-semibold">旁白</span>
                  {currentShot.voice_over}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-muted-foreground">
              <span>
                {currentShot.shot_size || '—'} · {currentShot.lens_mm ? `${currentShot.lens_mm}mm` : '—'} · {shotMovementLabel(currentShot)}
              </span>
              <span className="font-bold text-foreground">{currentShot.duration_frames} 帧</span>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Icons.MessageSquare className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  审片批注与意见 ({comments.length})
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  批注直接写入当前镜头的审阅记录。
                </p>
              </div>
            </div>

            {commentError && (
              <div role="alert" className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                {commentError}
              </div>
            )}

            <div className="space-y-3">
              {commentsLoading ? (
                <div className="py-6 text-center text-xs text-muted-foreground">正在加载批注...</div>
              ) : comments.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  暂无批注。
                </div>
              ) : (
                comments.map(comment => (
                  <div
                    key={comment.id}
                    className={`rounded-md border border-border p-3 ${
                      comment.is_resolved ? 'bg-muted/30 opacity-70' : 'bg-background'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {comment.author_name || '内部用户'}
                      </span>
                      <span className="font-mono">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>

                    {comment.quote_text && (
                      <div className="mt-2 border-l-2 border-border pl-3 text-xs text-muted-foreground">
                        {comment.quote_text}
                      </div>
                    )}

                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                      {comment.body}
                    </p>

                    <div className="mt-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resolveComment.mutate({
                          id: comment.id,
                          resolved: !comment.is_resolved
                        })}
                        disabled={resolveComment.isPending}
                      >
                        {comment.is_resolved ? '重新打开' : '标记已处理'}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="mt-4 space-y-2 border-t border-border pt-4">
              <TextArea
                rows={3}
                value={commentText}
                onChange={event => setCommentText(event.target.value)}
                placeholder="添加该镜头的导演审片批注..."
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!commentText.trim() || createComment.isPending}
                >
                  {createComment.isPending ? '发送中…' : '发送批注'}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-5">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-foreground">审片历史</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                这里只读展示已存在的 revision-bound 决策记录；版本、对比、Word-style Audit 与逐条差异继续按迁移矩阵恢复。
              </p>
            </div>

            {decisionsLoading ? (
              <div className="py-5 text-center text-xs text-muted-foreground">正在加载审片历史...</div>
            ) : decisions.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                暂无审片历史。
              </div>
            ) : (
              <div className="divide-y divide-border">
                {decisions.map(decision => (
                  <div
                    key={decision.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"
                  >
                    <span className="text-foreground">
                      {decision.action_label}
                      <span className="ml-2 text-muted-foreground">
                        {decision.previous_status} → {decision.next_status}
                      </span>
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {new Date(decision.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
