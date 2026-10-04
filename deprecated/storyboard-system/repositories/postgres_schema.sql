-- ============================================================================
-- FrameForge Professional Storyboard & Production Management System
-- PostgreSQL Target Production Schema (Migration Baseline Version 1)
-- Conforms to ARCHITECTURE_MIGRATION.md Section 35.2
-- ============================================================================

-- Ensure uuid-ossp or pgcrypto extension is available if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Schema migration tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Viewer',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    user_color VARCHAR(32) NOT NULL DEFAULT '',
    avatar_file VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
    token_hash VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf VARCHAR(128) NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    production_type VARCHAR(64) NOT NULL DEFAULT 'promo',
    fps DOUBLE PRECISION NOT NULL DEFAULT 25.0,
    start_tc VARCHAR(32) NOT NULL DEFAULT '01:00:00:00',
    target_seconds DOUBLE PRECISION NOT NULL DEFAULT 270.0,
    aspect_ratio VARCHAR(32) NOT NULL DEFAULT '16:9',
    status VARCHAR(64) NOT NULL DEFAULT 'development',
    share_token VARCHAR(128) UNIQUE,
    is_drop_frame BOOLEAN NOT NULL DEFAULT FALSE,
    director VARCHAR(255) NOT NULL DEFAULT '',
    dp VARCHAR(255) NOT NULL DEFAULT '',
    producer VARCHAR(255) NOT NULL DEFAULT '',
    company VARCHAR(255) NOT NULL DEFAULT '',
    custom_template_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    deleted_at TIMESTAMPTZ,
    updated_by VARCHAR(255) NOT NULL DEFAULT '',
    updated_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at);

-- Sequences
CREATE TABLE IF NOT EXISTS sequences (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    code VARCHAR(64) NOT NULL DEFAULT '',
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sequences_project ON sequences(project_id, position);

-- Shots
CREATE TABLE IF NOT EXISTS shots (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sequence_id VARCHAR(64) REFERENCES sequences(id) ON DELETE SET NULL,
    position INTEGER NOT NULL,
    number VARCHAR(64) NOT NULL,
    sort_index INTEGER NOT NULL DEFAULT 0,
    title VARCHAR(255) NOT NULL DEFAULT '',
    chapter VARCHAR(255) NOT NULL DEFAULT '',
    scene VARCHAR(255) NOT NULL DEFAULT '',
    panel_frame VARCHAR(255) NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL DEFAULT '',
    performance TEXT NOT NULL DEFAULT '',
    composition TEXT NOT NULL DEFAULT '',
    director_notes TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    duration_frames INTEGER NOT NULL DEFAULT 75,
    locked BOOLEAN NOT NULL DEFAULT FALSE,
    handles_head_frames INTEGER NOT NULL DEFAULT 0,
    handles_tail_frames INTEGER NOT NULL DEFAULT 0,
    shot_size VARCHAR(64) NOT NULL DEFAULT '全景',
    lens VARCHAR(128) NOT NULL DEFAULT '',
    lens_source VARCHAR(128) NOT NULL DEFAULT '',
    angle VARCHAR(64) NOT NULL DEFAULT '',
    height VARCHAR(64) NOT NULL DEFAULT '',
    movement VARCHAR(64) NOT NULL DEFAULT '固定',
    equipment VARCHAR(255) NOT NULL DEFAULT '',
    sensor VARCHAR(128) NOT NULL DEFAULT '',
    aperture VARCHAR(64) NOT NULL DEFAULT '',
    shutter VARCHAR(64) NOT NULL DEFAULT '',
    camera_fps DOUBLE PRECISION NOT NULL DEFAULT 25.0,
    voiceover TEXT NOT NULL DEFAULT '',
    dialogue TEXT NOT NULL DEFAULT '',
    subtitle TEXT NOT NULL DEFAULT '',
    music TEXT NOT NULL DEFAULT '',
    sound TEXT NOT NULL DEFAULT '',
    primary_method VARCHAR(64) NOT NULL DEFAULT 'LIVE',
    secondary_methods JSONB NOT NULL DEFAULT '[]'::jsonb,
    department VARCHAR(64) NOT NULL DEFAULT 'Camera',
    owner VARCHAR(255) NOT NULL DEFAULT '',
    status VARCHAR(64) NOT NULL DEFAULT 'Draft',
    approval_version VARCHAR(64) NOT NULL DEFAULT 'v001',
    transition VARCHAR(64) NOT NULL DEFAULT '',
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    method_data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    revision INTEGER NOT NULL DEFAULT 1,
    import_columns_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    rich_text_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    script_character VARCHAR(255) NOT NULL DEFAULT '',
    script_parenthetical VARCHAR(255) NOT NULL DEFAULT '',
    script_scene_type VARCHAR(64) NOT NULL DEFAULT '',
    script_time_of_day VARCHAR(64) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_shots_proj_pos ON shots(project_id, position);
CREATE INDEX IF NOT EXISTS idx_shots_proj_sort ON shots(project_id, sort_index);
CREATE INDEX IF NOT EXISTS idx_shots_deleted ON shots(is_deleted);

-- Panels
CREATE TABLE IF NOT EXISTS panels (
    id VARCHAR(64) PRIMARY KEY,
    shot_id VARCHAR(64) NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    label VARCHAR(32) NOT NULL DEFAULT 'A',
    duration_frames INTEGER NOT NULL DEFAULT 75,
    media_id VARCHAR(64),
    drawing_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_panels_shot ON panels(shot_id, position);

-- Production Steps
CREATE TABLE IF NOT EXISTS production_steps (
    id VARCHAR(64) PRIMARY KEY,
    shot_id VARCHAR(64) NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    sort_index INTEGER NOT NULL DEFAULT 0,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(64) NOT NULL DEFAULT 'TASK',
    input_asset VARCHAR(255) NOT NULL DEFAULT '',
    output_asset VARCHAR(255) NOT NULL DEFAULT '',
    department VARCHAR(64) NOT NULL DEFAULT '',
    owner VARCHAR(255) NOT NULL DEFAULT '',
    status VARCHAR(64) NOT NULL DEFAULT 'Pending',
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_prod_steps_shot ON production_steps(shot_id, sort_index);

-- Assets
CREATE TABLE IF NOT EXISTS assets (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL UNIQUE,
    mime VARCHAR(128) NOT NULL,
    size BIGINT NOT NULL,
    category VARCHAR(64) NOT NULL DEFAULT 'Storyboard',
    version VARCHAR(32) NOT NULL DEFAULT 'v001',
    rights_info VARCHAR(255) NOT NULL DEFAULT '',
    source_url TEXT NOT NULL DEFAULT '',
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    sha256 VARCHAR(64) NOT NULL DEFAULT '',
    created_by VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_assets_project ON assets(project_id);

-- Asset Versions
CREATE TABLE IF NOT EXISTS asset_versions (
    id VARCHAR(64) PRIMARY KEY,
    asset_id VARCHAR(64) NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    version_number VARCHAR(32) NOT NULL,
    storage_key VARCHAR(255) NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    size BIGINT NOT NULL,
    sha256 VARCHAR(64) NOT NULL DEFAULT '',
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(asset_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_asset_versions_asset ON asset_versions(asset_id, created_at DESC);

-- Shot Asset Links
CREATE TABLE IF NOT EXISTS shot_asset_links (
    id VARCHAR(64) PRIMARY KEY,
    shot_id VARCHAR(64) NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    asset_id VARCHAR(64) NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    role VARCHAR(64) NOT NULL DEFAULT 'Reference',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_shot_assets ON shot_asset_links(shot_id, asset_id);

-- Shot Versions
CREATE TABLE IF NOT EXISTS shot_versions (
    id VARCHAR(64) PRIMARY KEY,
    shot_id VARCHAR(64) NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    version_num VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL DEFAULT '',
    snapshot_json JSONB NOT NULL,
    asset_id VARCHAR(64),
    status VARCHAR(64) NOT NULL DEFAULT 'Draft',
    branch_name VARCHAR(64) NOT NULL DEFAULT 'main',
    parent_version_id VARCHAR(64),
    merge_parent_id VARCHAR(64),
    is_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by VARCHAR(255) NOT NULL DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_shot_versions_shot ON shot_versions(shot_id, created_at DESC);

-- Project Snapshots
CREATE TABLE IF NOT EXISTS project_snapshots (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_num VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL DEFAULT '',
    snapshot_json JSONB NOT NULL,
    parent_snapshot_id VARCHAR(64),
    created_by VARCHAR(255) NOT NULL DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, version_num)
);
CREATE INDEX IF NOT EXISTS idx_project_snapshots_proj ON project_snapshots(project_id, created_at DESC);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR(64) PRIMARY KEY,
    shot_id VARCHAR(64) NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL,
    author_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    role VARCHAR(64) NOT NULL DEFAULT 'Director',
    text TEXT NOT NULL,
    timecode VARCHAR(32) NOT NULL DEFAULT '',
    quote_field VARCHAR(128) NOT NULL DEFAULT '',
    quote_text TEXT NOT NULL DEFAULT '',
    parent_id VARCHAR(64) REFERENCES comments(id) ON DELETE CASCADE,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_comments_shot ON comments(shot_id);

-- Review Decisions
CREATE TABLE IF NOT EXISTS review_decisions (
    id VARCHAR(64) PRIMARY KEY,
    shot_id VARCHAR(64) NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    version_id VARCHAR(64),
    previous_status VARCHAR(64) NOT NULL DEFAULT '',
    next_status VARCHAR(64) NOT NULL,
    action_label VARCHAR(128) NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_review_decisions_shot ON review_decisions(shot_id, created_at DESC);

-- Share Links
CREATE TABLE IF NOT EXISTS share_links (
    token VARCHAR(128) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    snapshot_json JSONB NOT NULL,
    is_permanent BOOLEAN NOT NULL DEFAULT TRUE,
    allow_download BOOLEAN NOT NULL DEFAULT TRUE,
    watermark VARCHAR(255) NOT NULL DEFAULT '',
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    revoked_at TIMESTAMPTZ,
    created_by VARCHAR(255) NOT NULL DEFAULT '',
    expires_at BIGINT,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_share_links_proj ON share_links(project_id);

-- Custom Field Definitions & Values
CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    key VARCHAR(128) NOT NULL,
    label VARCHAR(255) NOT NULL,
    type VARCHAR(64) NOT NULL DEFAULT 'text',
    options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, key)
);
CREATE INDEX IF NOT EXISTS idx_cf_defs_project ON custom_field_definitions(project_id);

CREATE TABLE IF NOT EXISTS custom_field_values (
    id VARCHAR(64) PRIMARY KEY,
    shot_id VARCHAR(64) NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    field_id VARCHAR(64) NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
    value_json JSONB NOT NULL DEFAULT 'null'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(shot_id, field_id)
);
CREATE INDEX IF NOT EXISTS idx_cf_values_shot ON custom_field_values(shot_id);

-- Project Column Preferences
CREATE TABLE IF NOT EXISTS project_column_preferences (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    columns_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    order_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    width_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    permanently_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Creative Boards (Moodboard & Lighting)
CREATE TABLE IF NOT EXISTS creative_boards (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    board_type VARCHAR(64) NOT NULL,
    data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    revision INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, board_type)
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(128) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);

-- AI Proposals (Phase 5 / Complete AI Invocation target)
CREATE TABLE IF NOT EXISTS ai_proposals (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    capability VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    model VARCHAR(128) NOT NULL,
    prompt_summary TEXT NOT NULL DEFAULT '',
    changes_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ai_proposals_project ON ai_proposals(project_id, status);
