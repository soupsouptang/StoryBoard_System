'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, Select, TextArea } from '@frameforge/ui';
import type { Shot } from '@frameforge/types';
import { ApiError } from '@/lib/api-client';
import { MethodBadge } from './MethodBadge';
import { StatusBadge } from './StatusBadge';
import { ShotTableText } from './ShotTableText';
import { getMethodLabel, getStatusBadge } from '@/lib/media-resolver';
import {
  type CustomFieldDefinition,
  usePatchCustomFieldValue
} from '@/lib/hooks/useCustomFields';

interface CustomFieldCellProps {
  productionId: string;
  shot: Shot;
  field: CustomFieldDefinition;
  value: unknown;
  format?: string;
  fps?: number;
}

function displayValue(field: CustomFieldDefinition, value: unknown) {
  const effective = value === undefined ? field.default_value : value;
  if (effective === null || effective === undefined || effective === '') return '';
  if (field.field_type === 'boolean') return effective ? '是' : '否';
  if (field.field_type === 'json') return JSON.stringify(effective);
  if (field.field_type === 'multiselect' && Array.isArray(effective)) return effective.join(' / ');
  return String(effective);
}

export function CustomFieldCell({
  productionId,
  shot,
  field,
  value, format, fps = 24
}: CustomFieldCellProps) {
  const mutation = usePatchCustomFieldValue(productionId);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictRevision, setConflictRevision] = useState<number | null>(null);
  const cancelled = useRef(false);

  const currentDisplay = displayValue(field, value);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (field.field_type !== 'number' && field.field_type !== 'date') {
        inputRef.current.select();
      }
    }
  }, [isEditing, field.field_type]);

  useEffect(() => {
    if (hasConflict && conflictRevision !== null && shot.revision !== conflictRevision) {
      setHasConflict(false);
      setConflictRevision(null);
      setSaveError(null);
    }
  }, [hasConflict, conflictRevision, shot.revision]);

  const beginEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    cancelled.current = false;
    setEditValue(currentDisplay);
    setSaveError(null);
    setHasConflict(false);
    setConflictRevision(null);
    setIsEditing(true);
  };

  const parseValue = (raw: string): unknown => {
    if (field.field_type === 'number') {
      return raw.trim() === '' ? null : Number(raw);
    }
    if (field.field_type === 'boolean') {
      return raw === 'true';
    }
    if (field.field_type === 'multiselect') return raw ? raw.split(' / ') : [];
    if (field.field_type === 'json') return raw.trim() ? JSON.parse(raw) : null;
    return raw;
  };

  const save = async (rawValue: string = editValue) => {
    if (!isEditing || mutation.isPending || hasConflict || cancelled.current) return;

    let nextValue: unknown;
    try { nextValue = parseValue(rawValue); }
    catch { setSaveError('请输入有效的结构化 JSON 内容。'); return; }
    const effectiveCurrent = value === undefined ? field.default_value : value;

    if (nextValue === effectiveCurrent) {
      setIsEditing(false);
      return;
    }

    try {
      await mutation.mutateAsync({
        shotId: shot.id,
        fieldId: field.id,
        revision: shot.revision,
        value: nextValue
      });
      setSaveError(null);
      setHasConflict(false);
      setConflictRevision(null);
      setIsEditing(false);
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 409 || error.code === 'CUSTOM_FIELD_REVISION_CONFLICT')
      ) {
        setHasConflict(true);
        setConflictRevision(shot.revision);
        setSaveError(
          '镜头已在别处修改。当前输入已保留；列表同步到最新 revision 后可再次保存，或放弃输入。'
        );
      } else {
        setSaveError(error instanceof Error ? error.message : '保存自定义列失败');
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    event.stopPropagation();
    if (event.key === 'Enter' && field.field_type !== 'textarea') {
      event.preventDefault();
      void save();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelled.current = true;
      setIsEditing(false);
      setSaveError(null);
      setHasConflict(false);
      setConflictRevision(null);
    }
  };

  if (isEditing) {
    const editor =
      field.field_type === 'multiselect' ? (
        <select multiple autoFocus aria-label={field.label} value={editValue ? editValue.split(' / ') : []}
          disabled={mutation.isPending} onKeyDown={handleKeyDown}
          className="w-full rounded-md border bg-background p-1 text-xs"
          onChange={event => setEditValue(Array.from(event.target.selectedOptions, option => option.value).join(' / '))}
          onBlur={() => { if (!saveError) void save(); }}>
          {field.options.map(option => <option key={option} value={option}>{format === 'primary_method' ? getMethodLabel(option) : option}</option>)}
        </select>
      ) : field.field_type === 'select' ? (
        <Select
          label={field.label}
          value={editValue}
          onChange={next => {
            setEditValue(next);
            void save(next);
          }}
          options={[
            ...(!field.required ? [{ value: '', label: '— 空 —' }] : []),
            ...field.options.map(option => ({ value: option, label: format === 'status' ? getStatusBadge(option).label : format === 'sequence_id' ? `场次 ${option.slice(0,8)}` : option }))
          ]}
          disabled={mutation.isPending}
          className="h-8 text-xs"
        />
      ) : field.field_type === 'boolean' ? (
        <Select
          label={field.label}
          value={editValue === '是' || editValue === 'true' ? 'true' : 'false'}
          onChange={next => {
            setEditValue(next);
            void save(next);
          }}
          options={[
            { value: 'true', label: '是' },
            { value: 'false', label: '否' }
          ]}
          disabled={mutation.isPending}
          className="h-8 text-xs"
        />
      ) : ['textarea', 'json'].includes(field.field_type) ? (
        <TextArea
          value={editValue}
          onChange={event => setEditValue(event.target.value)}
          onBlur={() => {
            if (!saveError) void save();
          }}
          onKeyDown={handleKeyDown}
          disabled={mutation.isPending}
          rows={2}
          className="min-h-14 text-xs"
          autoFocus
        />
      ) : (
        <Input
          ref={inputRef}
          type={
            field.field_type === 'number'
              ? 'number'
              : field.field_type === 'date'
                ? 'date'
                : field.field_type === 'url'
                  ? 'url'
                  : 'text'
          }
          value={editValue}
          onChange={event => setEditValue(event.target.value)}
          onBlur={() => {
            if (!saveError) void save();
          }}
          onKeyDown={handleKeyDown}
          disabled={mutation.isPending}
          className="h-8 min-w-24 text-xs"
        />
      );

    return (
      <div
        className="relative min-w-0"
        onClick={event => event.stopPropagation()}
        onDoubleClick={event => event.stopPropagation()}
      >
        {editor}
        {saveError && (
          <div
            role="alert"
            className="absolute left-0 top-full z-40 mt-1 min-w-72 rounded-md border border-warning/40 bg-popover p-2 text-xs text-popover-foreground shadow-lg"
          >
            <p>{saveError}</p>
            <div className="mt-2 flex gap-2">
              {!hasConflict && (
                <Button
                  size="sm"
                  variant="outline"
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => void save()}
                >
                  重试保存
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onMouseDown={event => event.preventDefault()}
                onClick={() => {
                  setIsEditing(false);
                  setSaveError(null);
                  setHasConflict(false);
                  setConflictRevision(null);
                }}
              >
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
      onClick={event => event.stopPropagation()}
      onDoubleClick={beginEdit}
      className="mx-[-6px] cursor-text rounded px-1.5 py-0.5 transition-colors hover:bg-muted"
      title="双击编辑自定义列"
    >
      <div>
        {currentDisplay ? format === 'primary_method' ? <div className="flex flex-wrap gap-1">{currentDisplay.split(' / ').map(method => <MethodBadge key={method} method={method} />)}</div>
          : format === 'status' ? <StatusBadge status={currentDisplay} />
          : format === 'duration_frames' ? <span className="font-mono"><ShotTableText text={`${currentDisplay}f (${(Number(currentDisplay) / fps).toFixed(1)}s)`} /></span>
          : format === 'lens_mm' ? <ShotTableText text={`${currentDisplay}mm`} />
          : format === 'sequence_id' ? <ShotTableText text={`场次 ${currentDisplay.slice(0,8)}`} />
          : format === 'camera_movement' && field.field_type === 'json' ? <ShotTableText text={String(((value === undefined ? field.default_value : value) as { type?: unknown } | null)?.type || '固定')} />
          : <ShotTableText text={currentDisplay} /> : (
          <span className={field.required ? 'italic text-[#FF0082]' : 'italic text-muted-foreground'}>
            {field.required ? '必填' : '空'}
          </span>
        )}
      </div>
    </div>
  );
}
