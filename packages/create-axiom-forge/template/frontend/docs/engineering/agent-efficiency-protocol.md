---
name: agent-efficiency-protocol
description: Protocolo obrigatório de eficiência, validação incremental e tratamento de bloqueadores do squad Frontend.
alwaysApply: false
---

# Eficiência e bloqueadores — Frontend

Faça um pré-voo único: integração Backend APPROVED, referência visual opcional, branch/worktree, paths, diff,
scripts, dependências, variáveis, secrets sem expô-los e ambiente. Se faltar contrato aprovado,
Backend, referência visual, API key, domínio, acesso cross-repo ou serviço externo, pare antes de codar e
consulte o usuário com evidência, impacto, duas a quatro opções, procedimento, custo/risco e
reversão; pergunte se deve resolver agora ou deixar em standby. Não invente endpoints, use mock como
contrato real, suba serviço sem autorização ou faça polling. Em standby, marque `blocked`.

Rode a menor prova primeiro: teste/schema/componente alterado, depois a suite afetada; full testes,
lint, typecheck, build, acessibilidade e review completo somente uma vez no gate final. Reutilize
resultado apenas quando commit/diff, ambiente, versões e dependências não mudaram e registre
`REUSED_EVIDENCE`. O agente corrige defeito simples, local e dentro de seus paths; delegue somente
cross-layer, segurança, arquitetura, ownership, infraestrutura ou contrato. Agrupe findings do mesmo
owner e entregue handoff compacto com status, refs, PR/SHAs, aprovação/checks/merge, prova,
evidência, bloqueios e próximo owner.

Continuam proibidos suppressions de lint, casts evasivos, secrets/PII em logs/bundle/URL, contrato
inventado, fetch na UI e gate vermelho.
