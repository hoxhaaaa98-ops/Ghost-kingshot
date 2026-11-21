/* Kingshot Tools — independent Cloudflare Pages edition. Privacy-first browser storage. */
(() => {
  'use strict';
  const KEY = 'kingshot-tools-cloudflare-v2';
  const LEGACY_KEY = 'kingshot-tools-site-v1';
  const CAP_KEY = 'kingshot-tools-viking-v1';
  const APT_KEY = 'kingshot-tools-appointments-v1';
  const ASSETS = 'assets/';
  const TOOLS = [
    {id:'bt-lead',name:'BT Lead Rally Ratio',tag:'BEAR TRAP',img:'bear-lead.webp',desc:'Plan lead rally troop ratios for Bear Trap and compare different setups.',intro:'A dedicated lead-rally ratio calculator. We will add your exact inputs, ratio rules and calculations next.', icon:'🐻'},
    {id:'bt-joiner',name:'BT Joiner Squad Planner',tag:'BEAR TRAP',img:'bear-joiner.webp',desc:'Build Bear Trap joiner squads with heroes and troop distribution.',intro:'A joiner planner based on your choice of heroes, troop capacities and requested ratios.',icon:'🐻'},
    {id:'viking',name:'Viking Vengeance Squad Planner',tag:'VIKING VENGEANCE',img:'viking.webp',desc:'Plan city reinforcements, heroes, troop distribution, HQ recalls and deployment buffs.',intro:'Kingshot-specific squad planning with hero capacity, automatic troop allocation, and HQ waves 10 and 20.',icon:'🛡️',ready:true},
    {id:'kvk',name:'KvK Planner',tag:'KINGDOM VS KINGDOM',img:'kvk.webp',desc:'Coordinate KvK phases, assignments and alliance targets.',intro:'Create a clear KvK planner for kingdom assignments, phases and strategies.',icon:'♛'},
    {id:'utc',name:'UTC Time Converter',tag:'TIME & EVENTS',img:'utc.webp',desc:'Convert event times from UTC into time zones across your alliance.',intro:'Convert scheduled UTC event times across player time zones.',icon:'◷',ready:true},
    {id:'message',name:'Message Creator',tag:'ALLIANCE COMMS',img:'messages.webp',desc:'Draft, format and save alliance announcements with message limits.',intro:'Prepare copy-ready alliance messages and templates.',icon:'▤',ready:true}
  ];
  const DEFAULT_STATE = () => ({currentId:'',profiles:[]});
  const GUEST = {id:'guest',name:'',power:'',level:'',alliance:'',kingdom:'',avatar:'',favorites:[],draft:''};
  let state;
  let editingId = null;
  let avatarPending = null;
  let toastTimer;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const profile = () => state.profiles.find(p=>p.id===state.currentId) || state.profiles[0] || GUEST;
  const hasProfile = () => state.profiles.length > 0;
  const number = value => value !== '' && Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-GB') : '—';
  const cleanProfile = p => ({
    id:String(p.id||Math.random().toString(36).slice(2)).slice(0,60),name:String(p.name||'Player').slice(0,32),power:String(p.power??'').slice(0,15),
    level:String(p.level??'').slice(0,3),alliance:String(p.alliance||'').slice(0,20),kingdom:String(p.kingdom||'').slice(0,12),
    avatar:typeof p.avatar==='string' && /^data:image\/(jpeg|png|webp);base64,/.test(p.avatar) && p.avatar.length<250000 ? p.avatar : '',
    favorites:Array.isArray(p.favorites)?p.favorites.filter(x=>TOOLS.some(t=>t.id===x)).slice(0,20):[],
    draft:String(p.draft||'').slice(0,15000)
  });
  function load(){
    try{
      let parsed=JSON.parse(localStorage.getItem(KEY)||'null');
      // Keep old copies created on this same domain; do not impose a demo Ghost profile.
      if(!parsed){
        parsed=JSON.parse(localStorage.getItem(LEGACY_KEY)||'null');
        if(parsed?.profiles?.length===1){
          const p=parsed.profiles[0];
          if(p.id==='ghost'&&p.name==='Ghost'&&!p.power&&!p.level&&!p.kingdom&&!p.alliance&&!p.draft&&!p.avatar&&!(p.favorites||[]).length)parsed=null;
        }
      }
      if(parsed&&Array.isArray(parsed.profiles)&&parsed.profiles.length<=50){
        const profiles=parsed.profiles.map(cleanProfile);
        const currentId=profiles.some(p=>p.id===(parsed.currentId||parsed.selected))?(parsed.currentId||parsed.selected):(profiles[0]?.id||'');
        return {profiles,currentId};
      }
    }catch(e){}
    return DEFAULT_STATE();
  }
  function save(){
    try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch(e){toast('Device storage is full. Export a backup in Settings.');return false;}
  }
  function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3200);}
  function avatarHTML(p,size='big-avatar'){
    return `<span class="${size}">${p.avatar?`<img src="${p.avatar}" alt="${esc(p.name)} avatar">`:'♛'}</span>`;
  }
  function profilePanel(p){
    if(!hasProfile())return `<section class="profile-panel welcome-profile">
      <div class="profile-info"><div class="mini-header"><span>♟</span>Your Player Profile</div><div class="profile-row"><span class="big-avatar">♛</span>
        <div class="profile-details"><h2 class="profile-name">Make it yours.</h2><p>Create a Kingshot player profile to show your name, kingdom, power and alliance. Nothing is shared with other website visitors.</p></div></div></div>
      <div class="profile-actions"><button type="button" data-action="new-profile" class="button button-primary">＋ Create Your Profile</button></div>
    </section>`;

    return `<section class="profile-panel">
      <div class="profile-info"><div class="mini-header"><span>♟</span>Player Profile</div>
        <div class="profile-row">${avatarHTML(p)}<div class="profile-details"><h2 class="profile-name">${esc(p.name)}</h2>
          <div class="stats"><div class="stat"><span class="stat-icon">⚔</span><span><small>Power</small><strong>${number(p.power)}</strong></span></div>
          <div class="stat"><span class="stat-icon">♜</span><span><small>Level</small><strong>${number(p.level)}</strong></span></div>
          <div class="stat"><span class="stat-icon">♟</span><span><small>Alliance</small><strong>${esc(p.alliance||'—')}</strong></span></div>
          ${p.kingdom?`<div class="stat"><span class="stat-icon">♛</span><span><small>Kingdom</small><strong>${esc(p.kingdom)}</strong></span></div>`:''}</div>
        </div></div></div>
      <div class="profile-actions"><button type="button" data-action="save-profile" class="button button-dark">▣ Save Profile</button><button type="button" data-action="edit-profile" class="button button-outline">✎ Edit Profile</button></div>
    </section>`;
  }
  const castleSVG = `<svg viewBox="0 0 320 175" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M0 170 68 115 93 134 128 87 167 140 201 102 259 149 320 113V175H0" fill="#1d7048" opacity=".45"/><path d="M28 175V92h25V76h12v16h22v83zm75 0V50h27V32h12v18h29v125zm89 0V93h33V68h15v25h24v82zm83 0V114h36V90h9v85" fill="#0b3727"/><path d="M26 83h13V72h11v11h14V72h11v11h14v14H26zm76-40h15V31h11v12h15V31h12v12h17v13h-70zm89 43h16V76h13v10h20V76h13v10h14v11h-76zm82 19h13V95h12v10h13V95h9v22h-47" fill="#154f36"/><path d="M136 32V9l35 10-35 10" fill="#c3f4c4"/><path d="M233 65V43l27 9-27 9" fill="#c3f4c4"/><path d="M53 76V49l26 9-26 9" fill="#b5ecb4"/><path d="M0 172H320" stroke="#8fe0a2" stroke-width="5"/><path d="M118 175v-36a13 13 0 0 1 26 0v36M210 175v-29a11 11 0 0 1 22 0v29" fill="#5ab17b"/></svg>`;
  function toolCard(t){return `<article class="tool-card"><div class="tool-art"><img class="main-art" src="${ASSETS+t.img}" alt="${esc(t.name)} artwork">${t.id.startsWith('bt-')?'<img class="bear-mark" src="assets/bear-mark.png" alt="Bear Trap emblem">':''}</div>
  <div class="tool-content"><span class="tool-tag">${esc(t.tag)}</span><h3>${esc(t.name)}</h3><p>${esc(t.desc)}</p><a class="button button-primary tool-link" href="#${t.id}" data-link>${t.ready?'OPEN TOOL':'EXPLORE TOOL'} <span class="arrow">❯</span></a></div></article>`;}
  function dashboard(){
    return `<div class="hero"><div class="hero-copy"><span class="hero-kicker">♛ THE KINGDOM STARTS HERE</span><h1>KINGSHOT TOOLS</h1><p>Premium planning tools & calculators for Kingshot.</p></div><div class="hero-art">${castleSVG}</div></div>
      ${profilePanel(profile())}<div class="section-title-row"><div><h2>Explore tools</h2><div class="section-sub">Prepare your next rally, event and alliance announcement.</div></div><span class="aside-note">${TOOLS.length} TOOLS</span></div>
      <div class="tool-grid">${TOOLS.map(toolCard).join('')}</div>`;
  }
  function header(title,desc){return `<div class="page-intro"><a href="#dashboard" data-link class="back-link">← Dashboard / Tools</a><h1>${esc(title)}</h1><p>${esc(desc)}</p></div>`;}
  // Shared step navigation for the working Kingshot tools.
  const otherToolSteps={utc:0,message:0};
  let utcSelection={date:'',time:''};
  let utcToolView='converter';
  let messageBuffer=null;
  let previouslyRendered='';
  function flowWorkspace(tool,heading,kicker,intro,seal,steps,body,summary){
    const current=otherToolSteps[tool];
    const step=steps[current]||steps[0];
    return '<div class="vk-root vk-workspace ks-tool-flow ks-flow-'+steps.length+'">'+
    '<div class="vk-command-header"><div class="vk-command-text"><span class="vk-eyebrow">'+esc(kicker)+'</span><h2>'+esc(heading)+'</h2><p>'+esc(intro)+'</p></div><span class="vk-command-seal" aria-hidden="true">'+seal+'</span></div>'+
    '<div class="vk-command-metrics">'+summary+'</div>'+
    '<div class="vk-stepper" aria-label="'+esc(heading)+' steps">'+steps.map((item,i)=>'<button type="button" class="vk-step '+(i===current?'vk-step-active ':i<current?'vk-step-past ':'')+'" data-action="flow-step" data-tool="'+tool+'" data-index="'+i+'" '+(i===current?'aria-current="step"':'')+'><span class="vk-step-number">'+(i<current?'✓':String(i+1).padStart(2,'0'))+'</span><span class="vk-step-label">'+esc(item.title)+'</span></button>').join('')+'</div>'+
    '<div class="vk-active-step-heading"><div><span>STEP '+String(current+1).padStart(2,'0')+' OF '+String(steps.length).padStart(2,'0')+'</span><h2>'+esc(step.title)+'</h2><p>'+esc(step.desc)+'</p></div><div class="vk-step-progress"><span style="width:'+Math.round((current+1)/steps.length*100)+'%"></span></div></div>'+
    '<div class="vk-stage-body">'+body+'</div>'+
    '<div class="vk-bottom-navigation"><div>'+(current>0?'<button type="button" class="vk-back-btn" data-action="flow-step" data-tool="'+tool+'" data-index="'+(current-1)+'">← Previous</button>':'<span class="vk-autosave">♛ '+esc(heading)+'</span>')+'</div>'+(current<steps.length-1?'<button type="button" class="vk-next-btn" data-action="flow-step" data-tool="'+tool+'" data-index="'+(current+1)+'">Continue →</button>':'<button type="button" class="vk-next-btn" data-action="flow-step" data-tool="'+tool+'" data-index="0">Back to start ↻</button>')+'</div>'+
    '</div>';
  }
  function getMessageText(){if(messageBuffer===null)messageBuffer=profile().draft||'';return messageBuffer;}
  function messageSummary(){
    const value=getMessageText(),lines=value?value.split(/\r?\n/).length:0;
    return '<div><span>Characters</span><strong id="flowChars">'+value.length+' / 512</strong></div>'+
     '<div><span>Message lines</span><strong id="flowLines">'+lines+' / 10</strong></div>'+
     '<div><span>Saved profile</span><strong id="flowProfile">'+esc(hasProfile()?profile().name:'Guest')+'</strong></div>';
  }
  function previewMessage(){
    const v=getMessageText(),lines=v?v.split(/\r?\n/).length:0;
    return '<section class="content-card ks-preview-panel"><span class="eyebrow">FINAL MESSAGE</span><h2>Review & copy</h2>'+
      '<p>Check your announcement, then copy it straight into Kingshot.</p>'+
      '<pre class="ks-message-preview" id="messagePreview">'+(v?esc(v):'No message written yet. Return to Compose to create one.')+'</pre>'+
      '<div class="counter-row"><span class="'+(v.length>512?'bad':'good')+'">'+v.length+' / 512 characters</span><span class="'+(lines>10?'bad':'good')+'">'+lines+' / 10 lines</span></div>'+
      '<div class="form-actions"><button type="button" class="button button-primary" data-action="copy-message">▣ Copy Message</button><button type="button" class="button button-dark" data-action="save-draft">Save Draft</button><button type="button" class="button button-ghost" data-action="flow-step" data-tool="message" data-index="0">✎ Edit message</button></div></section>';
  }
  function gameTool(t){
    if(t.id==='viking')return header(t.name,t.intro)+'<div class="tool-page-hero" style="height:205px;margin-bottom:23px"><img src="assets/viking.webp" alt="Viking Vengeance artwork"><div class="tool-hero-gradient"></div><div class="tool-hero-text"><span class="eyebrow">VIKING VENGEANCE</span><h2>Squad Planner</h2></div></div><div id="viking-planner-root" data-profile="'+esc(profile().id)+'"></div>';
    return header(t.name,t.intro)+'<div class="vk-root ks-inprogress"><div class="vk-command-header"><div class="vk-command-text"><span class="vk-eyebrow">'+esc(t.tag)+'</span><h2>'+esc(t.name)+'</h2><p>We are preparing this calculator for Kingshot.</p></div><span class="vk-command-seal" aria-hidden="true">♜</span></div><section class="content-card ks-inprogress-card" role="status"><div class="ks-inprogress-icon" aria-hidden="true">⚙</div><h2>Tool in process</h2><p>We are building and checking this tool before opening it to players. No unverified results will be displayed.</p><a class="button button-primary" href="#dashboard" data-link>← Back to all tools</a></section></div>';
  }
  const VIKING_DEFAULT={base:'',marches:'6',infantry:'',cavalry:'',bison:'0',boost:'0',marshal:'0'};
  function allViking(){try{return JSON.parse(localStorage.getItem(CAP_KEY)||'{}')||{};}catch(e){return {};}}
  function vikingData(){const d=allViking()[profile().id]||{};return {...VIKING_DEFAULT,...d};}
  function vikingSetup(){
    const v=vikingData();
    const num=x=>Math.max(0,Number(x)||0);
    const normal=num(v.base)*num(v.marches),troops=num(v.infantry)+num(v.cavalry);
    const missing=Math.max(0,troops-normal);
    const pet=num(v.bison)*1500,mar=v.marshal==='on'?2500:0,buff=Number(v.boost);
    const option=(val,label,selected)=>`<option value="${esc(val)}" ${selected===String(val)?'selected':''}>${esc(label)}</option>`;
    const ranks=Array.from({length:10},(_,i)=>option(i+1,`Mighty Bison R${i+1} · +${((i+1)*1500).toLocaleString('en-GB')}`,v.bison)).join('');
    return `<section class="content-card viking-setup" aria-label="Viking Vengeance deployment capacity setup">
      <div class="setup-heading"><span class="setup-icon">🛡️</span><div><span class="eyebrow">STEP 1 · TROOP DEPLOYMENT</span><h2>Deployment Capacity & Buffs</h2><p>Set your normal march capacity first. Only choose buffs if you need the extra space.</p></div></div>
      <div class="form-grid">
        <label>Normal capacity per march<input data-viking="base" type="number" inputmode="numeric" min="0" placeholder="e.g. 125000" value="${esc(v.base)}"></label>
        <label>Available marches<select data-viking="marches">${[1,2,3,4,5,6].map(n=>option(n,`${n} ${n===1?'march':'marches'}`,v.marches)).join('')}</select></label>
        <label>Infantry available<input data-viking="infantry" type="number" inputmode="numeric" min="0" placeholder="Troop count" value="${esc(v.infantry)}"></label>
        <label>Cavalry available<input data-viking="cavalry" type="number" inputmode="numeric" min="0" placeholder="Troop count" value="${esc(v.cavalry)}"></label>
      </div>
      <div class="viking-results"><div><small>Normal total capacity</small><strong id="vNormal">${v.base?normal.toLocaleString('en-GB'):'—'}</strong></div><div><small>Infantry + Cavalry</small><strong id="vTroops">${troops?troops.toLocaleString('en-GB'):'—'}</strong></div><div><small>Troops left behind</small><strong id="vLeft">${v.base&&troops?missing.toLocaleString('en-GB'):'—'}</strong></div></div>
      <div class="viking-advice"><span>💡</span><div><strong>Only use deployment buffs if needed.</strong><p>If you <strong>can't get all your Infantry and Cavalry out of the city</strong> using normal marches, add Mighty Bison, Deployment Capacity Boost or Marshal. If all troops fit already, leave every option set to <strong>None</strong>.</p></div></div>
      <div class="buff-title"><span>⚡</span><h3>Optional deployment buffs</h3></div>
      <div class="viking-buffs">
        <label><span class="buff-label"><span class="buff-icon">🐂</span>Mighty Bison · Fearless Roar</span><select data-viking="bison">${option(0,'None — No pet bonus',v.bison)}${ranks}</select></label>
        <label><span class="buff-label"><span class="buff-icon">⚡</span>Deployment Capacity Boost</span><select data-viking="boost">${option(0,'None — No boost',v.boost)}${option(10,'Boost I · +10%',v.boost)}${option(20,'Boost II · +20%',v.boost)}</select></label>
        <label><span class="buff-label"><span class="buff-icon">👑</span>Marshal Appointment</span><select data-viking="marshal">${option('0','None — Not appointed',v.marshal)}${option('on','Marshal · +2,500',v.marshal)}</select></label>
      </div>
      <div class="viking-results"><div><small>Pet bonus</small><strong id="vPet">${pet?'+'+pet.toLocaleString('en-GB'):'None'}</strong></div><div><small>Capacity boost</small><strong id="vBoost">${buff?'+'+buff+'%':'None'}</strong></div><div><small>Marshal bonus</small><strong id="vMarshal">${mar?'+'+mar.toLocaleString('en-GB'):'None'}</strong></div></div>
      <p class="muted" style="font-size:12px;margin:4px 0 0" id="vikingHint">${pet||mar||buff?'Bonuses are shown separately until we verify their in-game stacking formula.':'No buffs selected — recommended unless normal deployment falls short.'}</p>
    </section>`;
  }
  function refreshViking(){
    const p=profile().id, current=allViking(),v={...VIKING_DEFAULT,...current[p]};
    const num=x=>Math.max(0,Number(x)||0),fmt=n=>Math.round(n).toLocaleString('en-GB');
    const normal=num(v.base)*num(v.marches),total=num(v.infantry)+num(v.cavalry),missing=Math.max(0,total-normal);
    const bison=num(v.bison)*1500,boost=num(v.boost),marshal=v.marshal==='on'?2500:0;
    if($('vNormal'))$('vNormal').textContent=v.base?fmt(normal):'—';
    if($('vTroops'))$('vTroops').textContent=total?fmt(total):'—';
    if($('vLeft'))$('vLeft').textContent=v.base&&total?fmt(missing):'—';
    if($('vPet'))$('vPet').textContent=bison?'+'+fmt(bison):'None';
    if($('vBoost'))$('vBoost').textContent=boost?'+'+boost+'%':'None';
    if($('vMarshal'))$('vMarshal').textContent=marshal?'+'+fmt(marshal):'None';
    if($('vikingHint'))$('vikingHint').textContent=bison||boost||marshal?'Bonuses are shown separately until we verify their in-game stacking formula.':missing>0?'Your normal marches leave troops behind; optional buffs may help.':'No buffs selected — recommended unless normal deployment falls short.';
  }
  function profilePage(){const p=profile();return `${header('Player Profile','Create, switch and save profiles for different Kingshot accounts.')}<div class="profile-full">${profilePanel(p)}</div><div class="wide-grid"><div class="content-card"><span class="eyebrow">YOUR KINGDOM ACCOUNTS</span><h2>Saved profiles</h2><div class="saved-list">${!hasProfile()?'<p>No profiles yet. Create yours to begin.</p>':''}${state.profiles.map(x=>`<button type="button" data-action="switch-profile" data-id="${esc(x.id)}">${x.id===state.currentId?'✓ ':''}♛ ${esc(x.name)} ${x.kingdom?' · #'+esc(x.kingdom):''}</button>`).join('')}</div><div class="form-actions"><button class="button button-primary" data-action="new-profile">＋ New Profile</button>${state.profiles.length>1?'<button class="button button-ghost" data-action="delete-profile">Delete Current Profile</button>':''}</div></div><div class="content-card"><h2>Saved on your device</h2><p>Your player details and message drafts stay in this browser. At this stage there is no account sign-in or cross-device sync.</p><div class="info-strip">You can export a backup under <a href="#settings" data-link style="font-weight:900;text-decoration:underline">Settings</a> to move your profiles to another device.</div></div></div>`;}
  function utcPage(){
    if(!utcSelection.date){const now=new Date().toISOString();utcSelection={date:now.slice(0,10),time:now.slice(11,16)};}
    const views=[
      {id:'converter',icon:'◷',title:'UTC Converter',description:'Event times around the world'},
      {id:'minister',icon:'♛',title:'Minister Timing',description:'Applications and troop training'},
      {id:'appointments',icon:'▤',title:'Appointment Notes',description:'Your saved kingdom schedule'}
    ];
    const stage=utcToolView==='converter'?
      '<section class="content-card ks-utc-card th-panel"><div class="th-panel-heading"><span class="th-panel-mark">◷</span><div><span class="eyebrow">EVENT TIME CONVERSION</span><h2>Convert a UTC event time</h2><p>Pick an event date and time to compare alliance regions, including daylight-saving changes.</p></div></div><div class="form-grid"><label>UTC event date<input type="date" id="utcDate" value="'+esc(utcSelection.date)+'" required></label><label>UTC event time<input type="time" id="utcTime" value="'+esc(utcSelection.time)+'" required></label></div><div class="form-actions"><button type="button" class="button button-primary" data-action="convert-time">Convert times →</button><button type="button" class="button button-ghost" data-action="utc-now">Use current UTC</button></div><div id="timeResults" class="results-grid" aria-live="polite"></div></section>':
      utcToolView==='minister'?
      '<div id="minister-planner-root" data-profile="'+esc(profile().id)+'"><section class="content-card"><h2>Minister Application Planner</h2><p>Loading local and UTC appointment timing…</p></section></div>':
      appointmentsPanel();
    let clock='—',zone='UTC';
    try{clock=new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}catch(err){}
    return header('UTC Time Converter','Convert alliance times, calculate minister application times and keep kingdom appointment notes.')+
      '<div class="th-hub"><div class="th-hero"><div class="th-hero-copy"><span class="th-eyebrow">KINGSHOT · ALLIANCE TIME TOOLS</span><h2>Time Hub</h2><p>Times, minister appointments and training schedules. Everything together, without extra steps.</p></div>'+
      '<div class="th-utc-clock"><small>CURRENT SERVER TIME</small><strong>'+esc(clock)+'</strong><span>UTC · 24-hour clock</span></div></div>'+
      '<nav class="th-switcher" aria-label="Choose time tool">'+views.map(v=>'<button type="button" class="th-switch '+(utcToolView===v.id?'is-selected':'')+'" data-action="utc-view" data-view="'+v.id+'" aria-pressed="'+(utcToolView===v.id)+'"><span class="th-switch-icon">'+v.icon+'</span><span class="th-switch-copy"><strong>'+esc(v.title)+'</strong><small>'+esc(v.description)+'</small></span></button>').join('')+'</nav>'+
      '<div class="th-content">'+stage+'</div><p class="th-footer-note">Time zone detected: '+esc(zone)+'. Minister application times are planning estimates, not live Kingshot reservations.</p></div>';
  }
  function allAppointments(){try{return JSON.parse(localStorage.getItem(APT_KEY)||'{}')||{};}catch(e){return {};}}
  function appointments(){const arr=allAppointments()[profile().id];return Array.isArray(arr)?arr:[];}
  function fmtAppointment(when){
    const date=new Date(when+':00Z');
    if(!Number.isFinite(date.getTime()))return when;
    return new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',weekday:'short',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date)+' UTC';
  }
  function appointmentList(){
    const appts=appointments().slice().sort((a,b)=>a.when.localeCompare(b.when));
    return appts.length?appts.map(x=>`<div class="appointment"><span class="appointment-marker">♛</span><div class="appointment-desc"><strong>${esc(x.role)} · ${esc(x.name)}</strong><small>${esc(fmtAppointment(x.when))} · ${esc(x.duration)} minutes</small>${x.notes?`<span>${esc(x.notes)}</span>`:''}</div><button class="remove-appointment" type="button" data-action="delete-appointment" data-id="${esc(x.id)}" aria-label="Remove appointment for ${esc(x.name)}">✕</button></div>`).join(''):'<div class="appointment-empty">No appointments added. Create your first manual appointment note.</div>';
  }
  function appointmentsPanel(){return `<section class="content-card appointment-panel"><div class="appointment-head"><div><span class="eyebrow">MINISTER / EVENT PLANNING</span><h2>Appointment Planner</h2><p>Keep a simple UTC schedule for your kingdom. This is a personal planning list, not an in-game booking system.</p></div><span class="appointment-head-icon">♛</span></div>
    <form id="appointmentForm"><div class="form-grid appointment-form">
      <label>Player name<input type="text" id="aptName" maxlength="40" placeholder="Player name" required></label>
      <label>Role or appointment<input type="text" id="aptRole" maxlength="50" placeholder="e.g. Minister of Construction" required></label>
      <label>Date (UTC)<input type="date" id="aptDate" required></label>
      <label>Time (UTC)<input type="time" id="aptTime" required></label>
      <label>Duration<select id="aptDuration"><option value="10">10 minutes</option><option value="15">15 minutes</option><option value="20">20 minutes</option><option value="30" selected>30 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option><option value="120">120 minutes</option></select></label>
      <label>Optional note<input type="text" id="aptNotes" maxlength="120" placeholder="Your notes"></label>
    </div><div class="form-actions"><button class="button button-primary" type="submit">＋ Save Appointment</button><button class="button button-ghost" type="button" data-action="copy-appointments">▣ Copy Schedule</button></div></form>
    <div class="appointment-list" id="appointmentList">${appointmentList()}</div>
    <p class="muted" style="font-size:12px">Check the actual game appointment duration and rules. Times are entered and displayed in UTC; changes here do not reserve appointments inside Kingshot.</p>
  </section>`;}
  function addAppointment(form){
    const name=$('aptName').value.trim(),role=$('aptRole').value.trim(),day=$('aptDate').value,time=$('aptTime').value;
    const duration=Number($('aptDuration').value),when=day+'T'+time;
    if(!name||!role||!day||!time||!Number.isFinite(new Date(when+'Z').valueOf())){toast('Complete player, appointment, date and UTC time.');return;}
    const next=allAppointments(),id=profile().id;
    const rows=Array.isArray(next[id])?next[id]:[];
    if(rows.length>=150){toast('This profile already has 150 appointments.');return;}
    rows.push({id:'a'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name,role,when,duration,notes:$('aptNotes').value.trim()});
    next[id]=rows;localStorage.setItem(APT_KEY,JSON.stringify(next));
    form.reset();$('appointmentList').innerHTML=appointmentList();if($('flowAppointments'))$('flowAppointments').textContent=appointments().length+' saved';toast('Appointment note saved.');
  }
  function removeAppointment(id){const next=allAppointments(),pid=profile().id;next[pid]=(next[pid]||[]).filter(a=>a.id!==id);localStorage.setItem(APT_KEY,JSON.stringify(next));$('appointmentList').innerHTML=appointmentList();if($('flowAppointments'))$('flowAppointments').textContent=appointments().length+' saved';toast('Appointment removed.');}
  async function copyAppointments(){
    const rows=appointments().slice().sort((a,b)=>a.when.localeCompare(b.when));
    if(!rows.length){toast('Add an appointment first.');return;}
    const content='KINGSHOT APPOINTMENT SCHEDULE (UTC)\n'+rows.map(x=>`${fmtAppointment(x.when)} | ${x.role}: ${x.name} (${x.duration} min)${x.notes?' - '+x.notes:''}`).join('\n');
    try{await navigator.clipboard.writeText(content);toast('Appointment schedule copied.');}catch(e){toast('Copy unavailable in this browser.');}
  }
  function messagePage(){
    const draft=getMessageText();
    const characters=draft.length,lines=draft?draft.split(/\r?\n/).length:0;
    const quickTemplates=[['event','Event reminder'],['notice','Announcement'],['rules','Rules reminder'],['battle','Battle plan']];
    return header('Message Creator','Draft, format and copy Kingshot alliance announcements without leaving the editor.')+
      '<div class="ms-studio">'+
      '<div class="ms-hero"><div class="ms-hero-copy"><span class="ms-kicker">GHOST’S KINGSHOT TOOLS / ALLIANCE COMMS</span><h2>Comms Studio<span class="ms-hero-spark"> ✦</span></h2><p>Draft announcements, drop in secret Kingshot icons and prepare your message for sending — all in one workspace.</p></div>'+
      '<div class="ms-hero-stamp"><span>▤</span><strong>ALLIANCE<br>DISPATCH</strong></div></div>'+
      '<div class="ms-dashboard" aria-label="Live message stats">'+
        '<div class="ms-metric"><span>CHARACTER LIMIT</span><strong id="msCharMetric">'+characters+' <small>/ 512</small></strong><span class="ms-progress"><span id="msCharFill" style="width:'+Math.min(100,Math.round(characters/512*100))+'%"></span></span></div>'+
        '<div class="ms-metric"><span>LINE LIMIT</span><strong id="msLineMetric">'+lines+' <small>/ 10</small></strong><span class="ms-progress"><span id="msLineFill" style="width:'+Math.min(100,Math.round(lines/10*100))+'%"></span></span></div>'+
        '<div class="ms-metric"><span>MESSAGE STATUS</span><strong class="ms-state" id="msMessageState">'+(characters===0?'Ready to write':characters>512||lines>10?'Over short-limit':'Within short-limit')+'</strong><small class="ms-status-sub">For short announcements</small></div>'+
      '</div>'+
      '<div class="ms-grid">'+
        '<section class="content-card ms-compose" aria-label="Message editor">'+
          '<div class="ms-section-head"><div><span class="ms-overline">01 / WRITING SPACE</span><h2>Compose a message</h2><p>Type freely, or start from a ready-made format.</p></div><span class="ms-section-mark">✎</span></div>'+
          '<div class="ms-template-bar"><span>QUICK START</span><div class="ms-template-chips">'+quickTemplates.map(([value,label])=>'<button type="button" class="ms-template-chip" data-action="message-quick-template" data-template="'+value+'">'+label+'</button>').join('')+'</div></div>'+
          '<label class="ms-template-label">Or select a template<select id="messageTemplate"><option value="blank">Blank message</option><option value="event">Event Reminder</option><option value="notice">Alliance Announcement</option><option value="rules">Rules Reminder</option><option value="battle">Battle Plan</option></select></label>'+
          '<label class="ms-editor-label">MESSAGE CONTENT<textarea id="messageBody" maxlength="15000" spellcheck="true" placeholder="Write your alliance message here...">'+esc(draft)+'</textarea></label>'+
          '<details class="ms-vault ms-vault-inline" id="msEmojiVault"><summary><span class="ms-vault-symbol">✧</span><span><strong>Browse '+ALL_ICONS.length+' icons & symbols</strong><small>See item names, then tap to insert · No codes</small></span><span class="ms-vault-chevron" aria-hidden="true">⌄</span></summary><div class="ms-vault-content">'+secretEmojiPanel()+'</div></details>'+
          '<div class="ms-editor-footer"><div class="ms-limit-row"><span id="characterCount">0 / 512 characters</span><span id="lineCount">0 / 10 lines</span></div><p>Short-message limits may vary in Kingshot. The editor won’t erase anything if you go over.</p></div>'+
          '<div class="ms-actions"><button type="button" class="button button-primary ms-copy-main" data-action="copy-message">▣ Copy message</button><button type="button" class="button button-dark" data-action="save-draft">Save draft</button><button type="button" class="button button-ghost" data-action="clear-message">Clear</button></div>'+
        '</section>'+
        '<aside class="ms-aside"><section class="ms-preview-card" aria-label="Live message preview">'+
          '<div class="ms-preview-head"><span class="ms-live-dot"></span><span>LIVE MESSAGE PREVIEW</span><strong>◉</strong></div>'+
          '<div class="ms-preview-body"><div class="ms-preview-identity"><span class="ms-preview-avatar">♛</span><div><strong>Alliance notice</strong><small>Preview · not sent</small></div></div>'+
          '<div class="ms-preview-paper"><pre id="messagePreview">'+(draft?esc(draft):'Your announcement will appear here as you type...')+'</pre></div>'+
          '<div class="ms-preview-summary"><span id="msWordCount">0 words</span><span id="msPreviewLabel">Ready to create</span></div></div>'+
          '<div class="ms-preview-footer">Nothing is posted to Kingshot automatically. Use Copy message to paste it into the game.</div>'+
        '</section><div class="ms-aside-tip"><span>✦</span><p><strong>Instant updates.</strong> Edit your message or insert a secret icon below — the preview updates immediately.</p></div></aside>'+
      '</div>'+
      '<div class="ms-bottom-note"><strong>Saved on your device.</strong> Click Save draft to store your message under the selected player profile. Copying never sends it automatically.</div>'+
      '</div>';
  }
  const EMOJI_SET=[
    [0xE001,'Gem','Resources','💎'],[0xE012,'Bag of Gems','Resources','💎'],[0xE002,'Bread','Resources','🍞'],[0xE003,'Wood','Resources','🪵'],[0xE004,'Stone / Coal','Resources','🪨'],[0xE005,'Iron','Resources','⛓️'],[0xE006,'Gold','Resources','🪙'],[0xE010,'Truegold','Resources','✨'],
    [0xE007,'Hero XP','Heroes & Gear','📖'],[0xE019,'Hero Shard','Heroes & Gear','🧩'],[0xE016,'Forgehammer','Heroes & Gear','🔨'],[0xE047,'Mystery Badge','Heroes & Gear','🎖️'],
    [0xE013,'Building Speedup','Speedups','🏗️'],[0xE014,'Troop Speedup','Speedups','⚔️'],[0xE015,'Research Speedup','Speedups','🔬'],[0xE017,'General Speedup','Speedups','⏩'],
    [0xE011,'Pearl of Enigma','Events & Coins','🔮'],[0xE020,'Halloween Candy','Events & Coins','🍬'],[0xE029,'Halloween Lollipop','Events & Coins','🍭'],[0xE021,'Energy Booster','Events & Coins','⚡'],[0xE022,'Hotdog','Events & Coins','🌭'],[0xE034,'Lucky Peach','Events & Coins','🍑'],[0xE040,'Energy Bar','Events & Coins','🥖'],[0xE009,'Wheel Coin','Events & Coins','🎡'],[0xE018,'Adventure Coin','Events & Coins','🪙'],[0xE042,'Elysium Coin','Events & Coins','🏅'],[0xE046,'Twinstar Coin','Events & Coins','🌟'],[0xE043,'Buttery Bones','Events & Coins','🦴'],[0xE048,'Event Dice','Events & Coins','🎲'],[0xE049,'Twinstar Dice','Events & Coins','🎲'],[0xE036,'Coin (unconfirmed)','More Icons','🪙'],[0xE041,'Viking Token (unconfirmed)','More Icons','🪓'],[0xE044,'Alliance Brawl (unconfirmed)','More Icons','🏰']
  ];
  const SYMBOL_SET=[
    [0x2501,'Heavy horizontal line','Symbols & Arrows','━'],
    [0x2022,'Bullet dot','Symbols & Arrows','•'],
    [0x00B0,'Small degree circle','Symbols & Arrows','°'],
    [0x2212,'Minus sign','Symbols & Arrows','−'],
    [0x27F6,'Long right arrow','Symbols & Arrows','⟶'],
    [0x2026,'Dotted right arrow','Symbols & Arrows','···▶','···▶'],
    [0x21E8,'Outlined right arrow','Symbols & Arrows','⇨'],
    [0x21D2,'Double right arrow','Symbols & Arrows','⇒'],
    ...Array.from({length:10},(_,i)=>[0x2460+i,'Circled number '+(i+1),'Circled Numbers',String.fromCodePoint(0x2460+i)]),
    [0x0075,'UTC label','Symbols & Arrows','utc','utc']
  ];
  const ALL_ICONS=[...EMOJI_SET,...SYMBOL_SET];
  const EMOJI_CATS=['All','Resources','Speedups','Heroes & Gear','Events & Coins','More Icons','Symbols & Arrows','Circled Numbers'];
  function secretEmojiPanel(){
    return '<section class="secret-emojis ms-simple-picker" aria-label="Kingshot item and text symbol picker">'+
      '<p class="ms-picker-hint">Tap any picture to add its character to your message. The name underneath tells you what it represents.</p>'+
      '<div id="emojiResults" class="emoji-grid ms-icon-grid" role="group" aria-label="Kingshot item icons and text symbols"></div>'+
      '<p class="ms-picker-note"><strong>Note:</strong> These pictures are visual guides, not exact Kingshot sprites. The game draws its own item icon when supported. This is a community-reported selection, not a confirmed complete official list.</p>'+
    '</section>';
  }
  function refreshEmojis(){
    const out=$('emojiResults');if(!out)return;
    const groups=[
      {title:'Kingshot item icons',subtitle:'Game-specific icons · community-reported',items:EMOJI_SET},
      {title:'Text symbols & markers',subtitle:'Standard arrows, numbers and short labels',items:SYMBOL_SET}
    ];
    out.innerHTML=groups.map(group=>
      '<div class="ms-icon-group"><div class="ms-icon-group-heading"><strong>'+esc(group.title)+
      '</strong><small>'+group.items.length+' choices · '+esc(group.subtitle)+'</small></div>'+
      '<div class="ms-icon-group-grid">'+group.items.map(([code,name,cat,picture,override])=>{
        const value=override||String.fromCodePoint(code);
        const isSymbol=cat==='Symbols & Arrows'||cat==='Circled Numbers';
        return '<button type="button" class="ms-icon-choice ms-icon-choice-labelled'+(isSymbol?' ms-icon-choice-symbol':'')+
          '" data-action="emoji-insert" data-insert="'+esc(value)+
          '" aria-label="Insert '+esc(name)+'" title="'+esc(name)+'">'+
          '<span class="ms-icon-picture" aria-hidden="true">'+esc(picture)+'</span>'+
          '<span class="ms-icon-name">'+esc(name.replace(/ \(unconfirmed\)/g,''))+'</span></button>';
      }).join('')+'</div></div>'
    ).join('');
  }
  function insertEmoji(ch){const box=$('messageBody');if(box){const a=box.selectionStart??box.value.length,b=box.selectionEnd??a;box.setRangeText(ch,a,b,'end');box.focus();messageBuffer=box.value;}else{messageBuffer=getMessageText()+ch;toast('Unicode icon inserted into draft.');}updateCounts();}
  function settingsPage(){return `${header('Settings','Keep control of saved profiles and move your information between websites.')}<div class="wide-grid"><section class="content-card"><span class="eyebrow">YOUR DATA</span><h2>Backup & restore</h2><p>Export profiles, message drafts, Viking setups, minister application preferences and appointment notes. You can also import profile backups exported from Floot.</p><div class="data-controls"><button class="button button-primary" data-action="export-data">↓ Export Backup</button><button class="button button-ghost" data-action="import-data">↑ Import Backup</button><input id="backupFile" type="file" accept=".json,application/json"></div></section><section class="content-card"><h2>Storage & privacy</h2><p>Profiles, drafts and tool setups are stored in this browser only. Other players create their own profiles. To migrate from Floot, export a backup on the old site and import it here.</p><p class="muted" style="font-size:12px">A new website has separate browser storage; old Floot profiles cannot appear automatically. Export a backup first.</p></section></div>`;}
  function helpPage(){return `${header('Help & FAQ','Quick answers about how this early version works.')}<section class="content-card faq"><details open><summary>Which calculators are available?</summary><p>UTC conversion, Message Creator and the Kingshot Viking Vengeance squad planner work now. The Viking planner estimates hero level capacity and supports exact in-game overrides. Bear Trap and KvK calculators are next.</p></details><details><summary>Does my profile save automatically?</summary><p>Yes. Profile changes save to local browser storage as soon as you submit the profile form. Draft messages save when you press Save Draft.</p></details><details><summary>Can I use the same profile on an iPhone and a computer?</summary><p>Not automatically in this release. Export and import your backup through Settings; optional cloud accounts can be added later.</p></details><details><summary>Is Kingshot Tools official?</summary><p>No. It is an independent, fan-made community toolkit, not affiliated with or endorsed by the game publisher.</p></details></section>`;}
  function currentPage(){const v=(location.hash||'#dashboard').replace(/^#/,'');return ['dashboard','profile','settings','help',...TOOLS.map(t=>t.id)].includes(v)?v:'dashboard';}
  function render(){const page=currentPage();
    if(page!==previouslyRendered){
      if(page==='utc')utcToolView='converter';
      if(page==='message'){messageBuffer=null;}
      previouslyRendered=page;
    }
    $('appMain').innerHTML=page==='dashboard'?dashboard():page==='profile'?profilePage():page==='settings'?settingsPage():page==='help'?helpPage():page==='utc'?utcPage():page==='message'?messagePage():gameTool(TOOLS.find(t=>t.id===page));
    document.querySelectorAll('[data-nav]').forEach(link=>{const active=link.dataset.nav===page;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    document.querySelector('.profile-switch-name').textContent=hasProfile()?'My Profiles':'Create Profile';
    const top=$('headerAvatar');top.setAttribute('aria-label',hasProfile()?'Edit player profile':'Create player profile');top.innerHTML=profile().avatar?`<img src="${profile().avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="Profile avatar">`:'♛';
    if(page==='utc'&&$('utcDate'))convertUTC();
    if(page==='utc'&&$('minister-planner-root')&&window.KingshotMinisterPlanner)window.KingshotMinisterPlanner.mount($('minister-planner-root'),profile().id);
    if(page==='message'){updateCounts();if($('emojiResults'))refreshEmojis();}
    if(page==='viking'&&window.KingshotVikings){window.KingshotVikings.mount($('viking-planner-root'),profile().id);}
    renderProfilesDropdown();
  }
  function renderProfilesDropdown(){const dropdown=$('profileDropdown');dropdown.innerHTML=(!hasProfile()?'<p style="color:#49745c;font-size:12px;padding:0 12px">No profiles yet</p>':'')+state.profiles.map(p=>`<button type="button" class="${p.id===state.currentId?'selected':''}" data-action="switch-profile" data-id="${esc(p.id)}">${p.id===state.currentId?'✓ ':''}${esc(p.name)}</button>`).join('')+'<button type="button" class="new-profile" data-action="new-profile">＋ New Profile</button>';}
  function closeMenu(){ $('sidebar').classList.remove('open');$('scrim').classList.remove('show');$('menuButton').setAttribute('aria-expanded','false');}
  function showDropdown(show){$('profileDropdown').hidden=!show;$('profileSwitch').setAttribute('aria-expanded',String(show));}
  function openProfile(newProfile=false){newProfile=newProfile||!hasProfile();editingId=newProfile?null:profile().id;avatarPending=newProfile?'':profile().avatar;$('dialogTitle').textContent=newProfile?'Create Player Profile':'Edit Player Profile';const data=newProfile?{name:'',kingdom:'',alliance:'',power:'',level:''}:profile();
    $('pfName').value=data.name;$('pfKingdom').value=data.kingdom;$('pfAlliance').value=data.alliance;$('pfPower').value=data.power;$('pfLevel').value=data.level;$('pfAvatar').value='';$('profileDialog').showModal();}
  function closeProfile(){$('profileDialog').close();}
  async function readAvatar(file){if(!file)return;if(file.size>8*1024*1024){toast('Choose an image under 8 MB.');return;}
    try{const image=await createImageBitmap(file);const w=220,h=220;const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');const ratio=Math.max(w/image.width,h/image.height);const iw=image.width*ratio,ih=image.height*ratio;ctx.drawImage(image,(w-iw)/2,(h-ih)/2,iw,ih);avatarPending=canvas.toDataURL('image/jpeg',.78);image.close();toast('Picture ready. Save the profile to keep it.');}catch(e){toast('Unable to read that image. Try JPEG or PNG.');}}
  function saveProfileForm(e){e.preventDefault();const name=$('pfName').value.trim();if(!name){$('pfName').focus();toast('Add a player name.');return;}
    const data={name,kingdom:$('pfKingdom').value.trim(),alliance:$('pfAlliance').value.trim(),power:$('pfPower').value,level:$('pfLevel').value,avatar:avatarPending||''};
    if(editingId){const p=state.profiles.find(p=>p.id===editingId);Object.assign(p,data);state.currentId=p.id;}else{const id='p-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6);state.profiles.push({...cleanProfile({id,...data})});state.currentId=id;}
    save();closeProfile();render();toast('Profile saved on this device.');}
  function toggleFav(id){if(!hasProfile()){openProfile(true);toast('Create a profile to save tools.');return;}const p=profile();if(!p.favorites) p.favorites=[];p.favorites=p.favorites.includes(id)?p.favorites.filter(x=>x!==id):[...p.favorites,id];save();render();toast('Saved tool preferences.');}
  function deleteProfile(){if(state.profiles.length<=1){toast('Keep at least one profile.');return;}
    if(confirm(`Delete profile "${profile().name}" and its saved data on this device?`)){state.profiles=state.profiles.filter(p=>p.id!==state.currentId);state.currentId=state.profiles[0].id;save();render();toast('Profile deleted.');}}
  function convertUTC(){const date=$('utcDate')?.value,time=$('utcTime')?.value;if(!date||!time){if($('utcDate')||$('utcTime'))toast('Choose a date and time first.');return;}
     utcSelection={date,time};
    const instant=new Date(`${date}T${time}:00Z`);if(Number.isNaN(instant.valueOf())){toast('Invalid date or time.');return;}
    const zones=[['UTC','UTC'],['United Kingdom','Europe/London'],['Italy / Central Europe','Europe/Rome'],['US Eastern','America/New_York'],['US Pacific','America/Los_Angeles'],['Saudi Arabia','Asia/Riyadh'],['United Arab Emirates','Asia/Dubai'],['Sydney, Australia','Australia/Sydney']];
    $('timeResults').innerHTML=zones.map(([name,zone])=>{const f=new Intl.DateTimeFormat('en-GB',{timeZone:zone,weekday:'short',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(instant);return `<div class="time-result"><small>${esc(name)}</small><strong>${esc(f)}</strong></div>`;}).join('');}
  function updateCounts(){
    const box=$('messageBody');if(box)messageBuffer=box.value;
    const value=getMessageText(),lines=value?value.split(/\r?\n/).length:0;
    const c=$('characterCount'),l=$('lineCount');
    if(c){c.textContent=value.length+' / 512 characters';c.className=value.length>512?'bad':'good';}
    if(l){l.textContent=lines+' / 10 lines';l.className=lines>10?'bad':'good';}
    const mc=$('flowChars'),ml=$('flowLines');
    if(mc)mc.textContent=value.length+' / 512';
    if(ml)ml.textContent=lines+' / 10';
    const echo=$('emojiDraftPreview'),preview=$('messagePreview');
    if(echo)echo.textContent=value||'Your message is empty. You can still select an icon to begin.';
    if(preview)preview.textContent=value||'Your announcement will appear here as you type...';
    const cm=$('msCharMetric'),lm=$('msLineMetric'),stateEl=$('msMessageState');
    if(cm)cm.innerHTML=value.length+' <small>/ 512</small>';
    if(lm)lm.innerHTML=lines+' <small>/ 10</small>';
    const cf=$('msCharFill'),lf=$('msLineFill');
    if(cf)cf.style.width=Math.min(100,Math.round(value.length/512*100))+'%';
    if(lf)lf.style.width=Math.min(100,Math.round(lines/10*100))+'%';
    const over=value.length>512||lines>10;
    if(stateEl){stateEl.textContent=!value?'Ready to write':over?'Over short-limit':'Within short-limit';stateEl.className='ms-state'+(over?' ms-over':'');}
    const wordCount=$('msWordCount'),previewLabel=$('msPreviewLabel');
    if(wordCount)wordCount.textContent=(value.trim()?value.trim().split(/\s+/).length:0)+' words';
    if(previewLabel)previewLabel.textContent=over?'Check limits':value?'Preview updated':'Ready to create';
  }
  const TEMPLATES={blank:'',event:'ALLIANCE EVENT REMINDER\nEvent: [Event name]\nDate: [Day / Date]\nTime: [00:00 UTC]\nPlease be ready a few minutes early.',notice:'ALLIANCE ANNOUNCEMENT\n\n[Your announcement]\n\nPlease contact R4/R5 with questions.',rules:'ALLIANCE RULES REMINDER\n\n[State the applicable rule clearly]\n\nPlease contact leadership before retaliating.',battle:'EVENT BATTLE PLAN\nObjective: [Target]\nSquad A: [Task]\nSquad B: [Task]\nBackup: [Task]\nFollow R4/R5 instructions.'};
  function saveDraft(){if(!hasProfile()){openProfile(true);toast('Create a profile to save drafts.');return;}profile().draft=getMessageText();save();toast('Draft saved to '+profile().name+'.');}
  async function copyMessage(){const value=getMessageText();if(!value.trim()){toast('Write a message first.');return;}
    try{await navigator.clipboard.writeText(value);toast('Message copied.');}catch(e){const box=$('messageBody');if(box){box.select();try{document.execCommand('copy');toast('Message copied.');return;}catch(err){}}window.prompt('Copy your alliance message',value);}}
  function getJson(key){try{return JSON.parse(localStorage.getItem(key)||'{}');}catch(e){return {};}}
  function exportData(){
    const backup={format:'ghosts-kingshot-tools-v2',exported:new Date().toISOString(),profiles:state.profiles,currentId:state.currentId,viking:getJson(CAP_KEY),appointments:getJson(APT_KEY),minister:getJson('kingshot-minister-planner-v1'),vikingFull:getJson('kingshot-viking-full-v2')};
    const file=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download='ghosts-kingshot-tools-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Backup downloaded.');
  }
  async function importData(file){
    if(!file)return;if(file.size>2e6){toast('Backup file is too large.');return;}
    try{
      const obj=JSON.parse(await file.text());
      if(!['kingshot-tools-v1','ghosts-kingshot-tools-v2','kingshot-floot-v1'].includes(obj.format)||!Array.isArray(obj.profiles)||obj.profiles.length>50)throw Error('Unsupported backup format');
      const profiles=obj.profiles.map(cleanProfile);
      if(!confirm(`Replace your saved profiles with ${profiles.length} from this backup?`))return;
      const id=obj.currentId||obj.selected;
      state={profiles,currentId:profiles.find(p=>p.id===id)?.id||profiles[0]?.id||''};
      if(obj.format==='ghosts-kingshot-tools-v2'){
        if(obj.viking&&typeof obj.viking==='object')localStorage.setItem(CAP_KEY,JSON.stringify(obj.viking));
        if(obj.appointments&&typeof obj.appointments==='object')localStorage.setItem(APT_KEY,JSON.stringify(obj.appointments));
        if(obj.minister&&typeof obj.minister==='object')localStorage.setItem('kingshot-minister-planner-v1',JSON.stringify(obj.minister));
        if(obj.vikingFull&&typeof obj.vikingFull==='object')localStorage.setItem('kingshot-viking-full-v2',JSON.stringify(obj.vikingFull));
      }
      save();render();toast('Backup imported.');
    }catch(e){toast('Invalid backup. Export a JSON backup from Kingshot Tools first.');}
  }
  function route(){render();closeMenu();window.scrollTo({top:0,behavior:'auto'});}
  document.addEventListener('click', e=>{
    const link=e.target.closest('[data-link]');if(link){closeMenu();showDropdown(false);}
    const btn=e.target.closest('[data-action]');if(!btn)return;
    const action=btn.dataset.action;
    if(action==='utc-view'){
      if($('utcDate')&&$('utcTime'))utcSelection={date:$('utcDate').value,time:$('utcTime').value};
      const view=btn.dataset.view;
      if(['converter','minister','appointments'].includes(view)){utcToolView=view;render();}
      return;
    }
    if(action==='flow-step'){
      const tool=btn.dataset.tool;
      if(tool==='message'){
        if(tool==='message'&&$('messageBody'))messageBuffer=$('messageBody').value;
        otherToolSteps[tool]=Math.max(0,Math.min(2,Number(btn.dataset.index)||0));
        render();window.scrollTo({top:0,behavior:'smooth'});
      }
      return;
    }
    if(action==='edit-profile')openProfile();
    else if(action==='new-profile'){showDropdown(false);openProfile(true);}
    else if(action==='save-profile'){if(!hasProfile())openProfile(true);else {save();toast('Your profile is saved on this device.');}}
    else if(action==='switch-profile'&&state.profiles.some(p=>p.id===btn.dataset.id)){state.currentId=btn.dataset.id;messageBuffer=null;otherToolSteps.message=0;save();showDropdown(false);render();toast('Profile switched.');}
    else if(action==='delete-profile')deleteProfile();
    else if(action==='toggle-favorite')toggleFav(btn.dataset.id);
    else if(action==='delete-appointment')removeAppointment(btn.dataset.id);
    else if(action==='copy-appointments')copyAppointments();
    else if(action==='emoji-insert')insertEmoji(btn.dataset.insert??String.fromCharCode(Number(btn.dataset.code)));
    else if(action==='convert-time')convertUTC();
    else if(action==='utc-now'){const now=new Date();$('utcDate').value=now.toISOString().slice(0,10);$('utcTime').value=now.toISOString().slice(11,16);convertUTC();}
    else if(action==='message-quick-template'){
      const chosen=TEMPLATES[btn.dataset.template];
      if(typeof chosen==='string'){
        if(getMessageText().trim()&&!confirm('Replace your current message with this template?'))return;
        messageBuffer=chosen;
        if($('messageBody'))$('messageBody').value=chosen;
        if($('messageTemplate'))$('messageTemplate').value=btn.dataset.template;
        updateCounts();
        $('messageBody')?.focus();
      }
    }
    else if(action==='save-draft')saveDraft();
    else if(action==='copy-message')copyMessage();
    else if(action==='clear-message'){if(confirm('Clear the message editor?')){messageBuffer='';if($('messageBody'))$('messageBody').value='';updateCounts();}}
    else if(action==='export-data')exportData();
    else if(action==='import-data')$('backupFile').click();
  });
  document.addEventListener('input',e=>{if(e.target.id==='messageBody'){messageBuffer=e.target.value;updateCounts();}
    if(e.target.id==='utcDate'||e.target.id==='utcTime')utcSelection={date:$('utcDate')?.value||utcSelection.date,time:$('utcTime')?.value||utcSelection.time};});
  document.addEventListener('change',e=>{
    if(e.target.dataset?.viking){const obj=allViking();obj[profile().id]={...vikingData(),[e.target.dataset.viking]:e.target.value};localStorage.setItem(CAP_KEY,JSON.stringify(obj));refreshViking();}
    if(e.target.id==='messageTemplate'){messageBuffer=TEMPLATES[e.target.value]||'';if($('messageBody'))$('messageBody').value=messageBuffer;updateCounts();}
    if(e.target.id==='backupFile'){importData(e.target.files[0]);e.target.value='';}
    if(e.target.id==='pfAvatar')readAvatar(e.target.files[0]);
  });
  document.addEventListener('submit',e=>{if(e.target?.id==='appointmentForm'){e.preventDefault();addAppointment(e.target);}});
  $('profileForm').addEventListener('submit',saveProfileForm);
  $('closeProfile').addEventListener('click',closeProfile);
  $('cancelProfile').addEventListener('click',closeProfile);
  $('profileSwitch').addEventListener('click',e=>{e.stopPropagation();showDropdown($('profileDropdown').hidden);});
  $('headerAvatar').addEventListener('click',()=>openProfile(!hasProfile()));
  $('menuButton').addEventListener('click',()=>{const open=!$('sidebar').classList.contains('open');$('sidebar').classList.toggle('open',open);$('scrim').classList.toggle('show',open);$('menuButton').setAttribute('aria-expanded',String(open));});
  $('scrim').addEventListener('click',closeMenu);
  document.addEventListener('click',e=>{if(!e.target.closest('.profile-menu-wrap'))showDropdown(false);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();showDropdown(false);}});
  window.addEventListener('hashchange',route);
  state=load();render();
})();