"""Read-only execution-plan validation; does not run or certify product tests.

Checks declared dependencies, write boundaries, gates and evidence structure.
Human review of actual results remains mandatory, including for accepted tasks.
"""
from __future__ import annotations

import argparse
from datetime import datetime
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PLAN = ROOT / "storyboard-system/docs/extensibility_execution_plan_2026-10-04.json"
STATES = {"not_started", "in_progress", "blocked", "accepted"}
KINDS = {"unit", "api", "postgres", "browser", "artifact", "contract"}


def safe_path(value):
    if not isinstance(value, str) or not value or "\\" in value:
        raise ValueError("repository paths must be nonempty forward-slash paths")
    path = PurePosixPath(value)
    if path.is_absolute() or ".." in path.parts or re.match(r"^[A-Za-z]:", value):
        raise ValueError("repository paths must stay within the checkout")
    resolved = (ROOT / value).resolve()
    if not resolved.is_relative_to(ROOT):
        raise ValueError("repository path resolves outside the checkout")
    return resolved


def validate(plan):
    errors = []
    if not isinstance(plan, dict) or plan.get("schema_version") != 1:
        return ["unsupported manifest schema_version"]
    docs = []
    for name in ("requirements", "execution_standard", "implementation_plan", "knowledge_standard"):
        try:
            path = safe_path(plan.get(name))
            if not path.is_file():
                raise ValueError("required standard is absent")
            docs.append(path.read_text(encoding="utf-8"))
        except (ValueError, OSError) as error:
            errors.append(f"{name}: {error}")
    gate_ids = set(re.findall(r"\b(?:FX|KL)-\d{2}\b", "\n".join(docs)))
    for key in ("shared_integration_paths", "protected_ui_paths"):
        for value in plan.get(key, []):
            try:
                safe_path(value)
            except ValueError as error:
                errors.append(f"{key}: {error}")
    packets = plan.get("work_packages")
    if not isinstance(packets, list) or not packets:
        return errors + ["work_packages must be a nonempty list"]
    by_id = {}
    for packet in packets:
        if not isinstance(packet, dict) or not isinstance(packet.get("id"), str) or not re.fullmatch(r"[A-Z0-9]+(?:-[A-Z0-9]+)+", packet["id"]):
            errors.append("invalid work package ID")
            continue
        identity = packet["id"]
        if identity in by_id:
            errors.append(f"{identity}: duplicate ID")
        by_id[identity] = packet
        if packet.get("state") not in STATES or not packet.get("owner") or not packet.get("title"):
            errors.append(f"{identity}: state/owner/title missing or invalid")
        for key in ("allowed_paths", "excluded_paths"):
            values = packet.get(key)
            if not isinstance(values, list) or not values:
                errors.append(f"{identity}: {key} must be declared")
                continue
            for value in values:
                try:
                    safe_path(value)
                except ValueError as error:
                    errors.append(f"{identity}: {error}")
        gates = packet.get("required_gates", [])
        kinds = packet.get("required_evidence_kinds", [])
        if not isinstance(gates, list) or not gates or any(gate not in gate_ids for gate in gates):
            errors.append(f"{identity}: undefined or missing acceptance gates")
            gates = []
        if not isinstance(kinds, list) or not kinds or any(kind not in KINDS for kind in kinds):
            errors.append(f"{identity}: undefined or missing evidence kinds")
            kinds = []
        if packet.get("state") == "blocked" and not packet.get("blockers"):
            errors.append(f"{identity}: blocked without a concrete blocker")
        passed_gates, passed_kinds = set(), set()
        records = packet.get("verification", [])
        if not isinstance(records, list):
            errors.append(f"{identity}: verification must be a list")
            records = []
        for record in records:
            if not isinstance(record, dict) or record.get("result") not in {"pass", "fail", "blocked"} or record.get("gate_id") not in gates or record.get("kind") not in KINDS:
                errors.append(f"{identity}: invalid verification result/gate/kind")
                continue
            if record["result"] != "pass":
                continue
            if not record.get("command") or not record.get("assertions") or record.get("exit_code") != 0:
                errors.append(f"{identity}: pass record lacks command/assertions/exit code")
            try:
                when = datetime.fromisoformat(record.get("executed_at", "").replace("Z", "+00:00"))
                if when.tzinfo is None:
                    raise ValueError("timezone absent")
            except (ValueError, TypeError, AttributeError):
                errors.append(f"{identity}: pass requires a timezone-aware execution time")
            commit = record.get("commit", "")
            valid_commit = isinstance(commit, str) and re.fullmatch(r"[a-f0-9]{40}", commit)
            if not valid_commit or subprocess.run(["git", "cat-file", "-e", f"{commit}^{{commit}}"], cwd=ROOT,
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False).returncode != 0:
                errors.append(f"{identity}: evidence commit is not a local Git commit")
            evidence = record.get("evidence", [])
            if not isinstance(evidence, list) or not evidence:
                errors.append(f"{identity}: pass record lacks evidence files")
                evidence = []
            for value in evidence:
                try:
                    if not safe_path(value).is_file():
                        raise ValueError("evidence file absent")
                except ValueError as error:
                    errors.append(f"{identity}: {error}")
            passed_gates.add(record["gate_id"])
            passed_kinds.add(record["kind"])
        if packet.get("state") == "accepted" and (set(gates) - passed_gates or set(kinds) - passed_kinds or packet.get("blockers")):
            errors.append(f"{identity}: accepted without all gate/kind evidence or with blockers")
    visiting, visited = set(), set()

    def visit(identity):
        if identity in visiting:
            errors.append(f"{identity}: dependency cycle")
            return
        if identity in visited:
            return
        visiting.add(identity)
        dependencies = by_id[identity].get("dependencies", [])
        if not isinstance(dependencies, list):
            errors.append(f"{identity}: invalid dependency list")
            dependencies = []
        for dependency in dependencies:
            if not isinstance(dependency, str) or dependency not in by_id:
                errors.append(f"{identity}: undefined dependency")
                continue
            if by_id[identity].get("state") == "accepted" and by_id[dependency].get("state") != "accepted":
                errors.append(f"{identity}: dependency not accepted")
            visit(dependency)
        visiting.remove(identity)
        visited.add(identity)
    for identity in by_id:
        visit(identity)
    pending = plan.get("pending_product_decisions", [])
    if not isinstance(pending, list):
        errors.append("pending_product_decisions must be a list")
        pending = []
    for decision in pending:
        if not isinstance(decision, dict) or not isinstance(decision.get("id"), str) or not decision.get("question") or not decision.get("blocked_behavior"):
            errors.append("invalid pending product decision")
            continue
        affected = decision.get("affected_packages")
        if not isinstance(affected, list) or not affected:
            errors.append(f"{decision['id']}: affected packages must be declared")
            continue
        for identity in affected:
            if not isinstance(identity, str) or identity not in by_id:
                errors.append(f"{decision['id']}: undefined affected package")
            elif by_id[identity].get("state") == "accepted":
                errors.append(f"{identity}: unresolved product decision {decision['id']}")
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_PLAN)
    args = parser.parse_args()
    try:
        manifest = args.manifest.resolve()
        if not manifest.is_relative_to(ROOT):
            raise ValueError("manifest must be inside the checkout")
        plan = json.loads(manifest.read_text(encoding="utf-8"))
        errors = validate(plan)
    except (ValueError, OSError) as error:
        print(f"Invalid execution manifest: {error}", file=sys.stderr)
        return 1
    if errors:
        for error in errors:
            print(error, file=sys.stderr)
        return 1
    print(f"Execution contract valid: {len(plan['work_packages'])} work packages; dependency/evidence structure checked. Product tests were not run.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
