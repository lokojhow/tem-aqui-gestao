# Migração do Tem Aqui para o Tem Aqui Gestão — sem perder dados

## Decisão de arquitetura

Não vamos copiar `stores` e `products` para outro banco e depois apagar o original.

O caminho seguro é usar **o Supabase atual como Banco Central Tem Aqui**:

- **Tem Aqui Gestão** vira o sistema que cadastra e altera produtos, estoque, equipe, promoções, clientes, ficha, vendas e caixa.
- **Tem Aqui público** fica leve: lê somente lojas/produtos/promoções públicas, recebe pedidos e mostra conteúdo ao consumidor.
- Assim o mesmo produto não fica duplicado em dois bancos e uma alteração de estoque/preço feita no Gestão aparece no Tem Aqui.

## Estrutura antiga reaproveitada

O banco do Tem Aqui já possui a ideia de equipe por loja:

- `store_members`
- funções/políticas com `can_manage_store(...)`
- papéis `owner`, `manager` e `editor`
- `user_roles` e `profiles` para reconhecer administrador/parceiro.

A V0.9 do Gestão mantém isso e acrescenta permissões individuais.

## Permissões da equipe

O proprietário pode liberar ou bloquear:

- PDV e vendas
- Produtos
- Estoque e categorias
- Clientes
- Ficha/fiado
- Promoções
- Relatórios
- Caixa
- Funcionários
- Configurações

Papéis visíveis:

- **Proprietário** = acesso total
- **Gerente** = operação completa; equipe pode ficar restrita
- **Funcionário** = PDV, produtos, estoque, clientes, ficha, promoções e relatórios por padrão; o proprietário pode alterar cada item

## Passos da migração

1. Fazer backup do projeto Supabase atual.
2. Executar `BANCO-CENTRAL-TEM-AQUI-GESTAO-V09.sql` no SQL Editor do **Supabase atual do Tem Aqui**.
3. Copiar para o repositório do Gestão a mesma **URL + chave pública/publishable** do frontend do Tem Aqui, preenchendo `supabase-config.js`.
4. Abrir o Gestão, entrar com a conta do proprietário/administrador e tocar **Sincronizar agora**.
5. Conferir:
   - lojas;
   - produtos;
   - preço;
   - estoque;
   - categorias;
   - equipe.
6. Só depois da conferência, retirar do Tem Aqui público as telas pesadas de administração de parceiro/produto/estoque.
7. **Não apagar `stores`, `products`, `profiles`, `user_roles` nem `store_members` do Supabase**, porque agora eles serão o banco central compartilhado.

## O que o SQL acrescenta

Sem apagar o catálogo existente:

- permissões granulares em `store_members`;
- convites de funcionários;
- categorias internas de estoque;
- clientes do Gestão;
- ficha/razão do cliente;
- vendas e itens de venda;
- sessões de caixa;
- movimentações de estoque;
- campos de código de barras, SKU, custo e unidade em produtos quando ainda não existirem.

## Sobre contas de funcionários

Se o e-mail já possui uma conta no Supabase Auth, o proprietário consegue vinculá-lo à loja.

Se ainda não possui conta, o Gestão guarda um **convite pendente**. Depois que esse e-mail criar/entrar na conta, a função `gestao_claim_invites()` pode vinculá-lo automaticamente.

## Próxima etapa depois da V0.9

Depois de confirmar o banco conectado, a próxima versão deve trocar também vendas, clientes, ficha, caixa, promoções e estoque do armazenamento local para as tabelas centrais criadas por este SQL. A V0.9 já deixa a estrutura e o login preparados.
