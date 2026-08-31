#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
ACTIVE = {
    "product-orchestrator", "product-manager", "product-owner", "ux-researcher",
    "product-designer", "business-analyst", "spec-engineer", "jira-planner",
}

def fm(text: str) -> str:
    if not text.startswith("---"):
        return ""
    end = text.find("\n---", 3)
    return text[3:end] if end >= 0 else ""

def main() -> int:
    skills = {p.name for p in (ROOT / ".agents" / "skills").iterdir() if p.is_dir() and (p / "SKILL.md").exists()}
    skills.discard("spec-reader")
    agents = {p.stem for p in (ROOT / ".claude" / "agents").glob("*.md")}
    errors = []
    if skills != ACTIVE: errors.append(f"skills extra={sorted(skills-ACTIVE)} missing={sorted(ACTIVE-skills)}")
    if agents != ACTIVE: errors.append(f"agents extra={sorted(agents-ACTIVE)} missing={sorted(ACTIVE-agents)}")
    for role in ACTIVE:
        for path in [ROOT/".agents"/"skills"/role/"SKILL.md", ROOT/".claude"/"agents"/f"{role}.md"]:
            if not path.exists():
                errors.append(f"missing {path}")
                continue
            if f"name: {role}" not in fm(path.read_text()): errors.append(f"frontmatter {path}")
        agent = ROOT/".claude"/"agents"/f"{role}.md"
        if agent.exists():
            front = fm(agent.read_text())
            model = re.search(r"^model:\s*(\S+)", front, re.M)
            if not model or model.group(1).lower() != "sonnet": errors.append(f"model {agent}")
            if re.search(r"\bopus\b", front, re.I): errors.append(f"opus {agent}")
    if errors:
        print("PRODUCT AGENT PARITY FAILED\n- " + "\n- ".join(errors)); return 1
    print(f"PRODUCT AGENT PARITY OK: {len(ACTIVE)} roles; spec-reader published")
    return 0

if __name__ == "__main__":
    sys.exit(main())
