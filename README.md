# Tem Aqui Gestão — V0.2

Redesign do PDV inspirado no layout de referência enviado pelo proprietário do projeto.

## V0.2 — interface
- Barra lateral escura com Nova Venda, histórico, clientes/ficha, produtos, estoque, relatórios, caixa e configurações.
- Faixa superior com atalhos de código de barras, venda em aberto, avulsos/estoque, ficha/clientes e relatórios.
- PDV em duas colunas: catálogo de produtos + carrinho.
- Pesquisa por nome ou código de barras.
- Leitores USB/Bluetooth que funcionam como teclado.
- Produtos avulsos com quantidade/unidade.
- Desconto e acréscimo.
- Finalização em dinheiro, Pix, cartão ou ficha.
- Clientes/ficha com saldo, limite, compras e pagamentos.
- Cadastro/edição de produtos com código, SKU, custo, estoque e opção de publicar no Tem Aqui.
- Estoque, histórico, relatórios, caixa e configurações.
- Layout responsivo para celular e computador.
- PWA com cache V0.2.

## Dados
Nesta etapa os dados continuam salvos no navegador (`localStorage`). O próximo passo de arquitetura é ligar o Gestão a um banco próprio com autenticação por empresa e funcionário e sincronização controlada com o Tem Aqui público.
