/**
 * FrameForge OS Domain Model Definitions
 * Master Specification V1.0 Implementation Ready
 */

export type TemplateType =
  | 'film'
  | 'documentary'
  | 'tvc'
  | 'corporate'
  | 'motion_graphics'
  | 'vfx_3d'
  | 'custom';

export type ProductionMethod =
  | 'live'
  | 'stock'
  | 'client'
  | 'archive'
  | 'still'
  | 'ae'
  | 'mg'
  | 'three_d'
  | 'vfx'
  | 'type';

export type Department =
  | 'director'
  | 'camera'
  | 'production'
  | 'art'
  | 'stock'
  | 'editorial'
  | 'motion'
  | 'mg'
  | 'three_d'
  | 'vfx'
  | 'sound'
  | 'color'
  | 'legal';

export type ShotStatus =
  | 'draft'
  | 'ready'
  | 'scheduled'
  | 'in_progress'
  | 'review'
  | 'changes_requested'
  | 'approved'
  | 'locked'
  | 'cancelled';

export type ProductionStepType =
  | 'shoot'
  | 'stock_search'
  | 'stock_purchase'
  | 'client_request'
  | 'client_receive'
  | 'design'
  | 'styleframe'
  | 'animation'
  | 'tracking'
  | 'roto'
  | 'key'
  | 'cleanup'
  | 'graphics'
  | 'compositing'
  | 'layout'
  | 'three_d_animation'
  | 'fx'
  | 'lighting'
  | 'render'
  | 'review'
  | 'delivery';

export type AssetType =
  | 'storyboard'
  | 'reference'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'font'
  | 'lut'
  | 'three_d_model'
  | 'texture'
  | 'project_file'
  | 'other';

export type SourceType =
  | 'internal'
  | 'stock'
  | 'client'
  | 'archive'
  | 'generated'
  | 'external';

export type AssetRole =
  | 'source'
  | 'reference'
  | 'input'
  | 'output'
  | 'plate'
  | 'background'
  | 'texture'
  | 'logo'
  | 'audio'
  | 'proxy'
  | 'deliverable';

export interface User {
  id: string;
  email: string;
  display_name: string;
  role_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: Record<string, boolean>;
}

export interface Production {
  id: string;
  name: string;
  code: string;
  template_type: TemplateType;
  fps_num: number;
  fps_den: number;
  drop_frame: boolean;
  start_timecode_frames: number;
  target_duration_frames?: number | null;
  aspect_ratio: string;
  width: number;
  height: number;
  status: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  shot_count?: number;
  total_duration_frames?: number;
  cover_media_id?: string | null;
}

export interface Sequence {
  id: string;
  production_id: string;
  display_number: string;
  name: string;
  description: string;
  sort_index: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Scene {
  id: string;
  production_id: string;
  sequence_id: string;
  display_number: string;
  name: string;
  int_ext?: string | null;
  day_night?: string | null;
  location?: string | null;
  description: string;
  sort_index: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Shot {
  id: string;
  production_id: string;
  sequence_id?: string | null;
  scene_id?: string | null;
  display_number: string;
  sort_index: number;
  name?: string | null;
  description: string;
  action: string;
  performance: string;
  composition: string;
  director_notes: string;
  duration_frames: number;
  timing_locked: boolean;
  shot_size?: string | null;
  camera_angle?: string | null;
  camera_height?: string | null;
  lens_mm?: number | null;
  camera?: string | null;
  sensor?: string | null;
  aperture?: string | null;
  shutter?: string | null;
  camera_movement: Record<string, unknown>;
  dialogue: string;
  voice_over: string;
  subtitle: string;
  music_notes: string;
  sfx_notes: string;
  primary_method: ProductionMethod;
  secondary_methods: ProductionMethod[];
  department?: Department | null;
  owner_id?: string | null;
  status: ShotStatus;
  approval_status: string;
  vfx_required: boolean;
  continuity_notes: string;
  risk_notes: string;
  current_version: number;
  revision: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // Computed client properties
  tc_in?: string;
  tc_out?: string;
  duration_seconds?: number;
  panels?: Panel[];
  steps?: ProductionStep[];
  assets?: Asset[];
}

export interface Panel {
  id: string;
  shot_id: string;
  display_number: string;
  sort_index: number;
  asset_id?: string | null;
  duration_frames?: number | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ProductionStep {
  id: string;
  shot_id: string;
  type: ProductionStepType;
  department: Department;
  owner_id?: string | null;
  status: string;
  sort_index: number;
  input_asset_id?: string | null;
  output_asset_id?: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Asset {
  id: string;
  production_id: string;
  filename: string;
  display_name: string;
  asset_type: AssetType;
  source_type: SourceType;
  storage_key: string;
  proxy_storage_key?: string | null;
  mime_type: string;
  width?: number | null;
  height?: number | null;
  duration_frames?: number | null;
  fps_num?: number | null;
  fps_den?: number | null;
  file_size: number;
  hash_sha256: string;
  rights_status?: string | null;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}