#!/usr/bin/env python3
"""Validate the canonical Codex skill ↔ Claude agent roster."""

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
ACTIVE = {
    "phase-orchestrator",
    "spec-engineer",
    "domain-modeler",
    "tech-lead",
    "backend-data-engineer",
    "backend-engineer",
    "frontend-engineer",
    "frontend-ui-engineer",
    "test-engineer",
    "quality-engineer",
    "security-reviewer",
    "release-engineer",
    "git-flow-specialist",
}


def frontmatter(text: str) -> str:
    if not text.startswith("---"):
        return ""
    end = text.find("\n---", 3)
    return text[3:end] if end >= 0 else ""


def main() -> int:
    codex = {
        p.name
        for p in (ROOT / ".agents" / "skills").iterdir()
        if p.is_dir() and (p / "SKILL.md").exists()
    }
    # Maintenance/mode skills are not delegated agents and therefore are outside the 1:1 roster.
    codex -= {"camada-agentica", "visual-first"}
    claude = {
        p.stem
        for p in (ROOT / ".claude" / "agents").glob("*.md")
    }
    errors: list[str] = []
    if codex != ACTIVE:
        errors.append(f"Codex roster differs; extra={sorted(codex - ACTIVE)}, missing={sorted(ACTIVE - codex)}")
    if claude != ACTIVE:
        errors.append(f"Claude roster differs; extra={sorted(claude - ACTIVE)}, missing={sorted(ACTIVE - claude)}")

    for role in sorted(ACTIVE):
        skill = ROOT / ".agents" / "skills" / role / "SKILL.md"
        agent = ROOT / ".claude" / "agents" / f"{role}.md"
        if skill.exists() and f"name: {role}" not in frontmatter(skill.read_text()):
            errors.append(f"{skill}: frontmatter name mismatch")
        if agent.exists():
            fm = frontmatter(agent.read_text())
            if f"name: {role}" not in fm:
                errors.append(f"{agent}: frontmatter name mismatch")
            model = re.search(r"^model:\s*(\S+)", fm, re.MULTILINE)
            if not model or model.group(1).lower() != "sonnet":
                errors.append(f"{agent}: model must be sonnet")
            if re.search(r"\bopus\b", fm, re.IGNORECASE):
                errors.append(f"{agent}: Opus is forbidden")

    if errors:
        print("AGENT PARITY FAILED")
        print("\n".join(f"- {error}" for error in errors))
        return 1
    print(f"AGENT PARITY OK: {len(ACTIVE)} roles, Codex ↔ Claude, Sonnet only")
    return 0


if __name__ == "__main__":
    sys.exit(main())
