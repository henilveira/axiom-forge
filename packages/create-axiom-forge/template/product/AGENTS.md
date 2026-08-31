# Product Workspace — contrato do squad

Este diretório contém somente Produto: conhecimento do negócio, discovery, design, PRDs, histórias,
Jira e specs. Não implemente código de runtime, SQL, Prisma, OpenAPI real ou contrato de integração.

Leia nesta ordem: `../CLAUDE.md`, `README.md`, `docs/README.md`,
`docs/product-management-playbook.md`, `docs/knowledge/`, `docs/glossary.md`, a história relacionada
e o estado do pacote.

Este template não traz evidência de produto. Backend e Frontend consomem apenas
um pacote com manifest verificável. Não altere uma regra para destravar
engenharia: registre `OPEN-REQ` ou devolva a decisão ao dono do negócio.

Product usa português; termos técnicos e IDs devem ser estáveis. Toda hipótese tem fonte/confiança;
todo documento tem status, owner e data. Nenhuma publicação vira `approved` sem revisão humana do
Product Owner.

O ponto de entrada de discovery é `/kickoff`. Depois dele, `spec-engineer` consolida requisitos e
specs; o `phase-orchestrator` encaminha modelagem, solução e execução aos papéis canônicos da raiz.
Não crie aliases de agentes de Produto que não existam no roster versionado.

Jira é integração externa: somente escreva quando houver pedido/autorização explícita, use o projeto
correto e registre o link no arquivo versionado. Nunca envie PII sensível ou segredo.
