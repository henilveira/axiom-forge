# Lições de engenharia

## LESSON-001 — Supressão inline de ESLint é inadmissível

**Data:** 2026-08-27
**Aprendizado:** comentários `eslint-disable` transformam um gate verde em uma
falsa evidência e escondem problemas de acessibilidade, imports, complexidade
ou contrato. O Frontend usa `noInlineConfig` e bloqueia qualquer ocorrência.

## LESSON-002 — Constantes precisam de localização previsível

**Data:** 2026-08-27
**Aprendizado:** tokens, variantes, limites e nomes espalhados dificultam
consistência visual e revisão. Constantes semânticas vivem em `*.constants.ts`;
bindings locais intermediários não são configuração.

## LESSON-003 — Diretórios por responsabilidade reduzem colisões

**Data:** 2026-08-27
**Aprendizado:** agrupar contracts, services, queries, mutations, forms,
orchestration e UI em subpastas explícitas facilita ownership e permite tasks
paralelas sem dividir arquivos.

## LESSON-004 — Paralelismo exige worktree real

**Data:** 2026-08-27
**Aprendizado:** tasks independentes só são paralelas quando cada subagente usa
branch/worktree própria e não há arquivo compartilhado. A integração retorna ao
Git Flow de forma sequencial e rastreável.

## LESSON-005 — A worktree precisa pertencer ao repositório do squad

**Data:** 2026-08-27
**Regra permanente:** valide `git rev-parse --show-toplevel` antes de delegar.
Se o Frontend não estiver configurado como projeto/worktree real, bloqueie a
delegação; nunca use o checkout local do meta-repositório para editar um
repositório aninhado.

## LESSON-006 — Contract é superfície, não depósito

**Data:** 2026-08-28
**Aprendizado:** `contract` descreve a superfície pública da feature; schemas,
types e constants precisam de pastas separadas para que parsing, forma dos
dados e semântica permaneçam auditáveis.

## LESSON-007 — Zod no cliente não é segurança

**Data:** 2026-08-28
**Regra permanente:** validação client-side melhora UX e feedback. Identidade,
autorização, integridade e regras de negócio só são provadas no Backend; Zod
apenas faz parsing de `unknown` no cliente.
