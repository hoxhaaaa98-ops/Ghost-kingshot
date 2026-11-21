/* Kingshot minister appointment time planner. This never claims live booking availability. */
(function(){
'use strict';
const STORE='kingshot-minister-planner-v1';
const OFFICES=['Chief Minister','Minister of Justice','Minister of the Interior','Field Commander','Marshal','Noble Advisor'];
const TIMEZONES=[
 ['UTC / Server time','UTC'],
 ['United Kingdom (London)','Europe/London'],
 ['Italy / Central Europe (Rome)','Europe/Rome'],
 ['Albania / Kosovo','Europe/Tirane'],
 ['US Eastern (New York)','America/New_York'],
 ['US Central (Chicago)','America/Chicago'],
 ['US Mountain (Denver)','America/Denver'],
 ['US Pacific (Los Angeles)','America/Los_Angeles'],
 ['Canada (Toronto)','America/Toronto'],
 ['Brazil (São Paulo)','America/Sao_Paulo'],
 ['Saudi Arabia (Riyadh)','Asia/Riyadh'],
 ['United Arab Emirates (Dubai)','Asia/Dubai'],
 ['India (Kolkata)','Asia/Kolkata'],
 ['Pakistan (Karachi)','Asia/Karachi'],
 ['Philippines (Manila)','Asia/Manila'],
 ['Singapore','Asia/Singapore'],
 ['Japan (Tokyo)','Asia/Tokyo'],
 ['Australia (Sydney)','Australia/Sydney'],
 ['South Africa (Johannesburg)','Africa/Johannesburg']
];
const defaults=()=>({office:'Chief Minister',zone:detectZone(),mode:'slot',basis:'next',activity:'general',earliest:'',lead:'5',fixedDate:'',fixedTime:'',trainHours:'',trainMinutes:'',trainSeconds:'',trainBuffer:'0',trainCapturedAt:''});
const q=(x)=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const opt=(value,label,selected)=>'<option value="'+q(value)+'"'+(String(value)===String(selected)?' selected':'')+'>'+q(label)+'</option>';
function detectZone(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}catch(e){return 'UTC';}}
function read(profileId){
 const def=defaults();try{
  const all=JSON.parse(localStorage.getItem(STORE)||'{}');const val=all[profileId]||{};
  const next={...def,...Object.fromEntries(Object.entries(val).filter(([k,v])=>Object.prototype.hasOwnProperty.call(def,k)&&typeof v==='string'))};
  try{new Intl.DateTimeFormat('en-GB',{timeZone:next.zone});}catch(e){next.zone=def.zone;}
  if(!OFFICES.includes(next.office))next.office=def.office;
  if(!['queue','slot'].includes(next.mode))next.mode='slot';
  if(!['next','fixed','training'].includes(next.basis))next.basis='next';
  if(!['general','training'].includes(next.activity))next.activity='general';
  if(next.activity==='training')next.basis='training';
  return next;
 }catch(e){return def;}
}
function write(id,data){try{const all=JSON.parse(localStorage.getItem(STORE)||'{}');all[id]=data;localStorage.setItem(STORE,JSON.stringify(all));}catch(e){}}
function localMinutes(utc,zone){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(utc);
 const h=Number(parts.find(p=>p.type==='hour')?.value??0),m=Number(parts.find(p=>p.type==='minute')?.value??0);
 return h*60+m;
}
function dateLabel(utc,zone){
 return new Intl.DateTimeFormat('en-GB',{timeZone:zone,weekday:'short',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZoneName:'short'}).format(new Date(utc));
}
function humanGap(ms){
 const mins=Math.ceil(Math.max(0,ms)/60000);
 if(mins>=1440)return Math.floor(mins/1440)+'d '+Math.floor(mins%1440/60)+'h';
 if(mins>=60)return Math.floor(mins/60)+'h '+mins%60+'m';
 return mins+' min';
}
function calculate(data,now=Date.now()){
 const lead=[0,5,10,15,30].includes(Number(data.lead))?Number(data.lead):5;
 const leadMs=lead*60000;
 let zone=data.zone;
 try{new Intl.DateTimeFormat('en-GB',{timeZone:zone});}catch(e){zone='UTC';}
 let start,warning='',choices=[],trainingEnd=null;
 if(data.activity==='training'||data.basis==='training'){
   const hours=Number(data.trainHours||0),mins=Number(data.trainMinutes||0),secs=Number(data.trainSeconds||0);
   if(![hours,mins,secs].every(Number.isInteger)||hours<0||hours>999||mins<0||mins>59||secs<0||secs>59)return{error:'Enter a valid remaining training time (hours, minutes and seconds).'};
   const remaining=(hours*3600+mins*60+secs)*1000;
   if(remaining<=0)return{error:'Enter how long is left on your current troop training, as shown in Kingshot.'};
   const captured=Number(data.trainCapturedAt);
   const measuredAt=Number.isFinite(captured)&&captured>0?captured:now;
   trainingEnd=measuredAt+remaining;
   if(trainingEnd<=now)return{error:'Your previously entered training timer has finished. Enter the current training time remaining to recalculate.'};
   const buffer=[0,5,10,15,30].includes(Number(data.trainBuffer))?Number(data.trainBuffer):0;
   const afterTraining=trainingEnd+buffer*60000;
   const minimum=Math.max(now+leadMs+1,afterTraining);
   if(data.mode==='queue'){
      start=minimum;
      choices=[start];
      warning='Queue appointments are not guaranteed. This is the time to check or request the next opening after your current training is finished.';
   }else{
      const interval=30*60000;
      start=Math.ceil(minimum/interval)*interval;
      choices=Array.from({length:3},(_,i)=>start+i*interval);
   }
   if(start-leadMs<trainingEnd)warning+=' The suggested check time is before your current training finishes; this is intentional so you can be ready for the next batch.';
   warning+=' Minister training bonuses apply when you start a new batch. They do not retroactively change the current training countdown.';
 }else if(data.basis==='fixed'){
  if(!/^\d{4}-\d\d-\d\d$/.test(data.fixedDate||'')||!/^\d\d:\d\d$/.test(data.fixedTime||''))return{error:'Enter the UTC appointment date and time to calculate your local application time.'};
  start=Date.parse(data.fixedDate+'T'+data.fixedTime+':00Z');
  if(!Number.isFinite(start))return{error:'That UTC date and time is invalid.'};
  if(start<=now)return{error:'This appointment time has already passed. Choose a future UTC date and time.'};
  if(start-leadMs<=now)warning='Your chosen early-application time has already passed. Apply or check as soon as you can, subject to your kingdom’s booking rules.';
  if(new Date(start).getUTCMinutes()%30!==0)warning+=' This time is not on a standard 00/30-minute boundary; verify your kingdom’s actual slot.';
  choices=[start];
 }else{
  const earliestMinutes=/^\d\d:\d\d$/.test(data.earliest||'')?(()=>{const [h,m]=data.earliest.split(':').map(Number);return h<24&&m<60?h*60+m:null;})():null;
  const interval=30*60000;
  const from=Math.ceil((now+leadMs+1)/interval)*interval;
  for(let ms=from;ms<=from+8*86400000 && choices.length<3;ms+=interval){
   if(earliestMinutes===null||localMinutes(new Date(ms),zone)>=earliestMinutes)choices.push(ms);
  }
  if(!choices.length)return{error:'No matching slot could be found. Try an earlier preferred local time.'};
  start=choices[0];
 }
 const application=start-leadMs;
 return{start,application,trainingEnd,zone,lead,warning,choices,untilStart:humanGap(start-now),untilApply:application>now?humanGap(application-now):'Now / already due'};
}
let current=null;
function resultHTML(data,plan){
 if(plan.error)return '<div class="mp-warning" role="status">'+q(plan.error)+'</div>';
 const slotLabel=data.mode==='queue'?'Suggested queue check':plan.trainingEnd?'Next suitable planning slot':'Planned appointment start';
 const applyLabel=data.mode==='queue'?'Suggested time to check/apply':'Suggested application/check time';
 return '<div class="mp-results" aria-live="polite">'+
  (plan.trainingEnd?'<div class="mp-training-finish"><div><small>Current training finishes · Your local time</small><strong>'+q(dateLabel(plan.trainingEnd,plan.zone))+'</strong></div><div><small>Current training finishes · UTC</small><strong>'+q(dateLabel(plan.trainingEnd,'UTC'))+'</strong></div></div>':'')+
  '<div class="mp-results-head"><span>♛ YOUR NEXT '+(data.mode==='queue'?'QUEUE CHECK':'MINISTER SLOT')+'</span><strong>'+q(data.office)+'</strong></div>'+
  '<div class="mp-result-grid"><div class="mp-result mp-highlight"><small>'+slotLabel+' · Your local time</small><strong>'+q(dateLabel(plan.start,plan.zone))+'</strong></div>'+
  '<div class="mp-result"><small>'+slotLabel+' · UTC server time</small><strong>'+q(dateLabel(plan.start,'UTC'))+'</strong></div>'+
  '<div class="mp-result"><small>'+applyLabel+' · Your local time</small><strong>'+q(dateLabel(plan.application,plan.zone))+'</strong></div>'+
  '<div class="mp-result"><small>'+applyLabel+' · UTC server time</small><strong>'+q(dateLabel(plan.application,'UTC'))+'</strong></div></div>'+
  '<div class="mp-countdown"><span>Until next slot <b>'+q(plan.untilStart)+'</b></span><span>Until suggested application <b>'+q(plan.untilApply)+'</b></span></div>'+
  (plan.warning?'<p class="mp-warning">'+q(plan.warning)+'</p>':'')+
  (data.mode==='queue'?'<p class="mp-disclaimer"><strong>Queue mode:</strong> Appointment order depends on your kingdom’s live queue. This is a planning reminder, <strong>not a confirmed turn or vacancy</strong>.</p>':'<p class="mp-disclaimer"><strong>Time-slot mode:</strong> This calculates standard 30-minute UTC planning intervals. It does <strong>not</strong> check whether a position is open, booked, or available to apply for in-game.</p>')+
  (plan.choices.length>1?'<div class="mp-upcoming"><h3>Other upcoming planning slots</h3>'+plan.choices.slice(1).map(ms=>'<div><span>'+q(dateLabel(ms,plan.zone))+'</span><small>'+q(dateLabel(ms,'UTC'))+'</small></div>').join('')+'</div>':'')+
  '<div class="mp-actions"><button type="button" data-mp-action="copy" class="button button-primary">▣ Copy UTC + local times</button><button type="button" data-mp-action="calculate" class="button button-ghost">↻ Recalculate now</button></div>'+
  '</div>';
}
function formHTML(data){
 const zoneChoices=TIMEZONES.slice();
 if(!zoneChoices.some(([,value])=>value===data.zone))zoneChoices.unshift(['Your device time zone ('+data.zone+')',data.zone]);
 const training=data.activity==='training';
 const ministerOffices=training?['Noble Advisor','Chief Minister']:OFFICES;
 const plan=calculate(data);
 return '<section class="content-card mp-panel">'+
 '<div class="mp-top"><span class="mp-emblem">♛</span><div><span class="eyebrow">KINGDOM MINISTER TIMING</span><h2>Minister Appointment Calculator</h2><p>Find a suitable appointment time and compare your local clock with UTC server time.</p></div></div>'+
 '<div class="mp-purpose"><button type="button" data-mp-action="purpose" data-purpose="general" class="mp-purpose-card '+(training?'':'is-active')+'"><span class="mp-purpose-icon">♛</span><strong>General Appointment</strong><small>Find a slot or enter an appointment time you already know.</small></button>'+
 '<button type="button" data-mp-action="purpose" data-purpose="training" class="mp-purpose-card '+(training?'is-active':'')+'"><span class="mp-purpose-icon">⚔</span><strong>Extra Troop Training</strong><small>Time your next minister application around a training batch.</small></button></div>'+
 '<div class="mp-fields"><label>Minister position<select data-mp="office">'+ministerOffices.map(v=>opt(v,v,data.office)).join('')+'</select></label>'+
 '<label>Your local time zone<select data-mp="zone">'+zoneChoices.map(([label,value])=>opt(value,label,data.zone)).join('')+'</select></label>'+
 '<label>Kingdom appointment mode<select data-mp="mode">'+opt('slot','Time Slots · 30-minute planning grid',data.mode)+opt('queue','Queue · time not guaranteed',data.mode)+'</select></label>'+
 (!training?'<label>Calculate using<select data-mp="basis">'+opt('next','Next suitable time',data.basis)+opt('fixed','Known UTC appointment date/time',data.basis)+'</select></label>':
 '<div class="mp-field-context"><strong>Training appointment</strong><span>Noble Advisor: +50% training speed and +200 training capacity when starting a new batch. Chief Minister also adds training speed.</span></div>')+
 '</div>'+
 (training?
  '<div class="mp-timer-card"><div class="mp-timer-heading"><span>◷</span><div><strong>How long is left on your current troop training?</strong><p>Copy the countdown currently shown in Kingshot.</p></div></div>'+
  '<div class="mp-timer-fields"><label>Hours<input data-mp="trainHours" type="number" inputmode="numeric" min="0" max="999" step="1" placeholder="00" value="'+q(data.trainHours)+'"></label>'+
  '<label>Minutes<input data-mp="trainMinutes" type="number" inputmode="numeric" min="0" max="59" step="1" placeholder="00" value="'+q(data.trainMinutes)+'"></label>'+
  '<label>Seconds<input data-mp="trainSeconds" type="number" inputmode="numeric" min="0" max="59" step="1" placeholder="00" value="'+q(data.trainSeconds)+'"></label></div>'+
  '<label class="mp-buffer-label">Allow extra time after training finishes<select data-mp="trainBuffer">'+[0,5,10,15,30].map(v=>opt(v,v===0?'None — first suitable slot':v+' minutes',data.trainBuffer)).join('')+'</select></label>'+
  '<p class="mp-timer-note">We record the time you entered the countdown, estimate when the current batch will finish, then find the next suitable UTC time slot. If your timer changes in-game, update these values.</p></div>':
  (data.basis==='next'?'<div class="mp-extra"><label>Earliest suitable local time (optional)<input data-mp="earliest" type="time" value="'+q(data.earliest)+'"></label><div class="mp-field-hint">Leave blank for the next UTC 30-minute planning boundary. Or choose a time you are next available locally.</div></div>':
  '<div class="mp-extra mp-fields"><label>Known UTC appointment date<input data-mp="fixedDate" type="date" value="'+q(data.fixedDate)+'"></label><label>Known UTC appointment time<input data-mp="fixedTime" type="time" value="'+q(data.fixedTime)+'"></label></div>'))+
 '<div class="mp-extra"><label>When should I check / apply?<select data-mp="lead">'+[0,5,10,15,30].map(v=>opt(v,v===0?'At the planned start time':v+' minutes before',data.lead)).join('')+'</select></label></div>'+
 '<p class="mp-guidance">Times adjust for daylight saving. This tool calculates when to check or apply, not whether the minister position is available. Always confirm in-game.</p>'+
 resultHTML(data,plan)+'</section>';
}
function render(){
 if(!current)return;current.root.innerHTML=formHTML(current.data);
}
function onChange(event){
 const input=event.target.closest('[data-mp]');if(!input||!current)return;
 const key=input.dataset.mp;if(!Object.prototype.hasOwnProperty.call(current.data,key))return;
 current.data[key]=input.value;
 if(['trainHours','trainMinutes','trainSeconds'].includes(key))current.data.trainCapturedAt=String(Date.now());
 write(current.id,current.data);render();
}
function onClick(event){
 const btn=event.target.closest('[data-mp-action]');if(!btn||!current)return;
 if(btn.dataset.mpAction==='purpose'){
    const wasTraining=current.data.activity==='training';
    current.data.activity=btn.dataset.purpose==='training'?'training':'general';
    if(current.data.activity==='training'){
      current.data.basis='training';
      if(!wasTraining)current.data.office='Noble Advisor';
    }else if(current.data.basis==='training')current.data.basis='next';
    write(current.id,current.data);render();return;
 }
 if(btn.dataset.mpAction==='calculate'){render();return;}
 if(btn.dataset.mpAction==='copy'){
  const p=calculate(current.data);if(p.error)return;
  const local=p.zone,role=current.data.office;
  const text='KINGSHOT MINISTER PLANNER\nRole: '+role+'\n'+(current.data.mode==='queue'?'Suggested queue check':'Planned appointment')+'\nLocal: '+dateLabel(p.start,local)+'\nUTC: '+dateLabel(p.start,'UTC')+'\nApply / check '+p.lead+' min early\nLocal: '+dateLabel(p.application,local)+'\nUTC: '+dateLabel(p.application,'UTC')+'\nCheck in-game availability; this is a planning estimate.';
  if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>{btn.textContent='✓ Copied schedule';}).catch(()=>window.prompt('Copy your minister times',text));
  else window.prompt('Copy your minister times',text);
 }
}
function mount(root,id){
 if(!root)return;
 if(current?.root){current.root.removeEventListener('change',onChange);current.root.removeEventListener('click',onClick);}
 current={root,id:id||'guest',data:read(id||'guest')};
 root.addEventListener('change',onChange);root.addEventListener('click',onClick);
 render();
}
window.KingshotMinisterPlanner={mount,calculate,dateLabel,detectZone};
})();
