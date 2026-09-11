# Tem Aqui Monitor

Central de monitoramento dos aplicativos de Jonathas, criada em branch separada para não alterar o Tem Aqui Gestão em produção.

## Aplicativos iniciais
- Tem Aqui Tupanatinga — GitHub + Supabase `click`
- Tem Aqui Gestão — GitHub + Supabase `click`
- Tem Aqui Itaíba — GitHub + Supabase `click`
- Portal Prefeitura de Manari — GitHub + Supabase `Manari conectado`
- Urna Educativa — GitHub

## Estrutura criada
- `monitor/index.html`: dashboard responsivo.
- `monitor/app.js`: atualização automática a cada 60 segundos e status GitHub disponível publicamente.
- Schema privado `monitoring` no projeto Supabase `click` com tabelas `apps`, `metric_snapshots` e `alerts`.

## Segurança
O schema `monitoring` não é exposto para `anon` nem `authenticated`. Tokens administrativos do GitHub e Supabase nunca devem ser colocados no JavaScript do navegador.

## Próxima camada
Para métricas completas de consumo, usar um backend/Edge Function privado que consulte:
- Supabase Management API (usage, egress e logs no endpoint novo baseado em ClickHouse; não usar `logs.all`).
- GitHub REST API (Actions, workflow runs, commits e rate limit).

O backend grava snapshots agregados em `monitoring.metric_snapshots` e abre alertas em `monitoring.alerts`. O frontend lê apenas os dados agregados por uma rota autenticada.
