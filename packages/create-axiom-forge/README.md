# create-axiom-forge

Gerador npm do boilerplate Axiom Forge: SDD, Product vazio, Next.js, NestJS,
autenticação técnica, Prisma/Postgres, RabbitMQ e agentes reutilizáveis.

## Uso

```bash
npx create-axiom-forge meu-projeto
```

O CLI pergunta quais agentes instalar:

1. Claude
2. Codex
3. Claude + Codex

Também é possível automatizar a escolha:

```bash
npx create-axiom-forge meu-projeto --agents both
```

O nome informado gera o diretório, o namespace do Docker Compose, o banco
Postgres (`meu_projeto`), o vhost e o exchange RabbitMQ. Depois da criação:

```bash
cd meu-projeto
/kickoff
```

`/kickoff` oferece dois caminhos: registrar ICP/problema/evidências que já são
conhecidos ou coletar uma ideia curta, pesquisar profundamente o mercado e
gerar hipóteses com fontes e limites explícitos.
