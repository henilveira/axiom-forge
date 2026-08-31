---
name: quality-gates
description: Gates executáveis de implementação, revisão, segurança e release para impedir que convenções arquiteturais fiquem apenas na documentação.
alwaysApply: false
---

# Gates de qualidade

Uma regra sem verificação automática tende a desaparecer. O agente responsável deve escolher o
menor gate que prove a regra e registrar o comando no handoff. Nunca marque task como concluída
com gate vermelho, warning novo não explicado ou teste que não foi executado.
O encadeamento dos gates e o formato do handoff estão em
[`engineering-modus-operandi.md`](engineering-modus-operandi.md); este documento lista a evidência
executável mínima.

## Por camada

| Momento | Evidência mínima |
|---|---|
| contrato | schema/assinatura compilando e exemplo válido |
| domínio | unit tests de invariantes, erro e transição |
| application | use-case tests com portas fake e autorização |
| persistência | integration test com DB controlado, índice e concorrência |
| HTTP | OpenAPI/decorators, status de erro e contract test |
| frontend dados | schema parse, service/query/mutation tests |
| frontend UI | loading/error/empty, acessibilidade e paridade visual |
| fluxo | E2E do AC navegável |
| revisão | dependência, complexidade, naming, segurança, docs |
| release | build + lint + typecheck + testes aplicáveis + estado limpo |

## Regras de teste

- Teste deve falhar se a implementação coberta quebrar; não valide apenas o mock.
- Separe testes por tipo; não esconda integração em unit test.
- Use builders/fixtures determinísticos e clock injetável.
- Não use snapshot como única prova de comportamento.
- Toda mutation cobre sucesso, erro e invalidação/rollback aplicável.
- Todo endpoint tenant-scoped cobre isolamento entre tenants.
- Casos de segurança (auth, autorização, CSRF, segredo e log sensível) têm cenário explícito.

## Checklist do reviewer

1. A mudança melhora a saúde do código e está pequena o suficiente para revisar?
2. Cada linha alterada pertence à task e ao bounded context correto?
3. Invariante está no domínio; autorização na application; transporte na interface?
4. Assinatura/porta está separada do adapter? Há dependência invertida ou import circular?
5. Há cast de `unknown`, `any`, `First()` sem erro tipado ou relógio global?
6. Há regra duplicada, método grande, componente com fetch ou mock no código produtivo?
7. Request/response/error, nullabilidade, cache e observabilidade estão documentados?
8. O frontend preserva tokens, estados e primitives sem acoplar sua lógica?
9. Algum log expõe Authorization, cookie, senha, convite, PII ou payload sensível?
10. Os gates foram realmente executados e os resultados são reproduzíveis?

## Escalonamento

- Ambiguidade de produto → `spec-engineer`.
- Regra ou fronteira de domínio → `domain-modeler`.
- Contrato, sequência ou divergência → `tech-lead`.
- Vulnerabilidade → `security-reviewer`, consolidada por `quality-engineer`.
- Falha estrutural recorrente → abrir ADR ou task de arquitetura, não contornar localmente.
