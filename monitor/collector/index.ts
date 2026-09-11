// Tem Aqui Monitor collector
// Deploy only after configuring SUPABASE_ACCESS_TOKEN and GITHUB_TOKEN as server-side secrets.
// Never expose those tokens in browser JavaScript.

const PROJECTS = [
  { ref: 'izbkcdimyfoxikpzefba', name: 'click' },
  { ref: 'dxvqiiawthxwkypvsxci', name: 'Manari conectado' },
];
const REPOS = [
  'lokojhow/tem-aqui-tupanatinga',
  'lokojhow/tem-aqui-gestao',
  'lokojhow/tem-aqui-itaiba',
  'lokojhow/prefeitura-manari-app',
  'lokojhow/urna-educativa',
];

async function json(url:string, headers:Record<string,string>) {
  const r = await fetch(url,{headers});
  const body = await r.text();
  if(!r.ok) throw new Error(`${r.status} ${url}: ${body.slice(0,240)}`);
  return body ? JSON.parse(body) : null;
}

Deno.serve(async (req) => {
  if(req.method !== 'GET') return new Response('Method not allowed',{status:405});
  const sbToken = Deno.env.get('SUPABASE_ACCESS_TOKEN');
  const ghToken = Deno.env.get('GITHUB_TOKEN');
  if(!sbToken || !ghToken) return Response.json({ok:false,error:'Monitor secrets not configured'},{status:503});

  const supabase:any[]=[];
  for(const p of PROJECTS){
    try{
      // Project metadata is safe for a status pulse. Detailed usage/log collection
      // should use current Management API endpoints. Do not use deprecated logs.all.
      const meta=await json(`https://api.supabase.com/v1/projects/${p.ref}`,{Authorization:`Bearer ${sbToken}`});
      supabase.push({ref:p.ref,name:p.name,status:meta?.status||'unknown',region:meta?.region||null});
    }catch(e){supabase.push({ref:p.ref,name:p.name,error:String(e)})}
  }

  const github:any[]=[];
  for(const repo of REPOS){
    try{
      const h={Authorization:`Bearer ${ghToken}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
      const meta=await json(`https://api.github.com/repos/${repo}`,h);
      const runs=await json(`https://api.github.com/repos/${repo}/actions/runs?per_page=5`,h);
      github.push({repo,pushed_at:meta?.pushed_at,visibility:meta?.visibility,default_branch:meta?.default_branch,workflow_runs:(runs?.workflow_runs||[]).map((x:any)=>({id:x.id,status:x.status,conclusion:x.conclusion,name:x.name,created_at:x.created_at,updated_at:x.updated_at}))});
    }catch(e){github.push({repo,error:String(e)})}
  }

  return Response.json({ok:true,generated_at:new Date().toISOString(),supabase,github},{headers:{'Cache-Control':'private, max-age=30'}});
});
