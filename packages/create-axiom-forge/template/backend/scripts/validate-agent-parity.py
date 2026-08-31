#!/usr/bin/env python3
"""Valida que o roster Claude/skill do Backend é local e paritário."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
ROLES = {
    "phase-orchestrator",
    "tech-lead",
    "domain-modeler",
    "backend-data-engineer",
    "backend-engineer",
    "test-engineer",
    "quality-engineer",
    "security-reviewer",
    "release-engineer",
}

skill_dir = ROOT / ".agents" / "skills"
agent_dir = ROOT / ".claude" / "agents"
skills = {p.name for p in skill_dir.iterdir() if p.is_dir()} if skill_dir.exists() else set()
agents = {p.stem for p in agent_dir.glob("*.md")} if agent_dir.exists() else set()

errors = []
if skills != ROLES:
    errors.append(f"skills divergentes: esperado={sorted(ROLES)} atual={sorted(skills)}")
if agents != ROLES:
    errors.append(f"agents divergentes: esperado={sorted(ROLES)} atual={sorted(agents)}")
for path in sorted(agent_dir.glob("*.md")):
    text = path.read_text(encoding="utf-8")
    if not re.search(r"^model:\s*sonnet\s*$", text, re.MULTILINE):
        errors.append(f"{path}: model deve ser sonnet")
    if re.search(r"\bopus\b", text, re.IGNORECASE):
        errors.append(f"{path}: Opus proibido")

if errors:
    print("\n".join(errors))
    sys.exit(1)
print(f"Backend agent parity OK ({len(ROLES)} roles)")
