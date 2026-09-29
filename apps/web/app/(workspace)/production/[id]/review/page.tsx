'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  Icons,
  TextArea
} from '@frameforge/ui';
import { useProduction, useShots } from '@/lib/hooks/useProduction';
import {
  useCreateReviewComment,
  useResolveReviewComment,
  useReviewComments,
  useReviewDecisions
} from '@/lib/hooks/useReview';
import {
  useAcceptShotVersion,
  useCreateShotVersion,
  useRestoreShotVersion,
  useShotVersions
} from '@/lib/hooks/useVersions';
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
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [restoreVersionId, setRestoreVersionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (activeShotIndex >= shots.length) setActiveShotIndex(0);
  }, [activeShotIndex, shots.length]);

  const currentShot = shots[activeShotIndex] || shots[0];
  const shotId = currentShot?.id || '';

  const { data: comments = [], isLoading: commentsLoading } = useReviewComments(shotId);
  const { data: decisions = [] } = useReviewDecisions(shotId);
  const createComment = useCreateReviewComment(shotId);
  const resolveComment = useResolveReviewComment(shotId);
  const { data: versions = [], isLoading: versionsLoading } = useShotVersions(shotId);
  const createVersion = useCreateShotVersion(shotId);
  const acceptVersion = useAcceptShotVersion(shotId);
  const restoreVersion = useRestoreShotVersion(productionId, shotId);

  useEffect(() => {
    setSelectedVersionId(null);
    setRestoreVersionId(null);
  }, [shotId]);

  const handleCreateVersion = async () => {
    setActionError(null);
    try {
      const version = await createVersion.mutateAsync({});
      setSelectedVersionId(version.id);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '保存版本失败');
    }
  };

  const handleAcceptVersion = async () => {
    if (!selectedVersionId) return;
    setActionError(null);
    try {
      await acceptVersion.mutateAsync(selectedVersionId);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '接受版本失败');
    }
  };

  const handleRestoreVersion = async () => {
    if (!restoreVersionId || !currentShot) return;
    setActionError(null);
    try {
      await restoreVersion.mutateAsync({
        versionId: restoreVersionId,
        revision: currentShot.revision
      });
      setRestoreVersionId(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '恢复版本失败');
    }
  };

  const handleAddComment = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = commentText.trim();
    if (!body || !currentShot) return;
    setActionError(null);
    try {
      await createComment.mutateAsync(body);
      setCommentText('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '发送批注失败');
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

        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {shots.map((shot, index) => (
            <button
              key={shot.id}
              type="button"
              onClick={() => {
                setActiveShotIndex(index);
                setActionError(null);
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

          <Card className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">版本与审阅基线</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  版本是不可变的镜头字段快照；选择一个版本后，后续审片决策会显式绑定该版本。
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleCreateVersion()}
                disabled={createVersion.isPending}
              >
                {createVersion.isPending ? '保存中…' : '保存当前版本'}
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              {versionsLoading ? (
                <div className="py-4 text-center text-xs text-muted-foreground">正在加载版本...</div>
              ) : versions.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  暂无版本快照。保存版本后可将审片决策绑定到明确版本。
                </div>
              ) : (
                versions.map(version => {
                  const selected = selectedVersionId === version.id;
                  return (
                    <div
                      key={version.id}
                      className={`flex flex-wrap items-center gap-2 rounded-md border p-2.5 ${
                        selected ? 'border-ring bg-accent/50' : 'border-border bg-background'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedVersionId(selected ? null : version.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            v{String(version.version_number).padStart(3, '0')}
                          </span>
                          <span className="truncate text-sm text-foreground">
                            {version.name || '未命名版本'}
                          </span>
                          {version.is_accepted && (
                            <Badge variant="secondary">Accepted</Badge>
                          )}
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          {version.branch_name} · {new Date(version.created_at).toLocaleString()}
                        </div>
                      </button>

                      {selected && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleAcceptVersion()}
                            disabled={acceptVersion.isPending || version.is_accepted}
                          >
                            {version.is_accepted ? '已接受' : '设为接受版本'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRestoreVersionId(version.id)}
                            disabled={restoreVersion.isPending}
                          >
                            恢复
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="p-4">
            <div>
              <div className="text-sm font-semibold text-foreground">审片历史</div>
              <div className="mt-1 text-xs text-muted-foreground">
                这里只读展示已写入的 revision-bound 审片记录；Review 页面不提供全局审批看板。
              </div>
            </div>

            {actionError && (
              <div role="alert" className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                {actionError}
              </div>
            )}

            {decisions.length === 0 ? (
              <div className="mt-3 rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                暂无审片历史。
              </div>
            ) : (
              <div className="mt-3 divide-y divide-border border-t border-border">
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

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Icons.MessageSquare className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-foreground">
                审片批注与意见 ({comments.length})
              </h3>
            </div>

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
                        {comment.role ? <span className="ml-1 font-normal text-muted-foreground">· {comment.role}</span> : null}
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
        </div>
      </main>
      <Dialog
        open={Boolean(restoreVersionId)}
        onOpenChange={open => {
          if (!open && !restoreVersion.isPending) setRestoreVersionId(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogTitle>恢复镜头版本</DialogTitle>
          <DialogDescription>
            恢复会先保存当前镜头字段作为“回滚前备份”，再将所选版本写回当前镜头。该操作使用当前 revision 做冲突检查。
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreVersionId(null)}
              disabled={restoreVersion.isPending}
            >
              取消
            </Button>
            <Button
              onClick={() => void handleRestoreVersion()}
              disabled={restoreVersion.isPending}
            >
              {restoreVersion.isPending ? '恢复中…' : '确认恢复'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}