# Método de implementação do Frontend

## Ordem de construção

1. `schemas/types/constants`: parsing Zod, tipos e semântica do contrato.
2. `services`: cliente HTTP/evento, auth, tenant e mapeamento de erro.
3. `queries/mutations`: cache, invalidação, retry e estados assíncronos.
4. `forms/orchestration`: validação, acessibilidade e composição da jornada.
5. `components/ui|client|forms|patterns|states`: componentes reutilizáveis,
   tokens e estados visuais.
6. testes unitários, contrato, integração, E2E e revisão visual contra o
   inventário fornecido pelo projeto derivado, quando houver.

## Regras de qualidade

- valide qualquer `unknown` na borda com Zod;
- não faça fetch em componente visual;
- represente loading, empty, error, success, disabled e permissão;
- preserve teclado, foco, semântica, contraste e mensagens de erro;
- não exponha token, cookie, PII ou payload sensível em logs/client telemetry;
- não trate o contrato como compatível sem teste;
- não avance com lint, typecheck, build, testes ou acessibilidade vermelhos.

Validação no cliente é somente UX e feedback. Identidade, autorização,
integridade e regras de negócio precisam ser verificadas no Backend. Zod faz
parsing de `unknown`, mas não transforma o cliente em uma fronteira de
segurança.

## Tradução visual e ownership

O Tech Lead decompõe cada tradução visual na sequência explícita:

```text
referência visual opcional → token/primitive → state → pure UI
```

O `frontend-ui-engineer` é o owner da tradução visual: extrai evidências de uma
referência visual opcional, cria tokens/primitives, modela estados e entrega UI pura e acessível.
O `frontend-engineer` conecta contratos, dados e orchestration por interfaces
estáveis, sem copiar acoplamento, fetch ou regra de negócio da referência visual para a
UI.
