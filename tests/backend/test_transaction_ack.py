"""A mutation response must acknowledge commit, never just flush."""
import sys
from pathlib import Path

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'apps' / 'api'))
from app.core import database


@pytest.mark.asyncio
async def test_commit_precedes_response_and_failure_is_not_success(monkeypatch):
    events = []
    class Session:
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def commit(self):
            events.append('commit')
            if fail[0]: raise RuntimeError('synthetic commit failure')
        async def rollback(self): events.append('rollback')
        async def close(self): events.append('close')
    fail = [False]
    monkeypatch.setattr(database, 'AsyncSessionLocal', Session)
    app = FastAPI()
    @app.post('/write')
    async def write(db=database.db_session):
        events.append('write')
        return {'saved': True}
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url='http://test') as client:
        response = await client.post('/write')
        assert response.status_code == 200
        assert events == ['write', 'commit', 'close']
        fail[0] = True
        events.clear()
        response = await client.post('/write')
        assert response.status_code == 500
        assert events == ['write', 'commit', 'rollback', 'close']
