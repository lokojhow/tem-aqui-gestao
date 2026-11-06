# Tem Aqui Gestão — celular como servidor (experimental)

Esta ramificação foi criada para desenvolver o modo em que um celular Android armazena o banco de dados comercial e atende outros dispositivos na mesma rede.

## Situação

O Tem Aqui Gestão usa **IndexedDB local** no modo autônomo e **Supabase** no modo central. IndexedDB de um aparelho não é acessível automaticamente aos outros. Um PWA isolado não hospeda um servidor de rede.

Foi preparado um experimento separado com:
- Servidor HTTP Python para execução no Android (Termux);
- Banco SQLite local e uma API que adapta chamadas do `GestaoBackend`;
- Interface original do Tem Aqui Gestão copiada para uma pasta de testes (o repositório original não é alterado);
- Login de proprietário e venda/estoque serializados no banco;
- Acesso dos outros aparelhos na mesma rede, sujeito às restrições de bateria do Android.

**Status: protótipo não validado para operações comerciais reais.** Não há APK nativo, HTTPS, autenticação granular de funcionários, backup e sincronização remota completos. Não expor a porta na Internet.

## Próximas etapas

1. Verificar a compatibilidade de todos os módulos do PDV com a API local.
2. Adicionar autenticação/permissões por usuário, backup/restauração e proteção da conexão.
3. Implementar aplicativo Android hospedeiro com serviço em primeiro plano para não depender de Termux.
4. Só depois preparar liberação na versão principal e migração de dados com backup.

**Não excluir Supabase, lojas, produtos ou dados anteriores.** Nada nesta ramificação foi colocado em produção.
