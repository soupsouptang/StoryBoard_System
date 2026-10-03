"""Project commit coordination; snapshot codec and diff engine are separate."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import ConflictError, DomainError, NotFoundError
from app.models.collaboration import AuditLog
from app.models.command import OutboxEvent
from app.models.production import Production
from app.models.project_version import ProjectBranch, ProjectCommit
from app.services.project_diff import compare_snapshots
from app.services.project_snapshot import capture_project, content_hash


class ProjectVersionService:
    @staticmethod
    def permission(user, write=False):
        permissions = getattr(getattr(user, "role", None), "permissions", None) or {}
        allowed = ("production.write", "shot.write") if write else ("production.read", "production.write", "shot.write", "review.approve")
        if not permissions.get("*") and not any(permissions.get(key) for key in allowed):
            raise DomainError("当前账号没有项目版本操作权限", code="FORBIDDEN")

    @staticmethod
    async def project(db, production_id, lock=False):
        query = select(Production).where(Production.id == production_id, Production.deleted_at.is_(None))
        if lock:
            query = query.with_for_update().execution_options(populate_existing=True)
        if (await db.execute(query)).scalar_one_or_none() is None:
            raise NotFoundError("项目不存在")

    @staticmethod
    async def commit(db, production_id, commit_id):
        row = (await db.execute(select(ProjectCommit).where(ProjectCommit.id == commit_id, ProjectCommit.production_id == production_id))).scalar_one_or_none()
        if row is None:
            raise NotFoundError("项目版本不存在")
        return row

    @staticmethod
    async def working_state(db, production_id, user):
        ProjectVersionService.permission(user)
        await ProjectVersionService.project(db, production_id)
        snapshot = await capture_project(db, production_id)
        return {"state_hash": content_hash(snapshot), "schema_version": snapshot["schema_version"],
            "sections": {key: len(rows) for key, rows in snapshot["sections"].items()},
            "excluded_components": ["moodboard"],
            "pending_components": []}

    @staticmethod
    async def create_commit(db: AsyncSession, production_id, req, user):
        ProjectVersionService.permission(user, write=True)
        await ProjectVersionService.project(db, production_id, lock=True)
        branch = (await db.execute(select(ProjectBranch).where(ProjectBranch.production_id == production_id,
            ProjectBranch.name == req.branch_name).with_for_update().execution_options(populate_existing=True))).scalar_one_or_none()
        head = branch.head_id if branch else None
        if head != req.expected_head_id:
            raise ConflictError("分支已推进，请刷新提交记录后重试", details={"server_head_id": head})
        if branch is None and req.branch_name != "main":
            raise DomainError("请先从已有提交创建分支", code="BRANCH_NOT_FOUND")
        snapshot = await capture_project(db, production_id)
        digest = content_hash(snapshot)
        if digest != req.expected_state_hash:
            raise ConflictError("项目内容已修改，请重新预览后提交", details={"server_state_hash": digest})
        if head:
            parent = await ProjectVersionService.commit(db, production_id, head)
            if parent.content_hash == digest:
                return parent
        if branch is None:
            branch = ProjectBranch(production_id=production_id, name="main", created_by=user.id)
            db.add(branch)
        row = ProjectCommit(production_id=production_id, message=req.message, branch_name=req.branch_name,
            parent_id=head, snapshot=snapshot, schema_version=snapshot["schema_version"], content_hash=digest, created_by=user.id)
        db.add(row)
        await db.flush()
        branch.head_id = row.id
        branch.revision = (branch.revision or 1) + (1 if head else 0)
        db.add(AuditLog(user_id=user.id, action="project.version.commit", entity_type="project_commit", entity_id=row.id,
            metadata_json={"production_id": production_id, "parent_id": head}))
        db.add(OutboxEvent(production_id=production_id, command_id=row.id, event_type="project.version.commit",
            revision=branch.revision,
            entity_ids={"commit_id": row.id, "branch_id": branch.id, "head_id": row.id}))
        await db.flush()
        return row

    @staticmethod
    async def create_branch(db, production_id, req, user):
        ProjectVersionService.permission(user, write=True)
        await ProjectVersionService.project(db, production_id, lock=True)
        await ProjectVersionService.commit(db, production_id, req.from_commit_id)
        exists = (await db.execute(select(ProjectBranch.id).where(ProjectBranch.production_id == production_id, ProjectBranch.name == req.name))).scalar_one_or_none()
        if exists:
            raise DomainError("该分支名称已存在", code="BRANCH_EXISTS")
        branch = ProjectBranch(production_id=production_id, name=req.name, head_id=req.from_commit_id, created_by=user.id)
        db.add(branch)
        await db.flush()
        db.add(AuditLog(user_id=user.id, action="project.version.branch", entity_type="project_branch", entity_id=branch.id,
            metadata_json={"production_id": production_id, "head_id": branch.head_id}))
        db.add(OutboxEvent(production_id=production_id, command_id=branch.id, event_type="project.version.branch",
            revision=branch.revision, entity_ids={"branch_id": branch.id, "head_id": branch.head_id}))
        await db.flush()
        return branch

    @staticmethod
    async def graph(db, production_id, user, limit=100, before_id=None):
        ProjectVersionService.permission(user)
        await ProjectVersionService.project(db, production_id)
        query = select(ProjectCommit).where(ProjectCommit.production_id == production_id)
        if before_id:
            before = await ProjectVersionService.commit(db, production_id, before_id)
            from sqlalchemy import or_, and_
            query = query.where(or_(ProjectCommit.created_at < before.created_at,
                and_(ProjectCommit.created_at == before.created_at, ProjectCommit.id < before.id)))
        commits = list((await db.execute(query.order_by(ProjectCommit.created_at.desc(), ProjectCommit.id.desc()).limit(limit + 1))).scalars())
        branches = list((await db.execute(select(ProjectBranch).where(ProjectBranch.production_id == production_id).order_by(ProjectBranch.name))).scalars())
        return {"commits": commits[:limit], "branches": branches, "next_before_id": commits[limit - 1].id if len(commits) > limit else None}

    @staticmethod
    async def detail(db, production_id, commit_id, user):
        ProjectVersionService.permission(user)
        await ProjectVersionService.project(db, production_id)
        return await ProjectVersionService.commit(db, production_id, commit_id)

    @staticmethod
    async def compare(db, production_id, commit_id, user, to_id=None, shot_id=None):
        before = await ProjectVersionService.detail(db, production_id, commit_id, user)
        after = (await ProjectVersionService.commit(db, production_id, to_id)).snapshot if to_id else await capture_project(db, production_id)
        if shot_id and not any(shot_id in source["sections"]["shots"] for source in (before.snapshot, after)):
            raise NotFoundError("该镜头不在比较版本中")
        return {"from_commit_id": before.id, "to_commit_id": to_id, "from_hash": before.content_hash,
            "to_hash": content_hash(after), **compare_snapshots(before.snapshot, after, shot_id)}
