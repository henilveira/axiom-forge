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
OPTIONAL_PREFIXES = ("stack-", "architecture-", "database-", "broker-", "provider-")


def frontmatter(text: str) -> str:
    if not text.startswith("---"):
        return ""
    end = text.find("\n---", 3)
    return text[3:end] if end >= 0 else ""


def main() -> int:
    codex_root = ROOT / ".agents" / "skills"
    claude_root = ROOT / ".claude" / "agents"
    codex_all = {
        p.name
        for p in codex_root.iterdir()
        if p.is_dir() and (p / "SKILL.md").exists()
    } if codex_root.exists() else set()
    # Maintenance/mode skills are not delegated agents and therefore are outside the 1:1 roster.
    codex_all -= {"camada-agentica", "kickoff", "visual-first"}
    codex = {role for role in codex_all if not role.startswith(OPTIONAL_PREFIXES)}
    codex_optional = codex_all - codex
    claude_all = {
        p.stem
        for p in claude_root.glob("*.md")
    } if claude_root.exists() else set()
    claude = {role for role in claude_all if not role.startswith(OPTIONAL_PREFIXES)}
    claude_optional = claude_all - claude
    errors: list[str] = []
    has_codex = bool(codex_all)
    has_claude = bool(claude_all)
    if not has_codex and not has_claude:
        errors.append("Nenhum dialeto de agente encontrado")
    if has_codex and codex != ACTIVE:
        errors.append(f"Codex roster differs; extra={sorted(codex - ACTIVE)}, missing={sorted(ACTIVE - codex)}")
    if has_claude and claude != ACTIVE:
        errors.append(f"Claude roster differs; extra={sorted(claude - ACTIVE)}, missing={sorted(ACTIVE - claude)}")
    if has_codex and has_claude and codex_optional != claude_optional:
        errors.append(f"Optional specialist roster differs; Codex={sorted(codex_optional)}, Claude={sorted(claude_optional)}")

    for role in sorted(ACTIVE):
        skill = codex_root / role / "SKILL.md"
        agent = claude_root / f"{role}.md"
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

    for role in sorted(codex_optional | claude_optional):
        skill = codex_root / role / "SKILL.md"
        agent = claude_root / f"{role}.md"
        if skill.exists() and f"name: {role}" not in frontmatter(skill.read_text()):
            errors.append(f"{skill}: optional frontmatter name mismatch")
        if agent.exists():
            fm = frontmatter(agent.read_text())
            if f"name: {role}" not in fm:
                errors.append(f"{agent}: optional frontmatter name mismatch")
            model = re.search(r"^model:\s*(\S+)", fm, re.MULTILINE)
            if not model or model.group(1).lower() != "sonnet":
                errors.append(f"{agent}: model must be sonnet")
            if re.search(r"\bopus\b", fm, re.IGNORECASE):
                errors.append(f"{agent}: Opus is forbidden")

    if errors:
        print("AGENT PARITY FAILED")
        print("\n".join(f"- {error}" for error in errors))
        return 1
    dialects = "Codex ↔ Claude" if has_codex and has_claude else "Codex-only" if has_codex else "Claude-only"
    print(f"AGENT PARITY OK: {len(ACTIVE)} roles, {dialects}, Sonnet only")
    return 0


if __name__ == "__main__":
    sys.exit(main())
