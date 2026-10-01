'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button, Input } from '@frameforge/ui';
import { useUpdateShot } from '@/lib/hooks/useProduction';
import type { Shot } from '@frameforge/types';
import { ApiError } from '@/lib/api-client';

interface InlineEditCellProps {
  productionId: string;
  shot: Shot;
  field: keyof Shot;
  value: string | number | null;
  placeholder?: React.ReactNode;
  className?: string;
  type?: 'text' | 'number';
  required?: boolean;
}

export function InlineEditCell({
  productionId,
  shot,
  field,
  value,
  placeholder,
  className = '',
  type = 'text',
  required = false
}: InlineEditCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictRevision, setConflictRevision] = useState<number | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const savingRef = useRef(false);
  const cancelledRef = useRef(false);
  const updateShot = useUpdateShot(productionId);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type === 'text') {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  useEffect(() => {
    if (hasConflict && conflictRevision !== null && shot.revision !== conflictRevision) {
      setHasConflict(false);
      setConflictRevision(null);
      setSaveError('镜头已更新。当前输入已保留，可重试保存，或放弃输入。');
    }
  }, [hasConflict, conflictRevision, shot.revision]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the inspector
    cancelledRef.current = false;
    setEditValue(value !== null && value !== undefined ? String(value) : '');
    setSaveError(null);
    setHasConflict(false);
    setConflictRevision(null);
    setIsEditing(true);
  };

  const saveChange = async () => {
    if (!isEditing || savingRef.current || hasConflict || cancelledRef.current) return;
    if (required && !editValue.trim()) { setSaveError('此项必填，请输入内容。'); return; }
    
    let finalValue: string | number | null = editValue;
    if (type === 'number') {
      finalValue = editValue === '' ? null : Number(editValue);
    }

    if (finalValue === value) {
      setSaveError(null);
      setHasConflict(false);
      setConflictRevision(null);
      setIsEditing(false);
      return;
    }

    try {
      savingRef.current = true;
      setIsSaving(true);
      await updateShot.mutateAsync({
        id: shot.id,
        revision: shot.revision,
        changes: { [field]: finalValue }
      });
      setSaveError(null);
      setHasConflict(false);
      setConflictRevision(null);
      setIsEditing(false);
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.status === 409 || err.code === 'SHOT_REVISION_CONFLICT')) {
        setHasConflict(true);
        setConflictRevision(shot.revision);
        setSaveError('镜头已在别处修改。当前输入已保留；列表刷新到最新版本后可再次保存，或放弃输入。');
      } else {
        setSaveError(err instanceof Error ? err.message : '保存失败，请重试');
      }
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation(); // prevent row keyboard selection
    if (e.key === 'Enter') {
      if (isComposingRef.current || e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) {
        return;
      }
      e.preventDefault();
      void saveChange();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelledRef.current = true;
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className={`relative ${className}`} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
        <Input
          ref={inputRef}
          type={type}
          value={editValue}
          aria-label={typeof placeholder === 'string' ? placeholder : '编辑单元格'}
          onChange={(e) => setEditValue(e.target.value)}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={() => { isComposingRef.current = false; }}
          onBlur={() => { if (!saveError) void saveChange(); }}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className="h-7 w-full min-w-[60px] px-1.5 py-0 text-xs bg-background border-ring"
        />
        {saveError && (
          <div role="alert" className="absolute left-0 top-full z-30 mt-1 min-w-64 rounded-md border border-warning/40 bg-popover p-2 text-xs text-foreground shadow-lg">
            <p>{saveError}</p>
            <div className="mt-2 flex gap-2">
              {!hasConflict && (
                <Button size="sm" variant="outline" onMouseDown={e => e.preventDefault()} onClick={() => void saveChange()}>
                  重试保存
                </Button>
              )}
              <Button size="sm" variant="ghost" onMouseDown={e => e.preventDefault()} onClick={() => { setSaveError(null); setHasConflict(false); setConflictRevision(null); setIsEditing(false); }}>
                放弃输入
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`cursor-text rounded px-1.5 py-0.5 -mx-1.5 transition-colors hover:bg-muted ${className} ${isSaving ? 'opacity-50' : ''}`}
      title="双击编辑"
    >
      <div className="line-clamp-1">{value !== null && value !== '' ? value : <span className={required ? 'text-[#FF0082]' : 'text-muted-foreground italic'}>{placeholder || (required ? '请输入内容（必填）' : '空')}</span>}</div>
    </div>
  );
}
