/** Closed table-column contribution adapter. Values remain owned by Shot/custom fields. */
import type { Shot } from '@frameforge/types';
import type { CustomFieldDefinition } from './hooks/useCustomFields';
import { PENDING_SHOT_TABLE_COLUMNS, SHOT_TABLE_COLUMN_OPTIONS, type ShotTableColumnKey } from './shot-table-presentation';

export type DetailField = {
  key: string; label: string; hidden: boolean; readonly: boolean; required: boolean;
  kind: 'text' | 'textarea' | 'number' | 'boolean' | 'date' | 'url' | 'select' | 'multiselect' | 'json' | 'image' | 'duration' | 'movement' | 'timecode';
  options: string[]; custom?: CustomFieldDefinition;
};
const longText = new Set(['description', 'voice_over', 'performance', 'dialogue', 'action']);
export function shotDetailFields(keys: string[], visible: string[], labels: Record<string, string>, custom: CustomFieldDefinition[]): DetailField[] {
  return keys.map(key => {
    const field = custom.find(item => item.column_key === key);
    return { key, label: labels[key] || key, hidden: !visible.includes(key),
      readonly: !visible.includes(key) || key === 'display_number' || key === 'tc_in' || PENDING_SHOT_TABLE_COLUMNS.has(key as ShotTableColumnKey),
      required: field?.required || key === 'name' || key === 'duration_frames' || key === 'primary_method' || key === 'status',
      kind: field?.field_type || (key === 'panel_image' ? 'image' : key === 'duration_frames' ? 'duration' : key === 'camera_movement' ? 'movement' : key === 'tc_in' ? 'timecode' : key === 'lens_mm' ? 'number' : SHOT_TABLE_COLUMN_OPTIONS[key] || key === 'sequence_id' ? 'select' : longText.has(key) ? 'textarea' : 'text'),
      options: field?.options || SHOT_TABLE_COLUMN_OPTIONS[key] || [], custom: field };
  });
}
export function detailFieldValue(field: DetailField, shot: Shot, values: Record<string, unknown>) {
  if (field.custom) return values[field.custom.id] === undefined ? field.custom.default_value : values[field.custom.id];
  return shot[field.key as keyof Shot];
}
export function equalDetailValue(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) && Array.isArray(right)) return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
  return JSON.stringify(left ?? '') === JSON.stringify(right ?? '');
}
