---
name: kickoff
description: Abre o discovery de um projeto derivado em dois modos: contexto de mercado já conhecido ou descoberta assistida por pesquisa profunda.
---

# /kickoff — início do projeto

Use esta skill na primeira conversa de um projeto derivado. Ela transforma uma
ideia em contexto de Produto rastreável; não implementa código, não cria regra
de negócio silenciosa e não publica uma spec sem aprovação humana.

## Pré-voo

1. Leia `README.md`, `docs/STATE.md`, `product/README.md`,
   `product/docs/product/README.md` e os templates em `product/docs/_templates/`.
2. Leia `.project-config.json` quando existir para recuperar nome, slug e
   ferramentas de agentes instaladas.
3. Pergunte qual modo a pessoa quer usar:

   - **Mercado conhecido:** a pessoa já tem ICP, problema, evidências e visão
     de mercado; registre o que ela sabe e marque lacunas sem contestar por
     inferência.
   - **Descoberta de hipóteses:** a pessoa ainda está explorando; colete só o
     necessário para pesquisar o mercado e gerar hipóteses testáveis.

## Perguntas comuns

Faça uma pergunta por vez e aceite respostas curtas. Pergunte:

1. Qual é a ideia em uma ou duas frases?
2. Qual problema você acredita que está resolvendo e para quem?
3. Em qual país/região e idioma o primeiro recorte deve operar?
4. Que restrições existem agora: prazo, canal, tecnologia, capital ou acesso a
   usuários?

No modo **Mercado conhecido**, pergunte também:

5. Quem é o ICP, quem usa e quem compra?
6. Quais evidências você já tem: entrevistas, dados de uso, vendas,
   observação, comunidade ou outra fonte?
7. Quais alternativas e concorrentes a pessoa usa hoje?
8. Qual resultado mensurável indicaria que vale continuar?

No modo **Descoberta de hipóteses**, pergunte também:

5. Que comportamento, dor ou mudança de contexto fez você pensar nessa ideia?
6. Quem parece sentir essa dor primeiro, mesmo que o ICP ainda esteja aberto?
7. O que você já tentou descobrir e o que continua incerto?
8. Há segmentos, concorrentes ou termos de busca que devemos investigar?

## Pesquisa profunda — somente no modo de descoberta

Depois das respostas, faça pesquisa de mercado na capacidade web/browser
disponível na sessão. Não trate a pesquisa como validação automática. Cubra,
quando houver dados:

- tamanho e definição do mercado, segmentos e geografia;
- concorrentes diretos, substitutos e comportamento atual;
- sinais de demanda, linguagem usada pelo público e jobs-to-be-done;
- modelos de negócio e faixas de preço apenas como evidência contextual;
- tendências, regulamentação, dependências e barreiras de entrada;
- lacunas, segmentos ignorados e riscos de interpretação.

Priorize fontes primárias, relatórios recentes, dados públicos, documentação de
concorrentes e entrevistas fornecidas pela pessoa. Registre URL, título,
publicador, data de publicação/acesso e o trecho ou dado que sustenta cada
afirmação. Separe explicitamente:

```text
FATO observado → INFERÊNCIA razoável → HIPÓTESE a validar → EXPERIMENTO sugerido
```

Se a capacidade de pesquisa não estiver disponível, não invente resultados:
gere o intake, marque `RESEARCH_REQUIRED` e deixe uma fila priorizada de
perguntas e fontes para a próxima sessão.

## Artefatos de saída

Escreva somente em `product/` e mantenha tudo em `DRAFT`:

- `product/docs/kickoffs/<YYYY-MM-DD>-<slug>.md` — respostas, modo,
  escopo, perguntas abertas e decisões provisórias;
- `product/docs/research/<slug>-market-research.md` — evidências, fontes,
  método, limites e fatos/inferências separados (modo de descoberta);
- `product/docs/product/hypotheses/<slug>-market-hypotheses.md` — ICP,
  problema, alternativa, outcome, confiança, risco e experimento por hipótese.

Use os templates correspondentes em `product/docs/_templates/` quando existirem.
Atualize `product/docs/STATE.md` com o checkpoint, sem apagar contexto anterior.

## Limites e próximo passo

Não implemente domínio, endpoint, tabela, tela, pricing, autorização ou
integração durante o kickoff. O resultado é contexto de Produto, não contrato
de engenharia. Ao terminar, entregue um resumo das lacunas e encaminhe para
`spec-engineer`; só uma spec `APPROVED` pode seguir para modelagem e código.
