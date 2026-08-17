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


## V0.5 — promoções, descontos e categorias de estoque
- Nova área **Promoções**.
- Criação de promoção com nome, percentual de desconto, início e término.
- Seleção de um ou vários produtos.
- Filtro de produtos por categoria durante a criação da promoção.
- Promoções podem ser agendadas, pausadas, editadas ou excluídas.
- Preço promocional entra automaticamente no PDV durante o período ativo.
- Ao vencer o período, o produto volta automaticamente ao preço normal.
- Estoque mostra preço normal, preço atual e promoção ativa.
- Opção **Publicar no Tem Aqui** fica salva para futura sincronização com o aplicativo público.
- Nova gestão de **Categorias do estoque**.
- Criação e renomeação de categorias.
- Produtos usam seleção de categoria no cadastro.
- Filtro de estoque por categoria.
- Resumo de quantidade de produtos, estoque baixo, custo e valor estimado.
- Mantidos cálculo de troco da V0.3 e quantidades por peso/volume da V0.4.

> Nesta etapa, promoções e categorias continuam salvas localmente no navegador. A sincronização real entre vários aparelhos e com o Tem Aqui público será feita quando conectarmos o banco do Tem Aqui Gestão.


## V0.6 — versão visível
- Exibe `V0.6.0` permanentemente no canto superior direito.
- Assim fica fácil confirmar se a atualização realmente chegou ao aparelho.
- Cache do Service Worker e parâmetros de CSS/JS foram atualizados para V0.6.0.


## V0.7 — Produtos por categoria e edição no celular
- A tela Produtos agora mostra categorias com contagem de produtos.
- A lista fica agrupada por categoria quando “Todos” está selecionado.
- É possível tocar em uma categoria para ver somente os produtos dela.
- Cada produto agora tem botão **Editar** visível.
- No celular, o editor abre em tela cheia para não ficar escondido abaixo da lista.
- A categoria aparece em cada linha de produto.
- Botão **+ Categoria** também aparece diretamente na tela Produtos.
- Versão visível atualizada para **V0.7.0**.


## V0.8 — voltar e menu inferior fixo
- Novo botão **← Voltar** no editor de produto.
- O menu inferior continua visível enquanto o editor está aberto no celular.
- O editor para acima do menu inferior, evitando que o menu cubra os botões.
- O botão **Cancelar** continua funcionando como retorno.
- Versão visível atualizada para **V0.8.0**.


## V0.9 — Funcionários, permissões e Banco Central

- Nova área **Funcionários e Acessos**.
- Papéis: Proprietário, Gerente e Funcionário.
- Permissões individuais para PDV, produtos, estoque, clientes, ficha, promoções, relatórios, caixa, funcionários e configurações.
- Ativar/desativar funcionário.
- Cada venda passa a guardar o operador responsável.
- Configuração de operador por aparelho no modo local.
- Tela de login para o Banco Central.
- Seletor de comércio para administrador/proprietário com mais de uma loja.
- Sincronização preparada para carregar lojas e produtos do Supabase atual do Tem Aqui.
- Mantém funcionamento local quando o banco ainda não está configurado.
- Inclui `BANCO-CENTRAL-TEM-AQUI-GESTAO-V09.sql`.
- Inclui guia `MIGRACAO-TEM-AQUI-PARA-GESTAO.md`.
- Versão visível: **V0.9.3**.


## V0.9.3 — Banco central e estoque real

Esta versão liga o Tem Aqui Gestão ao Supabase central do Tem Aqui usando somente a chave pública do frontend.

Implementado:
- login real do lojista;
- cada conta vê apenas as lojas às quais possui acesso;
- produtos reais do Tem Aqui no Gestão;
- categorias internas específicas por loja;
- SKU, código de barras, preço de custo e estoque mínimo;
- movimentação de estoque com registro;
- baixa atômica de estoque no PDV;
- Funcionários e Acessos usando permissões do banco central;
- nova identidade Tem Aqui Gestão.

Observação: criação de um novo funcionário exige que o e-mail já possua uma conta no Tem Aqui. Nenhuma chave service_role é armazenada no aplicativo.


## V0.9.3 — compatibilidade com o banco real

Esta versão não depende do SQL V0.9.2 gerado anteriormente.
O frontend foi mantido usando a estrutura real já existente no Supabase:
`store_members.role`, `store_members.status`, permissões `can_*`,
`store_inventory_categories`, `inventory_movements` e os RPCs `gestao_*`.

O patch de segurança/compatibilidade dos RPCs foi aplicado diretamente no
Supabase central antes da geração deste pacote.
