(() => {
  'use strict';

  let client = null;
  let session = null;
  let configured = false;

  const cfg = () => window.TEM_AQUI_SUPABASE || {};
  const isConfigured = () => Boolean(cfg().url && (cfg().publishableKey || cfg().anonKey));

  function init() {
    configured = isConfigured();
    if (!configured || !window.supabase?.createClient) return false;
    if (!client) client = window.supabase.createClient(cfg().url, cfg().publishableKey || cfg().anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return true;
  }

  async function getSession() {
    if (!init()) return null;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    session = data?.session || null;
    return session;
  }

  async function signIn(email, password) {
    if (!init()) throw new Error('Banco central ainda não configurado.');
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    session = data?.session || null;
    return session;
  }

  async function signOut() {
    if (!init()) return;
    await client.auth.signOut();
    session = null;
  }

  async function rolesForUser(userId) {
    if (!init() || !userId) return [];
    const roles = [];
    try {
      const { data } = await client.from('user_roles').select('role').eq('user_id', userId);
      (data || []).forEach(row => row?.role && roles.push(String(row.role)));
    } catch (_) {}
    try {
      const { data } = await client.from('profiles').select('role').eq('id', userId).maybeSingle();
      if (data?.role) roles.push(String(data.role));
    } catch (_) {}
    return [...new Set(roles)];
  }

  const isAdminRole = roles => roles.some(role => ['admin','administrador'].includes(String(role).toLowerCase()));

  async function myStores() {
    const s = await getSession();
    if (!s?.user) return [];
    const userId = s.user.id;
    const roles = await rolesForUser(userId);
    let stores = [];

    if (isAdminRole(roles)) {
      const { data, error } = await client.from('stores').select('*').order('name', { ascending: true }).limit(1000);
      if (error) throw error;
      stores = (data || []).map(store => ({ ...store, _memberRole: 'owner', _permissions: null, _admin: true }));
      return stores;
    }

    const own = await client.from('stores').select('*').eq('owner_id', userId).order('name', { ascending: true });
    if (!own.error) stores.push(...(own.data || []).map(store => ({ ...store, _memberRole: 'owner', _permissions: null })));

    try {
      const memberships = await client.from('store_members').select('store_id,member_role,active,permissions').eq('user_id', userId).eq('active', true);
      if (!memberships.error && memberships.data?.length) {
        const ids = memberships.data.map(row => row.store_id).filter(Boolean);
        if (ids.length) {
          const result = await client.from('stores').select('*').in('id', ids).order('name', { ascending: true });
          if (!result.error) {
            result.data.forEach(store => {
              const member = memberships.data.find(row => String(row.store_id) === String(store.id));
              if (!stores.some(existing => String(existing.id) === String(store.id))) {
                stores.push({ ...store, _memberRole: member?.member_role || 'editor', _permissions: member?.permissions || null });
              }
            });
          }
        }
      }
    } catch (_) {}

    return stores;
  }

  function mapProduct(row) {
    const raw = row || {};
    const category =
      raw.category_label || raw.categoryLabel || raw.category ||
      raw.food_section || raw.section || raw.pharmacy_category ||
      raw.source_group || 'Outros';
    const unit = raw.unit || raw.sale_unit || raw.measure_unit || 'un.';
    return {
      id: String(raw.id),
      centralId: raw.id,
      storeId: raw.store_id,
      name: raw.name || raw.title || 'Produto',
      barcode: raw.barcode || raw.ean || raw.gtin || raw.code || '',
      sku: raw.sku || raw.internal_code || '',
      price: Number(raw.price || 0),
      cost: Number(raw.cost || raw.cost_price || 0),
      stock: Number(raw.stock || 0),
      category: String(category || 'Outros'),
      unit,
      icon: raw.emoji || raw.icon || '📦',
      showcase: raw.available !== false,
      active: raw.available !== false,
      image: raw.image_url || raw.image || '',
      _central: true,
      _raw: raw
    };
  }

  async function storeProducts(storeId) {
    if (!init() || !storeId) return [];
    const { data, error } = await client.from('products').select('*').eq('store_id', storeId).limit(5000);
    if (error) throw error;
    return (data || []).map(mapProduct);
  }

  async function listMembers(storeId) {
    if (!init() || !storeId) return [];
    const rpc = await client.rpc('gestao_list_store_members', { p_store_id: storeId });
    if (!rpc.error) return rpc.data || [];

    // Fallback: basic membership data, if migration SQL is not installed yet.
    const basic = await client.from('store_members').select('store_id,user_id,member_role,active,permissions,display_name,email').eq('store_id', storeId);
    if (basic.error) throw rpc.error || basic.error;
    return (basic.data || []).map(row => ({
      user_id: row.user_id,
      full_name: row.display_name || 'Funcionário',
      email: row.email || '',
      member_role: row.member_role || 'editor',
      active: row.active !== false,
      permissions: row.permissions || null
    }));
  }

  async function saveMember(storeId, member) {
    if (!init()) throw new Error('Banco central não configurado.');
    if (!storeId) throw new Error('Selecione uma loja.');
    const args = {
      p_store_id: storeId,
      p_email: member.email,
      p_member_role: member.role || 'editor',
      p_permissions: member.permissions || {},
      p_active: member.active !== false,
      p_display_name: member.name || ''
    };
    const { data, error } = await client.rpc('gestao_upsert_store_member', args);
    if (error) throw error;
    return data;
  }

  async function setMemberActive(storeId, userId, active) {
    const { data, error } = await client.rpc('gestao_set_store_member_active', {
      p_store_id: storeId, p_user_id: userId, p_active: Boolean(active)
    });
    if (error) throw error;
    return data;
  }

  async function context(preferredStoreId='') {
    const s = await getSession();
    if (!s?.user) return { configured: isConfigured(), session: null, stores: [], store: null, products: [], membership: null, roles: [] };
    const roles = await rolesForUser(s.user.id);
    const stores = await myStores();
    const store = stores.find(item => String(item.id) === String(preferredStoreId)) || stores[0] || null;
    const products = store ? await storeProducts(store.id) : [];
    const membership = store ? {
      role: store._memberRole || 'editor',
      permissions: store._permissions || null,
      isAdmin: Boolean(store._admin) || isAdminRole(roles),
      isOwner: String(store.owner_id || '') === String(s.user.id)
    } : null;
    return { configured: true, session: s, stores, store, products, membership, roles };
  }

  window.GestaoBackend = {
    init, isConfigured, getSession, signIn, signOut, rolesForUser,
    myStores, storeProducts, listMembers, saveMember, setMemberActive, context,
    get client(){ init(); return client; }
  };
})();
