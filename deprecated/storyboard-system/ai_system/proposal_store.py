"""Proposal storage and audit logging for AI generated suggestions."""

from __future__ import annotations

import json
import sqlite3
import uuid
from typing import Any, Dict, List, Optional
from ai_system.contracts import AIProposal, ProposalStatus


class ProposalStore:
    def __init__(self, db: sqlite3.Connection):
        self._db = db
        self._ensure_table()

    def _ensure_table(self):
        self._db.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_proposals (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                capability TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                model TEXT NOT NULL,
                prompt_summary TEXT NOT NULL DEFAULT '',
                changes_json TEXT NOT NULL DEFAULT '[]',
                created_by_user_id TEXT,
                reviewed_by_user_id TEXT,
                reviewed_at TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        self._db.execute(
            "CREATE INDEX IF NOT EXISTS idx_ai_proposals_proj_status ON ai_proposals(project_id, status)"
        )

    def create(self, proposal: AIProposal) -> AIProposal:
        self._db.execute(
            """
            INSERT INTO ai_proposals (
                id, project_id, capability, status, model, prompt_summary,
                changes_json, created_by_user_id, reviewed_by_user_id, reviewed_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                proposal.id,
                proposal.project_id,
                proposal.capability,
                proposal.status.value,
                proposal.model,
                proposal.prompt_summary,
                json.dumps(proposal.changes),
                proposal.created_by_user_id,
                proposal.reviewed_by_user_id,
                proposal.reviewed_at,
                proposal.created_at,
            ),
        )
        return proposal

    def get_by_id(self, proposal_id: str) -> Optional[AIProposal]:
        cur = self._db.execute(
            """
            SELECT id, project_id, capability, status, model, prompt_summary,
                   changes_json, created_by_user_id, reviewed_by_user_id, reviewed_at, created_at
            FROM ai_proposals WHERE id = ?
            """,
            (proposal_id,),
        )
        row = cur.fetchone()
        if not row:
            return None
        return AIProposal(
            id=row[0],
            project_id=row[1],
            capability=row[2],
            status=ProposalStatus(row[3]),
            model=row[4],
            prompt_summary=row[5],
            changes=json.loads(row[6]) if row[6] else [],
            created_by_user_id=row[7],
            reviewed_by_user_id=row[8],
            reviewed_at=row[9],
            created_at=row[10],
        )

    def list_by_project(self, project_id: str, status: Optional[ProposalStatus] = None) -> List[AIProposal]:
        if status:
            cur = self._db.execute(
                """
                SELECT id, project_id, capability, status, model, prompt_summary,
                       changes_json, created_by_user_id, reviewed_by_user_id, reviewed_at, created_at
                FROM ai_proposals WHERE project_id = ? AND status = ? ORDER BY created_at DESC
                """,
                (project_id, status.value),
            )
        else:
            cur = self._db.execute(
                """
                SELECT id, project_id, capability, status, model, prompt_summary,
                       changes_json, created_by_user_id, reviewed_by_user_id, reviewed_at, created_at
                FROM ai_proposals WHERE project_id = ? ORDER BY created_at DESC
                """,
                (project_id,),
            )
        res = []
        for row in cur.fetchall():
            res.append(
                AIProposal(
                    id=row[0],
                    project_id=row[1],
                    capability=row[2],
                    status=ProposalStatus(row[3]),
                    model=row[4],
                    prompt_summary=row[5],
                    changes=json.loads(row[6]) if row[6] else [],
                    created_by_user_id=row[7],
                    reviewed_by_user_id=row[8],
                    reviewed_at=row[9],
                    created_at=row[10],
                )
            )
        return res

    def update_status(
        self,
        proposal_id: str,
        new_status: ProposalStatus,
        reviewed_by_user_id: Optional[str] = None,
        reviewed_at: Optional[str] = None,
    ) -> bool:
        cur = self._db.execute(
            """
            UPDATE ai_proposals
            SET status = ?, reviewed_by_user_id = ?, reviewed_at = ?
            WHERE id = ?
            """,
            (new_status.value, reviewed_by_user_id, reviewed_at, proposal_id),
        )
        return cur.rowcount > 0
