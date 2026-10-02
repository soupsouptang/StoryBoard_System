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
  Input,
  Select,
  TextArea
} from '@frameforge/ui';
import { useProduction, useShots } from '@/lib/hooks/useProduction';
import {
  useCreateReviewComment,
  useDeleteReviewComment,
  useResolveReviewComment,
  useReviewComments,
  useReviewDecisions,
  useUpdateReviewComment
} from '@/lib/hooks/useReview';
import type { ReviewComment } from '@/lib/hooks/useReview';
import { ShotPanelImage } from '@/components/shot/ShotPanelImage';
import { framesToTimecode } from '@frameforge/timecode';
import {
  useAcceptShotVersion,
  useCreateShotBranch,
  useCreateShotVersion,
  useMergeShotVersion,
  useRestoreShotVersion,
  useShotVersionCompare,
  useShotVersions
} from '@/lib/hooks/useVersions';
import { StatusBadge } from '@/components/shot/StatusBadge';
import { MethodBadge } from '@/components/shot/MethodBadge';
import { shotMovementLabel, shotMethodValues } from '@/lib/shot-display';
import { useAuthStore } from '@/stores/authStore';

type CommentReferenceField = 'description' | 'voiceover' | 'name';

interface CommentReference {
  field: CommentReferenceField;
  label: string;
  text: string;
}

interface CommentDraft {
  body: string;
  parentId: string | null;
  quoteField: CommentReferenceField | '';
  quoteText: string;
}

const COMMENT_REFERENCE_LABELS: Record<CommentReferenceField, string> = {
  description: '画面描述',
  voiceover: '对应旁白',
  name: '镜头标题'
};

function getCommentReferences(shot: {
  description?: string | null;
  voice_over?: string | null;
  name?: string | null;
  display_number: string;
}): CommentReference[] {
  const references: CommentReference[] = [
    { field: 'description', label: COMMENT_REFERENCE_LABELS.description, text: shot.description || '' },
    { field: 'voiceover', label: COMMENT_REFERENCE_LABELS.voiceover, text: shot.voice_over || '' },
    { field: 'name', label: COMMENT_REFERENCE_LABELS.name, text: shot.name || `SHOT ${shot.display_number}` }
  ];
  return references.filter(reference => Boolean(reference.text.trim()));
}

function commentDraftMatches(left: CommentDraft, right: CommentDraft) {
  return left.body === right.body && left.parentId === right.parentId &&
    left.quoteField === right.quoteField && left.quoteText === right.quoteText;
}

function formatVersionValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export default function ReviewPage() {
  const params = useParams();
  const productionId = typeof params?.id === 'string' ? params.id : '';

  const { data: production } = useProduction(productionId);
  const { data: shots = [], isLoading } = useShots(productionId);
  const { user } = useAuthStore();
  const canWriteShot = Boolean(user?.role?.permissions?.['*'] || user?.role?.permissions?.['shot.write']);

  const [activeShotId, setActiveShotId] = useState<string | null>(null);
  const [reviewTab, setReviewTab] = useState<'comments' | 'versions'>('comments');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, CommentDraft>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [editingCommentRevision, setEditingCommentRevision] = useState(1);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [deleteCommentRevision, setDeleteCommentRevision] = useState(1);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [restoreVersionId, setRestoreVersionId] = useState<string | null>(null);
  const [mergeVersionId, setMergeVersionId] = useState<string | null>(null);
  const [branchParentVersionId, setBranchParentVersionId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const currentShot = shots.find(shot => shot.id === activeShotId) || shots[0];
  const shotId = currentShot?.id || '';
  const fps = production ? production.fps_num / (production.fps_den || 1) : 24;
  const currentStartFrame = (production?.start_timecode_frames || 0) + shots.slice(0, Math.max(0, shots.findIndex(shot => shot.id === shotId))).reduce((total, shot) => total + shot.duration_frames, 0);
  const commentReferences = currentShot ? getCommentReferences(currentShot) : [];
  const initialCommentDraft: CommentDraft = {
    body: '',
    parentId: null,
    quoteField: commentReferences[0]?.field || '',
    quoteText: commentReferences[0]?.text || ''
  };
  const commentDraft = commentDrafts[shotId] || initialCommentDraft;

  const { data: comments = [], isLoading: commentsLoading } = useReviewComments(shotId);
  const { data: decisions = [] } = useReviewDecisions(shotId);
  const createComment = useCreateReviewComment(shotId);
  const updateComment = useUpdateReviewComment(shotId);
  const resolveComment = useResolveReviewComment(shotId);
  const deleteComment = useDeleteReviewComment(shotId);
  const { data: versions = [], isLoading: versionsLoading } = useShotVersions(shotId);
  const { data: selectedVersionCompare, isLoading: versionCompareLoading } =
    useShotVersionCompare(selectedVersionId);
  const createVersion = useCreateShotVersion(shotId);
  const createBranch = useCreateShotBranch(shotId);
  const acceptVersion = useAcceptShotVersion(shotId);
  const restoreVersion = useRestoreShotVersion(productionId, shotId);
  const mergeVersion = useMergeShotVersion(productionId, shotId);
  const mutationPending = createComment.isPending || updateComment.isPending ||
    resolveComment.isPending || deleteComment.isPending || createVersion.isPending ||
    createBranch.isPending || acceptVersion.isPending || restoreVersion.isPending ||
    mergeVersion.isPending;

  const updateCommentDraft = (update: (draft: CommentDraft) => CommentDraft) => {
    setCommentDrafts(previous => ({
      ...previous,
      [shotId]: update(previous[shotId] || initialCommentDraft)
    }));
  };

  useEffect(() => {
    setSelectedVersionId(null);
    setRestoreVersionId(null);
    setMergeVersionId(null);
    setBranchParentVersionId(null);
    setBranchName('');
    setEditingCommentId(null);
    setEditingCommentText('');
    setDeleteCommentId(null);
  }, [shotId]);

  const handleCreateVersion = async () => {
    if (mutationPending || !canWriteShot) return;
    setActionError(null);
    try {
      const version = await createVersion.mutateAsync({});
      setSelectedVersionId(version.id);
      setReviewTab('versions');
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

  const handleCreateBranch = async () => {
    if (!branchParentVersionId || !branchName.trim()) return;
    setActionError(null);
    try {
      const version = await createBranch.mutateAsync({
        branchName: branchName.trim(),
        parentVersionId: branchParentVersionId
      });
      setSelectedVersionId(version.id);
      setBranchParentVersionId(null);
      setBranchName('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '创建版本分支失败');
    }
  };

  const handleMergeVersion = async () => {
    if (!mergeVersionId || !currentShot) return;
    setActionError(null);
    try {
      await mergeVersion.mutateAsync({
        versionId: mergeVersionId,
        revision: currentShot.revision,
        branchName: 'main'
      });
      setMergeVersionId(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '合并版本失败');
    }
  };

  const handleAddComment = async (event: React.FormEvent) => {
    event.preventDefault();
    const submittedDraft = { ...commentDraft, body: commentDraft.body.trim() };
    if (!submittedDraft.body || !currentShot) return;
    if (submittedDraft.parentId && !comments.some(comment => comment.id === submittedDraft.parentId)) {
      setActionError('回复目标已不可用，请重新选择会话目标。');
      updateCommentDraft(draft => ({ ...draft, parentId: null }));
      return;
    }
    const submittedShotId = shotId;
    setActionError(null);
    try {
      await createComment.mutateAsync({
        body: submittedDraft.body,
        parent_id: submittedDraft.parentId,
        quote_field: submittedDraft.quoteField,
        quote_text: submittedDraft.quoteText
      });
      setCommentDrafts(previous => {
        const savedDraft = previous[submittedShotId] || submittedDraft;
        if (!commentDraftMatches(savedDraft, submittedDraft)) return previous;
        const next = { ...previous };
        delete next[submittedShotId];
        return next;
      });
    } catch (error) {
      if (shotId === submittedShotId) {
        setActionError(error instanceof Error ? error.message : '发送批注失败');
      }
    }
  };

  const handleUpdateComment = async () => {
    if (!editingCommentId) return;
    const body = editingCommentText.trim();
    if (!body) return;
    setActionError(null);
    try {
      await updateComment.mutateAsync({ id: editingCommentId, body, revision: editingCommentRevision });
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '编辑批注失败');
    }
  };

  const handleDeleteComment = async () => {
    if (!deleteCommentId) return;
    setActionError(null);
    try {
      await deleteComment.mutateAsync({ id: deleteCommentId, revision: deleteCommentRevision });
      if (editingCommentId === deleteCommentId) {
        setEditingCommentId(null);
        setEditingCommentText('');
      }
      setDeleteCommentId(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '删除批注失败');
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

  const versionChanges =
    selectedVersionCompare?.fields.filter(field => field.changed) || [];
  const commentsByParent = new Map<string, ReviewComment[]>();
  comments.forEach(comment => {
    const parentKey = comment.parent_id || '';
    commentsByParent.set(parentKey, [...(commentsByParent.get(parentKey) || []), comment]);
  });
  const commentRoots = comments.filter(comment =>
    !comment.parent_id || !comments.some(parent => parent.id === comment.parent_id)
  );
  const renderComment = (comment: ReviewComment, depth = 0): React.ReactNode => {
    const isOwnComment = Boolean(user?.id && comment.user_id === user.id);
    const isEditing = editingCommentId === comment.id;
    const replies = commentsByParent.get(comment.id) || [];

    return (
      <div key={comment.id} className={depth ? 'relative ml-3 border-l-2 border-border pl-3 sm:ml-6 sm:pl-4' : ''}>
        <article className={`rounded-md border border-border p-3 ${comment.is_resolved ? 'bg-muted/30 opacity-75' : 'bg-background'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">
              {comment.author_name || '内部用户'}
              {comment.role ? <span className="ml-1 font-normal text-muted-foreground">· {comment.role}</span> : null}
              {depth > 0 && <span className="ml-2 rounded-sm bg-muted px-1.5 py-0.5 font-normal">回复</span>}
            </span>
            <span className="font-mono">{new Date(comment.created_at).toLocaleString()}</span>
          </div>

          {comment.quote_text && (
            <blockquote className="mt-2 min-w-0 border-l-2 border-ring bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <div className="mb-1 font-medium text-foreground">
                引用 · {COMMENT_REFERENCE_LABELS[comment.quote_field as CommentReferenceField] || '镜头字段'}
              </div>
              <p className="whitespace-pre-wrap break-words">{comment.quote_text}</p>
            </blockquote>
          )}

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <TextArea
                rows={3}
                value={editingCommentText}
                onChange={event => setEditingCommentText(event.target.value)}
                aria-label="编辑批注"
                autoFocus
              />
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingCommentId(null);
                    setEditingCommentText('');
                  }}
                  disabled={updateComment.isPending}
                >
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleUpdateComment()}
                  disabled={!editingCommentText.trim() || updateComment.isPending}
                >
                  {updateComment.isPending ? '保存中…' : '保存'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">{comment.body}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center justify-end gap-1">
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateCommentDraft(draft => ({ ...draft, parentId: comment.id }))}
              >
                回复
              </Button>
            )}
            {isOwnComment && !isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingCommentId(comment.id);
                    setEditingCommentText(comment.body);
                    setEditingCommentRevision(comment.revision);
                  }}
                >
                  编辑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setDeleteCommentId(comment.id);
                    setDeleteCommentRevision(comment.revision);
                  }}
                >
                  删除
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => resolveComment.mutate({ id: comment.id, resolved: !comment.is_resolved, revision: comment.revision }, {
                onError: error => setActionError(error instanceof Error ? error.message : '更新批注失败')
              })}
              disabled={resolveComment.isPending}
            >
              {comment.is_resolved ? '重新打开' : '标记已处理'}
            </Button>
          </div>
        </article>
        {replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };
  const replyTarget = commentDraft.parentId
    ? comments.find(comment => comment.id === commentDraft.parentId) || null
    : null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden lg:flex-row">
      <aside className="flex max-h-52 w-full shrink-0 flex-col border-b border-border bg-background lg:max-h-none lg:w-40 lg:border-b-0 lg:border-r">
        <div className="border-b border-border bg-card/60 p-4">
          <h1 className="mb-2 text-lg font-semibold">审片版本</h1>
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            审片镜头队列 ({shots.length})
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {shots.map(shot => (
            <button
              key={shot.id}
              type="button"
              onClick={() => {
                setActiveShotId(shot.id);
                setActionError(null);
              }}
              className={`flex w-full flex-col items-stretch gap-2 p-3 text-left text-xs transition-colors ${
                shot.id === shotId
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground hover:bg-accent/70'
              }`}
              disabled={mutationPending}
              aria-current={shot.id === shotId ? 'true' : undefined}
            >
              <span className="flex aspect-video items-center justify-center overflow-hidden rounded-md bg-muted/40">
                <ShotPanelImage shot={shot} className="h-full w-full object-contain"><span className="text-xs text-muted-foreground">暂无画面</span></ShotPanelImage>
              </span>
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

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-background p-4">
        <div className="grid min-h-full min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,35%)]">
          <section aria-label="当前镜头画面与内容" className="min-w-0">
          <Card className="gap-4 overflow-hidden p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-sm font-bold text-foreground">
                SHOT {currentShot.display_number}
              </span>
              <div className="flex items-center gap-2">
                <MethodBadge method={currentShot.primary_method} />
                {shotMethodValues(currentShot).filter(method => method !== currentShot.primary_method).map(method => <MethodBadge key={method} method={method} />)}
                <StatusBadge status={currentShot.status} />
              </div>
            </div>

            <div className="flex aspect-video min-h-40 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30">
              <ShotPanelImage shot={currentShot} className="h-full w-full object-contain">
                <div className="text-center text-sm text-muted-foreground">暂无分镜画面</div>
              </ShotPanelImage>
            </div>
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">
                {currentShot.name || `镜头 ${currentShot.display_number}`}
              </h2>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                {currentShot.description || '暂无画面描述'}
              </p>
              {currentShot.voice_over && (
                <div className="rounded-md border border-border bg-muted/40 p-3 text-left text-sm text-foreground">
                  <span className="mr-2 font-semibold">旁白</span>
                  {currentShot.voice_over}
                </div>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 text-sm">
              {[
                ['TC IN', framesToTimecode(currentStartFrame, fps)],
                ['TC OUT', framesToTimecode(currentStartFrame + currentShot.duration_frames, fps)],
                ['时长', `${currentShot.duration_frames} 帧`],
                ['景别', currentShot.shot_size], ['焦段', currentShot.lens_mm ? `${currentShot.lens_mm}mm` : null],
                ['运镜', shotMovementLabel(currentShot)], ['机位角度', currentShot.camera_angle],
                ['机位高度', currentShot.camera_height], ['摄影机', currentShot.camera],
                ['传感器', currentShot.sensor], ['光圈', currentShot.aperture], ['快门', currentShot.shutter],
                ['责任部门', currentShot.department], ['负责人', currentShot.owner_id]
              ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words">{value || '—'}</dd></div>)}
            </dl>
          </Card>

          </section>
          <aside aria-label="当前镜头审阅" className="min-w-0 space-y-4">
            <Card className="gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">当前审阅状态</h3>
                <StatusBadge status={currentShot.status} />
              </div>
              <p className="text-xs text-muted-foreground">提交当前镜头的版本快照，在版本中查看差异和评论。</p>
              <Button variant="outline" size="sm" disabled={mutationPending || !canWriteShot} onClick={() => void handleCreateVersion()}>
                {createVersion.isPending ? '提交中…' : '提交修订'}
              </Button>
              {actionError && <p role="alert" className="text-xs text-destructive">{actionError}</p>}
              <details className="border-t border-border pt-3 text-xs">
                <summary className="cursor-pointer font-medium">审阅记录（{decisions.length}）</summary>
                {decisions.length === 0 ? <p className="mt-2 text-muted-foreground">暂无审阅记录。</p> : decisions.map(decision => (
                  <div key={decision.id} className="mt-2 flex flex-wrap justify-between gap-2">
                    <span>{decision.action_label}</span><time className="text-muted-foreground">{new Date(decision.created_at).toLocaleString()}</time>
                  </div>
                ))}
              </details>
            </Card>
            <div role="group" aria-label="审阅内容" className="flex gap-1 rounded-md border border-border bg-muted p-1">
              {(['comments', 'versions'] as const).map(tab => <Button key={tab} aria-pressed={reviewTab === tab} aria-controls={`review-${tab}`} variant={reviewTab === tab ? 'secondary' : 'ghost'} size="sm" className="flex-1" onClick={() => setReviewTab(tab)}>
                {tab === 'comments' ? `评论 ${comments.length}` : `版本 / Before–After ${versions.length}`}
              </Button>)}
            </div>
            {reviewTab === 'versions' && (
          <Card id="review-versions" role="region" className="gap-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">版本与审阅基线</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  选择一个历史版本查看差异、分支或恢复当前镜头。
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {versionsLoading ? (
                <div className="py-4 text-center text-xs text-muted-foreground">正在加载版本...</div>
              ) : versions.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  暂无版本快照。提交修订后可查看版本与当前镜头的差异。
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
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setBranchParentVersionId(version.id);
                              setBranchName(
                                version.branch_name === 'main'
                                  ? `branch-v${String(version.version_number).padStart(3, '0')}`
                                  : `${version.branch_name}-next`
                              );
                            }}
                            disabled={createBranch.isPending}
                          >
                            创建分支
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setMergeVersionId(version.id)}
                            disabled={mergeVersion.isPending}
                          >
                            合并到当前
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

            {selectedVersionId && (
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-foreground">版本比较</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      所选版本 vs 当前镜头 · 仅显示发生变化的字段
                    </div>
                  </div>
                  {selectedVersionCompare && (
                    <Badge variant="outline">
                      v{String(selectedVersionCompare.version.version_number).padStart(3, '0')}
                    </Badge>
                  )}
                </div>

                {versionCompareLoading ? (
                  <div className="py-5 text-center text-xs text-muted-foreground">
                    正在读取版本快照...
                  </div>
                ) : selectedVersionCompare && versionChanges.length === 0 ? (
                  <div className="mt-3 rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    当前镜头与该版本没有字段差异。
                  </div>
                ) : selectedVersionCompare ? (
                  <div className="mt-3 space-y-2">
                    {versionChanges.map(change => (
                      <div
                        key={change.key}
                        className="grid gap-2 rounded-md border border-border p-2.5 sm:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)]"
                      >
                        <div className="text-xs font-medium text-foreground">
                          {change.label}
                        </div>
                        <div className="min-w-0 rounded-md bg-destructive/10 p-2">
                          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            版本
                          </div>
                          <del className="block break-words text-xs text-foreground decoration-destructive/70">
                            {formatVersionValue(change.before)}
                          </del>
                        </div>
                        <div className="min-w-0 rounded-md bg-accent/60 p-2">
                          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            当前
                          </div>
                          <ins className="block break-words text-xs text-foreground no-underline">
                            {formatVersionValue(change.after)}
                          </ins>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </Card>

            )}
            {reviewTab === 'comments' && (
          <Card id="review-comments" role="region" className="gap-3 p-4">
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
                <div className="space-y-3">
                  {commentRoots.map(comment => renderComment(comment))}
                </div>
              )}
            </div>

            <form onSubmit={handleAddComment} className="mt-4 space-y-2 border-t border-border pt-4">
              {replyTarget && (
                <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/40 p-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">
                      回复 {replyTarget.author_name || '内部用户'} 的批注
                    </div>
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-muted-foreground">
                      {replyTarget.body}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => updateCommentDraft(draft => ({ ...draft, parentId: null }))}
                  >
                    取消回复
                  </Button>
                </div>
              )}
              <div className="grid gap-3 rounded-md border border-border bg-card/60 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.8fr)] sm:items-end">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground">引用镜头内容</div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    引用会随批注保存，方便协作者确认讨论对象。
                  </p>
                </div>
                <Select
                  label="引用镜头字段"
                  value={commentDraft.quoteField || '__none__'}
                  options={[
                    { value: '__none__', label: '不引用镜头字段' },
                    ...commentReferences.map(reference => ({ value: reference.field, label: reference.label }))
                  ]}
                  onChange={value => {
                    const selected = commentReferences.find(reference => reference.field === value);
                    updateCommentDraft(draft => ({
                      ...draft,
                      quoteField: selected?.field || '',
                      quoteText: selected?.text || ''
                    }));
                  }}
                  disabled={!commentReferences.length}
                  className="h-9"
                />
                {commentDraft.quoteField && commentDraft.quoteText && (
                  <blockquote className="min-w-0 whitespace-pre-wrap break-words border-l-2 border-ring pl-3 text-xs text-muted-foreground sm:col-span-2">
                    <span className="mb-1 block font-medium text-foreground">
                      {COMMENT_REFERENCE_LABELS[commentDraft.quoteField]} · SHOT {currentShot.display_number}
                    </span>
                    {commentDraft.quoteText}
                  </blockquote>
                )}
              </div>
              <TextArea
                rows={3}
                maxLength={1000}
                value={commentDraft.body}
                onChange={event => updateCommentDraft(draft => ({ ...draft, body: event.target.value }))}
                placeholder={replyTarget ? '回复这条批注…' : '像 Word 批注一样写下修改意见…'}
                aria-label={replyTarget ? `回复 ${replyTarget.author_name || '内部用户'} 的批注` : '添加该镜头的审片批注'}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground" aria-live="polite">
                  {replyTarget
                    ? `会发布到 ${replyTarget.author_name || '内部用户'} 的批注线程 · SHOT ${currentShot.display_number}`
                    : `会发布到 SHOT ${currentShot.display_number} 的新会话`}
                </span>
                <Button
                  type="submit"
                  disabled={!commentDraft.body.trim() || createComment.isPending || Boolean(commentDraft.parentId && !replyTarget)}
                >
                  {createComment.isPending ? '发送中…' : replyTarget ? '发送回复' : '发送批注'}
                </Button>
              </div>
            </form>
          </Card>
            )}
          </aside>
        </div>
      </main>
      <Dialog
        open={Boolean(deleteCommentId)}
        onOpenChange={open => {
          if (!open && !deleteComment.isPending) setDeleteCommentId(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogTitle>删除批注</DialogTitle>
          <DialogDescription>
            删除后该批注会从当前审片线程移除；删除动作仍会由后端审计记录。
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteCommentId(null)}
              disabled={deleteComment.isPending}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteComment()}
              disabled={deleteComment.isPending}
            >
              {deleteComment.isPending ? '删除中…' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(branchParentVersionId)}
        onOpenChange={open => {
          if (!open && !createBranch.isPending) {
            setBranchParentVersionId(null);
            setBranchName('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogTitle>创建版本分支</DialogTitle>
          <DialogDescription>
            新分支会从所选不可变版本快照开始，不会修改当前镜头。之后可显式将该分支版本合并回当前镜头。
          </DialogDescription>
          <div className="space-y-2">
            <label htmlFor="review-branch-name" className="text-sm font-medium text-foreground">
              分支名称
            </label>
            <Input
              id="review-branch-name"
              value={branchName}
              onChange={event => setBranchName(event.target.value)}
              placeholder="例如：director-alt"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBranchParentVersionId(null);
                setBranchName('');
              }}
              disabled={createBranch.isPending}
            >
              取消
            </Button>
            <Button
              onClick={() => void handleCreateBranch()}
              disabled={!branchName.trim() || createBranch.isPending}
            >
              {createBranch.isPending ? '创建中…' : '创建分支'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(mergeVersionId)}
        onOpenChange={open => {
          if (!open && !mergeVersion.isPending) setMergeVersionId(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogTitle>合并版本到当前镜头</DialogTitle>
          <DialogDescription>
            先保存“合并前备份”，再把所选版本应用到当前镜头。若镜头已被他人修改，操作会中止并提示冲突。
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMergeVersionId(null)}
              disabled={mergeVersion.isPending}
            >
              取消
            </Button>
            <Button
              onClick={() => void handleMergeVersion()}
              disabled={mergeVersion.isPending}
            >
              {mergeVersion.isPending ? '合并中…' : '确认合并'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
