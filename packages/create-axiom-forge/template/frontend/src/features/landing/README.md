# Landing visual

Exemplo visual neutro de uma feature pública. Ele existe para demonstrar
composição, acessibilidade, estados locais e organização de pastas; não define
produto, posicionamento, preço, persona ou regra de negócio.

## Mapa visual

| Bloco | Responsabilidade | Arquivo |
| --- | --- | --- |
| Header | navegação e menu mobile local | `components/client/landing-header.tsx` |
| Hero | apresentação do starter | `components/patterns/landing-hero.tsx` |
| Benefits | princípios técnicos | `components/patterns/landing-benefits.tsx` |
| Timeline | fluxo SDD | `components/patterns/landing-timeline.tsx` |
| CTA/Footer | navegação sem integração externa | `components/patterns/landing-cta.tsx` e `landing-footer.tsx` |

## Contrato da feature

- Não há `services`, `queries`, `mutations` ou `forms` nesta feature.
- `components/ui` são server-compatible e recebem somente props primitivas.
- O único client component é o header, que encapsula scroll e menu mobile acessível.
- Substitua a copy, cores e links quando o projeto derivado tiver uma identidade própria.
