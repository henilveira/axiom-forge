---
name: integrations
description: Ferramentas do time e MCPs. Puxe ao integrar Jira/Confluence/cloud.
alwaysApply: false
---

# Integrações e MCPs — <nome do projeto>

> Ferramentas que o time já usa e os **MCP servers** propostos para conectá-las ao Claude Code,
> ajudando a **rodar, documentar e integrar** sem sair do fluxo. Atualizado quando a integração mudar.

## Ferramentas do time
| Categoria          | Ferramenta            | Processo / observação            |
|--------------------|-----------------------|----------------------------------|
| Gestão de projeto  | <Jira/Trello/Linear>  | <Scrum / Kanban / Waterfall>     |
| Documentação       | <Confluence/Notion/Evernote> | <onde mora a doc viva>    |
| Código & CI        | <GitHub/GitLab/Bitbucket> | <fluxo de PR/MR>             |
| Cloud              | <AWS/GCP/Azure>       | <regiões, contas>                |
| Observabilidade    | <Datadog/Sentry/Grafana> | <onde os alertas chegam>      |
| Comunicação        | <Slack/Teams>         | <canal de alertas/incidentes>    |

## MCPs propostos
> Verifique o nome/disponibilidade atual de cada servidor na doc oficial antes de configurar.
> **Conta/workspace** é o destino validado da conexão — confirme que é o do projeto (não o pessoal).

| Ferramenta        | MCP server (proposto)        | Conta/workspace (validada) | O que habilita                       | Status   |
|-------------------|------------------------------|----------------------------|--------------------------------------|----------|
| Jira / Confluence | Atlassian (oficial)          | <workspace do projeto>     | ler/criar issues e páginas; sync     | proposto |
| Notion            | Notion (oficial)             | <business, não pessoal>    | publicar vision/roadmap; buscar docs | proposto |
| GitHub            | GitHub (oficial)             | <org/repo>                 | PRs, issues, code review, releases   | proposto |
| GitLab            | GitLab (oficial/community)   | <grupo/projeto>            | MRs, issues, pipelines               | proposto |
| AWS               | AWS Labs MCP                 | <conta/perfil>             | consultar recursos, custos, docs     | proposto |
| GCP               | Google Cloud MCP / Toolbox   | <projeto>                  | recursos, dados                      | proposto |
| Azure             | Azure MCP (oficial)          | <subscription>             | recursos, deploy                     | proposto |
| Sentry / Datadog  | Sentry / Datadog MCP         | <org>                      | erros, métricas, alertas no contexto | proposto |
| Slack             | Slack MCP                    | <workspace/canal>          | notificar status/alertas ao time     | proposto |
| Libs / APIs       | Context7 MCP                 | (público)                  | lookup de libs na verificação de conhecimento (`CLAUDE.md`) | proposto |

## Como conectar (resumo)
- **Project-scoped:** `.mcp.json` na raiz do repo — compartilhável com o time. **Sem segredos.**
- **Segredos:** via variável de ambiente ou `claude mcp add`. **Nunca** commitar tokens.
- Servidores remotos/hosted (`type: http`) costumam usar OAuth; locais usam `command`+`args`.

## Fluxos que isso destrava
- Spec aprovada em `product/specs/EPIC-*/` → abre/atualiza issue no Jira/Linear.
- `vision.md` / `roadmap.md` → publica/atualiza no Notion/Confluence.
- ADR novo → comenta no PR do GitHub/GitLab.
- Alerta de observabilidade → resumo no Slack com link para a feature/spec.
