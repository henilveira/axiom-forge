# projeto derivado Backend

Leia `AGENTS.md` e as instruções de `docs/engineering/` antes de trabalhar.
Este é o diretório do squad Backend; agentes de Product e Frontend têm seus
próprios diretórios irmãos. Use `model: sonnet` nos agentes Claude. A fonte de
significado de negócio é a spec aprovada em `../product`; este diretório é
responsável por design técnico, NestJS, RabbitMQ, persistência, observação,
testes e pelo contrato de integração consumido por `../frontend`.

Aplique também `docs/engineering/agent-efficiency-protocol.md`: pré-voo único,
testes incrementais, full gate único e consulta ao usuário para qualquer
bloqueador externo antes de codar. O release-engineer entrega `release-ready`
para um PR; o `git-flow-specialist` do orquestrador é o owner da aprovação,
integração e limpeza no GitHub.
