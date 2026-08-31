---
name: pull-request-template
description: Estrutura mínima para explicar uma mudança e seus gates.
alwaysApply: false
---

## O que mudou

Descreva a mudança em uma ou duas frases.

## Por que mudou

Explique o problema que esta mudança resolve.

## Tipo de mudança

- [ ] Documentação
- [ ] Catálogo ou agentes
- [ ] CLI ou pacote npm
- [ ] Frontend
- [ ] Backend
- [ ] Infraestrutura
- [ ] Segurança

## Como validei

Liste os comandos executados e o resultado.

```text
comando → resultado
```

## Impacto no projeto gerado

Explique se esta mudança altera arquivos, comandos, dependências ou comportamento de projetos criados pelo `create-axiom-forge`.

## Risco e rollback

Descreva o risco conhecido e como desfazer a mudança, se necessário.

## Checklist

- [ ] Não adicionei regra de negócio ao template.
- [ ] Atualizei a documentação afetada.
- [ ] Não incluí secrets, tokens ou dados reais.
- [ ] Rodei os checks aplicáveis.
