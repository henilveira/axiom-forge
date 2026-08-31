---
name: glossary
description: Vocabulário técnico transversal do boilerplate e do projeto derivado.
alwaysApply: false
---

# Glossário

O boilerplate não define vocabulário de negócio. Termos de produto devem ser
registrados em `product/docs/glossary.md` pelo projeto derivado.

| Termo | Identificador | Definição |
|---|---|---|
| Camada | `Layer` | fronteira arquitetural com responsabilidade explícita |
| Porta | `Port` | contrato que permite ao domínio/application depender de abstração |
| Adaptador | `Adapter` | implementação de uma porta para tecnologia ou integração |
| Spec | `Spec` | contrato versionado de comportamento aprovado |
| Gate | `Gate` | comando e critério que provam uma condição de entrega |
| Delegação | `Delegation` | unidade de trabalho com owner, write-set, dependências e evidência |
| Contrato | `Contract` | acordo verificável entre componentes ou squads |

Adicione termos do domínio somente com fonte, owner, status e contexto.
