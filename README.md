# Tem Aqui Gestão — V0.1

Primeira base funcional do sistema de gestão para lojistas do Tem Aqui.

## O que já funciona nesta V0.1
- Dashboard responsivo para celular e computador
- Cadastro de produtos
- Código de barras por produto
- Estoque local
- Seleção “Mostrar na vitrine do Tem Aqui”
- PDV com vários itens na mesma venda
- Produto avulso
- Leitor de código de barras Bluetooth/USB que funcione como teclado
- Cadastro de clientes
- Limite e saldo de fiado
- Venda no fiado
- Baixa simples de estoque ao finalizar venda
- PWA instalável

## Próximas etapas
1. Banco separado do Tem Aqui Gestão e login por empresa/funcionário
2. Sincronização real com o aplicativo público Tem Aqui
3. Câmera para leitura de código de barras
4. Promoções temporárias (5%, 20%, horas/dias) sincronizadas
5. Ficha completa: pagamentos, parcelas, histórico e recibos
6. Permissões por funcionário e vendas simultâneas no celular
7. Caixa, sangria, fechamento e relatórios
8. Integração de impressoras e balanças por conectores/ponte local quando necessário
9. Empacotamento desktop (Windows) reaproveitando a mesma interface

## Arquitetura planejada
- Interface única responsiva/PWA para celular e navegador
- App desktop posteriormente empacotado a partir da mesma base
- Banco próprio do Gestão
- API de integração com o Tem Aqui público
- Cada empresa isolada por tenant/loja e cada funcionário com permissões
