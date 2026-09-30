'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, TextArea, Icons, Select, Checkbox } from '@frameforge/ui';
import type { Shot, Production } from '@frameforge/types';
import { framesToTimecode, framesToSeconds } from '@frameforge/timecode';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-client';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { useUpdateShot, useDeleteShot } from '@/lib/hooks/useProduction';
import { MethodBadge } from './MethodBadge';

interface ShotInspectorProps {
  shot: Shot | null;
  production: Production;
  onClose: () => void;
}

type ShotDraft = { form: Partial<Shot>; snapshot: Partial<Shot>; changes: Partial<Shot>; revision: number };

function editableShotValues(shot: Shot): Partial<Shot> {
  return {
    name: shot.name ?? '', display_number: shot.display_number,
    description: shot.description ?? '', panel_frame: shot.panel_frame ?? '', voice_over: shot.voice_over ?? '',
    dialogue: shot.dialogue ?? '', subtitle: shot.subtitle ?? '',
    director_notes: shot.director_notes ?? '', primary_method: shot.primary_method,
    department: shot.department, owner_id: shot.owner_id ?? '',
    status: shot.status, duration_frames: shot.duration_frames,
    timing_locked: shot.timing_locked, shot_size: shot.shot_size ?? null,
    lens_mm: shot.lens_mm ?? null, camera: shot.camera ?? null,
    camera_angle: shot.camera_angle ?? null, camera_height: shot.camera_height ?? null,
    action: shot.action ?? '', composition: shot.composition ?? '',
    vfx_required: shot.vfx_required
  };
}

export function ShotInspector({ shot, production, onClose }: ShotInspectorProps) {
  const queryClient = useQueryClient();
  const updateShot = useUpdateShot(production.id);
  const deleteShot = useDeleteShot(production.id);

  const [formData, setFormData] = useState<Partial<Shot>>({});
  const [serverSnapshot, setServerSnapshot] = useState<Partial<Shot>>({});
  const [changedFields, setChangedFields] = useState<Partial<Shot>>({});
  const [baseRevision, setBaseRevision] = useState(0);
  const isDirty = Object.keys(changedFields).length > 0;
  const [showClosePrompt, setShowClosePrompt] = useState(false);
  const currentShotIdRef = useRef<string | null>(null);
  const draftsRef = useRef(new Map<string, ShotDraft>());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'conflict' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conflictDetails, setConflictDetails] = useState<{ server_revision?: number; client_revision?: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState<'creative' | 'camera' | 'pipeline' | 'timing'>('creative');

  useEffect(() => {
    if (!shot) return;
    const values = editableShotValues(shot);

    if (currentShotIdRef.current === shot.id && isDirty) {
      if (saveStatus === 'conflict' && shot.revision !== baseRevision) {
        const nextChanges: Partial<Shot> = { ...changedFields };
        for (const [key, value] of Object.entries(nextChanges)) {
          const field = key as keyof Shot;
          if (Object.is(value, values[field])) {
            delete (nextChanges as Record<string, unknown>)[key];
          }
        }

        setServerSnapshot(values);
        setChangedFields(nextChanges);
        setFormData({ ...values, ...nextChanges });
        setBaseRevision(shot.revision);
        setSaveStatus('idle');
        setErrorMessage(null);
        setConflictDetails(null);
      }
      return;
    }
    if (currentShotIdRef.current && currentShotIdRef.current !== shot.id && isDirty) {
      draftsRef.current.set(currentShotIdRef.current, {
        form: formData, snapshot: serverSnapshot, changes: changedFields, revision: baseRevision
      });
    }
    const savedDraft = currentShotIdRef.current === shot.id ? undefined : draftsRef.current.get(shot.id);
    currentShotIdRef.current = shot.id;
    if (savedDraft) {
      setFormData(savedDraft.form);
      setServerSnapshot(savedDraft.snapshot);
      setChangedFields(savedDraft.changes);
      setBaseRevision(savedDraft.revision);
    } else {
      setFormData(values);
      setServerSnapshot(values);
      setChangedFields({});
      setBaseRevision(shot.revision);
    }
      setSaveStatus('idle');
      setErrorMessage(null);
      setConflictDetails(null);
  }, [shot]);

  if (!shot) return null;

  const fps = production.fps_num / (production.fps_den || 1);
  const durationSec = framesToSeconds(formData.duration_frames || shot.duration_frames, fps).toFixed(2);
  const timecode = framesToTimecode(formData.duration_frames || shot.duration_frames, fps, production.drop_frame);

  const handleFieldChange = (field: keyof Shot, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setChangedFields(prev => {
      const next = { ...prev };
      if (Object.is(value, serverSnapshot[field])) delete (next as Record<string, unknown>)[field];
      else (next as Record<string, unknown>)[field] = value;
      return next;
    });
    if (saveStatus !== 'idle') setSaveStatus('idle');
  };

  const handleSave = async () => {
    if (!Object.keys(changedFields).length || !shot) return;
    try {
      setSaveStatus('saving');
      setErrorMessage(null);
      setConflictDetails(null);
      const savedShot = await updateShot.mutateAsync({
        id: shot.id,
        revision: baseRevision,
        changes: changedFields
      });
      const values = editableShotValues(savedShot);
      setFormData(values);
      setServerSnapshot(values);
      setChangedFields({});
      setBaseRevision(savedShot.revision);
      draftsRef.current.delete(shot.id);
      setSaveStatus('saved');
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.status === 409 || err.code === 'SHOT_REVISION_CONFLICT')) {
        setSaveStatus('conflict');
        const details = err.details as { server_revision?: number; client_revision?: number } | undefined;
        setConflictDetails(details || null);
        setErrorMessage(err.message || '并发版本冲突：该镜头已被其他协作者修改。');
      } else {
        setSaveStatus('error');
        setErrorMessage(err instanceof Error ? err.message : '保存镜头失败，请重试');
      }
    }
  };

  const handleRefetch = async () => {
    await queryClient.invalidateQueries({ queryKey: ['shots', production.id] });
    // When the server revision changes, the effect above rebases the preserved draft.
  };

  const handleDiscard = () => {
    const values = editableShotValues(shot);
    setFormData(values);
    setServerSnapshot(values);
    setChangedFields({});
    setBaseRevision(shot.revision);
    draftsRef.current.delete(shot.id);
    setSaveStatus('idle');
    setErrorMessage(null);
    setShowClosePrompt(false);
  };

  const handleClose = () => {
    if (isDirty) setShowClosePrompt(true);
    else onClose();
  };

  const handleDelete = async () => {
    await deleteShot.mutateAsync(shot.id);
    onClose();
  };

  return (
    <aside className="z-20 flex h-full w-[var(--ff-inspector-w)] flex-col border-l border-border bg-card">
      {/* Inspector Header */}
      <div className="flex h-[50px] items-center justify-between border-b border-border px-4 bg-background/60">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-foreground">
            SHOT {shot.display_number}
          </span>
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            REV #{shot.revision}
          </span>
          {saveStatus === 'saved' && (
            <span className="text-[10px] font-mono text-foreground font-medium">✓ 已保存</span>
          )}
          {saveStatus === 'saving' && (
            <span className="text-[10px] font-mono text-muted-foreground">保存中…</span>
          )}
          {isDirty && saveStatus === 'idle' && (
            <span className="text-[10px] font-mono text-primary font-medium">• 未保存</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={saveStatus === 'saving' || (!isDirty && saveStatus !== 'conflict')}
            className="gap-1 text-xs"
          >
            <Icons.Check className="h-3.5 w-3.5" />
            {saveStatus === 'saving' ? '保存中…' : '保存'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            aria-label="关闭镜头详情"
            className="text-muted-foreground hover:text-foreground"
          >
            <Icons.X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showClosePrompt && (
        <div role="alertdialog" aria-label="未保存的镜头修改" className="mx-4 mt-3 rounded border border-warning/40 bg-warning/10 p-3 text-xs">
          <p className="font-medium">此镜头有未保存的修改。</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => setShowClosePrompt(false)}>继续编辑</Button>
            <Button size="sm" variant="outline" onClick={() => { handleDiscard(); onClose(); }}>放弃修改并关闭</Button>
          </div>
        </div>
      )}

      {/* Revision Conflict Banner (409) */}
      {saveStatus === 'conflict' && (
        <div role="alert" className="mx-4 mt-3 rounded border border-warning/40 bg-warning/10 p-3 text-xs text-foreground space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-warning">
            <Icons.AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <span>并发版本冲突 (HTTP 409)</span>
          </div>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            {errorMessage}
            {conflictDetails?.server_revision && (
              <span className="block font-mono mt-0.5">
                服务器版本: #{conflictDetails.server_revision} | 当前编辑版本: #{conflictDetails.client_revision || shot.revision}
              </span>
            )}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={handleRefetch} className="h-7 text-xs">
              <Icons.RefreshCw className="h-3.5 w-3.5 mr-1" />
              拉取最新版本（保留草稿）
            </Button>
            <Button variant="outline" size="sm" onClick={handleDiscard} className="h-7 text-xs">放弃草稿</Button>
          </div>
        </div>
      )}

      {/* General Error Banner */}
      {saveStatus === 'error' && errorMessage && (
        <div role="alert" className="mx-4 mt-3 rounded border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive flex items-center justify-between">
          <span className="line-clamp-2">{errorMessage}</span>
          <Button variant="ghost" size="icon" onClick={() => setErrorMessage(null)} className="h-5 w-5 text-destructive shrink-0">
            <Icons.X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-border bg-background/40 text-xs font-medium text-muted-foreground">
        <Button variant="ghost" size="sm"
          onClick={() => setActiveTab('creative')}
          aria-pressed={activeTab === 'creative'}
          className={`min-w-max flex-1 border-b-2 py-2 text-center transition-colors ${
            activeTab === 'creative' ? 'border-ring text-foreground bg-card' : 'border-transparent hover:text-foreground'
          }`}
        >
          画面与旁白
        </Button>
        <Button variant="ghost" size="sm"
          onClick={() => setActiveTab('camera')}
          aria-pressed={activeTab === 'camera'}
          className={`min-w-max flex-1 border-b-2 py-2 text-center transition-colors ${
            activeTab === 'camera' ? 'border-ring text-foreground bg-card' : 'border-transparent hover:text-foreground'
          }`}
        >
          摄影与构图
        </Button>
        <Button variant="ghost" size="sm"
          onClick={() => setActiveTab('pipeline')}
          aria-pressed={activeTab === 'pipeline'}
          className={`min-w-max flex-1 border-b-2 py-2 text-center transition-colors ${
            activeTab === 'pipeline' ? 'border-ring text-foreground bg-card' : 'border-transparent hover:text-foreground'
          }`}
        >
          管线与制作
        </Button>
        <Button variant="ghost" size="sm"
          onClick={() => setActiveTab('timing')}
          aria-pressed={activeTab === 'timing'}
          className={`min-w-max flex-1 border-b-2 py-2 text-center transition-colors ${
            activeTab === 'timing' ? 'border-ring text-foreground bg-card' : 'border-transparent hover:text-foreground'
          }`}
        >
          时码与锁定时长
        </Button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {activeTab === 'creative' && (
          <>
            <div>
              <label htmlFor="shot-panel-frame" className="block text-muted-foreground mb-1 font-medium">分镜图框</label>
              <Input
                id="shot-panel-frame"
                value={formData.panel_frame || ''}
                onChange={event => handleFieldChange('panel_frame', event.target.value)}
                placeholder="例如：正面双人构图"
              />
            </div>
            <div>
              <label htmlFor="shot-name" className="block text-muted-foreground mb-1 font-medium">镜头名称 / 标题</label>
              <Input
                id="shot-name"
                type="text"
                value={formData.name || ''}
                onChange={e => handleFieldChange('name', e.target.value)}
                placeholder="例如：园区鸟瞰全景"
              />
            </div>

            <div>
              <label htmlFor="shot-description" className="block text-muted-foreground mb-1 font-medium">画面构图与视觉描述 (Visual Action)</label>
              <TextArea
                id="shot-description"
                rows={4}
                value={formData.description || ''}
                onChange={e => handleFieldChange('description', e.target.value)}
                placeholder="详细描述画面构图、运动轨迹与光影氛围..."
              />
            </div>

            <div>
              <label htmlFor="shot-voice-over" className="block text-muted-foreground mb-1 font-medium">对应解说词旁白 (Voice Over)</label>
              <TextArea
                id="shot-voice-over"
                rows={4}
                value={formData.voice_over || ''}
                onChange={e => handleFieldChange('voice_over', e.target.value)}
                placeholder="输入本镜对应的解说词或台词旁白..."
              />
            </div>

            <div>
              <label htmlFor="shot-director-notes" className="block text-muted-foreground mb-1 font-medium">导演备注 (Director Notes)</label>
              <TextArea
                id="shot-director-notes"
                rows={2}
                value={formData.director_notes || ''}
                onChange={e => handleFieldChange('director_notes', e.target.value)}
                placeholder="导演特别要求与注意事项..."
              />
            </div>
          </>
        )}

        {activeTab === 'camera' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-muted-foreground mb-1">标准景别</label>
                <Select
                  label="标准景别"
                  value={formData.shot_size || '全景'}
                  onChange={value => handleFieldChange('shot_size', value)}
                  options={[ { value: "大远景", label: "大远景 (EWS)" }, { value: "远景", label: "远景 (WS)" }, { value: "全景", label: "全景 (FS)" }, { value: "中景", label: "中景 (MS)" }, { value: "近景", label: "近景 (MCU)" }, { value: "特写", label: "特写 (CU)" }, { value: "大特写", label: "大特写 (ECU)" } ]}
                />
              </div>

              <div>
                <label htmlFor="shot-lens-mm" className="block text-muted-foreground mb-1">焦段 (mm)</label>
                <Input
                  id="shot-lens-mm"
                  type="number"
                  value={formData.lens_mm || ''}
                  onChange={e => handleFieldChange('lens_mm', Number(e.target.value))}
                  placeholder="50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-muted-foreground mb-1">摄影机位角度</label>
                <Select
                  label="摄影机位角度"
                  value={formData.camera_angle || '平视'}
                  onChange={value => handleFieldChange('camera_angle', value)}
                  options={[ { value: "平视", label: "平视 (Eye Level)" }, { value: "俯视", label: "俯视 (High Angle)" }, { value: "仰视", label: "仰视 (Low Angle)" }, { value: "鸟瞰", label: "鸟瞰 (Bird's Eye)" }, { value: "斜角", label: "荷兰角 (Dutch Angle)" } ]}
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">机位高度</label>
                <Select
                  label="机位高度"
                  value={formData.camera_height || '胸高'}
                  onChange={value => handleFieldChange('camera_height', value)}
                  options={[ { value: "视平线", label: "视平线" }, { value: "胸高", label: "胸高" }, { value: "腰高", label: "腰高" }, { value: "贴地", label: "贴地低角度" }, { value: "高空航拍", label: "高空航拍" } ]}
                />
              </div>
            </div>

            <div>
              <label htmlFor="shot-camera" className="block text-muted-foreground mb-1">摄影设备 / 载具</label>
              <Input
                id="shot-camera"
                type="text"
                value={formData.camera || ''}
                onChange={e => handleFieldChange('camera', e.target.value)}
                placeholder="例如：ARRI Alexa Mini + 航拍无人机"
              />
            </div>
          </>
        )}

        {activeTab === 'pipeline' && (
          <>
            <div>
              <label className="block text-muted-foreground mb-1 font-medium">主要制作方式 (Primary Method)</label>
              <Select
                label="主要制作方式"
                value={formData.primary_method || 'live'}
                onChange={value => handleFieldChange('primary_method', value)}
                options={[ { value: "live", label: "实拍 (LIVE SHOOT)" }, { value: "stock", label: "购买素材 (STOCK FOOTAGE)" }, { value: "client", label: "客户素材 (CLIENT ASSET)" }, { value: "archive", label: "历史资料 (ARCHIVE)" }, { value: "still", label: "静帧 (STILL FRAME)" }, { value: "ae", label: "AE合成包装 (AE COMP)" }, { value: "mg", label: "动效设计 (MOTION GRAPHICS)" }, { value: "three_d", label: "3D三维制作 (3D ANIMATION)" }, { value: "vfx", label: "视效特效 (VFX SHOT)" }, { value: "type", label: "纯文字字卡 (TITLE CARD)" } ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-muted-foreground mb-1">责任部门</label>
                <Select
                  label="责任部门"
                  value={formData.department || 'camera'}
                  onChange={value => handleFieldChange('department', value)}
                  options={[ { value: "camera", label: "摄影组 (Camera)" }, { value: "director", label: "导演组 (Director)" }, { value: "production", label: "制片组 (Production)" }, { value: "art", label: "美术组 (Art)" }, { value: "stock", label: "素材组 (Stock)" }, { value: "editorial", label: "剪辑组 (Editorial)" }, { value: "motion", label: "动效组 (Motion)" }, { value: "three_d", label: "三维组 (3D)" }, { value: "vfx", label: "视效组 (VFX)" }, { value: "sound", label: "声音组 (Sound)" }, { value: "color", label: "调色组 (Color)" } ]}
                />
              </div>

              <div>
                <label htmlFor="shot-owner" className="block text-muted-foreground mb-1">责任负责人</label>
                <Input
                  id="shot-owner"
                  type="text"
                  value={formData.owner_id || ''}
                  onChange={e => handleFieldChange('owner_id', e.target.value)}
                  placeholder="例如：张指导"
                />
              </div>
            </div>

            <div>
              <label className="block text-muted-foreground mb-1">当前制作状态</label>
              <Select
                label="当前制作状态"
                value={formData.status || 'draft'}
                onChange={value => handleFieldChange('status', value)}
                options={[ { value: "draft", label: "规划中 (Draft)" }, { value: "in_progress", label: "制作中 (In Progress)" }, { value: "review", label: "待审片 (Ready for Review)" }, { value: "changes_requested", label: "需修改 (Changes Requested)" }, { value: "approved", label: "已审批 (Approved)" }, { value: "locked", label: "已锁定 (Locked)" } ]}
              />
            </div>

            <div className="flex items-center justify-between rounded border border-border bg-background/60 p-3">
              <div>
                <div className="font-medium text-foreground">视效制作需求 (VFX Required)</div>
                <div className="text-[11px] text-muted-foreground">标记是否需要三维/合成组介入</div>
              </div>
              <Checkbox
                aria-label="需要视效制作"
                checked={formData.vfx_required || false}
                onCheckedChange={checked => handleFieldChange('vfx_required', checked === true)}
              />
            </div>
          </>
        )}

        {activeTab === 'timing' && (
          <>
            <div className="rounded-lg border border-border bg-background/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">帧数规划 (Frames)</span>
                <span className="font-mono text-sm font-bold text-foreground">
                  {formData.duration_frames || 0} f
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">换算时长 (Seconds)</span>
                <span className="font-mono text-sm font-bold text-foreground">
                  {durationSec} s
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">SMPTE 时码</span>
                <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-bold text-foreground">
                  {timecode}
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="shot-duration-frames" className="block text-muted-foreground mb-1">手动调整帧数 (Integer Frames)</label>
              <Input
                id="shot-duration-frames"
                type="number"
                min={1}
                value={formData.duration_frames || ''}
                onChange={e => handleFieldChange('duration_frames', Number(e.target.value))}
                className="font-mono"
              />
            </div>

            <div className="flex items-center justify-between rounded border border-border bg-background/60 p-3">
              <div>
                <div className="font-medium text-foreground">锁定镜头时长 (Lock Timing)</div>
                <div className="text-[11px] text-muted-foreground">自动计时会跳过锁定镜头</div>
              </div>
              <Checkbox
                aria-label="锁定镜头时长"
                checked={formData.timing_locked || false}
                onCheckedChange={checked => handleFieldChange('timing_locked', checked === true)}
              />
            </div>
          </>
        )}
      </div>

      <div className="border-t border-border p-4 bg-background/60">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="flex-1 text-xs"
            >
              确认移至废纸篓
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(false)}
              className="text-xs"
            >
              取消
            </Button>
          </div>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            className="w-full gap-2 text-xs"
          >
            <Icons.Trash2 className="h-4 w-4" />
            移至废纸篓 (Trash Shot)
          </Button>
        )}
      </div>
    </aside>
  );
}
