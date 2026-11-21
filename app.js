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
    {id:'viking',name:'Viking Vengeance Squad Planner',tag:'VIKING VENGEANCE',img:'viking.webp',desc:'Organise Viking Vengeance squads, troops and defensive assignments.',intro:'Choose the squad planning rules for Viking Vengeance and we will build them here.',icon:'🛡️'},
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
  function gameTool(t){
    const fav=profile().favorites.includes(t.id);
    return `${header(t.name,t.intro)}${t.id==='viking'?vikingSetup():''}<div class="wide-grid">
      <div><div class="tool-page-hero"><img src="${ASSETS+t.img}" alt="${esc(t.name)} artwork"><div class="tool-hero-gradient"></div><div class="tool-hero-text"><span class="eyebrow">${esc(t.tag)}</span><h2>${esc(t.name)}</h2></div></div>
      <section class="content-card" style="margin-top:20px"><h2>Calculator details</h2><p>This tool's interface is prepared. The calculation fields and formula will be added once you tell me exactly how it should work.</p>
      <div class="coming-note"><span style="font-size:24px">⚙</span><span><strong>Awaiting your instructions</strong><br>No estimates or unverified Kingshot calculations are being shown.</span></div>
      <div class="form-actions"><button class="button ${fav?'button-dark':'button-primary'}" type="button" data-action="toggle-favorite" data-id="${t.id}">${fav?'✓ Saved to profile':'☆ Save to my profile'}</button></div></section></div>
      <section class="content-card"><span class="eyebrow">NEXT DEVELOPMENT STAGE</span><h2 style="margin-top:6px">How we'll build this</h2><ol class="number-steps"><li>Define the player inputs.</li><li>Agree the calculation rules and game values.</li><li>Build the calculator and test real examples.</li><li>Save favourite setups to your profile.</li></ol><p class="muted" style="font-size:12px">Nothing here uses guessed game data. Your tool specifications take priority.</p><div class="feature-list"><div class="feature-item"><span class="feature-icon">✎</span><div><strong>Custom inputs</strong><small>Designed to your preferences</small></div></div><div class="feature-item"><span class="feature-icon">◎</span><div><strong>Accurate outputs</strong><small>Verified using your examples</small></div></div><div class="feature-item"><span class="feature-icon">▣</span><div><strong>Saved setups</strong><small>Per-player profile storage</small></div></div></div></section>
    </div>`;
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
    return `${header('UTC Time Converter','Turn any UTC event time into the correct local time in other regions, including daylight-saving changes.')}
      <div class="wide-grid"><section class="content-card"><span class="eyebrow">EVENT TIME PLANNER</span><h2>Convert from UTC</h2><div class="form-grid"><label>UTC date<input type="date" id="utcDate" required></label><label>UTC time<input type="time" id="utcTime" required></label></div>
      <div class="form-actions"><button type="button" class="button button-primary" data-action="convert-time">Convert times →</button><button type="button" class="button button-ghost" data-action="utc-now">Use current UTC time</button></div><div id="timeResults" class="results-grid" aria-live="polite"></div></section>
      <section class="content-card"><span class="eyebrow">HOW IT WORKS</span><h2>Coordinate across time zones</h2><div class="tool-page-hero" style="height:180px;margin-bottom:17px"><img src="assets/utc.webp" alt="Clock and world time artwork"></div><p>Enter the event's date and UTC time. The displayed local time automatically accounts for daylight saving where applicable.</p><p class="muted" style="font-size:12px">Includes the UK, Italy/central Europe, US East/West, Saudi Arabia, UAE and Sydney.</p></section></div>${appointmentsPanel()}`;
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
    form.reset();$('appointmentList').innerHTML=appointmentList();toast('Appointment note saved.');
  }
  function removeAppointment(id){const next=allAppointments(),pid=profile().id;next[pid]=(next[pid]||[]).filter(a=>a.id!==id);localStorage.setItem(APT_KEY,JSON.stringify(next));$('appointmentList').innerHTML=appointmentList();toast('Appointment removed.');}
  async function copyAppointments(){
    const rows=appointments().slice().sort((a,b)=>a.when.localeCompare(b.when));
    if(!rows.length){toast('Add an appointment first.');return;}
    const content='KINGSHOT APPOINTMENT SCHEDULE (UTC)\n'+rows.map(x=>`${fmtAppointment(x.when)} | ${x.role}: ${x.name} (${x.duration} min)${x.notes?' - '+x.notes:''}`).join('\n');
    try{await navigator.clipboard.writeText(content);toast('Appointment schedule copied.');}catch(e){toast('Copy unavailable in this browser.');}
  }
  function messagePage(){
    const draft=profile().draft||'';
    return `${header('Message Creator','Write copy-ready alliance notices, check character and line limits, and save drafts per profile.')}
    <div class="wide-grid"><div class="message-left"><section class="content-card"><span class="eyebrow">ALLIANCE COMMS</span><h2>Compose your announcement</h2><label>Starter template<select id="messageTemplate"><option value="blank">Blank message</option><option value="event">Event Reminder</option><option value="notice">Alliance Announcement</option><option value="rules">Rules Reminder</option><option value="battle">Battle Plan</option></select></label>
    <label style="margin-top:16px">Message<textarea id="messageBody" maxlength="15000" placeholder="Type your alliance message here...">${esc(draft)}</textarea></label>
    <div class="counter-row"><span id="characterCount">0 / 512 characters</span><span id="lineCount">0 / 10 lines</span></div><div id="limitHint" class="template-hint">These limits are for Kingshot's typical short announcement format; confirm the applicable in-game field limit.</div>
    <div class="form-actions"><button class="button button-primary" data-action="copy-message">▣ Copy Message</button><button class="button button-dark" data-action="save-draft">Save Draft</button><button class="button button-ghost" data-action="clear-message">Clear</button></div></section>${secretEmojiPanel()}</div>
    <section class="content-card"><div class="tool-page-hero" style="height:190px;margin-bottom:20px"><img src="assets/messages.webp" alt="Alliance scroll and message artwork"></div><span class="eyebrow">DRAFT SAVING</span><h2>Ready to send</h2><p>Build short, readable messages for alliance members. The counter helps you stay within 512 characters and 10 lines when needed.</p><div class="info-strip">The <strong>Save Draft</strong> button saves the message to your currently selected profile on this device.</div></section></div>`;
  }
  const EMOJI_SET=[
    [0xE001,'Gem','Resources','💎'],[0xE012,'Bag of Gems','Resources','💎'],[0xE002,'Bread','Resources','🍞'],[0xE003,'Wood','Resources','🪵'],[0xE004,'Coal','Resources','⚫'],[0xE005,'Iron','Resources','⛓️'],[0xE006,'Gold','Resources','🪙'],[0xE010,'Truegold','Resources','✨'],
    [0xE007,'Hero XP','Heroes & Gear','📖'],[0xE019,'Hero Shard','Heroes & Gear','🧩'],[0xE016,'Forgehammer','Heroes & Gear','🔨'],[0xE047,'Mystery Badge','Heroes & Gear','🎖️'],
    [0xE013,'Building Speedup','Speedups','🏗️'],[0xE014,'Troop Speedup','Speedups','⚔️'],[0xE015,'Research Speedup','Speedups','🔬'],[0xE017,'General Speedup','Speedups','⏩'],
    [0xE011,'Pearl of Enigma','Events & Coins','🔮'],[0xE020,'Halloween Candy','Events & Coins','🍬'],[0xE029,'Halloween Lollipop','Events & Coins','🍭'],[0xE021,'Energy Booster','Events & Coins','⚡'],[0xE022,'Hotdog','Events & Coins','🌭'],[0xE034,'Lucky Peach','Events & Coins','🍑'],[0xE040,'Energy Bar','Events & Coins','🥖'],[0xE009,'Wheel Coin','Events & Coins','🎡'],[0xE018,'Adventure Coin','Events & Coins','🪙'],[0xE042,'Elysium Coin','Events & Coins','🏅'],[0xE046,'Twinstar Coin','Events & Coins','🌟'],[0xE036,'Coin (unconfirmed)','More Icons','🪙'],[0xE041,'Viking Token (unconfirmed)','More Icons','🪓'],[0xE044,'Alliance Brawl (unconfirmed)','More Icons','🏰']
  ];
  const EMOJI_CATS=['All','Resources','Speedups','Heroes & Gear','Events & Coins','More Icons'];
  function secretEmojiPanel(){
    return `<section class="secret-emojis" aria-label="Kingshot secret Unicode emojis"><div class="emoji-heading"><span class="emoji-icon">✦</span><div><span class="eyebrow">KINGSHOT SECRET UNICODE</span><h2>Secret Emoji Library</h2><p>Find an in-game item icon and insert its code into your message.</p></div></div>
    <div class="emoji-search"><input id="emojiSearch" type="search" placeholder="Search gems, Truegold, speedups..." aria-label="Search Unicode items"><span id="emojiCount"></span></div>
    <div class="emoji-categories" role="group" aria-label="Emoji category">${EMOJI_CATS.map((cat,i)=>`<button type="button" class="emoji-cat ${i===0?'selected':''}" data-action="emoji-filter" data-cat="${esc(cat)}">${esc(cat)}</button>`).join('')}</div>
    <div id="emojiResults" class="emoji-grid"></div>
    <p class="emoji-disclaimer"><strong>Note:</strong> These are community-reported private-use Unicode codes. Pictures are visual labels, not the special character. The inserted character may look blank or like a box outside Kingshot, and codes can vary by game version. Check in-game before sending.</p></section>`;
  }
  let emojiCategory='All';
  function refreshEmojis(){
    const out=$('emojiResults');if(!out)return;
    const query=$('emojiSearch').value.toLowerCase().trim();
    const filtered=EMOJI_SET.filter(([code,name,cat])=>(emojiCategory==='All'||cat===emojiCategory)&&(name.toLowerCase().includes(query)||('u+'+code.toString(16)).includes(query)));
    $('emojiCount').textContent=filtered.length+' icons';
    out.innerHTML=filtered.map(([code,name,cat,picture])=>`<div class="emoji-item"><div class="emoji-standin">${picture}</div><div class="emoji-info"><strong>${esc(name)}</strong><small>U+${code.toString(16).toUpperCase()}</small></div><div class="emoji-actions"><button type="button" data-action="emoji-insert" data-code="${code}" aria-label="Insert ${esc(name)}">↓ Insert</button><button type="button" data-action="emoji-copy" data-code="${code}" aria-label="Copy ${esc(name)}">▣</button></div></div>`).join('')||'<p class="emoji-empty">No matching icons.</p>';
    document.querySelectorAll('.emoji-cat').forEach(button=>button.classList.toggle('selected',button.dataset.cat===emojiCategory));
  }
  async function copyCharacter(ch){try{await navigator.clipboard.writeText(ch);toast('Unicode character copied.');}catch(e){toast('Copy not available in this browser. Use Insert instead.');}}
  function insertEmoji(ch){const box=$('messageBody');if(!box)return;const a=box.selectionStart??box.value.length,b=box.selectionEnd??a;box.setRangeText(ch,a,b,'end');box.focus();updateCounts();}
  function settingsPage(){return `${header('Settings','Keep control of saved profiles and move your information between websites.')}<div class="wide-grid"><section class="content-card"><span class="eyebrow">YOUR DATA</span><h2>Backup & restore</h2><p>Export profiles, message drafts, Viking setup inputs and appointment notes. You can also import profile backups exported from Floot.</p><div class="data-controls"><button class="button button-primary" data-action="export-data">↓ Export Backup</button><button class="button button-ghost" data-action="import-data">↑ Import Backup</button><input id="backupFile" type="file" accept=".json,application/json"></div></section><section class="content-card"><h2>Storage & privacy</h2><p>Profiles, drafts and tool setups are stored in this browser only. Other players create their own profiles. To migrate from Floot, export a backup on the old site and import it here.</p><p class="muted" style="font-size:12px">A new website has separate browser storage; old Floot profiles cannot appear automatically. Export a backup first.</p></section></div>`;}
  function helpPage(){return `${header('Help & FAQ','Quick answers about how this early version works.')}<section class="content-card faq"><details open><summary>Which calculators are available?</summary><p>The UTC converter and message creator work now. Bear Trap lead ratio, joiner squad, Viking Vengeance and KvK pages have been laid out and are awaiting your exact calculator requirements.</p></details><details><summary>Does my profile save automatically?</summary><p>Yes. Profile changes save to local browser storage as soon as you submit the profile form. Draft messages save when you press Save Draft.</p></details><details><summary>Can I use the same profile on an iPhone and a computer?</summary><p>Not automatically in this release. Export and import your backup through Settings; optional cloud accounts can be added later.</p></details><details><summary>Is Kingshot Tools official?</summary><p>No. It is an independent, fan-made community toolkit, not affiliated with or endorsed by the game publisher.</p></details></section>`;}
  function currentPage(){const v=(location.hash||'#dashboard').replace(/^#/,'');return ['dashboard','profile','settings','help',...TOOLS.map(t=>t.id)].includes(v)?v:'dashboard';}
  function render(){const page=currentPage();$('appMain').innerHTML=page==='dashboard'?dashboard():page==='profile'?profilePage():page==='settings'?settingsPage():page==='help'?helpPage():page==='utc'?utcPage():page==='message'?messagePage():gameTool(TOOLS.find(t=>t.id===page));
    document.querySelectorAll('[data-nav]').forEach(link=>{const active=link.dataset.nav===page;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    document.querySelector('.profile-switch-name').textContent=hasProfile()?'My Profiles':'Create Profile';
    const top=$('headerAvatar');top.setAttribute('aria-label',hasProfile()?'Edit player profile':'Create player profile');top.innerHTML=profile().avatar?`<img src="${profile().avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="Profile avatar">`:'♛';
    if(page==='utc'){const now=new Date();$('utcDate').value=now.toISOString().slice(0,10);$('utcTime').value=now.toISOString().slice(11,16);convertUTC();}
    if(page==='message'){updateCounts();emojiCategory='All';refreshEmojis();}
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
  function convertUTC(){const date=$('utcDate')?.value,time=$('utcTime')?.value;if(!date||!time){toast('Choose a date and time first.');return;}
    const instant=new Date(`${date}T${time}:00Z`);if(Number.isNaN(instant.valueOf())){toast('Invalid date or time.');return;}
    const zones=[['UTC','UTC'],['United Kingdom','Europe/London'],['Italy / Central Europe','Europe/Rome'],['US Eastern','America/New_York'],['US Pacific','America/Los_Angeles'],['Saudi Arabia','Asia/Riyadh'],['United Arab Emirates','Asia/Dubai'],['Sydney, Australia','Australia/Sydney']];
    $('timeResults').innerHTML=zones.map(([name,zone])=>{const f=new Intl.DateTimeFormat('en-GB',{timeZone:zone,weekday:'short',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(instant);return `<div class="time-result"><small>${esc(name)}</small><strong>${esc(f)}</strong></div>`;}).join('');}
  function updateCounts(){const box=$('messageBody');if(!box)return;const value=box.value;const lines=value?value.split(/\r?\n/).length:0;const c=$('characterCount'),l=$('lineCount');c.textContent=`${value.length} / 512 characters`;l.textContent=`${lines} / 10 lines`;c.className=value.length>512?'bad':'good';l.className=lines>10?'bad':'good';}
  const TEMPLATES={blank:'',event:'ALLIANCE EVENT REMINDER\nEvent: [Event name]\nDate: [Day / Date]\nTime: [00:00 UTC]\nPlease be ready a few minutes early.',notice:'ALLIANCE ANNOUNCEMENT\n\n[Your announcement]\n\nPlease contact R4/R5 with questions.',rules:'ALLIANCE RULES REMINDER\n\n[State the applicable rule clearly]\n\nPlease contact leadership before retaliating.',battle:'EVENT BATTLE PLAN\nObjective: [Target]\nSquad A: [Task]\nSquad B: [Task]\nBackup: [Task]\nFollow R4/R5 instructions.'};
  function saveDraft(){const box=$('messageBody');if(!box)return;if(!hasProfile()){openProfile(true);toast('Create a profile to save drafts.');return;}profile().draft=box.value;save();toast('Draft saved to '+profile().name+'.');}
  async function copyMessage(){const box=$('messageBody');if(!box?.value.trim()){toast('Write a message first.');return;}
    try{await navigator.clipboard.writeText(box.value);toast('Message copied.');}catch(e){box.select();try{document.execCommand('copy');toast('Message copied.');}catch(err){toast('Use Select All, then Copy.');}}}
  function getJson(key){try{return JSON.parse(localStorage.getItem(key)||'{}');}catch(e){return {};}}
  function exportData(){
    const backup={format:'ghosts-kingshot-tools-v2',exported:new Date().toISOString(),profiles:state.profiles,currentId:state.currentId,viking:getJson(CAP_KEY),appointments:getJson(APT_KEY)};
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
      }
      save();render();toast('Backup imported.');
    }catch(e){toast('Invalid backup. Export a JSON backup from Kingshot Tools first.');}
  }
  function route(){render();closeMenu();window.scrollTo({top:0,behavior:'auto'});}
  document.addEventListener('click', e=>{
    const link=e.target.closest('[data-link]');if(link){closeMenu();showDropdown(false);}
    const btn=e.target.closest('[data-action]');if(!btn)return;
    const action=btn.dataset.action;
    if(action==='edit-profile')openProfile();
    else if(action==='new-profile'){showDropdown(false);openProfile(true);}
    else if(action==='save-profile'){if(!hasProfile())openProfile(true);else {save();toast('Your profile is saved on this device.');}}
    else if(action==='switch-profile'&&state.profiles.some(p=>p.id===btn.dataset.id)){state.currentId=btn.dataset.id;save();showDropdown(false);render();toast('Profile switched.');}
    else if(action==='delete-profile')deleteProfile();
    else if(action==='toggle-favorite')toggleFav(btn.dataset.id);
    else if(action==='delete-appointment')removeAppointment(btn.dataset.id);
    else if(action==='copy-appointments')copyAppointments();
    else if(action==='emoji-filter'){emojiCategory=btn.dataset.cat;refreshEmojis();}
    else if(action==='emoji-insert')insertEmoji(String.fromCharCode(Number(btn.dataset.code)));
    else if(action==='emoji-copy')copyCharacter(String.fromCharCode(Number(btn.dataset.code)));
    else if(action==='convert-time')convertUTC();
    else if(action==='utc-now'){const now=new Date();$('utcDate').value=now.toISOString().slice(0,10);$('utcTime').value=now.toISOString().slice(11,16);convertUTC();}
    else if(action==='save-draft')saveDraft();
    else if(action==='copy-message')copyMessage();
    else if(action==='clear-message'){if(confirm('Clear the message editor?')){$('messageBody').value='';updateCounts();}}
    else if(action==='export-data')exportData();
    else if(action==='import-data')$('backupFile').click();
  });
  document.addEventListener('input',e=>{if(e.target.id==='messageBody')updateCounts();
    if(e.target.id==='emojiSearch')refreshEmojis();});
  document.addEventListener('change',e=>{
    if(e.target.dataset?.viking){const obj=allViking();obj[profile().id]={...vikingData(),[e.target.dataset.viking]:e.target.value};localStorage.setItem(CAP_KEY,JSON.stringify(obj));refreshViking();}
    if(e.target.id==='messageTemplate'){$('messageBody').value=TEMPLATES[e.target.value]||'';updateCounts();}
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