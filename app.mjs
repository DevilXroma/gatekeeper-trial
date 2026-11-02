import {level} from './level.mjs';
import {createEngine,figures,edgeKey} from './engine.mjs';
import {createConnectionAttempt} from './connection-attempt.mjs';
import {api,abortRequests} from './relay.mjs';
import {trapThemes,scenesForEvent,localPresentationEvents,createPresentationCursor} from './presentation.mjs';
import {startAmbience} from './ambience.mjs';
const engine=createEngine(level),$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
let role=null,state=engine.initial(),guideState={moves:0,attempt:1,arrived:[false,false,false],event:{type:'start'}},proposal=null,selected=0,reveal=false,host=false,local=false,room='',online=false,pending=false,connectionTimer=null,wake=null,netSession=null,networkGeneration=0,drag=null;
const storageKey='gatekeeper-v2-state';
const teamNames={movers:'Искры',guides:'Тени'};
function participantId(){try{let id=sessionStorage.getItem('gatekeeper-participant');if(!id){id=crypto.randomUUID();sessionStorage.setItem('gatekeeper-participant',id);}return id;}catch{return fallbackParticipant;}}
const fallbackParticipant=crypto.randomUUID();
const presentationCursor=createPresentationCursor();let sceneQueue=[],activeScene=null;
function restore(){try{const v=JSON.parse(localStorage.getItem(storageKey));if(v?.version===2&&v.pos?.length===3&&v.pos.every(n=>level.nodes[n])&&new Set(v.pos).size===3)return v;}catch{}return engine.initial();}
function save(){if(role==='host')try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{}}
function show(section){for(const id of ['lobby','connect','game'])$(id).hidden=id!==section;$('home-button').hidden=section==='lobby';document.body.dataset.screen=section;document.body.dataset.role=role||'';}
function notify(title,detail,icon='⌁',failure=false){$('event-title').textContent=title;$('event-detail').textContent=detail;$('event-icon').textContent=icon;$('event-strip').classList.toggle('failure',failure);}
function status(text,ok,connecting=false){$('connection-pill').querySelector('span').textContent=text;$('connection-pill').classList.toggle('offline',!ok);$('connection-pill').classList.toggle('connecting',connecting);}
function clearScenes(){sceneQueue=[];activeScene=null;$('overlay').hidden=true;$('overlay').removeAttribute('data-fx');$('overlay').removeAttribute('data-scene');$('scene-fx').replaceChildren();}
function nextScene(){if(!$('overlay').hidden||!sceneQueue.length)return;const scene=sceneQueue.shift();activeScene=scene;$('overlay').removeAttribute('data-team');$('overlay').dataset.scene=scene.kind;$('overlay').dataset.fx=scene.effect;$('overlay').dataset.variation=scene.variation||0;$('overlay').style.setProperty('--scene-color',scene.color);$('overlay-symbol').textContent=scene.symbol;$('overlay-title').textContent=scene.title;$('overlay-text').textContent=scene.text;$('overlay-close').textContent=scene.kind==='victory'?'Войти':scene.kind==='arrival'?'Продолжить путь':'Ещё попытка';
 $('scene-fx').replaceChildren();for(let i=0;i<16;i++){const p=document.createElement('i');p.style.setProperty('--i',i);p.style.setProperty('--angle',i*22.5+'deg');$('scene-fx').appendChild(p);}$('overlay').hidden=false;
 if(scene.kind==='failure'){document.body.dataset.trap=scene.effect;document.body.classList.add('shake');setTimeout(()=>{document.body.classList.remove('shake');delete document.body.dataset.trap;},900);}if(navigator.vibrate)navigator.vibrate(scene.kind==='failure'?60:[20,35,20]);
}
function queueScenes(s){const events=s.events||localPresentationEvents(s,level.danger,edgeKey);sceneQueue.push(...presentationCursor.consume(room||'local',s,events));nextScene();}
function toastOverlay(type){sceneQueue.push(...scenesForEvent({type,trap:0,token:state.event?.token,variation:state.attempt%3}));nextScene();}
function showTeamIntro(){const guides=role==='guides';activeScene={kind:'intro'};$('overlay').removeAttribute('data-fx');$('overlay').dataset.scene='intro';$('scene-fx').replaceChildren();$('overlay').dataset.team=role;$('overlay-symbol').textContent=guides?'☾':'✧';$('overlay-title').textContent='Вы — '+teamNames[role];$('overlay-text').textContent=guides?'«Вам досталось зрение. Не торопитесь радоваться: руками придётся работать другим. И соседям — ни слова».':'«Вам достались руки. Уж распорядитесь ими получше последней смены. С соседями — без разговоров, я всё слышу». ';$('overlay-close').textContent='Так тому и быть';$('overlay').hidden=false;}
function selectRole(next){
 role=next;proposal=null;pending=false;clearScenes();
 if(next==='host'){host=true;local=true;online=true;state=restore();room='';presentationCursor.reset('local',state.revision);show('game');$('host-controls').hidden=false;$('view-title').textContent='Стол ведущего';$('view-subtitle').textContent='ОБЕ КОМАНДЫ · ОБЩЕЕ СОСТОЯНИЕ';status('Локальная проверка',true);render();}
 else {host=false;local=false;online=false;$('join-role').textContent='ПРИВРАТНИК ЖДЁТ';resetJoinFeedback();show('connect');const params=new URLSearchParams(location.search);$('room-input').value=params.get('room')||'';}
}
$('player-button').onclick=()=>selectRole('join');$('developer-button').onclick=()=>selectRole('host');
$('home-button').onclick=()=>{shutdown();role=null;show('lobby');};
function shutdown(){networkGeneration++;clearTimeout(connectionTimer);connectionTimer=null;joinAttempt.stop();abortRequests();netSession=null;online=false;pending=false;clearScenes();try{wake?.release();}catch{}}
function publish(){}
function resetJoinFeedback(){$('join-feedback').hidden=true;$('join-feedback').classList.remove('error');$('join-submit').disabled=false;$('room-input').disabled=false;}
function drawJoinProgress({stage,remaining}){
 const stages=['server','host','sync'];$('join-feedback').hidden=false;$('join-feedback').classList.remove('error');$('join-spinner').hidden=false;$('join-result-icon').hidden=true;$('join-countdown').hidden=false;$('join-countdown').textContent=`${remaining} с`;$('join-retry').hidden=true;$('join-cancel').hidden=false;$('join-help').hidden=true;$('join-stages').hidden=false;
 $('join-status').textContent={server:'«Сейчас, сейчас…» Подключаемся',host:'«Где тут ваша компания?» Ищем партию',sync:'«Посмотрим, кому что достанется…»'}[stage];
 for(const li of $('join-stages').children){const index=stages.indexOf(li.dataset.stage),current=stages.indexOf(stage);li.classList.toggle('active',index===current);li.classList.toggle('done',index<current);}
 $('join-submit').disabled=true;$('room-input').disabled=true;
}
const joinAttempt=createConnectionAttempt({onTick:drawJoinProgress,onTimeout:()=>failJoin('timeout')});
function failJoin(reason){
 networkGeneration++;joinAttempt.stop();clearTimeout(connectionTimer);abortRequests();online=false;pending=false;proposal=null;status('Не удалось подключиться',false);
 if(role==='host'){$('create-room').disabled=false;notify('Сервер не ответил','Попробуйте создать партию ещё раз.');return;}
 show('connect');$('room-input').value=room;$('join-feedback').hidden=false;$('join-feedback').classList.add('error');$('join-spinner').hidden=true;$('join-result-icon').hidden=false;$('join-countdown').hidden=true;$('join-retry').hidden=false;$('join-cancel').hidden=true;$('join-submit').disabled=false;$('room-input').disabled=false;
 $('join-status').textContent=reason==='timeout'?'Не удалось подключиться за 30 секунд':reason==='room_not_found'?'Партия с таким кодом не найдена':'Соединение прервалось';
 $('join-help').hidden=false;$('join-help').textContent=reason==='room_not_found'?'Проверьте код у ведущего. Если партия закончилась, создайте новую. «Я-то тут. А вашу компанию не видать».':'Проверьте, что сайт открывается на устройстве, и нажмите «Попробовать ещё раз». «Я подожду. Как будто у меня есть ноги, чтобы уйти». ';
}
function ingest(data,force=false){
 const previous=role==='guides'?guideState:state,changed=JSON.stringify(previous)!==JSON.stringify(data.state);
 if(role==='guides')guideState=data.state;else state=data.state;
 if(host)$('clients-count').textContent=`Искры ${data.players.movers?'✓':'—'} · Тени ${data.players.guides?'✓':'—'}`;
 if(changed||force){if(!drag)render();save();queueScenes(data.state);}
}
function startPolling(){clearTimeout(connectionTimer);const generation=networkGeneration;
 const poll=async()=>{if(generation!==networkGeneration||!netSession)return;try{const data=await api('/rooms/'+room,{session:netSession});if(generation!==networkGeneration)return;const wasOffline=!online;online=true;joinAttempt.stop();status(host?'Партия открыта · HTTPS':'Партия на связи · HTTPS',true);if(wasOffline){show('game');resetJoinFeedback();}ingest(data,wasOffline);}
 catch(error){if(generation!==networkGeneration)return;online=false;pending=false;proposal=null;status('Восстанавливаем связь…',false,true);if(error.message==='room_not_found'){failJoin(error.message);return;}if(!joinAttempt.active){joinAttempt.start();joinAttempt.setStage('sync');}if(!drag)render();}
 if(generation===networkGeneration)connectionTimer=setTimeout(poll,1200);};connectionTimer=setTimeout(poll,1200);
}
async function createRoom(){
 shutdown();host=true;local=true;online=true;$('create-room').disabled=true;status('Создаём партию…',false,true);const generation=networkGeneration;
 try{const data=await api('/rooms',{method:'POST',body:{}});if(generation!==networkGeneration)return;room=data.code;netSession={role:'host',token:data.token};local=false;online=true;$('room-code').textContent=room;$('room-box').hidden=false;$('create-room').hidden=true;status('Партия открыта · HTTPS',true);ingest(data,true);startPolling();try{wake=await navigator.wakeLock?.request('screen');}catch{}}
 catch{if(generation===networkGeneration){online=true;local=true;$('create-room').disabled=false;status('Локальная проверка',true);notify('Не удалось создать партию','Сервер не ответил. Попробуйте ещё раз.');}}
}
$('create-room').onclick=createRoom;
$('copy-code').onclick=async()=>{try{await navigator.clipboard.writeText(room);$('copy-code').textContent='Скопировано';setTimeout(()=>$('copy-code').textContent='Копировать',1600);}catch{notify('Код партии',room);}};
$('join-form').onsubmit=e=>{e.preventDefault();joinRoom();};
async function joinRoom(){
 const code=$('room-input').value.toUpperCase().replace(/[^A-Z2-9]/g,'');if(code.length!==8){room=code;failJoin('invalid_code');$('join-status').textContent='Нужен код из восьми знаков.';return;}
 shutdown();room=code;const generation=networkGeneration;joinAttempt.start();
 try{await api('/health',{timeoutMs:30000});if(generation!==networkGeneration)return;joinAttempt.setStage('host');const data=await api('/rooms/'+room+'/join',{method:'POST',body:{clientId:participantId()},timeoutMs:30000});if(generation!==networkGeneration)return;if(!teamNames[data.role])throw Error('invalid_role');role=data.role;joinAttempt.setStage('sync');netSession={role,token:data.token};online=true;pending=false;joinAttempt.stop();resetJoinFeedback();show('game');$('host-controls').hidden=true;$('view-title').textContent=teamNames[role];$('view-subtitle').textContent='ПРИВРАТНИК СДЕЛАЛ СВОЙ ВЫБОР';status('Партия на связи',true);if(!(role==='guides'?data.state.arrived.every(Boolean):engine.won(data.state.pos)))showTeamIntro();ingest(data,true);startPolling();}
 catch(error){console.warn('Game connection failed:',error.name,error.message);if(generation===networkGeneration)failJoin(error.name==='AbortError'?'timeout':error.message);}
}
$('join-retry').onclick=joinRoom;$('join-cancel').onclick=()=>{shutdown();resetJoinFeedback();};
async function submitServerMove(i,to){
 if(pending||!netSession||!online)return;pending=true;render();const generation=networkGeneration;
 try{const data=await api('/rooms/'+room+'/move',{method:'POST',session:netSession,body:{token:i,to,revision:state.revision}});if(generation!==networkGeneration)return;pending=false;proposal=null;ingest(data,true);if(!data.accepted)rejected(data);}
 catch{if(generation!==networkGeneration)return;pending=false;proposal=null;online=false;render();status('Проверяем состояние хода…',false,true);notify('Ответ пока не получен','Дождитесь восстановления связи: повторно ход не отправляется.');}
}
function rejected(result){const text={occupied:['«Тут уже занято»','«Поверх соседа не надо. И чужое гнездо оставьте в покое».'],blocked:['«Ой. Камень встал»','«А вы думали, я только разговаривать умею?»'],invalid:['«Полегче, я старенький»','«По одному желобу. Через всю дверь — это уже метание».'],stale:['«Вы чуть-чуть опоздали»','Поле обновилось. Выберите ход ещё раз.']}[result.type]||['«Ещё разок»','Дождитесь обновления поля и повторите.'];notify(...text,result.type==='blocked'?'⊣':'↔');}
function applyMove(i,to){
 if(!local&&netSession){submitServerMove(i,to);return;}
 const result=engine.move(state,i,to);proposal=null;pending=false;
 if(!result.accepted){render();rejected(result);return result;}
 state=result.state;save();render();publish();queueScenes(state);return result;
}
$('confirm-move').onclick=()=>{if(!proposal||pending||!online)return;const move=proposal;if(host)applyMove(move.token,move.to);else submitServerMove(move.token,move.to);};
$('cancel-move').onclick=()=>{proposal=null;render();};
$('restart').onclick=async()=>{if(!confirm('Вернуть все фигурки на старт?'))return;if(!local&&netSession){try{const data=await api('/rooms/'+room+'/reset',{method:'POST',body:{},session:netSession});proposal=null;ingest(data,true);}catch{notify('Нет ответа сервера','Сброс пока не подтверждён.');}return;}state={...engine.initial(),revision:state.revision+1};proposal=null;save();render();};
$('reveal').onchange=e=>{reveal=e.target.checked;render();};$('overlay-close').onclick=()=>{$('overlay').hidden=true;activeScene=null;nextScene();};
$('solution-step').onclick=async()=>{const {validation}=await fetch('solution.json').then(r=>r.json());let p=[...level.start],index=0;for(;index<validation.path.length;index++){if(p.every((n,i)=>n===state.pos[i]))break;const step=validation.path[index];p=engine.move({...engine.initial(),pos:p},step.token,step.to).state.pos;}if(index===validation.path.length){notify('Начните с исходного положения','Этот пошаговый маршрут проверен от старта.');return;}const step=validation.path[index];applyMove(step.token,step.to);};
function svgEl(parent,tag,attrs={},text){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;parent.appendChild(n);return n;}
function panel(guide){
 const section=document.createElement('section');section.className='board-panel';section.innerHTML=`<div class="board-top"><h2>${guide?'Тени':'Искры'}</h2><span>${guide?'«СМОТРИТЕ ВНИМАТЕЛЬНЕЕ»':'«РУКИ ТАК И ЧЕШУТСЯ?»'}</span></div><div class="stone-board"><svg role="img" aria-label="${guide?'Карта Теней':'Каменное поле Искр'}" data-board="${guide?'guides':'movers'}"></svg></div>`;
 $('boards').appendChild(section);draw(section.querySelector('svg'),guide);
}
function draw(svg,guide){
 const size=Math.max(290,svg.getBoundingClientRect().width||500),pad=size<400?30:40,step=(size-pad*2)/4;svg.setAttribute('viewBox',`0 0 ${size} ${size}`);
 const xy=id=>{const n=level.nodes[id];return [pad+n.c*step,pad+n.r*step];};svg._xy=xy;svg._size=size;
 svgEl(svg,'title',{},guide?'Карта Теней: опасные участки и три гнезда':'Поле Искр: подвижные жетоны, гнёзда и выдвинутые перегородки');
 for(const[a,b]of level.edges){const[x1,y1]=xy(a),[x2,y2]=xy(b);svgEl(svg,'line',{x1,y1,x2,y2,class:'channel-bottom'});svgEl(svg,'line',{x1,y1,x2,y2,class:'channel'});
  if((guide||reveal&&host)&&level.danger.includes(edgeKey(a,b))){const x=(x1+x2)/2,y=(y1+y2)/2,index=level.danger.indexOf(edgeKey(a,b)),theme=trapThemes[index],g=svgEl(svg,'g',{class:'hazard','data-trap':index,role:'img','aria-label':theme.name});svgEl(g,'ellipse',{cx:x,cy:y+3,rx:17,ry:7,fill:theme.color,'fill-opacity':.13,class:'flame-glow'});const foreign=svgEl(g,'foreignObject',{x:x-22,y:y-37,width:44,height:48,'pointer-events':'none'});const flame=document.createElement('div');flame.className='flame-sprite';flame.style.setProperty('--hue',theme.hue+'deg');flame.style.setProperty('--delay',-index*.12+'s');foreign.appendChild(flame);}
 }
 const active=engine.gates(state.pos);
 if(!guide){for(const gate of (reveal&&host?level.gates:active)){const[a,b]=gate.edge,[x1,y1]=xy(a),[x2,y2]=xy(b),x=(x1+x2)/2,y=(y1+y2)/2,dx=y1===y2?0:10,dy=y1===y2?10:0;
   svgEl(svg,'line',{x1:x-dx,y1:y-dy,x2:x+dx,y2:y+dy,class:'gate','stroke-dasharray':active.includes(gate)?'none':'2 6'});if(reveal&&host){const[tx,ty]=xy(gate.at);svgEl(svg,'circle',{cx:tx,cy:ty,r:18,fill:'none',stroke:'var(--copper)','stroke-dasharray':'2 4'});}
 }}
 for(const id in level.nodes){const[x,y]=xy(id);svgEl(svg,'circle',{cx:x,cy:y,r:4.5,class:'node','data-node':id});}
 level.exits.forEach((id,i)=>{const[x,y]=xy(id),f=figures[i],g=svgEl(svg,'g',{class:'socket','data-exit':i,'aria-label':`Неподвижное гнездо: ${f.name}`});
  const d=`M${x-17},${y-24}H${x+17}L${x+24},${y-17}V${y+17}L${x+17},${y+24}H${x-17}L${x-24},${y+17}V${y-17}Z`;
  svgEl(g,'path',{d,fill:'#0c1418',stroke:'#101619','stroke-width':4});svgEl(g,'path',{d,fill:'none',stroke:f.color,'stroke-opacity':.45,'stroke-width':1.5});svgEl(g,'path',{d:`M${x-17},${y+24}H${x+17}L${x+24},${y+17}`,fill:'none',stroke:'#738087','stroke-opacity':.6,'stroke-width':2});svgEl(g,'text',{x,y:y+6,'text-anchor':'middle',fill:f.color,'fill-opacity':.65,'font-size':21},f.symbol);
  if(!guide)g.addEventListener('pointerdown',()=>notify('«Это гнездо. Вырезано в камне»','«Хотите двигать — беритесь за круглый жетон, он сверху лежит».','◇'));
 });
 if(!guide){
  state.pos.forEach((id,i)=>{const[x,y]=xy(id),f=figures[i],done=engine.done(state.pos,i),g=svgEl(svg,'g',{class:done?'token settled':'token movable','data-token':i,role:done?'img':'button',tabindex:done?-1:0,'aria-label':`${f.name}${done?' в своём гнезде':' — подвижный жетон'}`});
    g.style.setProperty('--token-color',f.color);g.style.setProperty('--float-delay',-i*.83+'s');svgEl(g,'circle',{cx:x,cy:y,r:30,fill:'transparent'});svgEl(g,'ellipse',{cx:x,cy:y+9,rx:22,ry:13,fill:'#0009',class:'token-shadow'});const floating=svgEl(g,'g',{class:'token-float'});svgEl(floating,'circle',{cx:x,cy:y+3,r:19,fill:'#12191b',stroke:f.color,'stroke-width':1,'stroke-opacity':.4});svgEl(floating,'circle',{cx:x,cy:y-1,r:19,fill:'#344044',stroke:f.color,'stroke-width':2.5,class:'token-rim'});svgEl(floating,'circle',{cx:x,cy:y-1,r:15,fill:'#202c31',stroke:f.color,'stroke-width':.8,'stroke-opacity':.4});svgEl(floating,'path',{d:`M${x-13},${y-12}Q${x-2},${y-22} ${x+10},${y-15}`,fill:'none',stroke:'#f5eee0','stroke-opacity':.5,'stroke-width':1.5});svgEl(floating,'text',{x,y:y+6,'text-anchor':'middle',fill:f.color,'font-size':25},done?'✓':f.symbol);if(!done)svgEl(g,'ellipse',{cx:x,cy:y+5,rx:13,ry:4,fill:'none',stroke:f.color,'stroke-width':.7,'stroke-opacity':.35,class:'levitation-ring'});
    if(!done&&(host||role==='movers')){
     g.addEventListener('pointerdown',e=>beginDrag(e,svg,i,g));g.addEventListener('click',()=>{selected=i;});
     g.addEventListener('keydown',e=>{const dir={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];if(!dir||!online||pending||$('overlay').hidden===false)return;e.preventDefault();const n=level.nodes[id],to=engine.adj[id].find(k=>level.nodes[k].c===n.c+dir[0]&&level.nodes[k].r===n.r+dir[1]);if(to){proposal={token:i,to};render();}});
    }
  });
  if(proposal){const[x,y]=xy(proposal.to);svgEl(svg,'circle',{cx:x,cy:y,r:24,fill:'none',stroke:figures[proposal.token].color,'stroke-width':2,'stroke-dasharray':'5 5'});}
 }
}
function point(event,svg){const r=svg.getBoundingClientRect();return [(event.clientX-r.left)*svg._size/r.width,(event.clientY-r.top)*svg._size/r.height];}
function beginDrag(e,svg,i,g){
 if(!online||pending||engine.done(state.pos,i)||!$('overlay').hidden)return;e.preventDefault();selected=i;proposal=null;const from=state.pos[i],origin=svg._xy(from);drag={pointer:e.pointerId,svg,g,i,from,origin};g.classList.add('dragging');
 for(const to of engine.adj[from]){const[x,y]=svg._xy(to);svgEl(svg,'circle',{cx:x,cy:y,r:23,class:'reachable','data-reachable':to});}svg.appendChild(g);g.setPointerCapture(e.pointerId);
 const moving=ev=>{if(!drag||ev.pointerId!==drag.pointer)return;const[x,y]=point(ev,svg);g.setAttribute('transform',`translate(${x-origin[0]},${y-origin[1]})`);};
 const end=ev=>{if(!drag||ev.pointerId!==drag.pointer)return;const[x,y]=point(ev,svg);let closest=null,distance=Infinity;for(const n of engine.adj[from]){const[nx,ny]=svg._xy(n),d=Math.hypot(x-nx,y-ny);if(d<distance){closest=n;distance=d;}}const cancelled=ev.type==='pointercancel';drag=null;g.removeEventListener('pointermove',moving);g.removeEventListener('pointerup',end);g.removeEventListener('pointercancel',end);if(!cancelled&&distance<Math.max(27,svg._size*.075))proposal={token:i,to:closest};render();if(!cancelled&&!proposal)rejected({type:'invalid'});};
 g.addEventListener('pointermove',moving);g.addEventListener('pointerup',end);g.addEventListener('pointercancel',end);
}
function render(){
 if(!role)return;const guide=role==='guides',current=guide?guideState:state,arrived=guide?guideState.arrived:state.pos.map((_,i)=>engine.done(state.pos,i));
 $('boards').replaceChildren();$('boards').classList.toggle('dual',host);if(!guide)panel(false);if(guide||host)panel(true);
 $('progress-line').replaceChildren();figures.forEach((f,i)=>{const d=document.createElement('div');d.className='progress-chip'+(arrived[i]?' arrived':'');d.style.setProperty('--color',f.color);d.innerHTML=`<span style="color:${f.color}">${f.symbol}</span>${f.name}${arrived[i]?' · на выходе':''}`;$('progress-line').appendChild(d);});
 $('action-strip').hidden=guide;$('proposal').hidden=!proposal;$('instruction').hidden=!!proposal;$('instruction').textContent=!online?'«Постойте-ка. Голоса не слышно» — восстанавливаем связь':pending?'«Сейчас, сейчас. Дайте камню подумать»':arrived.every(Boolean)?'За дверью слышен скрежет засова':'«Круглый жетон берите. Да, этот. Теперь по желобу»';
 if(proposal){const from=level.nodes[state.pos[proposal.token]],to=level.nodes[proposal.to],direction=to.c>from.c?'вправо →':to.c<from.c?'влево ←':to.r>from.r?'вниз ↓':'вверх ↑';$('proposal-text').textContent=`${figures[proposal.token].symbol} ${figures[proposal.token].name} — ${direction}`;}
 $('confirm-move').disabled=pending||!online;$('cancel-move').disabled=pending;
 $('counters').innerHTML=`ХОД ${current.moves}<br>ПОПЫТКА ${current.attempt}`;
 const ev=current.event||{type:'start'};
 const messages={start:['Привратник довольно щурится','«Ну что, удивите старую дверь. Только соседям не подсказывайте словами».','⌁'],move:['«Вот. Умеете же»','«А сначала смотрели на меня так, будто это я здесь заперт».','↔'],gate:['Привратник ехидно хихикает',guide?'«Ой. Что-то там у соседей случилось».':'«А её тут не было? Как неловко получилось».','⊣'],arrived:['«Один пристроился»','«Остальных тоже не бросайте. Я за ними присматривать не нанимался».','✓'],failure:['«А вот сюда — не надо»','«Ничего. В первый раз все очень уверенные». Жетоны возвращены к началу.','↺'],victory:['Вы слышите тяжёлый щелчок','Дверь медленно отворяется. «Проходите. И не делайте вид, что так и задумывали».','⌘']};
 if(ev.type==='move')messages.move=[['«Вот. Умеете же»','«Продолжайте, я смотрю».','↔'],['«Дальше, дальше»','«Мне отсюда особенно хорошо видно».','↔'],['Привратник одобрительно хмыкает','«Пока ничего не сломали. Уже приятно».','↔']][current.moves%3];
 notify(...(messages[ev.type]||messages.move),ev.type==='failure');
 $('solution-step').disabled=!host||engine.won(state.pos);
}
window.addEventListener('resize',()=>{if(!drag&&role&&$('game').hidden===false)render();});
document.addEventListener('visibilitychange',async()=>{if(document.visibilityState==='visible'&&host&&!local)try{wake=await navigator.wakeLock?.request('screen');}catch{}});
const initialRole=new URLSearchParams(location.search).get('role');if(initialRole==='host')selectRole('host');else if(initialRole)selectRole('join');
startAmbience($('ambient-particles'));
