(() => {
  'use strict';

  let client = null;
  let currentSession = null;

  const cfg = () => window.TEM_AQUI_SUPABASE || {};
  const isConfigured = () => Boolean(cfg().url && (cfg().publishableKey || cfg().anonKey));

  function init() {
    if (!isConfigured() || !window.supabase?.createClient) return false;
    if (!client) {
      client = window.supabase.createClient(
        cfg().url,
        cfg().publishableKey || cfg().anonKey,
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
      );
    }
    return true;
  }

  async function getSession() {
    if (!init()) return null;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    currentSession = data?.session || null;
    return currentSession;
  }

  async function signIn(email, password) {
    if (!init()) throw new Error('Banco central não configurado.');
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    currentSession = data?.session || null;
    return currentSession;
  }

  async function signOut() {
    if (!init()) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
    currentSession = null;
  }

  async function rolesForUser(userId) {
    if (!userId) return [];
    const { data, error } = await client.from('user_roles').select('role').eq('user_id', userId);
    if (error) return [];
    return [...new Set((data || []).map(r => String(r.role || '').toLowerCase()).filter(Boolean))];
  }

  const isAdminRole = roles => roles.some(r => ['administrador','admin'].includes(String(r).toLowerCase()));

  function permissionsFromMember(row={}) {
    return {
      sell: Boolean(row.can_use_pos),
      products: Boolean(row.can_manage_products || row.can_add_products || row.can_edit_products),
      stock: Boolean(row.can_manage_stock),
      customers: Boolean(row.can_view_customers),
      credit: Boolean(row.can_view_customers),
      promotions: Boolean(row.can_manage_products),
      reports: Boolean(row.can_view_reports || row.can_view_revenue),
      cash: Boolean(row.can_view_cash || row.can_manage_cash || row.can_open_cash || row.can_close_cash || row.can_move_cash),
      staff: Boolean(row.can_manage_team),
      settings: Boolean(row.can_manage_settings || row.can_manage_hours || row.can_manage_store_images)
    };
  }

  async function myStores() {
    const s = await getSession();
    if (!s?.user) return [];
    const uid = s.user.id;
    const roles = await rolesForUser(uid);
    const output = [];

    if (isAdminRole(roles)) {
      const { data, error } = await client.from('stores').select('*').is('deleted_at', null).order('name');
      if (error) throw error;
      return (data || []).map(store => ({
        ...store, _memberRole:'owner', _permissions:null, _admin:true, _isOwner:true
      }));
    }

    const own = await client.from('stores').select('*').eq('owner_id', uid).is('deleted_at', null).order('name');
    if (own.error) throw own.error;
    (own.data || []).forEach(store => output.push({
      ...store, _memberRole:'owner', _permissions:null, _isOwner:true
    }));

    const membership = await client.from('store_members')
      .select('store_id,role,status,can_use_pos,can_manage_products,can_add_products,can_edit_products,can_manage_stock,can_view_customers,can_view_reports,can_view_revenue,can_manage_team,can_view_cash,can_manage_cash,can_open_cash,can_close_cash,can_move_cash,can_manage_settings,can_manage_hours,can_manage_store_images')
      .eq('user_id', uid)
      .in('status', ['active','ativo']);
    if (!membership.error && membership.data?.length) {
      const ids = [...new Set(membership.data.map(m => m.store_id).filter(Boolean))];
      const storesQ = await client.from('stores').select('*').in('id', ids).is('deleted_at', null);
      if (storesQ.error) throw storesQ.error;
      const memberByStore = new Map(membership.data.map(m => [String(m.store_id),m]));
      (storesQ.data || []).forEach(store => {
        if (output.some(x => x.id === store.id)) return;
        const m = memberByStore.get(String(store.id)) || {};
        output.push({
          ...store,
          _memberRole: ['manager','gerente'].includes(String(m.role||'').toLowerCase()) ? 'manager' : 'editor',
          _permissions: permissionsFromMember(m),
          _isOwner:false
        });
      });
    }
    return output.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
  }

  async function storeCategories(storeId) {
    const { data, error } = await client.from('store_inventory_categories')
      .select('id,name,slug,parent_id,sort_order,active')
      .eq('store_id', storeId).eq('active', true)
      .order('sort_order').order('name');
    if (error) throw error;
    return data || [];
  }

  function mapProduct(p, categoryName='Outros') {
    const unitRaw = String(p.unit || 'un').trim();
    const unit = unitRaw === 'un' ? 'un.' : unitRaw;
    return {
      id: String(p.id),
      name: p.name || 'Produto',
      category: categoryName || p.subcategory || p.storefront_category || p.category || 'Outros',
      categoryId: p.inventory_category_id || null,
      barcode: p.barcode || '',
      sku: p.sku || '',
      price: Number(p.price || 0),
      cost: Number(p.cost_price || 0),
      stock: Number(p.stock ?? p.stock_quantity ?? 0),
      minimumStock: Number(p.minimum_stock || 0),
      unit,
      showcase: Boolean(p.available),
      active: p.is_active !== false && p.available !== false,
      image: p.image_url || (Array.isArray(p.images) ? p.images[0] : '') || '',
      icon: '📦'
    };
  }

  async function storeProducts(storeId) {
    const cats = await storeCategories(storeId);
    const catMap = new Map(cats.map(c => [String(c.id), c.name]));
    const { data, error } = await client.from('products')
      .select('id,store_id,inventory_category_id,name,price,cost_price,stock,stock_quantity,minimum_stock,unit,available,is_active,image_url,images,barcode,sku,category,subcategory,storefront_category')
      .eq('store_id', storeId)
      .order('name', { ascending:true })
      .limit(10000);
    if (error) throw error;
    return (data || []).map(p => mapProduct(p, catMap.get(String(p.inventory_category_id)) || 'Outros'));
  }

  function slugify(value) {
    return String(value||'categoria').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'categoria';
  }

  async function createCategory(storeId, name) {
    let slug = slugify(name);
    const exists = await client.from('store_inventory_categories').select('id').eq('store_id',storeId).eq('slug',slug).maybeSingle();
    if (exists.data?.id) return exists.data;
    const { data, error } = await client.from('store_inventory_categories')
      .insert({ store_id:storeId, name, slug, active:true }).select('id,name,slug').single();
    if (error) throw error;
    return data;
  }

  async function ensureCategory(storeId, name) {
    const { data, error } = await client.from('store_inventory_categories')
      .select('id,name,slug').eq('store_id',storeId).ilike('name',name).maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data || createCategory(storeId,name);
  }

  async function renameCategory(storeId, original, name) {
    const { data:cat, error:qErr } = await client.from('store_inventory_categories')
      .select('id').eq('store_id',storeId).eq('name',original).maybeSingle();
    if (qErr && qErr.code !== 'PGRST116') throw qErr;
    if (!cat?.id) return createCategory(storeId,name);
    const { data, error } = await client.from('store_inventory_categories')
      .update({ name, slug:slugify(name), updated_at:new Date().toISOString() })
      .eq('id',cat.id).eq('store_id',storeId).select('id,name').single();
    if (error) throw error;
    return data;
  }

  async function saveProduct(storeId, product) {
    const category = await ensureCategory(storeId, product.category || 'Outros');
    const payload = {
      store_id: storeId,
      inventory_category_id: category.id,
      name: String(product.name||'').trim(),
      category: product.category || 'Outros',
      subcategory: product.category || 'Outros',
      barcode: product.barcode || null,
      sku: product.sku || null,
      price: Math.max(0,Number(product.price||0)),
      cost_price: Math.max(0,Number(product.cost||0)),
      stock: Math.max(0,Number(product.stock||0)),
      minimum_stock: Math.max(0,Number(product.minimumStock||0)),
      unit: String(product.unit||'un.').replace(/^un\.$/,'un'),
      available: product.showcase !== false,
      is_active: product.active !== false,
      image_url: product.image || null,
      updated_at: new Date().toISOString()
    };

    if (product.id && /^[0-9a-f-]{36}$/i.test(String(product.id))) {
      const { data, error } = await client.from('products').update(payload).eq('id',product.id).eq('store_id',storeId).select('*').single();
      if (error) throw error;
      return mapProduct(data, category.name);
    }
    const { data, error } = await client.from('products').insert(payload).select('*').single();
    if (error) throw error;
    return mapProduct(data, category.name);
  }

  async function listMembers(storeId) {
    const { data, error } = await client.rpc('gestao_list_store_members',{ p_store_id:storeId });
    if (error) throw error;
    return data || [];
  }

  async function saveMember(storeId, member) {
    const { data, error } = await client.rpc('gestao_upsert_store_member',{
      p_store_id:storeId,
      p_email:member.email,
      p_member_role:member.role,
      p_permissions:member.permissions || {},
      p_active:member.active !== false,
      p_display_name:member.name || ''
    });
    if (error) throw error;
    return { user_id:data };
  }

  async function setMemberActive(storeId,userId,active) {
    const { data,error } = await client.rpc('gestao_set_store_member_active',{
      p_store_id:storeId,p_user_id:userId,p_active:Boolean(active)
    });
    if(error) throw error;
    return data;
  }

  async function adjustStock(productId, quantity, movementType='adjustment', note='') {
    const { data,error } = await client.rpc('gestao_adjust_product_stock',{
      p_product_id:productId,p_quantity:Number(quantity),p_movement_type:movementType,p_note:note||null
    });
    if(error) throw error;
    return Number(data);
  }

  async function applySaleStock(items=[]) {
    const payload = items.map(i=>({
      productId:i.productId || null,
      qty:Number(i.qty||0),
      loose:Boolean(i.loose)
    }));
    const { data,error } = await client.rpc('gestao_apply_sale_stock',{ p_items:payload });
    if(error) throw error;
    return data || [];
  }

  async function context(preferredStoreId='') {
    const session = await getSession();
    if(!session?.user) return { session:null, stores:[], store:null, products:[], categories:[], membership:null };
    const stores = await myStores();
    const store = stores.find(s=>String(s.id)===String(preferredStoreId)) || stores[0] || null;
    if(!store) return { session, stores, store:null, products:[], categories:[], membership:null };

    const categoriesRows = await storeCategories(store.id);
    const products = await storeProducts(store.id);
    const membership = {
      isOwner:Boolean(store._isOwner),
      isAdmin:Boolean(store._admin),
      role:store._memberRole || 'editor',
      permissions:store._isOwner || store._admin ? null : (store._permissions || {})
    };
    return {
      session, stores, store, products,
      categories:categoriesRows.map(c=>c.name),
      categoryRows:categoriesRows,
      membership
    };
  }

  window.GestaoBackend = {
    init,isConfigured,getSession,signIn,signOut,myStores,storeCategories,storeProducts,
    createCategory,ensureCategory,renameCategory,saveProduct,
    listMembers,saveMember,setMemberActive,adjustStock,applySaleStock,context
  };
})();