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
}

export function InlineEditCell({
  productionId,
  shot,
  field,
  value,
  placeholder,
  className = '',
  type = 'text'
}: InlineEditCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictRevision, setConflictRevision] = useState<number | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
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
      setSaveError('��ͷ�Ѹ��¡���ǰ�����ѱ����������Ա��棬��������롣');
    }
  }, [hasConflict, conflictRevision, shot.revision]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the inspector
    setEditValue(value !== null && value !== undefined ? String(value) : '');
    setSaveError(null);
    setHasConflict(false);
    setConflictRevision(null);
    setIsEditing(true);
  };

  const saveChange = async () => {
    if (!isEditing || isSaving || hasConflict) return;
    
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
        setSaveError('��ͷ���ڱ��޸ġ���ǰ�����ѱ������б�ˢ�µ����°汾����ٴα��棬��������롣');
      } else {
        setSaveError(err instanceof Error ? err.message : '����ʧ�ܣ�������');
      }
    } finally {
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
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className={`relative ${className}`} onClick={(e) => e.stopPropagation()}>
        <Input
          ref={inputRef}
          type={type}
          value={editValue}
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
                  ���Ա���
                </Button>
              )}
              <Button size="sm" variant="ghost" onMouseDown={e => e.preventDefault()} onClick={() => { setSaveError(null); setHasConflict(false); setConflictRevision(null); setIsEditing(false); }}>
                ��������
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
      title="˫�����б༭"
    >
      <div className="line-clamp-1">{value || placeholder || <span className="text-muted-foreground italic">��</span>}</div>
    </div>
  );
}
