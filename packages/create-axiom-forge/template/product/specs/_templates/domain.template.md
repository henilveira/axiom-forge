---
name: domain
description: Modelo DDD da feature. Puxe ao modelar agregados e linguagem.
alwaysApply: false
---

# Domain Model (DDD) — <nome da feature>

> Responde: qual a **linguagem** e o **modelo** do negócio.
> DDD tático dentro do bounded context. Termos aqui devem aparecer iguais no código.

## Bounded Context
<Nome do contexto. Qual subdomínio: **core** (vantagem competitiva) /
**supporting** (necessário, não diferencia) / **generic** (compra-se pronto)?>

## Linguagem ubíqua
> Mesmo vocabulário entre negócio, spec e código. Promova ao `docs/glossary.md` global.

| Termo        | Definição                                   | NÃO confundir com |
|--------------|---------------------------------------------|-------------------|
| <Termo>      | <significado preciso no domínio>            | <termo parecido>  |

## Agregados, entidades e value objects
- **Agregado `<Nome>`** (raiz: `<Entidade>`)
  - Entidades: <…>
  - Value objects: <…>
  - **Invariantes** (regras sempre verdadeiras): <…>
  - Fronteira de consistência: <o que muda junto numa transação>

## Eventos de domínio
| Evento (passado)     | Disparado quando            | Quem reage          |
|----------------------|-----------------------------|---------------------|
| `<Algo>Aconteceu`    | <condição>                  | <contexto/handler>  |

## Relações com outros contextos
<Como este contexto fala com os outros: Customer/Supplier, Conformist,
Anti-Corruption Layer, Shared Kernel? Atualize `docs/architecture/context-map.md`.>
