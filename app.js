(() => {
  'use strict';
  const APP_VERSION = '0.9.0';
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
  const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const nowLocal = () => new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const todayKey = () => new Date().toISOString().slice(0, 10);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  const ACCESS_PERMISSIONS = [
    ['sell','PDV e vendas','Criar, editar e finalizar vendas'],
    ['products','Produtos','Cadastrar e editar produtos'],
    ['stock','Estoque','Alterar estoque e categorias'],
    ['customers','Clientes / ficha','Cadastrar clientes e abrir fichas'],
    ['credit','Fiado / recebimentos','Lançar vendas na ficha e receber pagamentos'],
    ['promotions','Promoções','Criar, editar e encerrar promoções'],
    ['reports','Relatórios','Visualizar vendas, totais e relatórios'],
    ['cash','Caixa','Abrir e fechar caixa'],
    ['staff','Funcionários','Cadastrar, editar e desativar funcionários'],
    ['settings','Configurações','Alterar configurações da loja']
  ];
  const rolePermissions = (role='editor') => {
    const keys = Object.fromEntries(ACCESS_PERMISSIONS.map(([key]) => [key, false]));
    if(role==='owner') ACCESS_PERMISSIONS.forEach(([key]) => keys[key]=true);
    if(role==='manager') ACCESS_PERMISSIONS.forEach(([key]) => keys[key]=!['staff'].includes(key));
    if(role==='editor') ['sell','products','stock','customers','credit','promotions','reports'].forEach(key=>keys[key]=true);
    return keys;
  };
  const roleLabel = role => ({owner:'Proprietário',manager:'Gerente',editor:'Funcionário'})[role] || 'Funcionário';
  const permissionLabel = key => ACCESS_PERMISSIONS.find(([id])=>id===key)?.[1] || key;


  const parseQty = (value) => {
    const normalized = String(value ?? '').trim().replace(',', '.');
    const number = Number(normalized);
    return Number.isFinite(number) ? number : 0;
  };
  const isFractionalUnit = (unit) => ['kg','g','L'].includes(String(unit || ''));
  const qtyStep = (unit) => unit === 'kg' || unit === 'L' ? 0.1 : 1;
  const formatQty = (value, unit) => {
    const n = Number(value || 0);
    return n.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: isFractionalUnit(unit) ? 3 : 0
    });
  };

  const demoProducts = [
    ['Picanha Bovina 1kg','7891234567895',37,15,'Carnes Bovina','🥩','kg',28],
    ['Contra Filé 1kg','7891234567896',32,18,'Carnes Bovina','🥩','kg',24],
    ['Coxão Mole 1kg','7891234567897',28.9,22,'Carnes Bovina','🥩','kg',21],
    ['Alcatra Bovina 1kg','7891234567898',29.9,14,'Carnes Bovina','🥩','kg',22],
    ['Linguiça Suína 1kg','7891234567899',16.9,12,'Carnes Suína','🌭','kg',12],
    ['Frango Inteiro 1kg','7891234567800',9.9,20,'Aves','🍗','kg',7],
    ['Queijo Coalho 1kg','7891234567801',24.9,8,'Frios','🧀','kg',18],
    ['Refrigerante 2L','7894900011517',10.9,24,'Bebidas','🥤','un.',7.5],
    ['Arroz 5kg Tio João','7891234567803',22.9,16,'Mercearia','🍚','un.',18],
    ['Feijão Preto 1kg','7891234567804',7.9,30,'Mercearia','🫘','un.',5.5],
    ['Óleo de Soja 900ml','7891234567805',8.9,26,'Mercearia','🫗','un.',6.5],
    ['Água Mineral 500ml','7891234567806',1.5,60,'Bebidas','💧','un.',0.8]
  ].map(([name,barcode,price,stock,category,icon,unit,cost]) => ({id:uid(),name,barcode,price,stock,category,icon,unit,cost,showcase:false,active:true}));

  let products = read('tag-products', []);
  if (!Array.isArray(products)) products = [];
  products = products.map(p => ({category:'Outros',icon:'📦',unit:'un.',cost:0,active:true,showcase:false,...p}));
  let storedCategories = read('tag-categories-v05', []);
  if (!Array.isArray(storedCategories)) storedCategories = [];
  const productCategories = [...new Set(products.map(p => String(p.category || 'Outros').trim()).filter(Boolean))];
  let categories = [...new Set(['Outros', ...storedCategories, ...productCategories])].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  let promotions = read('tag-promotions-v05', []);
  if (!Array.isArray(promotions)) promotions = [];

  if (!localStorage.getItem('tag-v02-seeded') && products.length <= 4) {
    const existingBars = new Set(products.map(p => String(p.barcode || '')));
    demoProducts.forEach(p => { if (!existingBars.has(String(p.barcode))) products.push(p); });
    localStorage.setItem('tag-v02-seeded', '1');
  }

  let localStaff = read('tag-staff-v09', []);
  if(!Array.isArray(localStaff)) localStaff=[];
  if(!localStaff.length){
    const ownerId='local-owner';
    localStaff=[{
      id:ownerId,userId:null,name:'Proprietário',email:'',whatsapp:'',
      role:'owner',active:true,permissions:rolePermissions('owner'),source:'local'
    }];
  } else {
    localStaff=localStaff.map(member=>({
      role:'editor',active:true,permissions:rolePermissions(member.role||'editor'),source:'local',...member,
      permissions:{...rolePermissions(member.role||'editor'),...(member.permissions||{})}
    }));
  }

  const state = {
    products,
    customers: read('tag-customers', [
      {id:uid(),name:'João da Silva',whatsapp:'(87) 99999-1234',limit:500,debt:265.80},
      {id:uid(),name:'Maria Aparecida',whatsapp:'(87) 98888-4567',limit:400,debt:120},
      {id:uid(),name:'José Oliveira',whatsapp:'(87) 97777-7777',limit:300,debt:0},
      {id:uid(),name:'Ana Paula Santos',whatsapp:'(87) 96666-8888',limit:300,debt:89.50}
    ]),
    sales: read('tag-sales', []),
    payments: read('tag-payments', []),
    openSales: read('tag-open-sales', []),
    settings: read('tag-settings', {storeName:'Frigorífico Boi Bom',operator:'Proprietário',currentStaffId:'local-owner'}),
    staff: localStaff,
    central: read('tag-central-v09', {storeId:'',storeName:'',connected:false,lastSync:null}),
    centralStores: [],
    centralSession: null,
    centralMembership: null,
    cash: read('tag-cash', {open:false,opening:0,openedAt:null}),
    cart: [],
    discount: 0,
    surcharge: 0,
    payment: '',
    selectedCustomerId: '',
    selectedManageProductId: '',
    selectedCustomerDetailId: '',
    catalogFilter: 'all',
    manageProductCategoryFilter: '',
    stockCategoryFilter: '',
    promotions,
    categories,
    saleStartedAt: new Date(),
    saleId: nextSaleId()
  };

  function nextSaleId() {
    const all = read('tag-sales', []);
    return `#${String((Array.isArray(all) ? all.length : 0) + 1).padStart(6, '0')}`;
  }
  function persist() {
    write('tag-products', state.products); write('tag-customers', state.customers); write('tag-sales', state.sales);
    write('tag-payments', state.payments); write('tag-open-sales', state.openSales); write('tag-settings', state.settings); write('tag-cash', state.cash);
    write('tag-categories-v05', state.categories); write('tag-promotions-v05', state.promotions);
    write('tag-staff-v09', state.staff); write('tag-central-v09', state.central);
  }
  function cartSubtotal(){ return state.cart.reduce((a,i)=>a + Number(i.price||0)*Number(i.qty||0),0); }
  function cartTotal(){ return Math.max(0, cartSubtotal() - Number(state.discount||0) + Number(state.surcharge||0)); }
  function soldItemsToday(){ return state.sales.filter(s=>String(s.createdAt).slice(0,10)===todayKey()).reduce((a,s)=>a+s.items.reduce((n,i)=>n+Number(i.qty||0),0),0); }
  function salesToday(){ return state.sales.filter(s=>String(s.createdAt).slice(0,10)===todayKey()); }
  function iconForProduct(p){ return p.icon || (/carne|picanha|filé|file|alcatra|coxão/i.test(p.name)?'🥩':/bebida|refrigerante/i.test(p.category+' '+p.name)?'🥤':/queijo/i.test(p.name)?'🧀':'📦'); }

  function promoDateValue(value){
    if(!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  function promotionStatus(promo){
    if(!promo || promo.active===false) return 'paused';
    const now = new Date();
    const start = promoDateValue(promo.startAt);
    const end = promoDateValue(promo.endAt);
    if(start && now < start) return 'scheduled';
    if(end && now > end) return 'expired';
    return 'active';
  }
  function promotionStatusLabel(status){
    return ({active:'Ativa',scheduled:'Agendada',expired:'Encerrada',paused:'Pausada'})[status] || status;
  }
  function activePromotionsForProduct(productId){
    return state.promotions
      .filter(p => promotionStatus(p)==='active' && Array.isArray(p.productIds) && p.productIds.includes(productId))
      .sort((a,b)=>Number(b.discountPercent||0)-Number(a.discountPercent||0));
  }
  function activePromotionForProduct(product){
    return activePromotionsForProduct(product.id)[0] || null;
  }
  function productSalePrice(product){
    const promo = activePromotionForProduct(product);
    const base = Number(product.price||0);
    if(!promo) return base;
    return Math.max(0, base * (1 - Number(promo.discountPercent||0)/100));
  }
  function productPriceMarkup(product){
    const promo = activePromotionForProduct(product);
    if(!promo) return `<strong>${money(product.price)}</strong>`;
    return `<span class="promo-badge">-${Number(promo.discountPercent||0).toLocaleString('pt-BR')}%</span><span class="price-old">${money(product.price)}</span><strong class="price-promo">${money(productSalePrice(product))}</strong>`;
  }
  function syncCategoryState(){
    const fromProducts = state.products.map(p=>String(p.category||'Outros').trim()).filter(Boolean);
    state.categories = [...new Set(['Outros', ...(state.categories||[]), ...fromProducts])].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  }
  function localDateTimeInputValue(date = new Date()){
    const local = new Date(date.getTime() - date.getTimezoneOffset()*60000);
    return local.toISOString().slice(0,16);
  }


  function currentStaff(){
    const selected=state.staff.find(member=>member.id===state.settings.currentStaffId && member.active!==false);
    return selected || state.staff.find(member=>member.role==='owner' && member.active!==false) || state.staff.find(member=>member.active!==false) || null;
  }
  function canAccess(permission){
    const member=currentStaff();
    if(!member) return true;
    if(member.role==='owner') return true;
    return member.active!==false && member.permissions?.[permission]===true;
  }
  const ROUTE_PERMISSION = {
    pos:'sell', customers:'customers', products:'products', stock:'stock',
    promotions:'promotions', history:'reports', reports:'reports',
    cash:'cash', staff:'staff', settings:'settings'
  };
  function applyAccessVisibility(){
    $$('[data-route]').forEach(button=>{
      const permission=ROUTE_PERMISSION[button.dataset.route];
      if(!permission) return;
      button.hidden=!canAccess(permission);
    });
    const member=currentStaff();
    if($('currentOperatorRole')) $('currentOperatorRole').textContent = member ? `${roleLabel(member.role)} · ${member.name}` : 'Operador';
  }
  function initials(name=''){
    return String(name||'TA').trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase() || 'TA';
  }



  function navigate(route) {
    const required=ROUTE_PERMISSION[route];
    if(required && !canAccess(required)){
      alert('Este operador não tem permissão para abrir esta área.');
      return;
    }
    $$('.view').forEach(v => v.classList.toggle('active', v.dataset.view === route));
    $$('.side-route').forEach(b => b.classList.toggle('active', b.dataset.route === route));
    if(route==='pos') renderPos();
    if(route==='customers') renderCustomers();
    if(route==='products') renderManageProducts();
    if(route==='stock') renderStock();
    if(route==='promotions') renderPromotions();
    if(route==='history') renderHistory();
    if(route==='reports') renderReports();
    if(route==='cash') renderCash();
    if(route==='staff') renderStaff();
    if(route==='settings') renderSettings();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function renderSidebar(){
    const sales = salesToday();
    $('sideSales').textContent = money(sales.reduce((a,s)=>a+Number(s.total||0),0));
    $('sideReceipts').textContent = money(sales.filter(s=>s.payment!=='ficha').reduce((a,s)=>a+Number(s.total||0),0) + state.payments.filter(p=>String(p.createdAt).slice(0,10)===todayKey()).reduce((a,p)=>a+Number(p.amount||0),0));
    $('sideCredit').textContent = money(state.customers.reduce((a,c)=>a+Number(c.debt||0),0));
    $('sideItems').textContent = soldItemsToday().toLocaleString('pt-BR');
    $('sideOrders').textContent = String(sales.length);
    $('openSaleBadge').textContent = String(state.openSales.length);
    $('storeName').textContent = state.settings.storeName || 'Minha Loja';
    applyAccessVisibility();
  }

  function renderPos(){
    $('saleId').textContent = state.saleId;
    $('saleStarted').textContent = state.saleStartedAt.toLocaleString('pt-BR', {dateStyle:'short',timeStyle:'short'});
    renderCategories(); renderCatalog(); renderCart(); renderCheckoutCustomers(); renderSidebar();
  }
  function renderCategories(){
    syncCategoryState();
    $('categoryFilter').innerHTML = '<option value="">Categorias</option>' + state.categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
  }
  function filteredProducts(){
    const term = String($('productSearch').value || '').trim().toLowerCase();
    const category = $('categoryFilter').value;
    let list = state.products.filter(p=>p.active!==false);
    if(term) list = list.filter(p=>`${p.name} ${p.barcode||''}`.toLowerCase().includes(term));
    if(category) list = list.filter(p=>(p.category||'Outros')===category);
    if(state.catalogFilter==='stock') list = list.filter(p=>Number(p.stock||0)>0);
    if(state.catalogFilter==='recent') list = list.slice(-8).reverse();
    if(state.catalogFilter==='loose') list = [];
    return list;
  }
  function renderCatalog(){
    const list = filteredProducts();
    $('productGrid').innerHTML = list.map(p=>`<button class="product-card" data-product-id="${p.id}"><div class="product-visual">${iconForProduct(p)}</div><h3>${esc(p.name)}</h3>${productPriceMarkup(p)}<small>${formatQty(p.stock,p.unit)} ${esc(p.unit||'un.')}</small></button>`).join('') || '<div class="empty-state" style="grid-column:1/-1;min-height:180px">Nenhum produto encontrado.</div>';
  }
  function addProductToCart(product, qty=1){
    qty = parseQty(qty);
    if(qty <= 0) return;
    if((product.unit||'un.') === 'un.') qty = Math.max(1, Math.round(qty));
    const existing = state.cart.find(i=>i.productId===product.id && !i.loose);
    const nextQty = Number(existing?.qty || 0) + qty;
    if(nextQty > Number(product.stock||0)){
      return alert(`Estoque insuficiente. Disponível: ${formatQty(product.stock, product.unit)} ${product.unit||'un.'}.`);
    }
    const promo = activePromotionForProduct(product);
    const salePrice = productSalePrice(product);
    if(existing){
      existing.qty = Number(nextQty.toFixed(3));
      existing.price = salePrice;
      existing.basePrice = Number(product.price||0);
      existing.promotionId = promo?.id || null;
      existing.discountPercent = Number(promo?.discountPercent||0);
    } else {
      state.cart.push({id:uid(),productId:product.id,name:product.name,price:salePrice,basePrice:Number(product.price||0),promotionId:promo?.id||null,discountPercent:Number(promo?.discountPercent||0),qty:Number(qty.toFixed(3)),unit:product.unit||'un.',loose:false});
    }
    renderCart();
  }

  function openQuantityDialog(product){
    if(!product) return;
    $('quantityProductId').value = product.id;
    $('quantityProductName').textContent = product.name;
    const promo = activePromotionForProduct(product);
    $('quantityProductInfo').textContent = promo ? `${money(productSalePrice(product))} por ${product.unit||'un.'} · promoção -${Number(promo.discountPercent||0).toLocaleString('pt-BR')}%` : `${money(product.price)} por ${product.unit||'un.'}`;
    $('quantityUnit').textContent = product.unit||'un.';
    $('quantityValue').value = isFractionalUnit(product.unit) ? '1,000' : '1';
    $('quantityStockHint').textContent = `Estoque disponível: ${formatQty(product.stock, product.unit)} ${product.unit||'un.'}`;
    $('quantityStockHint').classList.remove('quantity-warning');
    updateQuantityPreview();
    $('quantityDialog').showModal();
    setTimeout(()=>{$('quantityValue').focus();$('quantityValue').select();},50);
  }

  function updateQuantityPreview(){
    const product = state.products.find(p=>p.id===$('quantityProductId').value);
    if(!product) return;
    const qty = parseQty($('quantityValue').value);
    $('quantityItemTotal').textContent = money(productSalePrice(product) * Math.max(0, qty));
    const invalid = qty <= 0 || qty > Number(product.stock||0) || ((product.unit||'un.') === 'un.' && !Number.isInteger(qty));
    $('quantityStockHint').classList.toggle('quantity-warning', invalid);
    if(qty <= 0) $('quantityStockHint').textContent = 'Digite uma quantidade maior que zero.';
    else if((product.unit||'un.') === 'un.' && !Number.isInteger(qty)) $('quantityStockHint').textContent = 'Produtos por unidade precisam usar quantidade inteira.';
    else if(qty > Number(product.stock||0)) $('quantityStockHint').textContent = `Quantidade maior que o estoque. Disponível: ${formatQty(product.stock, product.unit)} ${product.unit||'un.'}.`;
    else $('quantityStockHint').textContent = `Estoque disponível: ${formatQty(product.stock, product.unit)} ${product.unit||'un.'}`;
  }

  function addSelectedQuantity(){
    const product = state.products.find(p=>p.id===$('quantityProductId').value);
    if(!product) return false;
    const qty = parseQty($('quantityValue').value);
    if(qty <= 0){ alert('Digite uma quantidade maior que zero.'); return false; }
    if((product.unit||'un.') === 'un.' && !Number.isInteger(qty)){ alert('Para produtos por unidade, use 1, 2, 3...'); return false; }
    const existing = state.cart.find(i=>i.productId===product.id && !i.loose);
    if(Number(existing?.qty || 0) + qty > Number(product.stock||0)){
      alert(`Estoque insuficiente. Disponível: ${formatQty(product.stock, product.unit)} ${product.unit||'un.'}.`);
      return false;
    }
    addProductToCart(product, qty);
    return true;
  }
  function renderCart(){
    $('cartCount').textContent = String(state.cart.length);
    $('emptyCart').hidden = state.cart.length>0;
    $('cartRows').innerHTML = state.cart.map((i,index)=>`<tr><td>${esc(i.name)}${i.loose?'<small> (avulso)</small>':''}</td><td><span class="qty-control"><button data-dec="${index}" aria-label="Diminuir">−</button><input class="qty-input" data-qty-input="${index}" inputmode="${isFractionalUnit(i.unit)?'decimal':'numeric'}" value="${formatQty(i.qty,i.unit)}"><span class="qty-unit">${esc(i.unit||'un.')}</span><button data-inc="${index}" aria-label="Aumentar">+</button></span></td><td>${money(i.price)}<small style="display:block;color:#7b858a">/${esc(i.unit||'un.')}</small></td><td>${money(i.price*i.qty)}</td><td><button class="remove-item" data-remove="${index}">⌫</button></td></tr>`).join('');
    const subtotal=cartSubtotal(), total=cartTotal();
    $('subtotal').textContent = money(subtotal); $('grandTotal').textContent = money(total);
    $('checkoutSubtotal').textContent=money(subtotal); $('checkoutDiscount').textContent=money(state.discount); $('checkoutSurcharge').textContent=money(state.surcharge); $('checkoutTotal').textContent=money(total);
    updateCashChange();
  }
  function renderCheckoutCustomers(){
    $('checkoutCustomer').innerHTML='<option value="">Selecione o cliente</option>'+state.customers.map(c=>`<option value="${c.id}" ${c.id===state.selectedCustomerId?'selected':''}>${esc(c.name)} — ${money(c.debt||0)}</option>`).join('');
  }
  function updateCashChange(){
    const box=$('cashChangeBox');
    if(!box) return;
    const isCash=state.payment==='dinheiro';
    box.hidden=!isCash;
    if(!isCash) return;
    const received=Number($('cashReceivedInput').value||0);
    const total=cartTotal();
    const change=Math.max(0,received-total);
    $('cashChangeValue').textContent=money(change);
    const enough=received>=total && total>0;
    box.classList.toggle('invalid',received>0 && !enough);
    $('cashChangeStatus').textContent = received<=0
      ? 'Digite quanto o cliente entregou.'
      : enough
        ? `Recebido ${money(received)} · troco ${money(change)}`
        : `Faltam ${money(total-received)} para completar o pagamento.`;
  }

  function clearSale(confirmFirst=true){
    if(confirmFirst && state.cart.length && !confirm('Limpar a venda atual?')) return;
    state.cart=[];state.discount=0;state.surcharge=0;state.payment='';state.selectedCustomerId='';state.saleStartedAt=new Date();state.saleId=nextSaleId();
    $('discountInput').value='0';$('surchargeInput').value='0';$$('[data-payment]').forEach(b=>b.classList.remove('active'));$('paymentHint').textContent='Selecione a forma de pagamento para confirmar a venda.';if($('cashReceivedInput'))$('cashReceivedInput').value='';if($('cashChangeBox'))$('cashChangeBox').hidden=true;renderPos();
  }
  function saveOpenSale(){
    if(!state.cart.length) return alert('Adicione itens antes de salvar a venda.');
    state.openSales.push({id:uid(),saleId:state.saleId,createdAt:new Date().toISOString(),cart:structuredClone(state.cart),discount:state.discount,surcharge:state.surcharge});persist();renderSidebar();alert('Venda salva em aberto.');
  }
  function choosePayment(payment){
    state.payment=payment;$$('[data-payment]').forEach(b=>b.classList.toggle('active',b.dataset.payment===payment));
    $('paymentHint').textContent = payment==='ficha' ? 'Ao selecionar Ficha, a venda será lançada na conta do cliente.' : payment==='dinheiro' ? 'Informe quanto o cliente entregou para calcular o troco.' : `Pagamento selecionado: ${payment}.`;
    if(payment!=='dinheiro' && $('cashReceivedInput')) $('cashReceivedInput').value='';
    updateCashChange();
    if(payment==='dinheiro') setTimeout(()=>$('cashReceivedInput')?.focus(),50);
  }
  function confirmSale(){
    if(!state.cart.length) return alert('A venda está vazia.');
    if(!state.payment) return alert('Selecione uma forma de pagamento.');
    let cashReceived=null, cashChange=null;
    if(state.payment==='dinheiro'){
      cashReceived=Number($('cashReceivedInput')?.value||0);
      const total=cartTotal();
      if(cashReceived<=0) return alert('Informe quanto o cliente entregou em dinheiro.');
      if(cashReceived<total) return alert(`O valor recebido é menor que o total. Faltam ${money(total-cashReceived)}.`);
      cashChange=Math.max(0,cashReceived-total);
    }
    for(const item of state.cart){
      if(item.loose || !item.productId) continue;
      const product=state.products.find(p=>p.id===item.productId);
      if(!product) return alert(`Produto não encontrado no estoque: ${item.name}.`);
      if(Number(item.qty||0)>Number(product.stock||0)) return alert(`Estoque insuficiente para ${item.name}. Disponível: ${formatQty(product.stock,product.unit)} ${product.unit||'un.'}.`);
    }
    let customer=null;
    if(state.payment==='ficha'){
      const cid=$('checkoutCustomer').value; customer=state.customers.find(c=>c.id===cid);
      if(!customer) return alert('Selecione o cliente para vender na ficha.');
      const total=cartTotal();
      if(Number(customer.limit||0)>0 && Number(customer.debt||0)+total>Number(customer.limit||0)) return alert('A venda ultrapassa o limite de crédito deste cliente.');
      customer.debt=Number(customer.debt||0)+total; state.selectedCustomerId=customer.id;
    }
    state.cart.forEach(i=>{if(i.loose)return;const p=state.products.find(p=>p.id===i.productId);if(p)p.stock=Math.max(0,Number(p.stock||0)-Number(i.qty||0));});
    const operator=currentStaff();
    const sale={id:uid(),saleId:state.saleId,createdAt:new Date().toISOString(),startedAt:state.saleStartedAt.toISOString(),items:structuredClone(state.cart),subtotal:cartSubtotal(),discount:Number(state.discount||0),surcharge:Number(state.surcharge||0),total:cartTotal(),payment:state.payment,cashReceived,cashChange,customerId:customer?.id||null,dueDate:$('checkoutDueDate').value||null,note:$('checkoutNote').value.trim(),operatorId:operator?.id||null,operatorName:operator?.name||state.settings.operator||'Operador'};
    state.sales.push(sale);persist();const total=sale.total;const cashMessage=sale.payment==='dinheiro'?`\nRecebido: ${money(sale.cashReceived)}\nTroco: ${money(sale.cashChange)}`:'';clearSale(false);renderSidebar();alert(`Venda concluída: ${money(total)}${cashMessage}`);
  }

  function renderCustomers(){
    const term=String($('customerSearch')?.value||'').toLowerCase();
    const list=state.customers.filter(c=>`${c.name} ${c.whatsapp||''}`.toLowerCase().includes(term));
    $('customerList').innerHTML=list.map(c=>`<div class="customer-row ${c.id===state.selectedCustomerDetailId?'active':''}" data-customer-id="${c.id}"><div class="customer-avatar">${esc(c.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase())}</div><div><b>${esc(c.name)}</b><small>${esc(c.whatsapp||'Sem WhatsApp')}</small></div><div class="customer-balance"><span>Saldo em aberto</span><strong class="${Number(c.debt||0)<=0?'ok':''}">${money(c.debt||0)}</strong></div></div>`).join('')||'<div class="empty-state">Nenhum cliente encontrado.</div>';
    renderCustomerDetail();
  }
  function customerMovements(customer){
    const sales=state.sales.filter(s=>s.customerId===customer.id).map(s=>({date:s.createdAt,desc:`Compra PDV ${s.saleId}`,type:'Compra',value:s.total,kind:'debit'}));
    const pays=state.payments.filter(p=>p.customerId===customer.id).map(p=>({date:p.createdAt,desc:p.note||'Pagamento',type:'Pagamento',value:p.amount,kind:'credit'}));
    return [...sales,...pays].sort((a,b)=>new Date(b.date)-new Date(a.date));
  }
  function renderCustomerDetail(){
    const c=state.customers.find(c=>c.id===state.selectedCustomerDetailId);
    if(!c){$('customerDetail').innerHTML='<div class="empty-state">Selecione um cliente para abrir a ficha.</div>';return;}
    const sales=state.sales.filter(s=>s.customerId===c.id);const paid=state.payments.filter(p=>p.customerId===c.id).reduce((a,p)=>a+Number(p.amount||0),0);const bought=sales.reduce((a,s)=>a+Number(s.total||0),0);
    const mov=customerMovements(c);
    $('customerDetail').innerHTML=`<div class="detail-header"><div class="customer-avatar">${esc(c.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase())}</div><div><h2>${esc(c.name)}</h2><p>${esc(c.whatsapp||'Sem WhatsApp')}</p><p>Limite de crédito: <b>${money(c.limit||0)}</b></p></div><div class="balance-big"><span>Saldo em aberto</span><strong>${money(c.debt||0)}</strong></div></div><div class="detail-kpis"><div><span>Total comprado</span><strong>${money(bought)}</strong></div><div><span>Total pago</span><strong style="color:#0b8f4f">${money(paid)}</strong></div><div><span>Saldo em aberto</span><strong style="color:#d33f3f">${money(c.debt||0)}</strong></div></div><table class="movements"><thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>${mov.map(m=>`<tr><td>${new Date(m.date).toLocaleDateString('pt-BR')}</td><td>${esc(m.desc)}</td><td>${m.type}</td><td style="color:${m.kind==='credit'?'#0b8f4f':'#d33f3f'}">${money(m.value)}</td></tr>`).join('')||'<tr><td colspan="4">Sem movimentações.</td></tr>'}</tbody></table><div class="detail-actions"><button class="green" data-receive-payment="${c.id}">Receber Pagamento</button><button class="green" data-sale-to-customer="${c.id}" style="background:#fff;color:#087b45;border:1px solid #0b8f4f">Nova Venda na Ficha</button></div>`;
  }
  function openCustomerDialog(c=null){$('customerId').value=c?.id||'';$('customerName').value=c?.name||'';$('customerWhatsapp').value=c?.whatsapp||'';$('customerLimit').value=c?.limit??0;$('customerDialog').showModal();}
  function saveCustomer(){const id=$('customerId').value||uid();const prev=state.customers.find(c=>c.id===id);const obj={id,name:$('customerName').value.trim(),whatsapp:$('customerWhatsapp').value.trim(),limit:Number($('customerLimit').value||0),debt:Number(prev?.debt||0)};const idx=state.customers.findIndex(c=>c.id===id);if(idx>=0)state.customers[idx]=obj;else state.customers.push(obj);state.selectedCustomerDetailId=id;persist();renderCustomers();renderCheckoutCustomers();renderSidebar();}
  function openPayment(c){$('paymentCustomerName').textContent=`${c.name} — saldo ${money(c.debt||0)}`;$('paymentAmount').value='';$('paymentNote').value='';$('paymentDialog').dataset.customerId=c.id;$('paymentDialog').showModal();}
  function savePayment(){const c=state.customers.find(c=>c.id===$('paymentDialog').dataset.customerId);if(!c)return;const amount=Number($('paymentAmount').value||0);if(amount<=0)return;if(amount>Number(c.debt||0) && !confirm('O valor é maior que o saldo em aberto. Continuar?'))return;c.debt=Math.max(0,Number(c.debt||0)-amount);state.payments.push({id:uid(),customerId:c.id,amount,createdAt:new Date().toISOString(),note:$('paymentNote').value.trim()});persist();renderCustomers();renderSidebar();}

  function renderManageProductCategories(){
    syncCategoryState();
    const selected=state.manageProductCategoryFilter || '';
    $('manageProductsAllCategory')?.classList.toggle('active',!selected);
    if(!$('manageProductCategoryChips')) return;
    $('manageProductCategoryChips').innerHTML=state.categories.map(c=>{
      const count=state.products.filter(p=>(p.category||'Outros')===c).length;
      return `<button class="category-pill ${selected===c?'active':''}" data-manage-category="${esc(c)}">${esc(c)} (${count})</button>`;
    }).join('');
  }

  function renderManageProducts(){
    renderManageProductCategories();
    const term=String($('manageProductSearch')?.value||'').toLowerCase().trim();
    const selectedCategory=state.manageProductCategoryFilter || '';
    let list=state.products.filter(p=>`${p.name} ${p.barcode||''} ${p.sku||''} ${p.category||''}`.toLowerCase().includes(term));
    if(selectedCategory) list=list.filter(p=>(p.category||'Outros')===selectedCategory);

    const renderRow=(p)=>`<div class="manage-product-row ${p.id===state.selectedManageProductId?'active':''}" data-manage-product="${p.id}">
      <div class="product-visual" style="width:42px;height:42px;font-size:27px">${iconForProduct(p)}</div>
      <div class="manage-product-main">
        <b>${esc(p.name)}</b>
        <small><span class="manage-category-name">${esc(p.category||'Outros')}</span> · ${esc(p.barcode||'Sem código')} · ${money(p.price)}</small>
      </div>
      <strong>${formatQty(p.stock,p.unit)} ${esc(p.unit||'un.')}</strong>
      <button type="button" class="manage-edit-button" data-edit-manage-product="${p.id}">Editar</button>
    </div>`;

    if(!list.length){
      $('manageProductList').innerHTML='<div class="empty-state">Nenhum produto encontrado nesta categoria.</div>';
    }else if(selectedCategory){
      $('manageProductList').innerHTML=`<div class="manage-category-heading">${esc(selectedCategory)} <span>${list.length}</span></div>${list.map(renderRow).join('')}`;
    }else{
      const groups=[...new Set(list.map(p=>p.category||'Outros'))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
      $('manageProductList').innerHTML=groups.map(category=>{
        const items=list.filter(p=>(p.category||'Outros')===category);
        return `<div class="manage-category-heading">${esc(category)} <span>${items.length}</span></div>${items.map(renderRow).join('')}`;
      }).join('');
    }
    renderProductEditor();
  }

  function renderProductEditor(newMode=false){
    const p=newMode?{id:'',name:'',barcode:'',sku:'',category:state.manageProductCategoryFilter||'Outros',price:0,cost:0,stock:0,unit:'un.',showcase:false,active:true,icon:'📦'}:state.products.find(p=>p.id===state.selectedManageProductId);
    if(!p){
      $('productEditor').classList.remove('mobile-open');
      $('productEditor').innerHTML='<div class="empty-state">Selecione um produto ou clique em Novo Produto.</div>';
      return;
    }
    syncCategoryState();
    const promo=activePromotionForProduct(p);
    const categoryOptions=state.categories.map(c=>`<option value="${esc(c)}" ${c===(p.category||'Outros')?'selected':''}>${esc(c)}</option>`).join('');
    $('productEditor').innerHTML=`<div class="editor-title"><button type="button" class="editor-back-button" id="productEditorBackButton">← Voltar</button><div class="product-visual">${iconForProduct(p)}</div><div><h2>${esc(p.name||'Novo produto')}</h2><small>${esc(p.unit||'un.')} · ${p.active!==false?'Ativo':'Inativo'}${promo?` · Promoção ${Number(promo.discountPercent||0).toLocaleString('pt-BR')}%`:''}</small></div></div><form id="editorForm" class="editor-form"><input type="hidden" id="editProductId" value="${esc(p.id)}"><label>Nome<input id="editProductName" value="${esc(p.name)}" required></label><label>Categoria<select id="editProductCategory">${categoryOptions}</select></label><label>Código de Barras (EAN/GTIN)<input id="editProductBarcode" value="${esc(p.barcode||'')}"></label><label>Código Interno (SKU)<input id="editProductSku" value="${esc(p.sku||'')}"></label><label>Preço de Venda (R$)<input id="editProductPrice" type="number" min="0" step="0.01" value="${Number(p.price||0)}"></label><label>Custo (R$)<input id="editProductCost" type="number" min="0" step="0.01" value="${Number(p.cost||0)}"></label><label>Estoque Atual<input id="editProductStock" type="number" min="0" step="0.001" value="${Number(p.stock||0)}"></label><label>Unidade<select id="editProductUnit"><option ${p.unit==='un.'?'selected':''}>un.</option><option ${p.unit==='kg'?'selected':''}>kg</option><option ${p.unit==='g'?'selected':''}>g</option><option ${p.unit==='L'?'selected':''}>L</option></select></label><label class="toggle-line wide"><span>Mostrar no Tem Aqui</span><input id="editProductShowcase" type="checkbox" ${p.showcase?'checked':''}></label><label class="toggle-line wide"><span>Produto ativo</span><input id="editProductActive" type="checkbox" ${p.active!==false?'checked':''}></label>${promo?`<div class="wide promotion-preview"><b>Promoção ativa:</b> ${esc(promo.name)} · ${Number(promo.discountPercent||0).toLocaleString('pt-BR')}% · preço atual ${money(productSalePrice(p))}</div>`:''}<div class="editor-actions"><button type="button" class="dark" id="cancelProductEdit">Cancelar</button><button class="green" type="submit">Salvar Alterações</button></div></form>`;
    if(window.matchMedia('(max-width:900px)').matches) $('productEditor').classList.add('mobile-open');
    else $('productEditor').classList.remove('mobile-open');
    const closeProductEditor=()=>{state.selectedManageProductId='';$('productEditor').classList.remove('mobile-open');renderManageProducts();};
    $('editorForm').addEventListener('submit',e=>{e.preventDefault();saveManagedProduct();});
    $('cancelProductEdit').addEventListener('click',closeProductEditor);
    $('productEditorBackButton').addEventListener('click',closeProductEditor);
  }
  function saveManagedProduct(){
    const id=$('editProductId').value||uid();const prev=state.products.find(p=>p.id===id);const obj={id,name:$('editProductName').value.trim(),category:$('editProductCategory').value.trim()||'Outros',barcode:$('editProductBarcode').value.trim(),sku:$('editProductSku').value.trim(),price:Number($('editProductPrice').value||0),cost:Number($('editProductCost').value||0),stock:Number($('editProductStock').value||0),unit:$('editProductUnit').value,showcase:$('editProductShowcase').checked,active:$('editProductActive').checked,icon:prev?.icon||'📦'};const idx=state.products.findIndex(p=>p.id===id);if(idx>=0)state.products[idx]=obj;else state.products.push(obj);state.selectedManageProductId=id;syncCategoryState();persist();renderManageProducts();renderCategories();renderCatalog();renderSidebar();
  }

  function renderStock(){
    syncCategoryState();
    const selected=state.stockCategoryFilter || '';
    const list=selected ? state.products.filter(p=>(p.category||'Outros')===selected) : state.products;
    const totalCost=list.reduce((sum,p)=>sum+Number(p.cost||0)*Number(p.stock||0),0);
    const totalSale=list.reduce((sum,p)=>sum+Number(p.price||0)*Number(p.stock||0),0);
    const low=list.filter(p=>Number(p.stock||0)<=5).length;
    $('stockSummary').innerHTML=`<article><span>Produtos</span><strong>${list.length}</strong></article><article><span>Estoque baixo</span><strong>${low}</strong></article><article><span>Custo estimado</span><strong>${money(totalCost)}</strong></article><article><span>Valor de venda</span><strong>${money(totalSale)}</strong></article>`;
    $('showAllStockButton').classList.toggle('active',!selected);
    $('stockCategoryChips').innerHTML=state.categories.map(c=>{
      const count=state.products.filter(p=>(p.category||'Outros')===c).length;
      return `<span class="category-chip ${selected===c?'active':''}"><button data-stock-category="${esc(c)}">${esc(c)} (${count})</button><button class="category-edit" data-edit-category="${esc(c)}" aria-label="Editar categoria">✎</button></span>`;
    }).join('');
    const note=selected?`<p class="stock-filter-note">Mostrando somente a categoria <b>${esc(selected)}</b>.</p>`:'';
    $('stockTable').innerHTML=`${note}<table class="simple-table"><thead><tr><th>Produto</th><th>Categoria</th><th>Código</th><th>Estoque</th><th>Custo</th><th>Preço normal</th><th>Preço atual</th><th>Promoção</th></tr></thead><tbody>${list.map(p=>{
      const promo=activePromotionForProduct(p);
      return `<tr><td>${esc(p.name)}</td><td>${esc(p.category||'Outros')}</td><td>${esc(p.barcode||'-')}</td><td>${formatQty(p.stock,p.unit)} ${esc(p.unit||'un.')}</td><td>${money(p.cost||0)}</td><td>${money(p.price||0)}</td><td>${promo?`<b class="price-promo">${money(productSalePrice(p))}</b>`:money(p.price||0)}</td><td>${promo?`<span class="stock-promo-badge">-${Number(promo.discountPercent||0).toLocaleString('pt-BR')}%</span>`:'—'}</td></tr>`;
    }).join('')||'<tr><td colspan="8">Nenhum produto nesta categoria.</td></tr>'}</tbody></table>`;
  }

  function openCategoryDialog(name=''){
    $('categoryOriginalName').value=name;
    $('categoryName').value=name;
    $('categoryDialogTitle').textContent=name?'Editar categoria':'Nova categoria';
    $('categoryDialog').showModal();
    setTimeout(()=>$('categoryName').focus(),50);
  }
  function saveCategory(){
    const original=$('categoryOriginalName').value.trim();
    const name=$('categoryName').value.trim();
    if(!name) return false;
    const duplicate=state.categories.some(c=>c.toLowerCase()===name.toLowerCase() && c!==original);
    if(duplicate){alert('Já existe uma categoria com esse nome.');return false;}
    if(original && original!==name){
      state.products.forEach(p=>{if((p.category||'Outros')===original)p.category=name;});
      state.categories=state.categories.map(c=>c===original?name:c);
      if(state.stockCategoryFilter===original)state.stockCategoryFilter=name;
    }else if(!state.categories.includes(name)){
      state.categories.push(name);
    }
    syncCategoryState();persist();renderStock();renderCategories();renderManageProducts();renderManageProductCategories();renderCatalog();
    return true;
  }

  function openPromotionDialog(promo=null){
    syncCategoryState();
    const now=new Date(),end=new Date(now.getTime()+24*60*60*1000);
    $('promotionId').value=promo?.id||'';
    $('promotionName').value=promo?.name||'';
    $('promotionPercent').value=Number(promo?.discountPercent||10);
    $('promotionStart').value=promo?.startAt ? localDateTimeInputValue(new Date(promo.startAt)) : localDateTimeInputValue(now);
    $('promotionEnd').value=promo?.endAt ? localDateTimeInputValue(new Date(promo.endAt)) : localDateTimeInputValue(end);
    $('promotionPublish').checked=Boolean(promo?.publishToTemAqui);
    $('promotionCategoryFilter').innerHTML='<option value="">Todas as categorias</option>'+state.categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    $('promotionCategoryFilter').value='';
    renderPromotionProductPicker(new Set(promo?.productIds||[]));
    updatePromotionPreview();
    $('promotionDialog').showModal();
  }

  function selectedPromotionProductIds(){
    return $$('#promotionProductPicker input[data-promotion-product]:checked').map(i=>i.dataset.promotionProduct);
  }

  function renderPromotionProductPicker(selectedIds=null){
    const selected=selectedIds || new Set(selectedPromotionProductIds());
    const category=$('promotionCategoryFilter').value;
    const list=category?state.products.filter(p=>(p.category||'Outros')===category):state.products;
    $('promotionProductPicker').innerHTML=list.map(p=>`<label class="promotion-product-option"><input type="checkbox" data-promotion-product="${p.id}" ${selected.has(p.id)?'checked':''}><span><b>${esc(p.name)}</b><small>${esc(p.category||'Outros')} · estoque ${formatQty(p.stock,p.unit)} ${esc(p.unit||'un.')}</small></span><strong>${money(p.price)}</strong></label>`).join('')||'<div class="empty-state">Nenhum produto nesta categoria.</div>';
  }

  function updatePromotionPreview(){
    const percent=Number($('promotionPercent').value||0);
    const count=selectedPromotionProductIds().length;
    const publish=$('promotionPublish').checked;
    const sampleId=selectedPromotionProductIds()[0];
    const sample=state.products.find(p=>p.id===sampleId);
    const sampleText=sample&&percent>0?` Exemplo: ${esc(sample.name)} de ${money(sample.price)} por ${money(Number(sample.price)*(1-percent/100))}.`:'';
    $('promotionPreview').innerHTML=`<b>${count} produto(s)</b> selecionado(s) · desconto de <b>${percent.toLocaleString('pt-BR')}%</b>${publish?' · marcada para publicar no Tem Aqui':''}.${sampleText}`;
  }

  function savePromotion(){
    const id=$('promotionId').value||uid();
    const name=$('promotionName').value.trim();
    const discountPercent=Number($('promotionPercent').value||0);
    const productIds=selectedPromotionProductIds();
    const startAt=$('promotionStart').value;
    const endAt=$('promotionEnd').value;
    if(!name){alert('Digite o nome da promoção.');return false;}
    if(!(discountPercent>0 && discountPercent<100)){alert('O desconto precisa ser maior que 0% e menor que 100%.');return false;}
    if(!productIds.length){alert('Selecione pelo menos um produto.');return false;}
    const start=new Date(startAt),end=new Date(endAt);
    if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<=start){alert('A data de término precisa ser depois da data de início.');return false;}
    const old=state.promotions.find(p=>p.id===id);
    const promo={id,name,discountPercent,productIds,startAt:start.toISOString(),endAt:end.toISOString(),publishToTemAqui:$('promotionPublish').checked,active:old?.active!==false,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    const idx=state.promotions.findIndex(p=>p.id===id);
    if(idx>=0)state.promotions[idx]=promo;else state.promotions.push(promo);
    persist();renderPromotions();renderCatalog();renderStock();renderManageProducts();
    return true;
  }

  function renderPromotions(){
    const active=state.promotions.filter(p=>promotionStatus(p)==='active').length;
    const scheduled=state.promotions.filter(p=>promotionStatus(p)==='scheduled').length;
    const ended=state.promotions.filter(p=>promotionStatus(p)==='expired').length;
    const publicCount=state.promotions.filter(p=>p.publishToTemAqui && ['active','scheduled'].includes(promotionStatus(p))).length;
    $('promotionDashboard').innerHTML=`<article><span>Ativas agora</span><strong>${active}</strong></article><article><span>Agendadas</span><strong>${scheduled}</strong></article><article><span>Encerradas</span><strong>${ended}</strong></article><article><span>Para o Tem Aqui</span><strong>${publicCount}</strong></article>`;
    const list=[...state.promotions].sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
    $('promotionList').innerHTML=list.map(p=>{
      const status=promotionStatus(p);
      const products=(p.productIds||[]).map(id=>state.products.find(prod=>prod.id===id)).filter(Boolean);
      const productTags=products.slice(0,8).map(prod=>`<span>${esc(prod.name)}</span>`).join('')+(products.length>8?`<span>+${products.length-8}</span>`:'');
      return `<article class="promotion-card"><div><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><h3>${esc(p.name)}</h3><span class="promotion-status ${status}">${promotionStatusLabel(status)}</span>${p.publishToTemAqui?'<span class="promo-badge">Tem Aqui</span>':''}</div><div class="promotion-meta"><span><b>${Number(p.discountPercent||0).toLocaleString('pt-BR')}%</b> de desconto</span><span>${new Date(p.startAt).toLocaleString('pt-BR')} → ${new Date(p.endAt).toLocaleString('pt-BR')}</span><span>${products.length} produto(s)</span></div><div class="promotion-products">${productTags}</div></div><div class="promotion-actions"><button data-edit-promotion="${p.id}">Editar</button><button data-toggle-promotion="${p.id}">${p.active===false?'Ativar':'Pausar'}</button><button class="danger-button" data-delete-promotion="${p.id}">Excluir</button></div></article>`;
    }).join('')||'<div class="data-card empty-state">Nenhuma promoção criada. Clique em Nova Promoção.</div>';
  }

  function renderHistory(){
    const rows=[...state.sales].reverse();$('historyTable').innerHTML=`<table class="simple-table"><thead><tr><th>Venda</th><th>Data</th><th>Pagamento</th><th>Itens</th><th>Total</th></tr></thead><tbody>${rows.map(s=>`<tr><td>${esc(s.saleId||s.id)}</td><td>${new Date(s.createdAt).toLocaleString('pt-BR')}</td><td>${esc(s.payment||'-')}${s.payment==='dinheiro'&&Number.isFinite(Number(s.cashReceived))?`<small style="display:block;color:#6b7780">Recebido ${money(s.cashReceived)} · Troco ${money(s.cashChange||0)}</small>`:''}</td><td>${s.items?.length||0}</td><td>${money(s.total||0)}</td></tr>`).join('')||'<tr><td colspan="5">Nenhuma venda realizada.</td></tr>'}</tbody></table>`;
  }
  function renderReports(){
    const sales=salesToday(),total=sales.reduce((a,s)=>a+Number(s.total||0),0),ticket=sales.length?total/sales.length:0,credit=state.customers.reduce((a,c)=>a+Number(c.debt||0),0);
    $('reportsContent').innerHTML=`<article><span>Vendas hoje</span><strong>${money(total)}</strong></article><article><span>Pedidos</span><strong>${sales.length}</strong></article><article><span>Ticket médio</span><strong>${money(ticket)}</strong></article><article><span>Fiado em aberto</span><strong>${money(credit)}</strong></article><article><span>Itens vendidos</span><strong>${soldItemsToday().toLocaleString('pt-BR')}</strong></article><article><span>Produtos cadastrados</span><strong>${state.products.length}</strong></article><article><span>Clientes</span><strong>${state.customers.length}</strong></article><article><span>Vendas salvas</span><strong>${state.openSales.length}</strong></article><article><span>Promoções ativas</span><strong>${state.promotions.filter(p=>promotionStatus(p)==='active').length}</strong></article><article><span>Categorias</span><strong>${state.categories.length}</strong></article>`;
  }
  function renderCash(){
    $('cashStatus').textContent=state.cash.open?`Caixa aberto desde ${new Date(state.cash.openedAt).toLocaleString('pt-BR')}`:'Caixa fechado';$('cashOpening').value=Number(state.cash.opening||0);const total=salesToday().filter(s=>s.payment!=='ficha').reduce((a,s)=>a+Number(s.total||0),0);$('cashSummary').innerHTML=`<p>Valor inicial: <b>${money(state.cash.opening||0)}</b></p><p>Recebimentos de vendas hoje: <b>${money(total)}</b></p><p>Total estimado em caixa: <b>${money(Number(state.cash.opening||0)+total)}</b></p>`;
  }
  function renderStaffPermissions(selected={}){
    if(!$('staffPermissions')) return;
    $('staffPermissions').innerHTML=ACCESS_PERMISSIONS.map(([key,label,description])=>`<label class="permission-option"><div><b>${esc(label)}</b><small>${esc(description)}</small></div><input type="checkbox" data-staff-permission="${key}" ${selected?.[key]?'checked':''}></label>`).join('');
  }

  function openStaffDialog(member=null){
    const item=member||{id:'',name:'',email:'',whatsapp:'',role:'editor',active:true,permissions:rolePermissions('editor')};
    $('staffDialogTitle').textContent=member?'Editar funcionário':'Novo funcionário';
    $('staffId').value=item.id||'';
    $('staffName').value=item.name||'';
    $('staffEmail').value=item.email||'';
    $('staffWhatsapp').value=item.whatsapp||'';
    $('staffRole').value=item.role||'editor';
    $('staffActive').checked=item.active!==false;
    renderStaffPermissions({...rolePermissions(item.role||'editor'),...(item.permissions||{})});
    $('staffDialog').showModal();
  }

  function staffPermissionsFromForm(){
    return Object.fromEntries($$('#staffPermissions [data-staff-permission]').map(input=>[input.dataset.staffPermission,input.checked]));
  }

  async function saveStaffMember(){
    const existingId=$('staffId').value;
    const role=$('staffRole').value||'editor';
    const member={
      id:existingId||uid(),
      name:$('staffName').value.trim(),
      email:$('staffEmail').value.trim().toLowerCase(),
      whatsapp:$('staffWhatsapp').value.trim(),
      role,
      active:$('staffActive').checked,
      permissions:staffPermissionsFromForm(),
      source:'local'
    };
    if(!member.name||!member.email){alert('Informe nome e e-mail do funcionário.');return false;}

    if(window.GestaoBackend?.isConfigured?.() && state.centralSession && state.central.storeId){
      try{
        const result=await window.GestaoBackend.saveMember(state.central.storeId,member);
        member.source='central';
        if(result?.user_id) member.userId=result.user_id;
        if(result?.pending) member.pending=true;
      }catch(error){
        console.error(error);
        alert(`Não foi possível salvar no banco central: ${error.message||error}`);
        return false;
      }
    }

    const idx=state.staff.findIndex(item=>item.id===member.id || (member.email && item.email===member.email));
    if(idx>=0) state.staff[idx]={...state.staff[idx],...member}; else state.staff.push(member);
    persist();renderStaff();renderSettings();applyAccessVisibility();
    return true;
  }

  function rolePermissionNames(member){
    return ACCESS_PERMISSIONS.filter(([key])=>member.permissions?.[key]).map(([,label])=>label);
  }

  function renderStaff(){
    const active=state.staff.filter(member=>member.active!==false).length;
    const managers=state.staff.filter(member=>member.active!==false&&member.role==='manager').length;
    const editors=state.staff.filter(member=>member.active!==false&&member.role==='editor').length;
    const central=state.staff.filter(member=>member.source==='central').length;
    $('staffSummary').innerHTML=`<article><span>Equipe ativa</span><strong>${active}</strong></article><article><span>Gerentes</span><strong>${managers}</strong></article><article><span>Funcionários</span><strong>${editors}</strong></article><article><span>No banco central</span><strong>${central}</strong></article>`;
    $('staffList').innerHTML=state.staff.map(member=>{
      const perms=rolePermissionNames(member);
      return `<article class="staff-card"><div><div class="staff-person"><div class="staff-avatar">${esc(initials(member.name))}</div><div><h3>${esc(member.name||'Funcionário')}</h3><p>${esc(member.email||'Sem e-mail')}${member.whatsapp?` · ${esc(member.whatsapp)}`:''}</p><div class="staff-badges"><span class="staff-role-badge">${roleLabel(member.role)}</span><span class="staff-status-badge ${member.active!==false?'active':'inactive'}">${member.active!==false?'Ativo':'Desativado'}</span>${member.source==='central'?'<span class="staff-cloud-badge">Banco central</span>':''}${member.pending?'<span class="staff-cloud-badge">Convite pendente</span>':''}</div></div></div><div class="staff-permission-mini">${perms.slice(0,8).map(label=>`<span>${esc(label)}</span>`).join('')}${perms.length>8?`<span>+${perms.length-8}</span>`:''}</div></div><div class="staff-actions"><button data-edit-staff="${member.id}">Editar acesso</button>${member.role!=='owner'?`<button class="${member.active!==false?'danger-button':''}" data-toggle-staff="${member.id}">${member.active!==false?'Desativar':'Ativar'}</button>`:''}</div></article>`;
    }).join('')||'<div class="data-card empty-state">Nenhum funcionário cadastrado.</div>';
  }

  async function refreshCentralStaff(){
    if(!window.GestaoBackend?.isConfigured?.() || !state.centralSession || !state.central.storeId){
      renderStaff(); return;
    }
    try{
      const rows=await window.GestaoBackend.listMembers(state.central.storeId);
      const currentLocalByEmail=new Map(state.staff.map(member=>[String(member.email||'').toLowerCase(),member]));
      rows.forEach(row=>{
        const email=String(row.email||'').toLowerCase();
        const old=currentLocalByEmail.get(email);
        const role=row.member_role||'editor';
        const member={
          id:old?.id || String(row.user_id||uid()),
          userId:row.user_id||null,
          name:row.full_name||row.display_name||old?.name||email.split('@')[0]||'Funcionário',
          email,
          whatsapp:row.whatsapp||old?.whatsapp||'',
          role,
          active:row.active!==false,
          permissions:{...rolePermissions(role),...(row.permissions||{})},
          source:'central',
          pending:false
        };
        const idx=state.staff.findIndex(item=>(member.userId&&item.userId===member.userId)||(email&&item.email===email));
        if(idx>=0) state.staff[idx]={...state.staff[idx],...member}; else state.staff.push(member);
      });
      persist();renderStaff();renderSettings();
    }catch(error){
      console.error(error);
      alert(`Não foi possível atualizar a equipe: ${error.message||error}`);
    }
  }

  function renderCentralStatus(message='',kind=''){
    const configured=window.GestaoBackend?.isConfigured?.()||false;
    const logged=Boolean(state.centralSession);
    const dot=$('centralDot'), mode=$('centralMode');
    if(dot){dot.classList.toggle('online',logged);dot.classList.toggle('error',kind==='error');}
    if(mode){mode.textContent=logged?'CENTRAL':configured?'PRONTO':'LOCAL';mode.classList.toggle('online',logged);}
    if($('centralStatus')) $('centralStatus').textContent=message || (logged?`Conectado${state.central.lastSync?` · última sincronização ${new Date(state.central.lastSync).toLocaleString('pt-BR')}`:''}`:configured?'Configuração encontrada. Faça login.':'Ainda não conectado.');
    if($('centralLoginButton')) $('centralLoginButton').hidden=logged;
    if($('centralLogoutButton')) $('centralLogoutButton').hidden=!logged;
  }

  function renderSettings(){
    $('settingsStoreName').value=state.settings.storeName||'';
    $('settingsOperator').value=state.settings.operator||'';
    const activeStaff=state.staff.filter(member=>member.active!==false);
    $('settingsOperatorSelect').innerHTML=activeStaff.map(member=>`<option value="${esc(member.id)}" ${member.id===state.settings.currentStaffId?'selected':''}>${esc(member.name)} — ${roleLabel(member.role)}</option>`).join('');
    if(!state.settings.currentStaffId && activeStaff[0]) state.settings.currentStaffId=activeStaff[0].id;
    const stores=state.centralStores||[];
    $('centralStoreSelect').innerHTML=stores.length?stores.map(store=>`<option value="${esc(store.id)}" ${String(store.id)===String(state.central.storeId)?'selected':''}>${esc(store.name||store.store_name||'Loja')}</option>`).join(''):'<option value="">Nenhuma loja conectada</option>';
    renderCentralStatus();
  }

  async function syncCentralDatabase(forceStoreId=''){
    if(!window.GestaoBackend?.isConfigured?.()){
      renderCentralStatus('Falta colocar a URL e a chave pública do Supabase em supabase-config.js.','error');
      alert('O banco central ainda não está configurado neste repositório.');
      return false;
    }
    try{
      renderCentralStatus('Sincronizando...');
      const preferred=forceStoreId||state.central.storeId||'';
      const context=await window.GestaoBackend.context(preferred);
      state.centralSession=context.session;
      if(!context.session){
        renderCentralStatus('Configuração encontrada. Faça login.');
        $('centralLoginDialog').showModal();
        return false;
      }
      state.centralStores=context.stores||[];
      const store=context.store;
      if(store){
        state.central.storeId=String(store.id);
        state.central.storeName=store.name||'Loja';
        state.settings.storeName=store.name||state.settings.storeName;
        if(context.products?.length){
          state.products=context.products;
          syncCategoryState();
        }
        const role=context.membership?.isOwner||context.membership?.isAdmin?'owner':(context.membership?.role||'editor');
        const permissions={...rolePermissions(role),...(context.membership?.permissions||{})};
        const centralUser=context.session.user;
        const email=String(centralUser.email||'').toLowerCase();
        let operator=state.staff.find(member=>member.userId===centralUser.id || (email&&member.email===email));
        if(!operator){
          operator={id:`central-${centralUser.id}`,userId:centralUser.id,name:centralUser.user_metadata?.full_name||centralUser.user_metadata?.name||email.split('@')[0]||'Operador',email,whatsapp:'',role,active:true,permissions,source:'central'};
          state.staff.push(operator);
        }else{
          Object.assign(operator,{userId:centralUser.id,email,role,permissions,source:'central',active:true});
        }
        state.settings.currentStaffId=operator.id;
        state.settings.operator=operator.name;
      }
      state.central.connected=true;
      state.central.lastSync=new Date().toISOString();
      persist();
      renderSidebar();renderPos();renderManageProducts();renderStock();renderPromotions();renderSettings();
      await refreshCentralStaff();
      renderCentralStatus();
      return true;
    }catch(error){
      console.error(error);
      state.central.connected=false;
      renderCentralStatus(`Erro: ${error.message||error}`,'error');
      return false;
    }
  }

  async function loginCentral(){
    try{
      await window.GestaoBackend.signIn($('centralEmail').value.trim(),$('centralPassword').value);
      $('centralPassword').value='';
      await syncCentralDatabase();
      return true;
    }catch(error){
      console.error(error);
      alert(`Não foi possível entrar: ${error.message||error}`);
      return false;
    }
  }


  $$('.side-route').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.route)));
  $$('.catalog-tabs button').forEach(b=>b.addEventListener('click',()=>{state.catalogFilter=b.dataset.filter;$$('.catalog-tabs button').forEach(x=>x.classList.toggle('active',x===b));renderCatalog();}));
  $('categoryFilter').addEventListener('change',renderCatalog);$('productSearch').addEventListener('input',renderCatalog);
  $('productSearch').addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();const value=e.currentTarget.value.trim();const p=state.products.find(p=>String(p.barcode||'')===value)||state.products.find(p=>p.name.toLowerCase().includes(value.toLowerCase()));if(p){if(isFractionalUnit(p.unit))openQuantityDialog(p);else addProductToCart(p);e.currentTarget.value='';renderCatalog();}else if(value)alert('Produto não encontrado.');});
  $('productGrid').addEventListener('click',e=>{const b=e.target.closest('[data-product-id]');if(!b)return;const p=state.products.find(p=>p.id===b.dataset.productId);if(!p)return;if(isFractionalUnit(p.unit))openQuantityDialog(p);else addProductToCart(p);});
  $('cartRows').addEventListener('click',e=>{
    const inc=e.target.closest('[data-inc]'),dec=e.target.closest('[data-dec]'),rem=e.target.closest('[data-remove]');
    if(inc){
      const idx=+inc.dataset.inc,item=state.cart[idx],step=qtyStep(item.unit),next=Number(item.qty)+step;
      const product=item.productId?state.products.find(p=>p.id===item.productId):null;
      if(product && next>Number(product.stock||0)) return alert(`Estoque insuficiente. Disponível: ${formatQty(product.stock,product.unit)} ${product.unit}.`);
      item.qty=Number(next.toFixed(3));
    }
    if(dec){
      const idx=+dec.dataset.dec,item=state.cart[idx],step=qtyStep(item.unit),next=Number(item.qty)-step;
      if(next<=0)state.cart.splice(idx,1);else item.qty=Number(next.toFixed(3));
    }
    if(rem)state.cart.splice(+rem.dataset.remove,1);
    renderCart();
  });
  $('cartRows').addEventListener('change',e=>{
    const input=e.target.closest('[data-qty-input]');
    if(!input)return;
    const idx=+input.dataset.qtyInput,item=state.cart[idx];
    if(!item)return;
    const qty=parseQty(input.value);
    if(qty<=0){alert('Digite uma quantidade maior que zero.');renderCart();return;}
    if((item.unit||'un.')==='un.' && !Number.isInteger(qty)){alert('Produtos por unidade precisam usar 1, 2, 3...');renderCart();return;}
    const product=item.productId?state.products.find(p=>p.id===item.productId):null;
    if(product && qty>Number(product.stock||0)){alert(`Estoque insuficiente. Disponível: ${formatQty(product.stock,product.unit)} ${product.unit}.`);renderCart();return;}
    item.qty=Number(qty.toFixed(3));
    renderCart();
  });
  $('discountInput').addEventListener('input',e=>{state.discount=Number(e.target.value||0);renderCart();});$('surchargeInput').addEventListener('input',e=>{state.surcharge=Number(e.target.value||0);renderCart();});
  $('clearCartButton').addEventListener('click',()=>{state.cart=[];renderCart();});$('clearSaleButton').addEventListener('click',()=>clearSale(true));$('cancelSaleTop').addEventListener('click',()=>clearSale(true));$('saveOpenSaleButton').addEventListener('click',saveOpenSale);
  $('finishSaleButton').addEventListener('click',()=>{if(!state.cart.length)return alert('Adicione itens à venda.');$('checkoutPanel').scrollIntoView({behavior:'smooth',block:'start'});});
  $$('[data-payment]').forEach(b=>b.addEventListener('click',()=>choosePayment(b.dataset.payment)));$('cashReceivedInput')?.addEventListener('input',updateCashChange);$('checkoutCustomer').addEventListener('change',e=>state.selectedCustomerId=e.target.value);$('confirmSaleButton').addEventListener('click',confirmSale);
  $('scanButton').addEventListener('click',()=>{$('productSearch').focus();alert('O campo está pronto para leitores USB/Bluetooth que funcionam como teclado. A leitura pela câmera entra na próxima etapa.');});
  $('quantityValue').addEventListener('input',updateQuantityPreview);
  $('confirmQuantityButton').addEventListener('click',e=>{if(!addSelectedQuantity())e.preventDefault();});
  $('addLooseButton').addEventListener('click',()=>{$('looseName').value='';$('looseQty').value='1';$('loosePrice').value='';$('looseDialog').showModal();});
  $('saveLooseButton').addEventListener('click',e=>{if(!$('looseForm').reportValidity()){e.preventDefault();return;}state.cart.push({id:uid(),productId:'',name:$('looseName').value.trim(),qty:Number($('looseQty').value||1),unit:$('looseUnit').value,price:Number($('loosePrice').value||0),loose:true});renderCart();});

  $('newCustomerButton').addEventListener('click',()=>openCustomerDialog());$('customerSearch').addEventListener('input',renderCustomers);$('customerList').addEventListener('click',e=>{const r=e.target.closest('[data-customer-id]');if(r){state.selectedCustomerDetailId=r.dataset.customerId;renderCustomers();}});$('customerDetail').addEventListener('click',e=>{const pay=e.target.closest('[data-receive-payment]'),sale=e.target.closest('[data-sale-to-customer]');if(pay){const c=state.customers.find(c=>c.id===pay.dataset.receivePayment);if(c)openPayment(c);}if(sale){state.selectedCustomerId=sale.dataset.saleToCustomer;choosePayment('ficha');renderCheckoutCustomers();navigate('pos');setTimeout(()=>$('checkoutPanel').scrollIntoView({behavior:'smooth'}),100);}});
  $('saveCustomerButton').addEventListener('click',e=>{if(!$('customerForm').reportValidity()){e.preventDefault();return;}saveCustomer();});$('savePaymentButton').addEventListener('click',e=>{if(!$('paymentForm').reportValidity()){e.preventDefault();return;}savePayment();});

  $('manageProductSearch').addEventListener('input',renderManageProducts);
  $('manageProductList').addEventListener('click',e=>{
    const edit=e.target.closest('[data-edit-manage-product]');
    const row=e.target.closest('[data-manage-product]');
    const id=edit?.dataset.editManageProduct || row?.dataset.manageProduct;
    if(!id)return;
    state.selectedManageProductId=id;
    renderManageProducts();
  });
  $('manageProductsAllCategory').addEventListener('click',()=>{state.manageProductCategoryFilter='';renderManageProducts();});
  $('manageProductCategoryChips').addEventListener('click',e=>{
    const b=e.target.closest('[data-manage-category]');
    if(!b)return;
    state.manageProductCategoryFilter=b.dataset.manageCategory;
    renderManageProducts();
  });
  $('productsCategoryButton').addEventListener('click',()=>openCategoryDialog());
  $('newProductButton').addEventListener('click',()=>renderProductEditor(true));

  $('newCategoryButton').addEventListener('click',()=>openCategoryDialog());
  $('saveCategoryButton').addEventListener('click',e=>{if(!$('categoryForm').reportValidity()||!saveCategory())e.preventDefault();});
  $('showAllStockButton').addEventListener('click',()=>{state.stockCategoryFilter='';renderStock();});
  $('stockCategoryChips').addEventListener('click',e=>{
    const filter=e.target.closest('[data-stock-category]'),edit=e.target.closest('[data-edit-category]');
    if(edit){openCategoryDialog(edit.dataset.editCategory);return;}
    if(filter){state.stockCategoryFilter=filter.dataset.stockCategory;renderStock();}
  });
  $('stockPromotionButton').addEventListener('click',()=>{navigate('promotions');openPromotionDialog();});
  $('newPromotionButton').addEventListener('click',()=>openPromotionDialog());
  $('promotionCategoryFilter').addEventListener('change',()=>renderPromotionProductPicker(new Set(selectedPromotionProductIds())));
  $('promotionProductPicker').addEventListener('change',updatePromotionPreview);
  $('promotionPercent').addEventListener('input',updatePromotionPreview);
  $('promotionPublish').addEventListener('change',updatePromotionPreview);
  $('selectVisiblePromotionProducts').addEventListener('click',()=>{$$('#promotionProductPicker input[data-promotion-product]').forEach(i=>i.checked=true);updatePromotionPreview();});
  $('clearPromotionProducts').addEventListener('click',()=>{$$('#promotionProductPicker input[data-promotion-product]').forEach(i=>i.checked=false);updatePromotionPreview();});
  $('savePromotionButton').addEventListener('click',e=>{if(!$('promotionForm').reportValidity()||!savePromotion())e.preventDefault();});
  $('promotionList').addEventListener('click',e=>{
    const edit=e.target.closest('[data-edit-promotion]'),toggle=e.target.closest('[data-toggle-promotion]'),del=e.target.closest('[data-delete-promotion]');
    if(edit){const p=state.promotions.find(p=>p.id===edit.dataset.editPromotion);if(p)openPromotionDialog(p);return;}
    if(toggle){const p=state.promotions.find(p=>p.id===toggle.dataset.togglePromotion);if(p){p.active=p.active===false?true:false;persist();renderPromotions();renderCatalog();renderStock();}return;}
    if(del){const p=state.promotions.find(p=>p.id===del.dataset.deletePromotion);if(p&&confirm(`Excluir a promoção "${p.name}"?`)){state.promotions=state.promotions.filter(x=>x.id!==p.id);persist();renderPromotions();renderCatalog();renderStock();}}
  });

  $('newStaffButton').addEventListener('click',()=>openStaffDialog());
  $('openStaffFromSettings').addEventListener('click',()=>navigate('staff'));
  $('staffRole').addEventListener('change',()=>renderStaffPermissions(rolePermissions($('staffRole').value)));
  $('applyRolePermissions').addEventListener('click',()=>renderStaffPermissions(rolePermissions($('staffRole').value)));
  $('saveStaffButton').addEventListener('click',async e=>{if(!$('staffForm').reportValidity()){e.preventDefault();return;}if(!(await saveStaffMember()))e.preventDefault();});
  $('refreshStaffButton').addEventListener('click',refreshCentralStaff);
  $('staffList').addEventListener('click',async e=>{
    const edit=e.target.closest('[data-edit-staff]'),toggle=e.target.closest('[data-toggle-staff]');
    if(edit){const member=state.staff.find(item=>item.id===edit.dataset.editStaff);if(member)openStaffDialog(member);return;}
    if(toggle){
      const member=state.staff.find(item=>item.id===toggle.dataset.toggleStaff);if(!member)return;
      const next=member.active===false;
      if(member.source==='central'&&member.userId&&window.GestaoBackend?.isConfigured?.()&&state.central.storeId){
        try{await window.GestaoBackend.setMemberActive(state.central.storeId,member.userId,next);}catch(error){alert(`Não foi possível alterar o acesso: ${error.message||error}`);return;}
      }
      member.active=next;persist();renderStaff();renderSettings();applyAccessVisibility();
    }
  });

  $('centralLoginButton').addEventListener('click',()=>$('centralLoginDialog').showModal());
  $('centralLoginSubmit').addEventListener('click',async e=>{if(!$('centralLoginForm').reportValidity()){e.preventDefault();return;}if(!(await loginCentral()))e.preventDefault();});
  $('centralSyncButton').addEventListener('click',()=>syncCentralDatabase());
  $('centralLogoutButton').addEventListener('click',async()=>{await window.GestaoBackend?.signOut?.();state.centralSession=null;state.central.connected=false;state.centralStores=[];persist();renderSettings();renderCentralStatus('Sessão encerrada.');});
  $('centralStoreSelect').addEventListener('change',e=>{if(e.target.value)syncCentralDatabase(e.target.value);});

  $('openCashButton').addEventListener('click',()=>{state.cash={open:true,opening:Number($('cashOpening').value||0),openedAt:new Date().toISOString()};persist();renderCash();});$('closeCashButton').addEventListener('click',()=>{state.cash={open:false,opening:0,openedAt:null};persist();renderCash();});
  $('saveSettingsButton').addEventListener('click',()=>{state.settings={...state.settings,storeName:$('settingsStoreName').value.trim()||'Minha Loja',operator:$('settingsOperator').value.trim()||currentStaff()?.name||'Proprietário',currentStaffId:$('settingsOperatorSelect').value||state.settings.currentStaffId};persist();renderSidebar();renderSettings();alert('Configurações salvas.');});
  $('settingsOperatorSelect').addEventListener('change',e=>{state.settings.currentStaffId=e.target.value;const member=currentStaff();if(member)state.settings.operator=member.name;persist();renderSidebar();applyAccessVisibility();});

  window.addEventListener('keydown',e=>{if(e.key==='F2'){e.preventDefault();navigate('pos');$('productSearch').focus();}if(e.key==='F3'){e.preventDefault();saveOpenSale();}if(e.key==='F4'){e.preventDefault();if(state.cart.length)$('checkoutPanel').scrollIntoView({behavior:'smooth'});}});

  if($('appVersionBadge')) $('appVersionBadge').textContent = `V${APP_VERSION}`;
  syncCategoryState();renderSidebar();renderPos();renderCustomers();renderManageProducts();renderStock();renderPromotions();renderHistory();renderReports();renderCash();renderStaff();renderSettings();applyAccessVisibility();
  if(window.GestaoBackend?.isConfigured?.()){setTimeout(async()=>{try{const session=await window.GestaoBackend.getSession();if(session)await syncCentralDatabase();else renderCentralStatus('Banco configurado. Faça login para sincronizar.');}catch(error){console.warn('Banco central:',error);}},150);}
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js?v=0.9.0').catch(()=>{});
})();
