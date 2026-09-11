const APPS=[
 {slug:'tem-aqui-tupanatinga',name:'Tem Aqui Tupanatinga',repo:'lokojhow/tem-aqui-tupanatinga',supabase:'click'},
 {slug:'tem-aqui-gestao',name:'Tem Aqui Gestão',repo:'lokojhow/tem-aqui-gestao',supabase:'click'},
 {slug:'tem-aqui-itaiba',name:'Tem Aqui Itaíba',repo:'lokojhow/tem-aqui-itaiba',supabase:'click'},
 {slug:'prefeitura-manari',name:'Portal Prefeitura de Manari',repo:'lokojhow/prefeitura-manari-app',supabase:'Manari conectado'},
 {slug:'urna-educativa',name:'Urna Educativa',repo:'lokojhow/urna-educativa',supabase:null}
];

const state={apps:[],alerts:0};
const fmtDate=v=>v?new Date(v).toLocaleString('pt-BR'):'—';

async function githubRepo(repo){
  try{
    const r=await fetch(`https://api.github.com/repos/${repo}`,{headers:{Accept:'application/vnd.github+json'}});
    if(!r.ok) return {ok:false,reason:r.status===404?'privado ou não acessível sem token':`HTTP ${r.status}`};
    const x=await r.json();
    return {ok:true,updated_at:x.updated_at,pushed_at:x.pushed_at,size:x.size,default_branch:x.default_branch,visibility:x.visibility||'public'};
  }catch(e){return {ok:false,reason:'falha de rede'}}
}

function card(a){
 const gh=a.github;
 const sbConnected=!!a.supabase;
 const warnings=[];
 if(!gh.ok) warnings.push(`GitHub: ${gh.reason}`);
 if(!sbConnected) warnings.push('Supabase não associado');
 const status=warnings.length?'warn':'ok';
 return `<article class="card">
  <div class="head"><div><div class="name">${a.name}</div><div class="repo">${a.repo}</div></div><span class="status ${status}">${status==='ok'?'NORMAL':'ATENÇÃO'}</span></div>
  <div class="metrics">
   <div class="metric"><span>GitHub</span><b>${gh.ok?'Conectado':'Limitado'}</b><div class="bar"><div class="fill" style="width:${gh.ok?'100':'35'}%"></div></div></div>
   <div class="metric"><span>Supabase</span><b>${sbConnected?a.supabase:'Sem projeto'}</b><div class="bar"><div class="fill" style="width:${sbConnected?'100':'0'}%"></div></div></div>
   <div class="metric"><span>Último push</span><b>${gh.ok?fmtDate(gh.pushed_at):'—'}</b></div>
  </div>
  ${warnings.length?`<div class="alert">⚠️ ${warnings.join(' · ')}</div>`:`<div class="alert">✅ Integrações básicas identificadas. Métricas de consumo entram pela API segura do monitor.</div>`}
  <div class="foot"><span>Branch: ${gh.ok?gh.default_branch:'—'}</span><span>${gh.ok?gh.visibility:'—'}</span></div>
 </article>`;
}

async function refresh(){
 document.getElementById('updated').textContent='Atualizando…';
 const apps=await Promise.all(APPS.map(async a=>({...a,github:await githubRepo(a.repo)})));
 state.apps=apps; state.alerts=apps.filter(a=>!a.github.ok||!a.supabase).length;
 document.getElementById('grid').innerHTML=apps.map(card).join('');
 document.getElementById('appsCount').textContent=apps.length;
 document.getElementById('sbCount').textContent=apps.filter(a=>a.supabase).length;
 document.getElementById('alertsCount').textContent=state.alerts;
 document.getElementById('overall').textContent=state.alerts?'Atenção':'Normal';
 document.getElementById('updated').textContent='Atualizado '+new Date().toLocaleTimeString('pt-BR');
}
refresh();setInterval(refresh,60000);