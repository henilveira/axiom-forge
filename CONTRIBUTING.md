---
name: contributing
description: Guia para contribuir com o Axiom Forge.
alwaysApply: false
---

# Contribuindo com o Axiom Forge

Obrigado por querer melhorar a forja. Contribuições de código, documentação, agentes, catálogo, pesquisa e exemplos são bem-vindas.

## Princípios

- Produto começa sem regra de negócio.
- Decisões de produto e engenharia ficam separadas.
- Identificadores de código usam inglês; documentação e produto usam português quando fizer sentido.
- Toda mudança deve ter ownership, evidência e um gate verificável.
- Segurança, compatibilidade e experiência do desenvolvedor importam tanto quanto o código.

## Fluxo de contribuição

1. Abra uma issue ou descreva claramente o problema no pull request.
2. Crie uma branch curta a partir de `main`:

   ```bash
   git switch main
   git pull --ff-only origin main
   git switch -c feature/<id>-<slug>
   ```

3. Faça a menor mudança coerente com o contrato.
4. Atualize testes e documentação quando a mudança alterar comportamento, catálogo ou API.
5. Rode os gates da área afetada.
6. Abra o pull request descrevendo risco, rollback e evidências.

Não faça push direto para `main`. A integração acontece por pull request com revisão humana.

## O que acontece depois de abrir a PR

O GitHub inicia os workflows automaticamente. Um workflow é uma sequência de comandos configurada em `.github/workflows/`. Cada resultado aparece como um check na PR.

- `apps` roda build, lint, typecheck e testes de frontend, backend e gerador;
- `esteira` verifica frontmatter, links, Mermaid e fidelidade entre spec e implementação;
- `pr-audit` verifica o nome da branch, o destino da PR e a aprovação humana do commit atual;
- `package` roda quando o pacote npm ou o workflow do pacote muda.

Check verde significa que a validação passou. Check vermelho significa que a PR precisa de correção. Depois de um novo push, a aprovação anterior pode deixar de valer, porque o projeto exige aprovação do commit atual.

A branch `main` possui o ruleset `Protect main`. Por isso, a PR só pode ser integrada quando os checks obrigatórios estão verdes, uma pessoa aprovou a mudança, as conversas foram resolvidas e a branch está atualizada conforme a política do GitHub.

Se um check não aparecer, confira se o workflow foi disparado e se o nome do job é igual ao nome exigido pelo ruleset. Se um check falhar, abra o detalhe no GitHub, corrija a causa na branch e faça um novo push.

O maintainer principal possui bypass administrativo para PRs próprias quando não existe outro revisor disponível. Esse recurso é uma exceção de manutenção, não uma substituição para revisão em mudanças de código importantes. Contribuições externas continuam sujeitas à revisão de `CODEOWNERS` e aos checks obrigatórios.
## Mudanças no gerador e catálogo

Uma nova stack deve declarar id estável, linguagem, framework, designs compatíveis, comandos, fontes e specialist. Uma nova arquitetura deve declarar suas dependências operacionais. Uma nova imagem de infraestrutura deve explicar portas, URL local, segurança e limitações.

Se uma opção não for compatível com toda a matriz, filtre-a no catálogo em vez de permitir um scaffold incoerente.

## Checks locais

```bash
cd packages/create-axiom-forge
npm test
npm run pack:check
```

Quando aplicável, rode também:

```bash
python3 .agents/scripts/validate-agent-parity.py
node scripts/audit-esteira.mjs
node scripts/validate-mermaid.mjs
```

Backend e frontend têm seus próprios `lint`, `typecheck`, `build` e `test`; consulte o [README principal](README.md) para os comandos completos.

## Pull requests bons de revisar

Inclua:

- contexto e problema;
- caminhos alterados;
- comportamento antes/depois;
- como reproduzir ou testar;
- impactos no template gerado;
- impacto no pacote npm, se houver;
- riscos, limitações e rollback;
- screenshots ou gravação quando a CLI/UI mudar.

Nunca inclua secrets, tokens, cookies, dumps ou dados reais.
