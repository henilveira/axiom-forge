# Frontend scaffold

Leia `AGENTS.md` e `docs/engineering/` antes de trabalhar. Este é o repositório
do squad Frontend; agentes de Backend e Product têm seus próprios diretórios
irmãos. Use `model: sonnet`. O contrato de verdade vem de uma integração Backend
aprovada em `../backend`. Uma referência visual fornecida pelo projeto derivado
é opcional e read-only.

Exceção explícita: pedidos `VISUAL-FIRST` (“visual first”, “100% visual” ou “sem
backend agora”) usam contrato `PROPOSED`, sem integração real, mantendo props e
view-models preparados para adaptação quando o Backend publicar o contrato.

Aplique também `docs/engineering/agent-efficiency-protocol.md`: pré-voo único,
validação incremental, full gate único e consulta ao usuário diante de qualquer
bloqueador externo antes de codar. O `frontend-release-engineer` entrega
`release-ready` para um PR; o `git-flow-specialist` do orquestrador é o owner
da aprovação, integração e limpeza no GitHub.
