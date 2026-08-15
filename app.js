
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const qsa = (s) => [...document.querySelectorAll(s)];
  const money = (v) => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const state = {
    products: read('tag-products', [
      {id: crypto.randomUUID(), name:'Ração Premium 1kg', barcode:'789100000001', price:18.90, stock:12, showcase:true},
      {id: crypto.randomUUID(), name:'Shampoo Pet 500ml', barcode:'789100000002', price:24.50, stock:8, showcase:false}
    ]),
    customers: read('tag-customers', []),
    sales: read('tag-sales', []),
    cart: [],
    selectedCustomerId: ''
  };

  function persist(){
    write('tag-products', state.products);
    write('tag-customers', state.customers);
    write('tag-sales', state.sales);
  }

  function navigate(route){
    qsa('.view').forEach(v => v.classList.toggle('active', v.dataset.view === route));
    qsa('[data-route]').forEach(b => b.classList.toggle('active', b.dataset.route === route));
    if(route === 'home') renderDashboard();
    if(route === 'products') renderProducts();
    if(route === 'customers') renderCustomers();
    if(route === 'promotions') renderShowcase();
    if(route === 'pos') renderCart();
    scrollTo({top:0,behavior:'smooth'});
  }

  function renderDashboard(){
    const today = new Date().toISOString().slice(0,10);
    const sales = state.sales.filter(s => String(s.createdAt).slice(0,10) === today);
    const salesTotal = sales.reduce((a,s)=>a+s.total,0);
    const stock = state.products.reduce((a,p)=>a+Number(p.stock||0),0);
    const credit = state.customers.reduce((a,c)=>a+Number(c.debt||0),0);
    $('kpiSales').textContent = money(salesTotal);
    $('kpiStock').textContent = String(stock);
    $('kpiCredit').textContent = money(credit);
    $('kpiShowcase').textContent = String(state.products.filter(p=>p.showcase).length);
  }

  function renderProducts(){
    const term = ($('productSearch').value || '').toLowerCase().trim();
    const list = state.products.filter(p => !term || `${p.name} ${p.barcode}`.toLowerCase().includes(term));
    $('productList').innerHTML = list.map(p => `<article>
      <div><h3>${p.name}</h3><p>${p.barcode || 'Sem código'} · Estoque: ${p.stock} · ${money(p.price)}</p>${p.showcase?'<span class="badge">Na vitrine</span>':''}</div>
      <button class="secondary" data-edit-product="${p.id}">Editar</button>
    </article>`).join('') || '<article><div><h3>Nenhum produto</h3><p>Cadastre o primeiro produto da loja.</p></div></article>';
  }

  function renderCustomers(){
    $('customerList').innerHTML = state.customers.map(c => `<article>
      <div><h3>${c.name}</h3><p>${c.whatsapp || 'Sem WhatsApp'} · Fiado: ${money(c.debt || 0)} / limite ${money(c.limit || 0)}</p></div>
      <button class="secondary" data-edit-customer="${c.id}">Editar</button>
    </article>`).join('') || '<article><div><h3>Nenhum cliente cadastrado</h3><p>Cadastre clientes para usar ficha/fiado.</p></div></article>';
  }

  function renderShowcase(){
    $('showcaseList').innerHTML = state.products.map(p => `<article>
      <div><h3>${p.name}</h3><p>${money(p.price)} · estoque ${p.stock}</p></div>
      <label class="check"><input type="checkbox" data-showcase="${p.id}" ${p.showcase?'checked':''}> Na vitrine</label>
    </article>`).join('');
  }

  function addToCart(product){
    const existing = state.cart.find(i=>i.productId===product.id);
    if(existing) existing.qty += 1;
    else state.cart.push({productId:product.id,name:product.name,price:Number(product.price),qty:1,loose:false});
    renderCart();
  }

  function renderCart(){
    $('cartList').innerHTML = state.cart.map((i,index)=>`<article>
      <div><h3>${i.name}</h3><p>${money(i.price)} cada</p></div>
      <div class="cart-actions"><button data-cart-dec="${index}">−</button><b>${i.qty}</b><button data-cart-inc="${index}">＋</button></div>
    </article>`).join('') || '<article><div><h3>Venda vazia</h3><p>Leia um código de barras, busque um produto ou adicione um item avulso.</p></div></article>';
    const subtotal = state.cart.reduce((a,i)=>a+(i.price*i.qty),0);
    $('subtotal').textContent = money(subtotal);
    $('discountTotal').textContent = money(0);
    $('grandTotal').textContent = money(subtotal);
  }

  function findProduct(term){
    const value = String(term||'').trim().toLowerCase();
    return state.products.find(p => String(p.barcode||'')===value) || state.products.find(p => p.name.toLowerCase().includes(value));
  }

  function openProduct(product=null){
    $('productId').value = product?.id || '';
    $('productName').value = product?.name || '';
    $('productBarcode').value = product?.barcode || '';
    $('productPrice').value = product?.price ?? '';
    $('productStock').value = product?.stock ?? '';
    $('productShowcase').checked = Boolean(product?.showcase);
    $('productDialog').showModal();
  }

  function saveProduct(){
    const id = $('productId').value || crypto.randomUUID();
    const item = {
      id,
      name:$('productName').value.trim(),
      barcode:$('productBarcode').value.trim(),
      price:Number($('productPrice').value||0),
      stock:Number($('productStock').value||0),
      showcase:$('productShowcase').checked
    };
    const idx = state.products.findIndex(p=>p.id===id);
    if(idx>=0) state.products[idx]=item; else state.products.push(item);
    persist(); renderProducts(); renderDashboard();
  }

  function openCustomer(customer=null){
    $('customerId').value = customer?.id || '';
    $('customerName').value = customer?.name || '';
    $('customerWhatsapp').value = customer?.whatsapp || '';
    $('customerLimit').value = customer?.limit ?? 0;
    $('customerDialog').showModal();
  }

  function saveCustomer(){
    const id = $('customerId').value || crypto.randomUUID();
    const previous = state.customers.find(c=>c.id===id);
    const item = {id,name:$('customerName').value.trim(),whatsapp:$('customerWhatsapp').value.trim(),limit:Number($('customerLimit').value||0),debt:Number(previous?.debt||0)};
    const idx = state.customers.findIndex(c=>c.id===id);
    if(idx>=0) state.customers[idx]=item; else state.customers.push(item);
    persist(); renderCustomers(); renderDashboard();
  }

  qsa('[data-route]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.route)));
  $('newProductButton').addEventListener('click',()=>openProduct());
  $('newCustomerButton').addEventListener('click',()=>openCustomer());
  $('productSearch').addEventListener('input',renderProducts);

  $('productList').addEventListener('click',e=>{const b=e.target.closest('[data-edit-product]');if(b)openProduct(state.products.find(p=>p.id===b.dataset.editProduct));});
  $('customerList').addEventListener('click',e=>{const b=e.target.closest('[data-edit-customer]');if(b)openCustomer(state.customers.find(c=>c.id===b.dataset.editCustomer));});
  $('showcaseList').addEventListener('change',e=>{const c=e.target.closest('[data-showcase]');if(!c)return;const p=state.products.find(p=>p.id===c.dataset.showcase);if(p){p.showcase=c.checked;persist();renderDashboard();}});
  $('saveProductButton').addEventListener('click',e=>{if(!$('productForm').reportValidity()){e.preventDefault();return;} saveProduct();});
  $('saveCustomerButton').addEventListener('click',e=>{if(!$('customerForm').reportValidity()){e.preventDefault();return;} saveCustomer();});

  $('barcodeInput').addEventListener('keydown',e=>{
    if(e.key!=='Enter')return;
    e.preventDefault();
    const p=findProduct(e.currentTarget.value);
    if(p){addToCart(p);e.currentTarget.value='';}
    else alert('Produto não encontrado. Cadastre o produto ou use Produto avulso.');
  });
  $('scanButton').addEventListener('click',()=>{$('barcodeInput').focus();alert('Nesta V0.1 o campo já aceita leitores Bluetooth/USB que funcionam como teclado. A câmera será adicionada na próxima etapa.');});
  $('addLooseButton').addEventListener('click',()=>{$('looseName').value='';$('loosePrice').value='';$('looseDialog').showModal();});
  $('saveLooseButton').addEventListener('click',e=>{
    if(!$('looseForm').reportValidity()){e.preventDefault();return;}
    state.cart.push({productId:'',name:$('looseName').value.trim(),price:Number($('loosePrice').value||0),qty:1,loose:true});renderCart();
  });
  $('cartList').addEventListener('click',e=>{
    const inc=e.target.closest('[data-cart-inc]'),dec=e.target.closest('[data-cart-dec]');
    if(inc){state.cart[Number(inc.dataset.cartInc)].qty+=1;renderCart();}
    if(dec){const i=Number(dec.dataset.cartDec);state.cart[i].qty-=1;if(state.cart[i].qty<=0)state.cart.splice(i,1);renderCart();}
  });
  $('newSaleButton').addEventListener('click',()=>{if(confirm('Limpar a venda atual?')){state.cart=[];renderCart();}});
  $('selectCustomerButton').addEventListener('click',()=>{
    if(!state.customers.length)return alert('Cadastre um cliente primeiro.');
    const names=state.customers.map((c,i)=>`${i+1} - ${c.name}`).join('\n');
    const choice=Number(prompt(`Cliente da ficha:\n${names}\n\nDigite o número:`));
    const customer=state.customers[choice-1];
    if(customer){state.selectedCustomerId=customer.id;alert(`Cliente selecionado: ${customer.name}`);}
  });
  $('finishSaleButton').addEventListener('click',()=>{
    if(!state.cart.length)return alert('Adicione pelo menos um item.');
    const total=state.cart.reduce((a,i)=>a+i.price*i.qty,0);
    const mode=prompt('Forma de pagamento: dinheiro, pix, cartão ou fiado?','pix')?.trim().toLowerCase();
    if(!mode)return;
    if(mode==='fiado'){
      const customer=state.customers.find(c=>c.id===state.selectedCustomerId);
      if(!customer)return alert('Selecione um cliente/ficha antes de vender fiado.');
      if(customer.limit>0 && customer.debt+total>customer.limit)return alert('A venda ultrapassa o limite de fiado deste cliente.');
      customer.debt=Number(customer.debt||0)+total;
    }
    state.cart.forEach(item=>{
      if(item.loose)return;
      const p=state.products.find(p=>p.id===item.productId);
      if(p)p.stock=Math.max(0,Number(p.stock||0)-item.qty);
    });
    state.sales.push({id:crypto.randomUUID(),createdAt:new Date().toISOString(),total,mode,customerId:state.selectedCustomerId||null,items:state.cart});
    state.cart=[];state.selectedCustomerId='';persist();renderCart();renderDashboard();alert(`Venda concluída: ${money(total)}`);
  });

  $('syncButton').addEventListener('click',()=>alert('Sincronização com o Tem Aqui será ligada quando conectarmos o banco do Gestão.'));
  renderDashboard(); renderProducts(); renderCustomers(); renderShowcase(); renderCart();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
})();
