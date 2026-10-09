import React,{useEffect,useMemo,useState}from'react';
import{createRoot}from'react-dom/client';
import{LayoutDashboard,Boxes,SlidersHorizontal,MonitorCog,ShieldCheck,Lightbulb,Bookmark,Settings,LogOut,Menu,Search,Trash2,Save,RotateCcw,CheckCircle2,AlertTriangle,XCircle,ChevronRight,Lock,Plus,Upload,Download,Database}from'lucide-react';
import'./styles.css';
import{components as initialComponents,workloads,qfdRelationships,defaultReqs}from'./data/data.js';
import{runQfd}from'./logic/qfd.js';
import{analyzeBuild}from'./logic/analysis.js';
import{recommend}from'./logic/recommend.js';
import{isSupabaseConfigured,supabase,fromDatabaseComponent,toDatabaseComponent}from'./lib/supabase.js';
import{parseComponentCsv,downloadComponentCsv,downloadComponentTemplate}from'./lib/catalogCsv.js';
const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n||0);
const readLocal=(key,fallback)=>{try{const value=localStorage.getItem(key);return value===null?fallback:JSON.parse(value)}catch{return fallback}};
const CATALOG_SEED_VERSION='44';
const readCatalogue=()=>{const stored=readLocal('pbb_catalog_v5',null);const version=localStorage.getItem('pbb_catalog_seed_version');if(!Array.isArray(stored)){localStorage.setItem('pbb_catalog_seed_version',CATALOG_SEED_VERSION);return initialComponents}if(version===CATALOG_SEED_VERSION)return stored;const merged=new Map(initialComponents.map(item=>[String(item.id),item]));stored.forEach(item=>merged.set(String(item.id),{...(merged.get(String(item.id))||{}),...item}));const result=[...merged.values()];localStorage.setItem('pbb_catalog_v5',JSON.stringify(result));localStorage.setItem('pbb_catalog_seed_version',CATALOG_SEED_VERSION);return result};
const defaultSpecs=category=>({
 CPU:{specs:{socket:'AM5',cores:6,threads:12,boostClock:'4.5 GHz',tdp:'65 W',performanceScore:65},power:65},
 Motherboard:{specs:{socket:'AM5',chipset:'B650',ramType:'DDR5',ramSlots:4,maxRam:'128 GB',formFactor:'mATX',maxPcieGeneration:'4.0'}},
 RAM:{specs:{capacity:'32 GB',type:'DDR5',speed:'5600 MT/s'}},
 GPU:{specs:{vram:'8 GB',power:'150 W',length:'250 mm',performanceScore:65}},
 Storage:{specs:{type:'NVMe SSD',capacity:'1 TB',interface:'PCIe 4.0'}},
 PSU:{specs:{wattage:'650 W',efficiency:'80+ Bronze'}},
 Case:{specs:{formFactor:'mATX',gpuClearance:'320 mm',maxCoolerHeight:'165 mm'}}
}[category]||{specs:{}});
const buildKeys=['cpu','motherboard','ram','gpu','storage','psu','case'];
const fields={CPU:'cpu',Motherboard:'motherboard',RAM:'ram',GPU:'gpu',Storage:'storage',PSU:'psu',Case:'case'};
const navGroups=[
 {label:'BUILD',items:[['Home',LayoutDashboard],['Workload Evaluation',SlidersHorizontal],['Components',Boxes],['Build Configuration',MonitorCog]]},
 {label:'ANALYSIS',items:[['Dashboard',LayoutDashboard],['QFD Analysis',MonitorCog],['Compatibility & Analysis',ShieldCheck],['FMEA Risk Analysis',AlertTriangle],['Recommendations',Lightbulb]]},
 {label:'SAVED',items:[['My Builds',Bookmark]]},
 {label:'SYSTEM',items:[['Administration',Settings]]}
];
const locked=new Set(['Dashboard','QFD Analysis','Compatibility & Analysis','FMEA Risk Analysis','Recommendations','My Builds','Administration']);
const countSelected=b=>buildKeys.filter(k=>Boolean(b[k])).length;
const powerLabel=a=>!a?.hasAnyPart?'—':`${a.power} W est.`;
const psuLabel=a=>a?.requiredPsu?`${a.requiredPsu} W`:'—';
function App(){
 const[session,setSession]=useState(null);
 const[authReady,setAuthReady]=useState(!isSupabaseConfigured);
 const[profile,setProfile]=useState(null);
 const[catalog,setCatalog]=useState(()=>readCatalogue());
 const[catalogSource,setCatalogSource]=useState(isSupabaseConfigured?'Connecting to component database…':'Local demo catalogue');
 const[catalogMessage,setCatalogMessage]=useState('');
 const[catalogLoading,setCatalogLoading]=useState(false);
 const[page,setPage]=useState('Home');
 const[collapsed,setCollapsed]=useState(false);
 const[authOpen,setAuthOpen]=useState(false);
 const[authTarget,setAuthTarget]=useState('Dashboard');
 const[authInitialMode,setAuthInitialMode]=useState('signin');
 const[work,setWork]=useState(()=>readLocal('pbb_work_v4',[]));
 const[req,setReq]=useState(()=>({...defaultReqs,...readLocal('pbb_req_v4',{})}));
 const[build,setBuild]=useState(()=>readLocal('pbb_active_build_v4',{}));
 const[saved,setSaved]=useState(()=>readLocal('pbb_saved_v4',[]));
 const qfd=useMemo(()=>runQfd(req,qfdRelationships),[req]);
 const analysis=useMemo(()=>analyzeBuild(build,catalog,work),[build,work,catalog]);
 const recs=useMemo(()=>recommend(build,work,qfd,analysis,catalog),[build,work,qfd,analysis,catalog]);
 const logged=Boolean(session?.user);
 const isAdmin=profile?.role==='admin';

 // Supabase owns authentication and persists the signed-in session across reloads.
 useEffect(()=>{
  if(!supabase){setAuthReady(true);return}
  let active=true;
  supabase.auth.getSession().then(({data,error})=>{
   if(!active)return;
   if(error)setCatalogMessage(error.message);
   setSession(data?.session||null);setAuthReady(true);
  }).catch(error=>{if(active){setCatalogMessage(error.message||'Could not restore sign-in session.');setAuthReady(true)}});
  const{data:{subscription}}=supabase.auth.onAuthStateChange((event,nextSession)=>{setSession(nextSession||null);setAuthReady(true);if(event==='PASSWORD_RECOVERY'){setAuthTarget('Reset password');setAuthInitialMode('recovery');setAuthOpen(true)}});
  if(typeof window!=='undefined'&&window.location.hash.includes('type=recovery')){setAuthTarget('Reset password');setAuthInitialMode('recovery');setAuthOpen(true)}
  return()=>{active=false;subscription.unsubscribe()};
 },[]);

 useEffect(()=>{
  let active=true;
  async function loadProfile(){
   if(!supabase||!session?.user){setProfile(null);return}
   const{data,error}=await supabase.from('profiles').select('id,email,display_name,role').eq('id',session.user.id).maybeSingle();
   if(!active)return;
   if(error){setProfile({id:session.user.id,email:session.user.email,role:'user'});setCatalogMessage('Profile could not be loaded. Check that the Supabase setup SQL was applied.');return}
   setProfile(data||{id:session.user.id,email:session.user.email,role:'user'});
  }
  loadProfile().catch(error=>{if(active)setProfile({id:session?.user?.id,role:'user'})});
  return()=>{active=false};
 },[session?.user?.id]);

 async function reloadCatalog(){
  if(!supabase)return;
  setCatalogLoading(true);
  try{
   const pageSize=1000;
   const rows=[];
   for(let start=0;;start+=pageSize){
    const{data,error}=await supabase.from('components').select('*').eq('is_active',true).order('category').order('name').range(start,start+pageSize-1);
    if(error)throw error;
    rows.push(...(data||[]));
    if(!data||data.length<pageSize)break;
   }
   if(rows.length){setCatalog(rows.map(fromDatabaseComponent));setCatalogSource('PostgreSQL component catalogue');setCatalogMessage(`${rows.length} component records loaded.`)}
   else{setCatalog(initialComponents);setCatalogSource('Sample catalogue — import the starter CSV');setCatalogMessage('The database table is empty. Import your component CSV from Administration.')}
  }catch(error){setCatalogSource('Local demo catalogue');setCatalogMessage(`Database catalogue unavailable: ${error.message||'Unknown error'}`)}
  finally{setCatalogLoading(false)}
 }
 useEffect(()=>{
  if(!isSupabaseConfigured){setCatalog(readCatalogue());setCatalogSource('Local demo catalogue');return}
  reloadCatalog().catch(error=>{setCatalogSource('Local demo catalogue');setCatalogMessage(error.message||'Could not load the database catalogue.')});
 },[]);

 // Guest mode uses browser storage. Once Supabase is configured, shared catalogue and saved builds come from Postgres.
 useEffect(()=>{localStorage.setItem('pbb_work_v4',JSON.stringify(work))},[work]);
 useEffect(()=>{localStorage.setItem('pbb_req_v4',JSON.stringify(req))},[req]);
 useEffect(()=>{localStorage.setItem('pbb_active_build_v4',JSON.stringify(build))},[build]);
 useEffect(()=>{if(!isSupabaseConfigured)localStorage.setItem('pbb_saved_v4',JSON.stringify(saved))},[saved]);
 useEffect(()=>{if(!isSupabaseConfigured)localStorage.setItem('pbb_catalog_v5',JSON.stringify(catalog))},[catalog]);
 useEffect(()=>{
  let active=true;
  async function loadSaved(){
   if(!supabase||!authReady)return;
   if(!session?.user){setSaved([]);return}
   const{data,error}=await supabase.from('saved_builds').select('*').order('updated_at',{ascending:false});
   if(!active)return;
   if(error){setCatalogMessage(`Saved builds could not be loaded: ${error.message}`);return}
   setSaved((data||[]).map(row=>({
    id:row.id,dbId:row.id,cloud:true,name:row.name,budget:Number(row.budget)||80000,
    ...(row.build_data||{}),workloads:row.workloads||[],requirements:row.requirements||{...defaultReqs},
    savedAt:row.updated_at?new Date(row.updated_at).toLocaleString('en-IN'):'Saved'
   })));
  }
  loadSaved().catch(error=>{if(active)setCatalogMessage(error.message||'Could not load saved builds.')});
  return()=>{active=false};
 },[session?.user?.id,authReady]);

 const requestLogin=target=>{setAuthTarget(target||'Dashboard');setAuthInitialMode('signin');setAuthOpen(true)};
 const go=n=>{
  if(n==='Administration'&&!isSupabaseConfigured){setPage(n);return}
  if(locked.has(n)&&!logged){requestLogin(n);return}
  if(n==='Administration'&&logged&&!isAdmin){window.alert('Administration is restricted to an administrator account.');return}
  setPage(n)
 };
 const newBuild=()=>{setBuild({});setWork([]);setReq({...defaultReqs});setPage('Workload Evaluation')};
 const doLogin=(destination)=>{setAuthOpen(false);setPage(destination||authTarget||'Dashboard')};
 const logout=async()=>{
  if(supabase){const{error}=await supabase.auth.signOut();if(error){window.alert(`Could not sign out: ${error.message}`);return}}
  setSession(null);setProfile(null);setPage('Home');setSaved([]);
 };
 const notifyError=message=>window.alert(message);
 const saveBuild=async(candidate=build)=>{
  if(!candidate.name?.trim())throw new Error('Enter a build name first.');
  if(supabase&&session?.user){
   const data={user_id:session.user.id,name:candidate.name.trim(),budget:Number(candidate.budget??80000),workloads:work,requirements:req,build_data:Object.fromEntries([...buildKeys.map(k=>[k,candidate[k]||'']),['name',candidate.name.trim()],['budget',Number(candidate.budget??80000)]])};
   const{data:row,error}=await supabase.from('saved_builds').upsert(data,{onConflict:'user_id,name'}).select('*').single();
   if(error)throw new Error(error.message);
   const view={id:row.id,dbId:row.id,cloud:true,name:row.name,budget:Number(row.budget),...(row.build_data||{}),workloads:row.workloads||[],requirements:row.requirements||{...defaultReqs},savedAt:new Date(row.updated_at).toLocaleString('en-IN')};
   setSaved(prev=>[view,...prev.filter(x=>x.name!==view.name)]);return view;
  }
  const view={...candidate,id:Date.now(),workloads:[...work],requirements:{...req},savedAt:new Date().toLocaleString('en-IN')};
  setSaved(prev=>[view,...prev.filter(x=>x.name!==view.name)]);return view;
 };
 const loadSavedBuild=item=>{
  const source=item.build_data||item;
  const next={name:item.name||source.name||'My Build',budget:Number(item.budget??source.budget??80000)};
  buildKeys.forEach(k=>{next[k]=source[k]||''});
  setBuild(next);
  if(Array.isArray(item.workloads))setWork(item.workloads);
  if(item.requirements)setReq({...defaultReqs,...item.requirements});
  setPage('Build Configuration');
 };
 const deleteSavedBuild=async item=>{
  if(item.cloud&&supabase){const{error}=await supabase.from('saved_builds').delete().eq('id',item.id);if(error)throw new Error(error.message)}
  setSaved(prev=>prev.filter(x=>String(x.id)!==String(item.id)));
 };
 const addCatalogComponent=async item=>{
  if(supabase){const{error}=await supabase.from('components').upsert(toDatabaseComponent(item),{onConflict:'id'});if(error)throw new Error(error.message);await reloadCatalog();return}
  setCatalog(prev=>[item,...prev]);
 };
 const updateCatalogComponent=async item=>{
  if(supabase){const{error}=await supabase.from('components').upsert(toDatabaseComponent(item),{onConflict:'id'});if(error)throw new Error(error.message);await reloadCatalog();return}
  setCatalog(prev=>prev.map(x=>String(x.id)===String(item.id)?item:x));
 };
 const deleteCatalogComponent=async item=>{
  if(supabase){const{error}=await supabase.from('components').delete().eq('id',String(item.id));if(error)throw new Error(error.message);await reloadCatalog();return}
  setCatalog(prev=>prev.filter(x=>String(x.id)!==String(item.id)));
 };
 const importCatalogComponents=async items=>{
  if(supabase){
   const rows=items.map(toDatabaseComponent);
   for(let i=0;i<rows.length;i+=200){const{error}=await supabase.from('components').upsert(rows.slice(i,i+200),{onConflict:'id'});if(error)throw new Error(error.message)}
   await reloadCatalog();return;
  }
  setCatalog(prev=>{const map=new Map(prev.map(x=>[String(x.id),x]));items.forEach(x=>map.set(String(x.id),x));return [...map.values()]});
 };
 return <div className={'app '+(collapsed?'collapsed':'')}>
  <aside className="sidebar">
   <div className="brand"><div className="logo">PB</div>{!collapsed&&<div className="brand-copy"><b>PC Build Bench</b><span>PC configuration</span></div>}<button className="collapse" onClick={()=>setCollapsed(!collapsed)}><Menu size={17}/></button></div>
   <nav>{navGroups.map(g=><div className="nav-group" key={g.label}><div className="nav-group-label">{!collapsed&&g.label}</div>{g.items.map(([n,I])=><button key={n} className={page===n?'active':''} title={n} onClick={()=>go(n)}><I size={16}/>{!collapsed&&<span>{n}</span>}{!collapsed&&locked.has(n)&&!logged&&!(n==='Administration'&&!isSupabaseConfigured)&&<Lock size={12} className="lock"/>}</button>)}</div>)}</nav>
   <div className="sidebar-bottom">{logged?<button className="signout" onClick={logout}><LogOut size={16}/>{!collapsed&&'Sign out'}</button>:<button className="signout" onClick={()=>requestLogin('Dashboard')}>{!collapsed&&'Sign in'}<ChevronRight size={15}/></button>}</div>
  </aside>
  <main>
   <header className="topbar"><div><div className="section-kicker">PC BUILD BENCH</div><h1>{page}</h1></div><div className="top-actions">{logged?<span className="account-status"><span/>{profile?.email||session.user.email||'Signed in'}</span>:<><span className="guest-status">Guest</span><button className="header-signin" onClick={()=>requestLogin('Dashboard')}>Sign in</button></>}</div></header>
   {catalogMessage&&<div className="app-notice" role="status"><span>{catalogMessage}</span><button onClick={()=>setCatalogMessage('')} aria-label="Dismiss notice">×</button></div>}
   <div className="content"><Page page={page} work={work} setWork={setWork} req={req} setReq={setReq} qfd={qfd} build={build} setBuild={setBuild} analysis={analysis} saved={saved} setSaved={setSaved} recs={recs} setPage={setPage} navigate={go} logged={logged} isAdmin={isAdmin} onLogin={requestLogin} newBuild={newBuild} catalog={catalog} setCatalog={setCatalog} catalogSource={catalogSource} catalogLoading={catalogLoading} onSaveBuild={saveBuild} onLoadSavedBuild={loadSavedBuild} onDeleteSavedBuild={deleteSavedBuild} onCatalogAdd={addCatalogComponent} onCatalogUpdate={updateCatalogComponent} onCatalogDelete={deleteCatalogComponent} onCatalogImport={importCatalogComponents}/></div>
  </main>
  {authOpen&&<Login target={authTarget} initialMode={authInitialMode} onLogin={doLogin} onClose={()=>setAuthOpen(false)}/>} 
 </div>
}

function Login({target,initialMode='signin',onLogin,onClose}){
 const[mode,setMode]=useState(initialMode);const[name,setName]=useState('');const[email,setEmail]=useState('');const[pass,setPass]=useState('');const[busy,setBusy]=useState(false);const[error,setError]=useState('');const[note,setNote]=useState('');
 const submit=async e=>{
  e.preventDefault();setError('');setNote('');
  if(!isSupabaseConfigured||!supabase){setError('Real sign-in is not configured yet. Add your Supabase URL and publishable key to .env.local, apply the SQL migration, then restart Vite.');return}
  if(['signup','recovery'].includes(mode)&&pass.length<8){setError('Use a password with at least 8 characters.');return}
  setBusy(true);
  try{
   if(mode==='recovery'){
    const{error:resetError}=await supabase.auth.updateUser({password:pass});
    if(resetError)throw resetError;
    setNote('Password updated. You can continue using your account.');
    onLogin('Dashboard');return;
   }else if(mode==='signup'){
    const{data,error:authError}=await supabase.auth.signUp({email:email.trim(),password:pass,options:{data:{display_name:name.trim()}}});
    if(authError)throw authError;
    if(data.session){onLogin();return}
    setNote('Account created. Check your email to confirm the account, then sign in.');setMode('signin');
   }else{
    const{error:authError}=await supabase.auth.signInWithPassword({email:email.trim(),password:pass});
    if(authError)throw authError;
    onLogin();
   }
  }catch(err){setError(err?.message||'Authentication failed.');}
  finally{setBusy(false)}
 };
 const resetPassword=async()=>{
  setError('');setNote('');
  if(!supabase||!isSupabaseConfigured){setError('Configure Supabase before using password recovery.');return}
  if(!email.trim()){setError('Enter your email first.');return}
  setBusy(true);
  try{const{error:resetError}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+window.location.pathname});if(resetError)throw resetError;setNote('If the account exists, a password-reset email will be sent.');}
  catch(err){setError(err?.message||'Could not request password reset.')}finally{setBusy(false)}
 };
 return <div className="modal-backdrop"><div className="login-modal"><button className="modal-close" onClick={onClose}><XCircle size={18}/></button><div className="login-mark">PB</div><div className="section-kicker">ACCOUNT</div><h2>{mode==='signup'?'Create account':mode==='recovery'?'Set a new password':`Sign in to ${target}`}</h2><p>{isSupabaseConfigured?'Use your email and password. Your saved builds will be linked to your account.':'The app is running in guest mode until Supabase is configured.'}</p>
 {!isSupabaseConfigured&&<div className="setup-note"><b>One-time setup required</b><span>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to <code>.env.local</code>, then apply <code>supabase/migrations/20261009000100_initial_schema.sql</code>.</span></div>}
 {error&&<div className="auth-error" role="alert">{error}</div>}{note&&<div className="auth-note" role="status">{note}</div>}
 <form className="login-form" onSubmit={submit}>
 {mode==='signup'&&<label>Display name<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Your display name" required/></label>}
 {mode!=='recovery'&&<label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="name@example.com" required/></label>}
 <label>{mode==='recovery'?'New password':'Password'}<input type="password" value={pass} onChange={e=>setPass(e.target.value)} autoComplete={mode==='signin'?'current-password':'new-password'} placeholder={mode==='signin'?'Enter your password':'At least 8 characters'} minLength={mode==='signin'?1:8} required/></label>
 <button className="primary full" type="submit" disabled={busy||!isSupabaseConfigured}>{busy?(mode==='signup'?'Creating account…':mode==='recovery'?'Updating password…':'Signing in…'):(mode==='signup'?'Create account':mode==='recovery'?'Update password':'Sign in')} <ChevronRight size={16}/></button>
 </form>
 {mode==='signin'&&<button className="text-btn centered" onClick={resetPassword} disabled={busy||!isSupabaseConfigured}>Forgot password?</button>}
 {mode!=='recovery'&&<button className="text-btn centered" onClick={()=>{setError('');setNote('');setMode(mode==='signup'?'signin':'signup')}}>{mode==='signup'?'Already have an account? Sign in':'New here? Create an account'}</button>}
 <button className="text-btn centered muted-btn" onClick={onClose}>Continue as Guest</button>
 </div></div>
}

function Page(p){switch(p.page){case'Home':return <Home {...p}/>;case'Dashboard':return <Dashboard {...p}/>;case'Workload Evaluation':return <Workload {...p}/>;case'QFD Analysis':return <QFD {...p}/>;case'Components':return <ComponentsPage {...p}/>;case'Build Configuration':return <Build {...p}/>;case'Compatibility & Analysis':return <Analysis {...p}/>;case'FMEA Risk Analysis':return <FMEA {...p}/>;case'Recommendations':return <Recommendations {...p}/>;case'My Builds':return <MyBuilds {...p}/>;case'Administration':return <Admin {...p}/>;default:return <Home {...p}/>}}
const Status=({type,children})=><span className={'status '+type}>{type==='ok'?<CheckCircle2 size={13}/>:type==='warn'?<AlertTriangle size={13}/>:<XCircle size={13}/>} {children}</span>;
const Metric=({label,value,sub})=><div className="metric"><span>{label}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}</div>;
const Row=({k,v})=><div className="row"><span>{k}</span><b>{v}</b></div>;
function PageHead({eyebrow,title,children,action}){return <div className="page-head"><div><div className="section-kicker">{eyebrow}</div><h2>{title}</h2>{children&&<p>{children}</p>}</div>{action}</div>}
function Home({setPage,build,analysis,onLogin,newBuild,catalog}){const selected=countSelected(build);return <div className="home-page">
 <PageHead eyebrow="PC CONFIGURATION" title="Build your PC.">Start from a workload, browse parts, then assemble a configuration.</PageHead>
 <section className="home-start"><div><span className="quiet-label">NEW BUILD</span><h3>Start with an empty configuration</h3><p>Nothing is preselected. Choose every component yourself.</p><button className="primary" onClick={newBuild}>Start a new build <ChevronRight size={15}/></button></div><div className="home-stats"><div><span>Parts in catalogue</span><b>{catalog.length}</b></div><div><span>Workload profiles</span><b>{Object.keys(workloads).length}</b></div></div></section>
 <div className="home-grid"><section className="home-section"><div className="section-title-row"><h3>Explore</h3></div><button className="home-link" onClick={()=>setPage('Workload Evaluation')}><SlidersHorizontal size={17}/><span><b>Workload Evaluation</b><small>Choose what the PC will be used for.</small></span><ChevronRight size={15}/></button><button className="home-link" onClick={()=>setPage('Components')}><Boxes size={17}/><span><b>Components</b><small>Browse the catalogue and add parts directly to the build.</small></span><ChevronRight size={15}/></button><button className="home-link" onClick={()=>setPage('Build Configuration')}><MonitorCog size={17}/><span><b>Build Configuration</b><small>Review the selected parts, cost and power estimate.</small></span><ChevronRight size={15}/></button></section><section className="home-section"><div className="section-title-row"><h3>Current build</h3><button className="text-btn" onClick={()=>setPage('Build Configuration')}>Open <ChevronRight size={14}/></button></div><div className="home-current"><div><span>Selected</span><b>{selected}/7</b></div><div><span>Total</span><b>{money(analysis.total)}</b></div><div><span>Power</span><b>{powerLabel(analysis)}</b></div></div><div className="mini-parts">{buildKeys.map(k=>{const x=catalog.find(c=>String(c.id)===String(build[k]));return <span key={k}>{x?x.name:'—'}</span>})}</div><div className="locked-inline"><span>Detailed analysis</span><button onClick={()=>onLogin('QFD Analysis')}>Sign in <ChevronRight size={13}/></button></div></section></div>
 </div>}
function Dashboard({work,build,analysis,qfd,setPage}){const selected=countSelected(build);return <div><PageHead eyebrow="OVERVIEW" title="Build summary">Review the active configuration and analysis results.</PageHead><div className="metric-grid four"><Metric label="Workloads" value={work.length||0}/><Metric label="Build cost" value={money(analysis.total)}/><Metric label="Estimated power" value={powerLabel(analysis)} sub="Reference power estimate"/><Metric label="QFD coverage" value={Math.round(qfd.coverage)+'%'}/></div><div className="dashboard-grid"><section className="section-block"><div className="section-title-row"><h3>Build status</h3><button className="text-btn" onClick={()=>setPage('Build Configuration')}>Open build <ChevronRight size={14}/></button></div><div className="stack"><Row k="Components selected" v={selected+'/7'}/><Row k="Compatibility" v={<Status type={analysis.compatibilityStatus}>{analysis.compatibilityLabel}</Status>}/><Row k="Budget" v={<Status type={analysis.budgetOk?'ok':'warn'}>{analysis.budgetOk?'Within budget':'Over budget'}</Status>}/><Row k="Risk" v={<Status type={!analysis.completeBuild?'warn':analysis.highRisk?'bad':analysis.mediumRisk?'warn':'ok'}>{!analysis.completeBuild?'Not assessed':analysis.highRisk?'High risk':analysis.mediumRisk?'Medium risk':'Low risk'}</Status>}/></div></section><section className="section-block"><div className="section-title-row"><h3>Technical priorities</h3></div><div className="priority-list">{qfd.priorities.slice(0,6).map(x=><div key={x.name}><div><span>{x.name}</span><b>{x.normalized.toFixed(1)}</b></div><div className="bar"><i style={{width:x.normalized+'%'}}/></div></div>)}</div></section></div></div>}
function Workload({work,setWork,navigate}){return <div><PageHead eyebrow="WORKLOAD" title="Choose workloads">Your selections set the workload weighting used later in the analysis.</PageHead><div className="workload-layout"><section className="section-block"><div className="section-title-row"><h3>Workload profiles</h3><span className="quiet-label">Select one or more</span></div><div className="work-list">{Object.entries(workloads).map(([k,v])=><button key={k} className={'work-row '+(work.includes(k)?'selected':'')} onClick={()=>setWork(work.includes(k)?work.filter(x=>x!==k):[...work,k])}><span className="work-check">{work.includes(k)?'✓':''}</span><span><b>{k}</b><small>{v.description}</small></span><strong>{Math.round(v.cpu*100)} CPU · {Math.round(v.gpu*100)} GPU · {Math.round(v.ram*100)} RAM</strong></button>)}</div><div className="button-row"><button className="primary" onClick={()=>navigate('QFD Analysis')}>Continue to QFD <ChevronRight size={15}/></button></div></section><section className="section-block"><div className="section-title-row"><h3>Current mix</h3></div>{work.length?<div className="priority-list">{['cpu','gpu','ram','storage'].map(k=>{const score=work.reduce((s,w)=>s+workloads[w][k],0)/work.length*100;return <div key={k}><div><span>{k.toUpperCase()}</span><b>{Math.round(score)}%</b></div><div className="bar"><i style={{width:score+'%'}}/></div></div>})}</div>:<div className="empty">Select at least one workload.</div>}</section></div></div>}
function QFD({req,setReq,qfd,setPage}){return <div><PageHead eyebrow="QFD ANALYSIS" title="User requirements">Set importance values. The relationship matrix converts them into technical priorities.</PageHead><div className="qfd-layout"><section className="section-block"><div className="section-title-row"><h3>Importance</h3><span className="quiet-label">1 low · 5 critical</span></div>{Object.entries(req).map(([k,v])=><div className="range-row" key={k}><span>{k}</span><b>{v}</b><input type="range" min="1" max="5" value={v} onChange={e=>setReq({...req,[k]:+e.target.value})}/></div>)}<div className="formula">Priority = Σ (importance × relationship strength)</div></section><section className="section-block"><div className="section-title-row"><h3>Technical priorities</h3><span className="quiet-label">Normalized</span></div><div className="priority-list">{qfd.priorities.map(x=><div key={x.name}><div><span>{x.name}</span><b>{x.normalized.toFixed(1)}</b></div><div className="bar"><i style={{width:x.normalized+'%'}}/></div></div>)}</div></section></div><section className="section-block qfd-matrix"><div className="section-title-row"><h3>Relationship matrix</h3><span className="quiet-label">0 none · 1 weak · 3 medium · 9 strong</span></div><div className="matrix"><div className="matrix-head"><span>User / Technical</span>{qfdRelationships.technical.map(t=><span key={t.short}>{t.short}</span>)}</div>{qfdRelationships.users.map(u=><div className="matrix-row" key={u}><span>{u}</span>{qfdRelationships.matrix[u].map((n,i)=><span className={n===9?'strong':n===3?'medium':n===1?'weak':''} key={i}>{n}</span>)}</div>)}</div><div className="matrix-foot"><span>{qfd.explanation}</span><button className="primary" onClick={()=>setPage('Build Configuration')}>Continue to build <ChevronRight size={15}/></button></div></section></div>}
const catalogSpecOrder={
 CPU:['socket','cores','threads','boostClock','boostClockGHz','tdp','microarchitecture','coreClockGHz'],
 Motherboard:['socket','ramType','chipset','formFactor','maxRam','ramSlots'],
 RAM:['capacity','type','speed','modules','casLatency'],
 GPU:['chipset','vram','length','coreClockMHz','boostClockMHz','color'],
 Storage:['capacity','type','interface','formFactor'],
 PSU:['wattage','efficiency','modular','type'],
 Case:['gpuClearance','formFactor','sidePanel','color','internal35Bays']
};
const catalogSpecAliases={vramGB:'vram',lengthMm:'length',capacityGB:'capacity'};
function getCatalogSpecs(item){
 const source=item?.specs&&typeof item.specs==='object'?item.specs:{};
 const entries=Object.entries(source).filter(([key,value])=>!key.startsWith('_')&&!/known$/i.test(key)&&!/dataquality/i.test(key)&&!/(source|inference|assumption|observation|priceestimate)/i.test(key)&&value!==null&&value!==undefined&&value!==''&&typeof value!=='object'&&String(value).toLowerCase()!=='undefined'&&String(value).toLowerCase()!=='null');
 const order=catalogSpecOrder[item?.category]||[];
 entries.sort((a,b)=>{const ai=order.indexOf(a[0]),bi=order.indexOf(b[0]);return (ai<0?999:ai)-(bi<0?999:bi)});
 const available=new Set(entries.map(([key])=>key));
 return entries.filter(([key])=>!catalogSpecAliases[key]||!available.has(catalogSpecAliases[key])).slice(0,4);
}
function ComponentsPage({build,setBuild,setPage,catalog,catalogSource}){
 const[c,setC]=useState('CPU'),[s,setS]=useState(''),[limit,setLimit]=useState(80);
 const cats=['All','CPU','Motherboard','RAM','GPU','Storage','PSU','Case'];
 const matching=catalog.filter(x=>(c==='All'||x.category===c)&&String(x.name||'').toLowerCase().includes(s.toLowerCase()));
 const list=matching.slice(0,limit);
 const pick=x=>{const key=fields[x.category];if(!key)return;setBuild({...build,[key]:x.id})};
 const selected=countSelected(build);
 useEffect(()=>setLimit(80),[c,s]);
 return <div><PageHead eyebrow="COMPONENTS" title="Choose parts">Browse the catalogue and add parts directly to your build.</PageHead>
 <p className="catalog-disclaimer">Showing {matching.length.toLocaleString('en-IN')} components. Prices are estimates and may differ from retailer listings.</p>
 <section className="build-strip"><div><span>ACTIVE BUILD</span><b>{selected}/7 selected</b></div>{buildKeys.map(k=>{const x=catalog.find(c=>String(c.id)===String(build[k]));return <div key={k} className={x?'filled':''}><small>{k}</small><span>{x?x.name:'Not selected'}</span></div>})}<button className="strip-action" onClick={()=>setPage('Build Configuration')}>Open build <ChevronRight size={14}/></button></section>
 <section className="catalog"><div className="catalog-toolbar"><div className="search"><Search size={15}/><input placeholder="Search parts" value={s} onChange={e=>setS(e.target.value)}/></div><div className="chips">{cats.map(x=><button key={x} className={c===x?'chip active':'chip'} onClick={()=>setC(x)}>{x}</button>)}</div></div>
 <div className="catalog-table"><div className="catalog-row catalog-head"><span>Component</span><span>Specifications</span><span>Price</span><span></span></div>
 {list.map(x=>{const key=fields[x.category],is=String(x.id)===String(build[key]);const specs=getCatalogSpecs(x);return <div className={'catalog-row '+(is?'selected-row':'')} key={x.id}><div className="component-name"><span className="tag">{x.category||'Component'}</span><b>{x.name||'Unnamed component'}</b><small>{x.brand||'Brand not specified'}</small></div><div className="catalog-specs">{specs.map(([k,v])=><span key={k}><small>{k.replace(/([A-Z])/g,' $1').replace(/_/g,' ').replace(/^./,t=>t.toUpperCase())}</small><b>{String(v)}</b></span>)}</div><strong className="price">{money(x.price)}</strong><button className={is?'secondary add-btn':'primary add-btn'} onClick={()=>pick(x)}>{is?<><CheckCircle2 size={14}/> Selected</>:<><Plus size={14}/> Add</>}</button></div>})}
 </div>{matching.length>list.length&&<div className="button-row"><button className="secondary" onClick={()=>setLimit(n=>n+80)}>Load 80 more ({(matching.length-list.length).toLocaleString('en-IN')} remaining)</button></div>}
 {matching.length===0&&<div className="empty">No components match this search in the selected category.</div>}
 </section></div>
}
function Build({build,setBuild,analysis,logged,onLogin,catalog,onSaveBuild}){
 const update=(k,v)=>setBuild({...build,[k]:v});
 const saveNow=async()=>{if(!logged){onLogin('My Builds');return}try{await onSaveBuild(build);window.alert('Build saved.')}catch(error){window.alert(`Could not save build: ${error.message}`)}};
 return <div><PageHead eyebrow="BUILD CONFIGURATION" title="Assemble the configuration">Select one component in each category and review the live results.</PageHead><div className="builder-layout"><section className="section-block"><div className="section-title-row"><h3>Build details</h3></div><label>Build name<input value={build.name||''} placeholder="e.g. Gaming 1440p" onChange={e=>update('name',e.target.value)}/></label><label>Budget (₹)<input type="number" value={build.budget??80000} min="0" onChange={e=>update('budget',+e.target.value)}/></label><div className="form-section-title">Components</div>{buildKeys.map(k=><label key={k}>{k.replace(/^./,m=>m.toUpperCase())}<select value={build[k]||''} onChange={e=>update(k,e.target.value)}><option value="">Select {k}</option>{catalog.filter(x=>String(x.category||'').toLowerCase()===k).map(x=><option key={x.id} value={x.id}>{x.name||'Unnamed component'} — {money(x.price)}</option>)}</select></label>)}<div className="button-row"><button className="secondary" onClick={()=>setBuild({})}><RotateCcw size={14}/> Reset</button><button className="primary" onClick={saveNow}><Save size={14}/> {logged?'Save build':'Sign in to save'}</button></div></section><section className="section-block"><div className="section-title-row"><h3>Live checks</h3></div><div className="summary-line"><div><span>Total</span><b>{money(analysis.total)}</b></div><div><span>Power</span><b>{powerLabel(analysis)}</b></div></div><div className="analysis-list">{analysis.checks.map(c=><div className="analysis-row" key={c.name}><div><b>{c.name}</b><span>{c.detail}</span></div><Status type={c.status}>{c.label}</Status></div>)}</div>{!logged&&<p className="guest-note">Configuration remains available as a guest. Sign in to save it to your account.</p>}</section></div></div>
}

function Analysis({analysis,navigate}){return <div><PageHead eyebrow="COMPATIBILITY" title="Compatibility & analysis">Each result is calculated from the currently selected components.</PageHead><div className="metric-grid four"><Metric label="Build cost" value={money(analysis.total)}/><Metric label="Budget" value={money(analysis.budget)}/><Metric label="Estimated power" value={powerLabel(analysis)} sub="Reference power estimate"/><Metric label="Required PSU" value={psuLabel(analysis)}/></div><section className="section-block"><div className="analysis-list detailed">{analysis.checks.map(c=><div className="analysis-row" key={c.name}><div className="analysis-icon">{c.status==='ok'?<CheckCircle2 size={18}/>:c.status==='warn'?<AlertTriangle size={18}/>:<XCircle size={18}/>}</div><div className="analysis-copy"><b>{c.name}</b><span>{c.detail}</span></div><Status type={c.status}>{c.label}</Status></div>)}</div></section><div className="actions"><button className="primary" onClick={()=>navigate('FMEA Risk Analysis')}>Run FMEA <ChevronRight size={15}/></button></div></div>}
function FMEA({analysis}){const counts=analysis.fmea.reduce((a,x)=>(a[x.level]=(a[x.level]||0)+1,a),{});return <div><PageHead eyebrow="FMEA" title="Build risk analysis">Severity, Occurrence and Detection are scored from 1–10; RPN = S × O × D.</PageHead><div className="fmea-summary"><Metric label="High" value={counts.High||0}/><Metric label="Medium" value={counts.Medium||0}/><Metric label="Low" value={counts.Low||0}/><Metric label="Highest RPN" value={analysis.fmea[0]?.rpn||0}/></div><section className="section-block"><div className="table-wrap"><table><thead><tr><th>Failure mode</th><th>Effect</th><th>S</th><th>O</th><th>D</th><th>RPN</th><th>Risk</th><th>Mitigation</th></tr></thead><tbody>{analysis.fmea.length?analysis.fmea.map(r=><tr key={r.mode}><td><b>{r.mode}</b></td><td>{r.effect}</td><td>{r.s}</td><td>{r.o}</td><td>{r.d}</td><td><b>{r.rpn}</b></td><td><span className={'risk '+r.level.toLowerCase()}>{r.level}</span></td><td>{r.mitigation}</td></tr>):<tr><td colSpan="8">{analysis.completeBuild?'No applicable failure modes for this configuration.':'Complete the build to calculate configuration-specific risks.'}</td></tr>}</tbody></table></div></section></div>}
function Recommendations({recs,work,build}){const hasContext=(work?.length||0)>0||countSelected(build)>0;return <div><PageHead eyebrow="RECOMMENDATIONS" title="Component suggestions">Rule-based suggestions using workload, QFD priorities, compatibility, budget and power.</PageHead><section className="section-block"><div className="recommend-list">{recs.length?recs.map(r=><article className="recommendation" key={r.title}><div><span className="tag">{r.category}</span><h3>{r.name}</h3><p>{r.reason}</p></div><div className="rec-score"><span>Priority</span><b>{r.score}</b></div></article>):<div className="empty">{hasContext?'No component changes are suggested for the current selection.':'Select a workload or begin a build to generate recommendations.'}</div>}</div></section></div>}
function MyBuilds({build,saved,setBuild,onSaveBuild,onLoadSavedBuild,onDeleteSavedBuild}){
 const save=async()=>{if(!build.name)return window.alert('Enter a build name first.');try{await onSaveBuild(build);window.alert('Build saved.')}catch(error){window.alert(`Could not save build: ${error.message}`)}};
 const remove=async item=>{if(!window.confirm(`Delete saved build “${item.name}”?`))return;try{await onDeleteSavedBuild(item)}catch(error){window.alert(`Could not delete build: ${error.message}`)}};
 return <div><PageHead eyebrow="SAVED BUILDS" title="My builds">Saved configurations are linked to your account when the database is configured.</PageHead><div className="save-bar"><div><b>Save current configuration</b><span>{countSelected(build)}/7 components selected</span></div><button className="primary" onClick={save}><Save size={14}/> Save build</button></div><div className="saved-list">{saved.length?saved.map(x=><div className="saved-row" key={x.id}><div><span className="tag">SAVED</span><h3>{x.name}</h3><small>{x.savedAt}</small></div><div className="saved-meta"><span>{money(x.budget||0)} budget</span><span>{countSelected(x)}/7 parts</span></div><div className="saved-actions"><button className="secondary" onClick={()=>onLoadSavedBuild(x)}><RotateCcw size={14}/> Load</button><button className="danger" onClick={()=>remove(x)}><Trash2 size={14}/></button></div></div>):<div className="empty">No saved builds yet.</div>}</div></div>
}

function Admin({catalog,build,saved,isAdmin,catalogSource,catalogLoading,onCatalogAdd,onCatalogUpdate,onCatalogDelete,onCatalogImport}){
 const[category,setCategory]=useState('CPU'),[name,setName]=useState(''),[brand,setBrand]=useState(''),[price,setPrice]=useState(''),[power,setPower]=useState('0'),[specsText,setSpecsText]=useState(JSON.stringify(defaultSpecs('CPU').specs,null,2)),[sourceUrl,setSourceUrl]=useState(''),[priceCheckedAt,setPriceCheckedAt]=useState(''),[busy,setBusy]=useState(false),[localMessage,setLocalMessage]=useState('');
 const byCat=catalog.reduce((a,x)=>(a[x.category]=(a[x.category]||0)+1,a),{});
 useEffect(()=>{const spec=defaultSpecs(category);setSpecsText(JSON.stringify(spec.specs,null,2));setPower(String(spec.power||0))},[category]);
 if(isSupabaseConfigured&&!isAdmin)return <div><PageHead eyebrow="SYSTEM" title="Administration">Administrator access is required to change the shared component catalogue.</PageHead><section className="section-block"><p>Your account is signed in but does not have the administrator role. The project owner can grant the role using the SQL statement in <code>supabase/SETUP.md</code>.</p></section></div>;
 const addComponent=async e=>{
  e.preventDefault();setLocalMessage('');
  const cleanName=name.trim(),cleanBrand=brand.trim(),cost=Number(price),watts=Number(power)||0;
  if(!cleanName||!cleanBrand||!Number.isFinite(cost)||cost<0){setLocalMessage('Enter a component name, brand, and non-negative price.');return}
  if(catalog.some(x=>x.category===category&&x.name.toLowerCase()===cleanName.toLowerCase())){setLocalMessage('A component with this name already exists in the category.');return}
  let specs;try{specs=JSON.parse(specsText||'{}');if(!specs||Array.isArray(specs)||typeof specs!=='object')throw new Error()}catch{setLocalMessage('Specifications must be a valid JSON object.');return}
  const slug=`${category}-${cleanName}`.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  try{setBusy(true);await onCatalogAdd({id:`${slug}-${Date.now().toString(36)}`,category,name:cleanName,brand:cleanBrand,price:cost,power:watts,specs,sourceUrl,priceCheckedAt});setName('');setBrand('');setPrice('');setSourceUrl('');setPriceCheckedAt('');setLocalMessage('Component added.');}
  catch(error){setLocalMessage(`Could not add component: ${error.message}`)}finally{setBusy(false)}
 };
 const editPrice=async item=>{const value=window.prompt(`New price for ${item.name} (₹):`,String(item.price));if(value===null)return;const cost=Number(value);if(!Number.isFinite(cost)||cost<0){window.alert('Enter a valid non-negative price.');return}try{await onCatalogUpdate({...item,price:cost,priceCheckedAt:new Date().toISOString().slice(0,10)})}catch(error){window.alert(`Could not update price: ${error.message}`)}};
 const deleteComponent=async item=>{const activeReference=Object.values(build||{}).some(value=>String(value)===String(item.id));const savedReference=(saved||[]).some(b=>Object.values(b||{}).some(value=>String(value)===String(item.id)));if(activeReference||savedReference){window.alert('This part is used in the active or a saved build. Remove it from those builds before deleting it.');return}if(!window.confirm(`Delete ${item.name} from the catalogue?`))return;try{await onCatalogDelete(item)}catch(error){window.alert(`Could not delete component: ${error.message}`)}};
 const importFile=async event=>{const file=event.target.files?.[0];if(!file)return;setLocalMessage('');try{const text=await file.text();const items=parseComponentCsv(text);setBusy(true);await onCatalogImport(items);setLocalMessage(`Imported ${items.length} component row(s).`)}catch(error){setLocalMessage(error.message||'CSV import failed.')}finally{setBusy(false);event.target.value=''}};
 return <div><PageHead eyebrow="SYSTEM" title="Administration">Manage component specifications and import larger catalogues.</PageHead>
 <div className="metric-grid four"><Metric label="Catalog items" value={catalog.length}/><Metric label="Categories" value={Object.keys(byCat).length}/><Metric label="Data source" value={catalogSource}/><Metric label="Storage" value={isSupabaseConfigured?'PostgreSQL':'This browser only'}/></div>
 <section className="section-block"><div className="section-title-row"><h3>Bulk catalogue import</h3><span className="quiet-label">CSV</span></div><p>Import many components in one operation. Use the template, verify technical specifications, and keep source links and price-check dates where available.</p><div className="admin-import"><label className="secondary file-pick"><Upload size={14}/> Select CSV<input type="file" accept=".csv,text/csv" onChange={importFile} disabled={busy}/></label><button className="secondary" onClick={downloadComponentTemplate}><Download size={14}/> Download template</button><button className="secondary" onClick={()=>downloadComponentCsv(catalog)}><Download size={14}/> Export catalogue</button></div><p className="guest-note">CSV columns: id, category, name, brand, price, power, specs_json, source_url, price_checked_at. Prices in the bundled sample catalogue are illustrative; verify them before treating them as current market prices.</p></section>
 <section className="section-block"><div className="section-title-row"><h3>Add one component</h3><span className="quiet-label">Complete specifications</span></div><form className="admin-form" onSubmit={addComponent}><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{['CPU','Motherboard','RAM','GPU','Storage','PSU','Case'].map(x=><option key={x}>{x}</option>)}</select></label><label>Component name<input value={name} onChange={e=>setName(e.target.value)} required placeholder="Component name"/></label><label>Brand<input value={brand} onChange={e=>setBrand(e.target.value)} required placeholder="Brand"/></label><label>Price (₹)<input type="number" min="0" step="1" value={price} onChange={e=>setPrice(e.target.value)} required placeholder="Price in INR"/></label><label>Power (W)<input type="number" min="0" step="1" value={power} onChange={e=>setPower(e.target.value)}/></label><label>Source URL<input type="url" value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="Manufacturer / retailer page"/></label><label>Price checked on<input type="date" value={priceCheckedAt} onChange={e=>setPriceCheckedAt(e.target.value)}/></label><label className="specs-json-field">Specifications JSON<textarea value={specsText} onChange={e=>setSpecsText(e.target.value)} rows="7" spellCheck="false" required/></label><button className="primary" type="submit" disabled={busy}>{busy?'Saving…':'Add component'}</button></form>{localMessage&&<p className="auth-note" role="status">{localMessage}</p>}</section>
 <section className="section-block admin-catalog"><div className="section-title-row"><h3>Catalogue records</h3><span className="quiet-label">Edit price or delete unused records</span></div><div className="admin-table">{catalog.map(item=><div className="admin-catalog-row" key={item.id}><span><b>{item.name}</b><small>{item.category} · {item.brand}{item.priceCheckedAt||item.price_checked_at?` · Price checked ${item.priceCheckedAt||item.price_checked_at}`:''}</small></span><strong>{money(item.price)}</strong><button className="secondary" onClick={()=>editPrice(item)}>Edit price</button><button className="danger" onClick={()=>deleteComponent(item)}>Delete</button></div>)}</div></section>
 </div>
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
