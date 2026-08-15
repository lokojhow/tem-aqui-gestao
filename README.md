# Tem Aqui Gestão — V0.3

Redesign do PDV inspirado no layout de referência enviado pelo proprietário do projeto.

## V0.3 — interface
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
- PWA com cache V0.3.

## Dados
Nesta etapa os dados continuam salvos no navegador (`localStorage`). O próximo passo de arquitetura é ligar o Gestão a um banco próprio com autenticação por empresa e funcionário e sincronização controlada com o Tem Aqui público.


## V0.3
- Pagamento em dinheiro agora pede o valor recebido.
- Troco calculado automaticamente em tempo real.
- Bloqueia a finalização se o valor recebido for menor que o total.
- Salva valor recebido e troco junto da venda.
- Histórico mostra recebido e troco nas vendas em dinheiro.


## V0.4 — quantidade por peso/volume
- Produtos em kg, g e L pedem a quantidade antes de entrar na venda.
- Aceita 1,200 kg, 1,500 kg etc.
- Quantidade pode ser editada diretamente no carrinho.
- Botões + e − continuam disponíveis.
- Produtos por unidade continuam inteiros.
- O valor do item é calculado automaticamente pelo peso.
- O estoque é validado antes de adicionar e antes de finalizar.
