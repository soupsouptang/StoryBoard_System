"""Run directly with Python; no app imports, engine, network, or real database."""
import ast
import asyncio
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[2]


class Query:
    def __getattr__(self, name):
        return lambda *args: self

    def __eq__(self, other):
        return self


class Model:
    id = shot_id = deleted_at = sort_index = role = Query()

    def __init__(self, **values):
        self.__dict__.update(values)


class Session:
    def __init__(self, shot=None, fail_commit=False):
        self.shot, self.fail_commit = shot, fail_commit
        self.added = []
        self.committed = self.rolled_back = False

    async def execute(self, query):
        return SimpleNamespace(scalar_one_or_none=lambda: self.shot)

    def add(self, value):
        self.added.append(value)

    async def commit(self):
        if self.fail_commit:
            raise RuntimeError("Synthetic commit failure")
        self.committed = True

    async def rollback(self):
        self.rolled_back = True


# Execute the actual service with inert query/models; never import the database module.
scope = dict(AsyncSession=Session, Shot=Model, Panel=Model, Asset=Model,
             ShotAssetLink=Model, AuditLog=Model, select=lambda *args: Query(),
             delete=lambda *args: Query())
exec(compile((ROOT / "apps/api/app/core/exceptions.py").read_text(), "exceptions", "exec"), scope)
source = ROOT / "apps/api/app/services/panel_media_service.py"
tree = ast.parse(source.read_text())
tree.body = [node for node in tree.body if not isinstance(node, ast.ImportFrom)
             or node.module in ("__future__", "datetime", "pathlib")]
exec(compile(tree, str(source), "exec"), scope)
Service = scope["PanelMediaService"]


async def check():
    for data, expected in [(b"\x89PNG\r\n\x1a\n", ("image/png", "png")),
                           (b"\xff\xd8\xff", ("image/jpeg", "jpg")),
                           (b"GIF89a", ("image/gif", "gif")),
                           (b"RIFF1234WEBP", ("image/webp", "webp")),
                           (b"invalid", None)]:
        assert Service.image_format(data) == expected
    shot = SimpleNamespace(id="synthetic", production_id="synthetic-project", display_number="001", revision=4)
    assert await Service.get_upload_shot(Session(shot), shot_id=shot.id, revision=4) is shot
    for db, error, code in [(Session(), scope["NotFoundError"], "NOT_FOUND"),
                            (Session(shot), scope["ShotRevisionConflict"], "SHOT_REVISION_CONFLICT")]:
        try:
            await Service.get_upload_shot(db, shot_id=shot.id, revision=3)
        except error as failure:
            assert failure.code == code
            if code == "SHOT_REVISION_CONFLICT":
                assert failure.details == {"server_revision": 4, "client_revision": 3}
        else:
            raise AssertionError("Expected lookup/revision failure")
    for fail_commit in (False, True):
        db = Session(fail_commit=fail_commit)
        with TemporaryDirectory(prefix="frameforge-panel-pure-") as directory:
            root = Path(directory)
            args = dict(shot=shot, data=b"synthetic", filename="../frame.png",
                        mime_type="image/png", extension="png", user_id="synthetic-user", media_root=root)
            try:
                result = await Service.save_panel_image(db, **args)
            except RuntimeError:
                assert fail_commit and db.rolled_back
                assert list(root.iterdir()) == [], "Failed commit must remove written files"
            else:
                assert not fail_commit and db.committed
                assert result["revision"] == 5
                assert (root / f'{result["asset_id"]}.png').read_bytes() == b"synthetic"
                assert db.added[1].filename == "frame.png"
                assert db.added[-1].action == "shot.panel_image"
    print("Panel media format, revision, persistence and file rollback pure checks passed.")


if __name__ == "__main__":
    asyncio.run(check())
