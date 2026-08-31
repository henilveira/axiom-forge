---
name: agent-efficiency-protocol
description: Protocolo obrigatório de eficiência, validação incremental e tratamento de bloqueadores do squad Backend.
alwaysApply: false
---

# Eficiência e bloqueadores — Backend

Faça um pré-voo único: spec aprovada, branch/worktree, paths, diff, scripts, dependências,
variáveis, secrets sem expô-los e serviços externos. Se faltar Postgres, RabbitMQ, SMTP, API key,
OAuth, domínio, acesso cross-repo ou autorização para migration, pare antes de codar e consulte o
usuário: explique evidência, impacto, duas a quatro opções, procedimento, custo/risco, reversão e
pergunte se deve resolver agora ou deixar em standby. Nunca invente valor, faça polling, suba serviço
sem autorização ou use mock como integração real. Em standby, marque `blocked` e só retome com mudança
de estado.

Rode a menor prova primeiro: teste alterado, depois suite afetada; full unit/integration/E2E, lint,
build e review completos somente uma vez no gate final. Reutilize resultado apenas se commit/diff,
ambiente, versões e dependências não mudaram, registrando `REUSED_EVIDENCE`. Após correção, não repita
automaticamente os 400 testes: invalide somente as evidências afetadas. O agente que encontra defeito
simples, local e dentro dos paths permitidos corrige-o; delegue apenas cross-layer, segurança,
arquitetura, ownership, infraestrutura ou mudança de contrato. Agrupe findings do mesmo owner.

Handoff: status, branch/worktree/commit, PR/SHAs, aprovação/checks/merge, paths, prova mínima,
evidência reutilizada, bloqueios, risco residual e próximo owner. Continuam proibidos suppressions de lint, casts evasivos, secrets/PII em
logs, migration destrutiva e gate vermelho.
