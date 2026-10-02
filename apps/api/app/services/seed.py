"""Database Development Seeder."""
from __future__ import annotations

import json
import uuid
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.production import Production, Sequence, Scene
from app.models.shot import Panel, ProductionStep, Shot
from app.models.user import Role, User
from app.services.column_catalog import builtin_definitions

ROLES = [
    {"name": "admin", "permissions": {"*": True}},
    {"name": "producer", "permissions": {"production.write": True, "shot.write": True, "export.create": True}},
    {"name": "director", "permissions": {"production.read": True, "shot.write": True, "review.approve": True}},
    {"name": "camera", "permissions": {"production.read": True, "shot.write": True}},
    {"name": "motion", "permissions": {"production.read": True, "shot.write": True, "asset.upload": True}},
    {"name": "vfx", "permissions": {"production.read": True, "shot.write": True, "asset.upload": True}},
    {"name": "readonly", "permissions": {"production.read": True}}
]


async def seed_database(db: AsyncSession) -> None:
    """Seed required roles/admin; optional demo production is explicit opt-in."""
    # 1. Seed Roles
    for r_data in ROLES:
        res = await db.execute(select(Role).where(Role.name == r_data["name"]))
        if not res.scalar_one_or_none():
            db.add(Role(id=str(uuid.uuid4()), name=r_data["name"], permissions=r_data["permissions"]))

    await db.flush()

    # 2. Seed an admin only when the operator explicitly supplies a password.
    if settings.INITIAL_ADMIN_PASSWORD:
        admin_res = await db.execute(select(User).where(User.email == settings.INITIAL_ADMIN_EMAIL.lower()))
        if not admin_res.scalar_one_or_none():
            role_res = await db.execute(select(Role).where(Role.name == "admin"))
            admin_role = role_res.scalar_one_or_none()
            admin_user = User(
                id=str(uuid.uuid4()),
                email=settings.INITIAL_ADMIN_EMAIL.lower(),
                display_name=settings.INITIAL_ADMIN_NAME,
                password_hash=get_password_hash(settings.INITIAL_ADMIN_PASSWORD),
                role_id=admin_role.id if admin_role else None,
                is_active=True
            )
            db.add(admin_user)
            await db.flush()

    # 3. Demo product data is optional. Normal development/test startup must
    # stay product-neutral unless DEMO_SEED_ENABLED is explicitly enabled.
    if not settings.DEMO_SEED_ENABLED:
        return

    prod_res = await db.execute(select(Production).limit(1))
    if not prod_res.scalar_one_or_none():
        pid = str(uuid.uuid4())
        prod = Production(
            id=pid,
            name="天津国际农产品交易中心 · 4分30秒形象宣传片",
            code="TJAGRI",
            template_type="corporate",
            fps_num=25,
            fps_den=1,
            drop_frame=False,
            start_timecode_frames=90000,
            target_duration_frames=6750,  # 270s * 25fps = 6750f
            aspect_ratio="16:9",
            width=1920,
            height=1080,
            status="approved"
        )
        db.add(prod)
        await db.flush()
        db.add_all(builtin_definitions(pid, None))

        # Sequences / Chapters
        seq1 = Sequence(id=str(uuid.uuid4()), production_id=pid, display_number="SEQ010", name="篇章一｜强强联手·战略启航", sort_index=1000.0)
        seq2 = Sequence(id=str(uuid.uuid4()), production_id=pid, display_number="SEQ020", name="篇章二｜区位优势·立体交通", sort_index=2000.0)
        seq3 = Sequence(id=str(uuid.uuid4()), production_id=pid, display_number="SEQ030", name="篇章三｜规划引领·产业高地", sort_index=3000.0)
        seq4 = Sequence(id=str(uuid.uuid4()), production_id=pid, display_number="SEQ040", name="篇章四｜数字赋能·智慧运营", sort_index=4000.0)
        db.add_all([seq1, seq2, seq3, seq4])
        await db.flush()

        # Seed 80 sample shots
        methods = ["live", "stock", "stock", "stock", "live", "mg", "ae", "3d", "client", "live"]
        departments = ["camera", "stock", "stock", "stock", "camera", "motion", "motion", "three_d", "production", "camera"]

        for i in range(1, 81):
            sid = str(uuid.uuid4())
            seq_id = seq1.id if i <= 20 else seq2.id if i <= 40 else seq3.id if i <= 60 else seq4.id
            m_idx = (i - 1) % len(methods)
            p_method = methods[m_idx]
            dur_frames = 75 if i % 2 == 0 else 100

            shot = Shot(
                id=sid,
                production_id=pid,
                sequence_id=seq_id,
                display_number=f"{i:03d}",
                sort_index=float(i * 1000),
                name=f"镜头 {i:03d}",
                description=f"【画面描述】镜头 {i:03d} 详细构图与动作设计。",
                voice_over=f"镜头 {i:03d} 对应解说词旁白，节奏明快，信息明确。",
                duration_frames=dur_frames,
                timing_locked=(i % 5 == 0),
                shot_size="全景" if i % 3 == 0 else "中景" if i % 3 == 1 else "特写",
                lens_mm=24.0 if i % 3 == 0 else 50.0 if i % 3 == 1 else 85.0,
                camera="ARRI Alexa Mini",
                camera_movement={"type": "航拍推镜头" if i % 2 == 0 else "固定机位"},
                primary_method=p_method,
                secondary_methods=["ae"] if p_method == "live" and i % 3 == 0 else [],
                department=departments[m_idx],
                owner_id="王指导",
                status="approved" if i <= 20 else "in_progress",
                revision=1
            )
            db.add(shot)

            panel = Panel(
                id=str(uuid.uuid4()),
                shot_id=sid,
                display_number="A",
                sort_index=1000.0,
                duration_frames=dur_frames
            )
            db.add(panel)

            step = ProductionStep(
                id=str(uuid.uuid4()),
                shot_id=sid,
                type="shoot" if p_method == "live" else "animation" if p_method in ("ae", "mg") else "stock_purchase" if p_method == "stock" else "review",
                department=departments[m_idx],
                status="done" if i <= 20 else "pending",
                sort_index=1000.0
            )
            db.add(step)

        await db.flush()
