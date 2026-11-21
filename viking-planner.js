/* Kingshot Viking Vengeance planner — standalone, no runtime dependencies. */
(function(){
'use strict';
const STORAGE='kingshot-viking-full-v2';
const OLD_STORAGE='kingshot-tools-viking-v1';
const TYPES=['Infantry','Cavalry','Archer'];
const HEROS=[
 ['Forrest','Infantry',0],['Seth','Infantry',0],['Edwin','Cavalry',0],['Olive','Archer',0],
 ['Howard','Infantry',1],['Chenko','Cavalry',1],['Gordon','Cavalry',1],['Fahd','Cavalry',1],['Quinn','Archer',1],['Diana','Archer',1],['Amane','Archer',1],['Yeonwoo','Archer',1],
 ['Amadeus','Infantry',1],['Helga','Infantry',1],['Saul','Archer',1],['Jabel','Cavalry',1],
 ['Zoe','Infantry',2],['Hilde','Cavalry',2],['Marlin','Archer',2],
 ['Eric','Infantry',3],['Petra','Cavalry',3],['Jaeger','Archer',3],
 ['Alcar','Infantry',4],['Margot','Cavalry',4],['Rosa','Archer',4],
 ['Long Fei','Infantry',5],['Thrud','Cavalry',5],['Vivian','Archer',5],
 ['Triton','Infantry',6],['Sophia','Cavalry',6],['Yang','Archer',6],
 ['Charles','Infantry',7],['Ava','Cavalry',7],['Wee & Woo','Archer',7],
 ['Diego','Infantry',8],['Liz','Cavalry',8],['Luna','Archer',8]
];
const HERO_MAP=new Map(HEROS.map(([n,t,g])=>[n,{name:n,type:t,gen:g}]));
// Source: Kingshot community Hero Level Chart, 2026-03-26. Level 39 is greater than level 40 in the source;
// keep that reported value while the tool labels all non-overridden capacity as an estimate.
const CAPACITY=[0,65,140,220,305,400,500,605,720,840,970,1100,1240,1390,1540,1700,1870,2040,2225,2410,2605,2805,3010,3225,3445,3670,3905,4145,4390,4645,4905,5175,5445,5715,6015,6310,6600,6895,7190,7840,7775,8070,8365,8655,8950,9245,9540,9830,10125,10420,10685,10925,11140,11340,11525,11700,11860,12010,12140,12260,12370,12470,12560,12650,12730,12800,12870,12930,12980,13030,13070,13110,13150,13190,13230,13270,13310,13350,13390,13430,13470];
const blankHero=()=>({name:'',level:''});
const blankSquad=()=>({destination:'',slots:'3',heroes:[blankHero(),blankHero(),blankHero()],exact:'',inf:'',cav:'',arc:'',ratioI:'50',ratioC:'50',ratioA:'0'});
const blankHQ=()=>({source:'1',inf:'',cav:'',arc:''});
const INITIAL=()=>({base:'',marches:'6',infantry:'',cavalry:'',archers:'',bison:'0',boost:'0',marshal:'0',includeArchers:false,mode:'fewest',guard:{Infantry:'',Cavalry:'',Archer:''},guardNotes:'',squads:Array.from({length:7},blankSquad),hqMode:'0',hqCapacity:'',hqDefenders:'15',hq:[blankHQ(),blankHQ()]});
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Math.max(0,Math.floor(Number(v)||0));
const f=v=>Math.round(v).toLocaleString('en-GB');
const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
const option=(value,title,selected)=>`<option value="${e(value)}" ${String(value)===String(selected)?'selected':''}>${e(title)}</option>`;
const numberInput=(id,value,label,placeholder='0')=>`<label>${label}<input type="number" inputmode="numeric" min="0" data-vk="${id}" value="${e(value)}" placeholder="${e(placeholder)}"></label>`;
const heroChoice=(chosen,type='')=>`<option value="">None — No hero</option>`+HEROS.filter(h=>!type||h[1]===type).map(([name,t,g])=>option(name,`${name} · ${t} (Gen ${g})`,chosen)).join('');
const squadChoice=(squads,chosen)=>squads.map((_,i)=>option(String(i+1),`City Reinforcement ${i+1}`,chosen)).join('');
const typeFields={inf:'Infantry',cav:'Cavalry',arc:'Archers'};
let current=null;
// A focused one-screen-at-a-time command deck, instead of a long copied-style form.
let activeStep=0;
let activeSquad=0;
const STEPS=[
 {title:'Troops & capacity',short:'Troops',icon:'01',desc:'Know what you can send before planning squads.'},
 {title:'Home guard',short:'City defence',icon:'02',desc:'Keep your defending heroes safely reserved.'},
 {title:'Squad builder',short:'Heroes',icon:'03',desc:'Equip one city reinforcement march at a time.'},
 {title:'Troop distribution',short:'Troop plan',icon:'04',desc:'Choose how to split your available troops.'},
 {title:'HQ waves',short:'HQ plan',icon:'05',desc:'Set up waves 10 and 20 without double-counting.'},
 {title:'Your battle plan',short:'Results',icon:'06',desc:'Review every squad, check warnings and copy.'}
];
function readData(profileId){
 let obj=INITIAL();
 try {const old=JSON.parse(localStorage.getItem(OLD_STORAGE)||'{}')[profileId];if(old)for(const name of ['base','marches','infantry','cavalry','bison','boost','marshal'])if(typeof old[name]==='string')obj[name]=old[name];}catch(err){}
 try {const stored=JSON.parse(localStorage.getItem(STORAGE)||'{}')[profileId];if(stored&&typeof stored==='object'){
   obj={...obj,...stored};obj.guard={...INITIAL().guard,...stored.guard};obj.squads=Array.from({length:7},(_,i)=>({...blankSquad(),...(stored.squads?.[i]||{}),heroes:Array.from({length:3},(_,j)=>({...blankHero(),...(stored.squads?.[i]?.heroes?.[j]||{})}))}));
   obj.hq=[0,1].map(i=>({...blankHQ(),...(stored.hq?.[i]||{})}));
 }}catch(err){}
 obj.marches=String(clamp(n(obj.marches)||6,1,7));
 return obj;
}
function save(){try{const all=JSON.parse(localStorage.getItem(STORAGE)||'{}');all[current.id]=current.data;localStorage.setItem(STORAGE,JSON.stringify(all));}catch(err){/* local storage may be disabled */}}
function selectedHeroNames(squad){return squad.heroes.slice(0,n(squad.slots)).map(h=>h.name).filter(Boolean);}
function squadCapacity(data,squad){
 const manual=n(squad.exact);
 const base=n(data.base);
 const percent=n(data.boost);
 const hero= squad.heroes.slice(0,n(squad.slots)).reduce((a,h)=>a+(CAPACITY[clamp(n(h.level),0,80)]||0),0);
 const flat=n(data.bison)*1500+(data.marshal==='on'?2500:0);
 // Percent on base only, Hero level amounts added separately: planning estimate, not a claim about hidden game stacking.
 const estimated=Math.floor(base*(1+percent/100))+hero+flat;
 return {capacity:manual||estimated,hero,estimated,manual:Boolean(manual),base,flat};
}
function distributeTargets(caps,desired,kind){
 const result=Array(caps.length).fill(0);
 let remaining=Math.min(desired,caps.reduce((a,b)=>a+b,0));
 if(kind==='fewest'){
  const ranked=caps.map((cap,i)=>({cap,i})).sort((a,b)=>b.cap-a.cap||a.i-b.i);
  for(const s of ranked){const x=Math.min(remaining,s.cap);result[s.i]=x;remaining-=x;}
  return result;
 }
 // Progressive water filling: each active march receives an equal share until it fills.
 let active=caps.map((_,i)=>i);
 while(remaining>0&&active.length){
  const share=Math.max(1,Math.floor(remaining/active.length));let progressed=false;
  for(const i of active){if(remaining===0)break;const add=Math.min(share,caps[i]-result[i],remaining);if(add){result[i]+=add;remaining-=add;progressed=true;}}
  active=active.filter(i=>result[i]<caps[i]);
  if(!progressed)break;
 }
 return result;
}
function assignInventory(targets,available){
 const result=targets.map(()=>({inf:0,cav:0,arc:0}));
 const totalTarget=targets.reduce((a,b)=>a+b,0);
 if(!totalTarget)return result;
 // Allocate priority types proportionally across the chosen target march sizes, preserving inventory totals.
 let remainingSlots=targets.slice();
 for(const type of ['inf','cav','arc']){
  const amount=Math.min(available[type],remainingSlots.reduce((a,b)=>a+b,0));
  const sum=remainingSlots.reduce((a,b)=>a+b,0);
  if(!sum||!amount)continue;
  const parts=remainingSlots.map((size,i)=>({i,whole:Math.floor(amount*size/sum),fraction:amount*size/sum%1}));
  let extras=amount-parts.reduce((a,b)=>a+b.whole,0);
  parts.sort((a,b)=>b.fraction-a.fraction||a.i-b.i);
  for(const part of parts){const count=part.whole+(extras>0?1:0);if(extras>0)extras--;result[part.i][type]=count;remainingSlots[part.i]-=count;}
 }
 return result;
}
function allocate(data, capacities){
 const inventory={inf:n(data.infantry),cav:n(data.cavalry),arc:data.includeArchers?n(data.archers):0};
 const amount=inventory.inf+inventory.cav+inventory.arc;
 if(data.mode==='manual-count')return capacities.map((cap,i)=>({inf:n(data.squads[i].inf),cav:n(data.squads[i].cav),arc:data.includeArchers?n(data.squads[i].arc):0}));
 if(data.mode==='manual-ratio'){
   // Allocate in squad order by explicit desired percentage; if one troop type runs out, leave spare capacity
   // rather than silently violate the user's chosen ratio.
   const free={...inventory};
   return capacities.map((cap,i)=>{
     const sq=data.squads[i],p=[n(sq.ratioI),n(sq.ratioC),data.includeArchers?n(sq.ratioA):0];
     const divisor=p.reduce((a,b)=>a+b,0);
     if(!divisor||cap<=0)return {inf:0,cav:0,arc:0};
     const fractions=p.map((x,j)=>({j,exact:cap*x/divisor,whole:Math.floor(cap*x/divisor)}));
     let spare=cap-fractions.reduce((a,b)=>a+b.whole,0);
     for(const x of fractions.sort((a,b)=>(b.exact-b.whole)-(a.exact-a.whole))){if(spare>0&&p[x.j]>0){x.whole++;spare--;}}
     const out={inf:0,cav:0,arc:0};
     for(const it of fractions){const type=['inf','cav','arc'][it.j];out[type]=Math.min(free[type],it.whole);free[type]-=out[type];}
     return out;
   });
 }
 const targets=distributeTargets(capacities,amount,data.mode==='spread'?'spread':'fewest');
 return assignInventory(targets,inventory);
}
function validation(data,caps,marches,alloc){
 const warnings=[];
 const used=new Map();
 for(const type of TYPES){if(data.guard[type])used.set(data.guard[type],'Your city Guard Station');}
 for(let i=0;i<marches;i++){
  const s=data.squads[i],heroes=s.heroes.slice(0,n(s.slots)).filter(h=>h.name);
  const types=new Set();
  for(const h of heroes){const type=HERO_MAP.get(h.name)?.type;
    if(type&&types.has(type))warnings.push(`Squad ${i+1}: two heroes share the ${type} troop type.`);
    if(type)types.add(type);
    if(used.has(h.name))warnings.push(`${h.name} is assigned more than once (${used.get(h.name)} and squad ${i+1}).`);
    used.set(h.name,`Squad ${i+1}`);
    if(!n(h.level)&&!n(s.exact))warnings.push(`Squad ${i+1}: enter ${h.name}'s level or an observed march capacity.`);
  }
  const amount=alloc[i].inf+alloc[i].cav+alloc[i].arc;
  if(amount>caps[i].capacity)warnings.push(`Squad ${i+1} exceeds its march capacity by ${f(amount-caps[i].capacity)} troops.`);
  if(data.mode==='manual-ratio'){
    const sum=n(s.ratioI)+n(s.ratioC)+(data.includeArchers?n(s.ratioA):0);
    if(sum!==100)warnings.push(`Squad ${i+1}: troop ratios total ${sum}%, not 100%.`);
  }
 }
 const totals=alloc.reduce((a,s)=>({inf:a.inf+s.inf,cav:a.cav+s.cav,arc:a.arc+s.arc}),{inf:0,cav:0,arc:0});
 const inv={inf:n(data.infantry),cav:n(data.cavalry),arc:n(data.archers)};
 for(const [k,label] of Object.entries(typeFields))if(totals[k]>inv[k])warnings.push(`${label} allocated exceeds inventory by ${f(totals[k]-inv[k])}.`);
 if(data.mode!=='manual-count'&&!data.includeArchers)warnings.push('Archers are reserved at home by default (not distributed).');
 return {warnings,totals,inv};
}
function compute(data){
 const marches=clamp(n(data.marches)||6,1,7);
 const squads=data.squads.slice(0,marches);
 const caps=squads.map(s=>squadCapacity(data,s));
 const alloc=allocate(data,caps.map(x=>x.capacity));
 const normalCaps=caps.map((_,i)=>squadCapacity({...data,bison:'0',boost:'0',marshal:'0'},squads[i]).capacity);
 const wanted=n(data.infantry)+n(data.cavalry)+(data.includeArchers?n(data.archers):0);
 const remaining=validation(data,caps,marches,alloc);
 const configuredCapacity=caps.reduce((s,c)=>s+c.capacity,0);
 const normalCapacity=normalCaps.reduce((s,c)=>s+c,0);
 const deployed=alloc.reduce((s,x)=>s+x.inf+x.cav+x.arc,0);
 const left={inf:remaining.inv.inf-remaining.totals.inf,cav:remaining.inv.cav-remaining.totals.cav,arc:remaining.inv.arc-remaining.totals.arc};
 const basicNeed=Math.max(0,wanted-normalCapacity);
 const missing=Math.max(0,wanted-configuredCapacity);
 const nonVerified=caps.some(c=>!c.manual&&(n(data.boost)||n(data.bison)||data.marshal==='on'));
 const hq=(data.hqMode==='0'?[]:(data.hqMode==='1'?[10]:[10,20])).map((wave,j)=>{
   const h=data.hq[j],index=clamp(n(h.source)-1,0,marches-1),source=alloc[index],sourceCap=caps[index].capacity;
   const pool={inf:Math.max(0,left.inf)+source.inf,cav:Math.max(0,left.cav)+source.cav,arc:Math.max(0,left.arc)+source.arc};
   const share=n(data.hqCapacity)>0&&n(data.hqDefenders)>0?Math.floor(n(data.hqCapacity)/n(data.hqDefenders)):0;
   const max=share?Math.min(sourceCap,share):sourceCap;
   const wants={inf:h.inf===''?source.inf:n(h.inf),cav:h.cav===''?source.cav:n(h.cav),arc:h.arc===''?source.arc:n(h.arc)};
   const total=wants.inf+wants.cav+wants.arc;
   const valid=total<=max&&wants.inf<=pool.inf&&wants.cav<=pool.cav&&wants.arc<=pool.arc;
   return {wave,source:index,capacity:max,pool,wants,total,valid,share};
 });
 return {marches,squads,caps,alloc,normalCapacity,configuredCapacity,normalCaps,wanted,deployed,left,basicNeed,missing,nonVerified,hq,...remaining};
}
const H=(title,desc='',subtitle='')=>`<div class="vk-section-title"><span class="vk-triangle">▼</span><div><h2>${title}</h2>${desc?`<p>${desc}</p>`:''}${subtitle?`<small>${subtitle}</small>`:''}</div></div>`;
function choice(type,selected){return heroChoice(selected,type);}
function squadInputs(data,idx){
 const s=data.squads[idx];const slots=clamp(n(s.slots),0,3);
 return `<article class="vk-squad-card"><h3>City Reinforcement ${idx+1}</h3><div class="vk-form-row"><label>Destination city / player (optional)<input type="text" maxlength="60" data-vk="squads.${idx}.destination" placeholder="Player or city" value="${e(s.destination)}"></label><label>Number of heroes<select data-vk="squads.${idx}.slots">${[0,1,2,3].map(i=>option(i,`${i} ${i===1?'hero':'heroes'}`,s.slots)).join('')}</select></label></div>
 ${Array.from({length:slots},(_,slot)=>`<div class="vk-hero-line"><label>Hero ${slot+1}<select data-vk="squads.${idx}.heroes.${slot}.name">${choice('',s.heroes[slot].name)}</select></label><label>Hero level (1–80)<input type="number" min="1" max="80" data-vk="squads.${idx}.heroes.${slot}.level" placeholder="Set level" value="${e(s.heroes[slot].level)}"></label></div>`).join('')}
 <label class="vk-wide-field">Exact observed march capacity (optional)<input type="number" min="0" data-vk="squads.${idx}.exact" placeholder="Overrides estimated capacity" value="${e(s.exact)}"></label>
 <div class="vk-inline-result" id="vk-cap-${idx}"></div>
 </article>`;
}
function heroPanel(data){return `<section class="content-card vk-panel">${H('Own city defence — locked heroes','Reserve up to three heroes for the Guard Station. These heroes do not use your selected reinforcement march slots.')}
 <div class="vk-banner"><strong>KingShot terminology:</strong> Guard Station heroes defend your city. This is distinct from NPC barricade defence. Reserved heroes cannot also be selected in reinforcement marches.</div>
 <div class="vk-form-row vk-three">${TYPES.map(type=>`<label>${type} hero<select data-vk="guard.${type}">${choice(type,data.guard[type])}</select></label>`).join('')}</div>
 <label class="vk-wide-field">City defence notes (optional)<input data-vk="guardNotes" type="text" maxlength="220" placeholder="Any instructions for your own city" value="${e(data.guardNotes)}"></label></section>`;}
function capacityPanel(data){return `<section class="content-card vk-panel">
 ${H('Deployment capacity & optional buffs','Set your base capacity and the marches you actually have available. The planner calculates hero bonuses separately for each squad.')}
 <div class="vk-form-row"><label>Base capacity (excluding hero level bonuses)<input data-vk="base" type="number" inputmode="numeric" min="0" placeholder="Your Command Center + research capacity" value="${e(data.base)}"></label><label>Available march slots<select data-vk="marches">${Array.from({length:7},(_,i)=>option(i+1,`${i+1} ${i===0?'march':'marches'}`,data.marches)).join('')}</select></label></div>
 <p class="vk-footnote">Choose your actual unlocked march queue count (normally up to six; seven is available as an extra planning slot). If the game shows a different capacity, enter it under that squad's exact-capacity override.</p>
 <div class="vk-advice"><span>💡</span><p><strong>Only use deployment buffs if needed.</strong> Leave all three buffs on <b>None</b> unless your normal marches cannot get all your Infantry and Cavalry out of the city.</p></div>
 <h3 class="vk-minor-heading">⚡ Optional buffs</h3><div class="vk-form-row vk-three">
 <label><span class="vk-buff-label">🐂 Mighty Bison · Fearless Roar</span><select data-vk="bison">${option('0','None — no pet bonus',data.bison)}${Array.from({length:10},(_,i)=>option(i+1,`Mighty Bison R${i+1} · +${f((i+1)*1500)}`,data.bison)).join('')}</select></label>
 <label><span class="vk-buff-label">⚡ Deployment Capacity Boost</span><select data-vk="boost">${option('0','None',data.boost)}${option('10','Boost I · +10%',data.boost)}${option('20','Boost II · +20%',data.boost)}</select></label>
 <label><span class="vk-buff-label">👑 Marshal Appointment</span><select data-vk="marshal">${option('0','None',data.marshal)}${option('on','Marshal · +2,500',data.marshal)}</select></label>
 </div><p class="vk-footnote">Estimated buff stacking: percentage applies to the base deployment value; hero level capacity and flat bonuses are then added. Use exact in-game march limits to replace the estimate where necessary.</p>
 <div id="vk-cap-summary" class="vk-stat-grid"></div></section>`;}
function inventoryPanel(data){return `<section class="content-card vk-panel">${H('Available troops','Enter the troops you actually have in the city. Archers can be kept at home or optionally included in city reinforcements.')}
 <div class="vk-form-row vk-three">${numberInput('infantry',data.infantry,'Infantry')}${numberInput('cavalry',data.cavalry,'Cavalry')}${numberInput('archers',data.archers,'Archers')}</div>
 <label class="vk-check"><input type="checkbox" data-vk="includeArchers" ${data.includeArchers?'checked':''}> Include Archers in the reinforcement allocation</label><p class="vk-footnote">By default, only Infantry and Cavalry are sent out. Archers remain in your city. This is a planning preference, not a mandatory game rule.</p></section>`;}
function allocationPanel(data){const mode=data.mode;const m=clamp(n(data.marches)||6,1,7);
 return `<section class="content-card vk-panel">${H('Auto Viking troop deployment configuration','Choose how your Infantry and Cavalry are divided among the selected city marches, or enter manual counts or troop ratios.')}
 <label class="vk-wide-field">Distribution mode<select data-vk="mode">${[
 ['fewest','Use fewest marches needed'],['spread','Spread across all selected marches'],['manual-count','Manual by troop count'],['manual-ratio','Manual by troop ratio']].map(([v,l])=>option(v,l,mode)).join('')}</select></label>
 ${mode==='manual-count'?`<div class="vk-manual-grid">${Array.from({length:m},(_,i)=>`<div class="vk-manual-card"><h3>City Reinforcement ${i+1}</h3><div class="vk-form-row vk-three">${['inf','cav',...(data.includeArchers?['arc']:[])].map(k=>numberInput(`squads.${i}.${k}`,data.squads[i][k],typeFields[k])).join('')}</div></div>`).join('')}</div>`:''}
 ${mode==='manual-ratio'?`<div class="vk-manual-grid">${Array.from({length:m},(_,i)=>`<div class="vk-manual-card"><h3>City Reinforcement ${i+1}</h3><div class="vk-form-row vk-three">${[['ratioI','Infantry %'],['ratioC','Cavalry %'],...(data.includeArchers?[['ratioA','Archers %']]:[])].map(([k,label])=>numberInput(`squads.${i}.${k}`,data.squads[i][k],label)).join('')}</div></div>`).join('')}</div>`:''}
 <div class="vk-inline-result" id="vk-plan-calculation"></div></section>`;}
function hqPanel(data){const mode=data.hqMode,m=clamp(n(data.marches)||6,1,7);return `<section class="content-card vk-panel">${H('HQ waves 10 and 20','HQ reinforcements are separate movements. Recall a city squad after wave 9 or 19, send it to HQ, then return it to city reinforcements after the HQ wave.')}
 <label class="vk-wide-field">Number of HQ wave setups<select data-vk="hqMode">${option('0','0 — No HQ setup',mode)}${option('1','1 — Same setup for waves 10 and 20',mode)}${option('2','2 — Different setups for each wave',mode)}</select></label>
 ${mode!=='0'?`<div class="vk-form-row"><label>HQ garrison capacity (optional)<input type="number" min="0" data-vk="hqCapacity" value="${e(data.hqCapacity)}" placeholder="Leader's HQ troop capacity"></label><label>Number of HQ defenders<input type="number" min="1" data-vk="hqDefenders" value="${e(data.hqDefenders)}"></label></div><p class="vk-footnote">If you enter the total HQ capacity and number of defenders, the planner estimates an equal per-player troop share. Confirm the alliance's actual HQ limit.</p>`:''}
 ${mode!=='0'?Array.from({length:mode==='1'?1:2},(_,i)=>`<div class="vk-hq-card"><h3>${mode==='1'?'HQ setup for waves 10 + 20':`Wave ${i===0?10:20} HQ setup`}</h3><label>City squad to recall<select data-vk="hq.${i}.source">${squadChoice(Array.from({length:m}),data.hq[i].source)}</select></label><div class="vk-form-row vk-three">${numberInput(`hq.${i}.inf`,data.hq[i].inf,'Infantry to HQ','Auto from recalled squad')}${numberInput(`hq.${i}.cav`,data.hq[i].cav,'Cavalry to HQ','Auto from recalled squad')}${numberInput(`hq.${i}.arc`,data.hq[i].arc,'Archers to HQ','Auto from recalled squad')}</div><p class="vk-footnote">Leave troop counts blank to use the troops from the recalled city squad automatically.</p><div id="vk-hq-${i}" class="vk-inline-result"></div></div>`).join(''):'<p class="vk-footnote">No HQ wave setup selected. You can still use the city reinforcement planner independently.</p>'}
 </section>`;}
function resultPanel(){return `<section class="content-card vk-panel">${H('Squad overview & checks','Your calculated troops, hero selections, capacity usage and checks in one place.')}<div id="vk-overview"></div><div class="vk-overview-actions"><button class="button button-primary" type="button" data-vka="copy">▣ Copy squad plan</button><button class="button button-outline" type="button" data-vka="reset">↻ Reset Viking setup</button></div></section>`;}
function squadSelectPanel(data){
 const m=clamp(n(data.marches)||6,1,7);
 activeSquad=clamp(activeSquad,0,m-1);
 return `<section class="content-card vk-panel">${H('Build your reinforcement squads','Pick a march below. Each squad has its own heroes, levels, destination and optional exact-capacity override.')}
 <div class="vk-squad-select" aria-label="Choose city reinforcement squad">${Array.from({length:m},(_,i)=>`<button type="button" data-vka="squad" data-id="${i}" aria-pressed="${activeSquad===i}" class="vk-squad-pill ${activeSquad===i?'is-current':''}"><span>Squad ${i+1}</span><small>${selectedHeroNames(data.squads[i]).length} / ${n(data.squads[i].slots)} heroes</small></button>`).join('')}</div>
 <div class="vk-editor-caption"><span class="vk-step-dot">${String(activeSquad+1).padStart(2,'0')}</span><div><strong>Editing city squad ${activeSquad+1}</strong><small>Choose up to three heroes, with different troop types</small></div></div>
 <div class="vk-squads vk-solo-squad">${squadInputs(data,activeSquad)}</div>
 <div class="vk-editor-footer"><span>${m} city marches available</span>${activeSquad<m-1?`<button type="button" data-vka="squad" data-id="${activeSquad+1}" class="vk-quiet-btn">Edit squad ${activeSquad+2} →</button>`:'<span>Last squad</span>'}</div></section>`;
}
function dashboardStrip(){return `<div class="vk-command-header"><div class="vk-command-text"><span class="vk-eyebrow">VIKING VENGEANCE / SQUAD CONTROL</span><h2>Command Deck</h2><p>Build your defence plan one decision at a time. Your choices save automatically to this browser.</p></div><span class="vk-command-seal" aria-hidden="true">♜</span></div>
 <div class="vk-command-metrics" aria-label="Live Viking planning summary"><div><span>Troops available</span><strong id="vk-live-troops">—</strong></div><div><span>Troops deployed</span><strong id="vk-live-deployed">—</strong></div><div><span>Not assigned</span><strong id="vk-live-left">—</strong></div></div>`;}
function renderForm(){const data=current.data,root=current.root;
 activeStep=clamp(activeStep,0,STEPS.length-1);
 const currentStep=STEPS[activeStep];
 const content=[
  ()=>capacityPanel(data)+inventoryPanel(data),
  ()=>heroPanel(data),
  ()=>squadSelectPanel(data),
  ()=>allocationPanel(data),
  ()=>hqPanel(data),
  ()=>resultPanel()
 ][activeStep]();
 root.innerHTML=`<div class="vk-root vk-workspace">
 ${dashboardStrip()}
 <div class="vk-stepper" aria-label="Viking planner steps">${STEPS.map((step,i)=>`<button type="button" data-vka="step" data-id="${i}" class="vk-step ${i===activeStep?'vk-step-active':''} ${i<activeStep?'vk-step-past':''}" aria-current="${i===activeStep?'step':'false'}"><span class="vk-step-number">${i<activeStep?'✓':step.icon}</span><span class="vk-step-label">${step.short}</span></button>`).join('')}</div>
 <div class="vk-active-step-heading"><div><span>STEP ${String(activeStep+1).padStart(2,'0')} OF ${String(STEPS.length).padStart(2,'0')}</span><h2>${currentStep.title}</h2><p>${currentStep.desc}</p></div><div class="vk-step-progress"><span style="width:${Math.round((activeStep+1)/STEPS.length*100)}%"></span></div></div>
 <div class="vk-stage-body">${content}</div>
 <div class="vk-bottom-navigation"><div>${activeStep>0?'<button type="button" data-vka="prev" class="vk-back-btn">← Previous</button>':'<span class="vk-autosave">✓ Saves as you go</span>'}</div><button type="button" data-vka="next" class="vk-next-btn">${activeStep===STEPS.length-1?'Back to troops ↻':activeStep===STEPS.length-2?'Review full plan →':'Continue →'}</button></div>
 <p class="vk-data-sources">Kingshot planning estimates based on community hero-level and troop data. Exact march capacity overrides take precedence. Check hero bonuses and final troop limits in your game before deploying.</p>
 </div>`;
 refresh();
}
function updateText(id,text){const el=current.root.querySelector('#'+id);if(el)el.textContent=text;}
function refresh(){if(!current)return;const d=current.data,x=compute(d);
 const bf=n(d.bison)*1500,percent=n(d.boost),marshal=d.marshal==='on'?2500:0;
 updateText('vk-live-troops',f(x.wanted));updateText('vk-live-deployed',f(x.deployed));updateText('vk-live-left',f(Math.max(0,x.wanted-x.deployed)));
 const caps=current.root.querySelector('#vk-cap-summary');if(caps)caps.innerHTML=`
  <div><small>Without buffs</small><strong>${f(x.normalCapacity)}</strong></div><div><small>With selected buffs</small><strong>${f(x.configuredCapacity)}</strong></div><div><small>Pet bonus / march</small><strong>${bf?'+'+f(bf):'None'}</strong></div><div><small>Deployment boost</small><strong>${percent?percent+'%':'None'}</strong></div><div><small>Marshal bonus / march</small><strong>${marshal?'+'+f(marshal):'None'}</strong></div><div><small>Extra space needed</small><strong>${f(x.basicNeed)}</strong></div>`;
 for(let i=0;i<x.marches;i++){
  const c=x.caps[i],names=selectedHeroNames(x.squads[i]);const el=current.root.querySelector(`#vk-cap-${i}`);if(el)el.innerHTML=`<span>March capacity: <strong>${f(c.capacity)}</strong> ${c.manual?'<em>exact override</em>':'<em>estimated</em>'}</span><span>Hero level bonus: <strong>+${f(c.hero)}</strong></span>${names.length===0?'<span>Assign heroes to increase capacity.</span>':''}`;
 }
 const deployed=x.totals.inf+x.totals.cav+x.totals.arc;
 const extra=Math.max(0,x.wanted-deployed);
 const v=current.root.querySelector('#vk-plan-calculation');if(v)v.innerHTML=`<div class="vk-sum-row"><div><small>Capacity available</small><strong>${f(x.configuredCapacity)}</strong></div><div><small>Troops allocated</small><strong>${f(deployed)}</strong></div><div><small>Troops not assigned</small><strong>${f(extra)}</strong></div></div><p>${x.missing?'Selected capacity is not enough for all your selected troop types. Consider more available marches or optional buffs.':'Selected capacity can hold the requested troops, subject to hero levels and actual in-game capacity.'}</p>`;
 for(let i=0;i<x.hq.length;i++){
  const h=x.hq[i],el=current.root.querySelector('#vk-hq-'+i);if(el)el.innerHTML=`<p><b>Recall City Reinforcement ${h.source+1} after wave ${h.wave===10?9:19}.</b> Home pool after recall: ${f(h.pool.inf)} Infantry / ${f(h.pool.cav)} Cavalry / ${f(h.pool.arc)} Archers.</p><p>Planned HQ troops: <b>${f(h.total)}</b> · limit: <b>${f(h.capacity)}</b> ${h.valid?'<span class="vk-good">✓ fits</span>':'<span class="vk-bad">⚠ exceeds available pool or limit</span>'}</p>`;
 }
 const overview=current.root.querySelector('#vk-overview');if(overview){
 const warnings=x.warnings.filter(t=>!t.startsWith('Archers are reserved'));
 if(!n(d.base)&&x.caps.some(c=>!c.manual))warnings.unshift('Enter base march capacity or exact capacity for each squad to calculate accurate troop limits.');
 if(x.nonVerified)warnings.unshift('Capacity buffs are estimated. Check exact per-march values in-game.');
 if(x.missing)warnings.push(`${f(x.missing)} more deployment slots needed with current configuration.`);
 for(const h of x.hq)if(!h.valid)warnings.push(`HQ wave ${h.wave}: desired troops exceed your recalled pool or HQ limit.`);
 const totalCap=x.caps.reduce((s,c)=>s+c.capacity,0);
 overview.innerHTML=`<div class="vk-sum-row"><div><small>Troops allocated</small><strong>${f(deployed)}</strong></div><div><small>Total troop capacity</small><strong>${f(totalCap)}</strong></div><div><small>Infantry + Cavalry left</small><strong>${f(Math.max(0,x.left.inf)+Math.max(0,x.left.cav))}</strong></div></div>
 <div class="vk-squad-overview">${x.squads.map((s,i)=>{const a=x.alloc[i],used=a.inf+a.cav+a.arc;const c=x.caps[i];const heroes=selectedHeroNames(s);const pr=used?[(100*a.inf/used).toFixed(1),(100*a.cav/used).toFixed(1),(100*a.arc/used).toFixed(1)]:['0','0','0'];return `<article class="vk-report-card"><h3>City Reinforcement ${i+1} ${s.destination?`· ${e(s.destination)}`:''}</h3><div><b>Heroes:</b> ${heroes.map(e).join(', ')||'None selected'}</div><div><b>Troops:</b> Infantry ${f(a.inf)} · Cavalry ${f(a.cav)} · Archers ${f(a.arc)}</div><div><b>Ratio:</b> ${pr.join('% / ')}%</div><div><b>March capacity:</b> ${f(c.capacity)} · <b>Used:</b> ${f(used)} ${used>c.capacity?'<span class="vk-bad">(over capacity)</span>':''}</div></article>`;}).join('')}</div>
 ${warnings.length?`<div class="vk-warnings"><strong>Checks & warnings</strong><ul>${[...new Set(warnings)].slice(0,22).map(t=>`<li>${e(t)}</li>`).join('')}</ul></div>`:'<div class="vk-ok">✓ No oversubscription or duplicate heroes detected.</div>'}
 ${x.hq.length?`<div class="vk-hq-plan"><h3>HQ recall plan</h3>${x.hq.map(h=>`<p>Wave ${h.wave}: recall City ${h.source+1} after wave ${h.wave-1}; send ${f(h.total)} to HQ, then return the troops after the HQ wave finishes.</p>`).join('')}${d.hqMode==='1'?'<p>Use the same squad and troop setup again for wave 20 after wave 19 has finished.</p>':''}</div>`:''}`;
 }
 }
function updatePath(path,value){const parts=path.split('.');let ref=current.data;for(const part of parts.slice(0,-1)){ref=ref[part];if(!ref)return;}ref[parts[parts.length-1]]=value;save();}
function listener(e){const el=e.target;if(!current||!current.root.contains(el))return;const key=el.dataset.vk;if(!key)return;
 const value=el.type==='checkbox'?el.checked:el.value;
 updatePath(key,value);
 if(el.tagName==='SELECT'||el.type==='checkbox'){renderForm();return;}
 refresh();
}
function planText(){const x=compute(current.data);const text=['VIKING VENGEANCE — SQUAD PLAN',`Marches: ${x.marches} | Allocated: ${f(x.deployed)} | Capacity: ${f(x.configuredCapacity)}`];
 x.squads.forEach((s,i)=>{const a=x.alloc[i];text.push(`City ${i+1}${s.destination?' / '+s.destination:''}: ${selectedHeroNames(s).join(', ')||'No heroes'}`,`INF ${f(a.inf)} / CAV ${f(a.cav)} / ARC ${f(a.arc)} (${f(x.caps[i].capacity)} cap)`);});
 for(const h of x.hq){text.push(`HQ Wave ${h.wave}: recall City ${h.source+1}, send INF ${f(h.wants.inf)} / CAV ${f(h.wants.cav)} / ARC ${f(h.wants.arc)}`);}
 return text.join('\n');
}
function click(e){const btn=e.target.closest('[data-vka]');if(!btn||!current?.root.contains(btn))return;
 if(btn.dataset.vka==='step'){activeStep=clamp(n(btn.dataset.id),0,STEPS.length-1);renderForm();return;}
 if(btn.dataset.vka==='next'){activeStep=activeStep===STEPS.length-1?0:activeStep+1;renderForm();return;}
 if(btn.dataset.vka==='prev'){activeStep=Math.max(0,activeStep-1);renderForm();return;}
 if(btn.dataset.vka==='squad'){activeSquad=clamp(n(btn.dataset.id),0,6);renderForm();return;}
 if(btn.dataset.vka==='reset'&&confirm('Reset your Viking squad planner settings for this profile?')){current.data=INITIAL();save();renderForm();}
 if(btn.dataset.vka==='copy'){const str=planText();navigator.clipboard?.writeText(str).then(()=>{btn.textContent='✓ Copied';setTimeout(()=>{if(btn.isConnected)btn.textContent='▣ Copy squad plan';},1300)}).catch(()=>{window.prompt('Copy your plan',str)});}
}
function mount(root,profileId){if(!root)return;
 if(current?.root&&current.root!==root){current.root.removeEventListener('input',listener);current.root.removeEventListener('change',listener);current.root.removeEventListener('click',click);}
 activeStep=0;activeSquad=0;
 current={root,id:profileId||'guest',data:readData(profileId||'guest')};
 root.addEventListener('input',listener);root.addEventListener('change',listener);root.addEventListener('click',click);
 renderForm();
}
window.KingshotVikings={mount,compute,initial:INITIAL,heroCapacity:level=>CAPACITY[clamp(n(level),0,80)]||0,heroes:HEROS};
const boot=document.querySelector("#viking-planner-root");if(boot)mount(boot,boot.dataset.profile||"guest");
})();