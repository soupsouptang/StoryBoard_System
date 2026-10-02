"""Opt-in project root locking/CAS, within the caller's SQLAlchemy transaction.

No business write owner is wired here yet. Call lock_and_check BEFORE locking
columns/shots, then advance once for an acknowledged logical change in the same
UoW. Permission, business validation, audit/outbox and commit remain caller-owned.
SQLite exercises CAS, but does not provide PostgreSQL FOR UPDATE semantics.
"""
from dataclasses import asdict, dataclass

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.models.production import Production


@dataclass(frozen=True)
class ProductionRevisions:
    revision: int
    schema_revision: int
    order_revision: int
    content_revision: int
    purge_epoch: int

    def __post_init__(self):
        for name, value in asdict(self).items():
            if type(value) is not int or value < (0 if name == "purge_epoch" else 1):
                raise ValueError(f"{name} must be a strict {'nonnegative' if name == 'purge_epoch' else 'positive'} integer")


FIELDS = tuple(ProductionRevisions.__dataclass_fields__)


class ProductionRevisionService:
    @staticmethod
    async def lock_and_check(db: AsyncSession, production_id: str, expected: ProductionRevisions) -> ProductionRevisions:
        if not isinstance(expected, ProductionRevisions):
            raise TypeError("expected must contain all five Production revision tokens")
        # Column read avoids a stale identity-map object and never overwrites drafts.
        with db.no_autoflush:
            row = (await db.execute(select(*(getattr(Production, name) for name in FIELDS))
                .where(Production.id == production_id, Production.deleted_at.is_(None))
                .with_for_update())).one_or_none()
        if row is None:
            raise NotFoundError("项目不存在或已删除")
        current = ProductionRevisions(**dict(row._mapping))
        if current != expected:
            raise ConflictError("项目版本已变化", details={"client_revisions": asdict(expected), "server_revisions": asdict(current)})
        return current

    @staticmethod
    async def advance(db: AsyncSession, production_id: str, expected: ProductionRevisions, *,
                      changed: bool = True, content: bool = True, schema: bool = False,
                      order: bool = False, purge: bool = False) -> ProductionRevisions:
        """All changes advance revision; structure/order/purge also advance content.

        Workspace-only changes may pass content=False. Purge also invalidates
        schema. No-op still checks tokens, but performs no UPDATE or commit.
        Counters are infrastructure fields: callers must never assign them.
        """
        if any(type(flag) is not bool for flag in (changed, content, schema, order, purge)):
            raise TypeError("revision change flags must be booleans")
        current = await ProductionRevisionService.lock_and_check(db, production_id, expected)
        if not changed:
            return current
        increments = {"revision": 1, "schema_revision": int(schema or purge),
                      "order_revision": int(order), "content_revision": int(content or schema or order or purge),
                      "purge_epoch": int(purge)}
        values = {name: getattr(Production, name) + amount for name, amount in increments.items() if amount}
        # Full vector CAS also covers stale epoch/schema/order callers and a
        # non-cooperating writer that does not acquire the root lock.
        with db.no_autoflush:
            result = await db.execute(update(Production)
                .where(Production.id == production_id, Production.deleted_at.is_(None),
                       *(getattr(Production, name) == getattr(expected, name) for name in FIELDS))
                .values(**values).returning(*(getattr(Production, name) for name in FIELDS))
                .execution_options(synchronize_session="fetch"))
        row = result.one_or_none()
        if row is None:
            raise ConflictError("项目版本已变化，请重新读取后重试", details={"client_revisions": asdict(expected)})
        return ProductionRevisions(**dict(row._mapping))
