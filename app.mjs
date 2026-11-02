import {level} from './level.mjs';
import {createEngine,figures,edgeKey} from './engine.mjs';
import {createConnectionAttempt} from './connection-attempt.mjs';
import {api,abortRequests} from './relay.mjs';
const engine=createEngine(level),$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
let role=null,state=engine.initial(),guideState={moves:0,attempt:1,arrived:[false,false,false],event:{type:'start'}},proposal=null,selected=0,reveal=false,host=false,local=false,room='',online=false,pending=false,connectionTimer=null,wake=null,netSession=null,networkGeneration=0,drag=null;
const storageKey='gatekeeper-v2-state';
function restore(){try{const v=JSON.parse(localStorage.getItem(storageKey));if(v?.version===2&&v.pos?.length===3&&v.pos.every(n=>level.nodes[n])&&new Set(v.pos).size===3)return v;}catch{}return engine.initial();}
function save(){if(role==='host')try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{}}
function show(section){for(const id of ['lobby','connect','game'])$(id).hidden=id!==section;$('home-button').hidden=section==='lobby';}
function notify(title,detail,icon='⌁',failure=false){$('event-title').textContent=title;$('event-detail').textContent=detail;$('event-icon').textContent=icon;$('event-strip').classList.toggle('failure',failure);}
function status(text,ok,connecting=false){$('connection-pill').querySelector('span').textContent=text;$('connection-pill').classList.toggle('offline',!ok);$('connection-pill').classList.toggle('connecting',connecting);}
function toastOverlay(type){const victory=type==='victory';$('overlay-symbol').textContent=victory?'☀ ☾ ϟ':'↺';$('overlay-title').textContent=victory?'Дверь поддаётся':'Привратник хихикает';$('overlay-text').textContent=victory?'Все три знака вернулись к своим выходам. Общая работа сделана.':'«А вот сюда — не надо». Фигурки вернулись на старт. Расположение поля не изменилось.';$('overlay').hidden=false;if(!victory){document.body.classList.add('shake');setTimeout(()=>document.body.classList.remove('shake'),450);}if(navigator.vibrate)navigator.vibrate(victory?[30,60,30]:60);}
function selectRole(next){
 role=next;proposal=null;pending=false;$('overlay').hidden=true;
 if(next==='host'){host=true;local=true;online=true;state=restore();show('game');$('host-controls').hidden=false;$('view-title').textContent='Стол ведущего';$('view-subtitle').textContent='ОБЕ КОМАНДЫ · ОБЩЕЕ СОСТОЯНИЕ';status('Локальная проверка',true);render();}
 else {host=false;local=false;online=false;$('join-role').textContent=next==='movers'?'КОМАНДА I · ИСПОЛНИТЕЛИ':'КОМАНДА II · ПРОВОДНИКИ';resetJoinFeedback();show('connect');const params=new URLSearchParams(location.search);$('room-input').value=params.get('room')||'';}
}
document.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>selectRole(b.dataset.role));$('developer-button').onclick=()=>selectRole('host');
$('home-button').onclick=()=>{shutdown();role=null;show('lobby');};
function shutdown(){networkGeneration++;clearTimeout(connectionTimer);connectionTimer=null;joinAttempt.stop();abortRequests();netSession=null;online=false;pending=false;try{wake?.release();}catch{}}
function publish(){}
function resetJoinFeedback(){$('join-feedback').hidden=true;$('join-feedback').classList.remove('error');$('join-submit').disabled=false;$('room-input').disabled=false;}
function drawJoinProgress({stage,remaining}){
 const stages=['server','host','sync'];$('join-feedback').hidden=false;$('join-feedback').classList.remove('error');$('join-spinner').hidden=false;$('join-result-icon').hidden=true;$('join-countdown').hidden=false;$('join-countdown').textContent=`${remaining} с`;$('join-retry').hidden=true;$('join-cancel').hidden=false;$('join-help').hidden=true;$('join-stages').hidden=false;
 $('join-status').textContent={server:'Подключаемся к серверу…',host:'Ищем партию ведущего…',sync:'Загружаем игровое поле…'}[stage];
 for(const li of $('join-stages').children){const index=stages.indexOf(li.dataset.stage),current=stages.indexOf(stage);li.classList.toggle('active',index===current);li.classList.toggle('done',index<current);}
 $('join-submit').disabled=true;$('room-input').disabled=true;
}
const joinAttempt=createConnectionAttempt({onTick:drawJoinProgress,onTimeout:()=>failJoin('timeout')});
function failJoin(reason){
 networkGeneration++;joinAttempt.stop();clearTimeout(connectionTimer);abortRequests();online=false;pending=false;proposal=null;status('Не удалось подключиться',false);
 if(role==='host'){$('create-room').disabled=false;notify('Сервер не ответил','Попробуйте создать партию ещё раз.');return;}
 show('connect');$('room-input').value=room;$('join-feedback').hidden=false;$('join-feedback').classList.add('error');$('join-spinner').hidden=true;$('join-result-icon').hidden=false;$('join-countdown').hidden=true;$('join-retry').hidden=false;$('join-cancel').hidden=true;$('join-submit').disabled=false;$('room-input').disabled=false;
 $('join-status').textContent=reason==='timeout'?'Не удалось подключиться за 30 секунд':reason==='room_not_found'?'Партия с таким кодом не найдена':'Соединение прервалось';
 $('join-help').hidden=false;$('join-help').textContent=reason==='room_not_found'?'Обновите страницу ведущего и создайте новую партию: код от старой версии не подходит. Затем введите новый код.':'Проверьте, что сайт открывается на устройстве, и нажмите «Попробовать ещё раз». Переключать Wi-Fi и мобильную сеть не требуется.';
}
function ingest(data,force=false){
 const previous=role==='guides'?guideState:state,changed=JSON.stringify(previous)!==JSON.stringify(data.state),oldAttempt=previous.attempt,oldWon=role==='guides'?guideState.arrived.every(Boolean):engine.won(state.pos);
 if(role==='guides')guideState=data.state;else state=data.state;
 if(host)$('clients-count').textContent=`Входы команд: ${data.players.movers?'исполнители ✓':'исполнители —'} · ${data.players.guides?'проводники ✓':'проводники —'}`;
 if(changed||force){if(!drag)render();save();if(data.state.attempt>oldAttempt)toastOverlay('failure');else if(!oldWon&&(role==='guides'?guideState.arrived.every(Boolean):engine.won(state.pos)))toastOverlay('victory');}
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
 try{await api('/health',{timeoutMs:30000});if(generation!==networkGeneration)return;joinAttempt.setStage('host');const data=await api('/rooms/'+room+'/join',{method:'POST',body:{role},timeoutMs:30000});if(generation!==networkGeneration)return;joinAttempt.setStage('sync');netSession={role,token:data.token};online=true;pending=false;joinAttempt.stop();resetJoinFeedback();show('game');$('host-controls').hidden=true;$('view-title').textContent=role==='movers'?'Ваши руки':'Ваши глаза';$('view-subtitle').textContent=role==='movers'?'КОМАНДА I · ИСПОЛНИТЕЛИ':'КОМАНДА II · ПРОВОДНИКИ';status('Партия на связи · HTTPS',true);ingest(data,true);startPolling();}
 catch(error){console.warn('Game connection failed:',error.name,error.message);if(generation===networkGeneration)failJoin(error.name==='AbortError'?'timeout':error.message);}
}
$('join-retry').onclick=joinRoom;$('join-cancel').onclick=()=>{shutdown();resetJoinFeedback();};
async function submitServerMove(i,to){
 if(pending||!netSession||!online)return;pending=true;render();const generation=networkGeneration;
 try{const data=await api('/rooms/'+room+'/move',{method:'POST',session:netSession,body:{token:i,to,revision:state.revision}});if(generation!==networkGeneration)return;pending=false;proposal=null;ingest(data,true);if(!data.accepted)rejected(data);}
 catch{if(generation!==networkGeneration)return;pending=false;proposal=null;online=false;render();status('Проверяем состояние хода…',false,true);notify('Ответ пока не получен','Дождитесь восстановления связи: повторно ход не отправляется.');}
}
function rejected(result){const text={occupied:['Точка занята','Нужен свободный узел или собственный выход.'],blocked:['Перегородка поднята','Обсудите обход или отведите фигурку назад.'],invalid:['Один ход — один желоб','Перетащите знак только в соседний узел.'],stale:['Поле уже изменилось','Получено актуальное состояние. Выберите ход ещё раз.']}[result.type]||['Ход не принят','Повторите после обновления поля.'];notify(...text,result.type==='blocked'?'⊣':'↔');}
function applyMove(i,to){
 if(!local&&netSession){submitServerMove(i,to);return;}
 const result=engine.move(state,i,to);proposal=null;pending=false;
 if(!result.accepted){render();rejected(result);return result;}
 state=result.state;save();render();publish();if(['failure','victory'].includes(state.event.type))toastOverlay(state.event.type);return result;
}
$('confirm-move').onclick=()=>{if(!proposal||pending||!online)return;const move=proposal;if(host)applyMove(move.token,move.to);else submitServerMove(move.token,move.to);};
$('cancel-move').onclick=()=>{proposal=null;render();};
$('restart').onclick=async()=>{if(!confirm('Вернуть все фигурки на старт?'))return;if(!local&&netSession){try{const data=await api('/rooms/'+room+'/reset',{method:'POST',body:{},session:netSession});proposal=null;ingest(data,true);}catch{notify('Нет ответа сервера','Сброс пока не подтверждён.');}return;}state={...engine.initial(),revision:state.revision+1};proposal=null;save();render();};
$('reveal').onchange=e=>{reveal=e.target.checked;render();};$('overlay-close').onclick=()=>$('overlay').hidden=true;
$('solution-step').onclick=async()=>{const {validation}=await fetch('solution.json').then(r=>r.json());let p=[...level.start],index=0;for(;index<validation.path.length;index++){if(p.every((n,i)=>n===state.pos[i]))break;const step=validation.path[index];p=engine.move({...engine.initial(),pos:p},step.token,step.to).state.pos;}if(index===validation.path.length){notify('Начните с исходного положения','Этот пошаговый маршрут проверен от старта.');return;}const step=validation.path[index];applyMove(step.token,step.to);};
function svgEl(parent,tag,attrs={},text){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;parent.appendChild(n);return n;}
function panel(guide){
 const section=document.createElement('section');section.className='board-panel';section.innerHTML=`<div class="board-top"><h2>${guide?'Карта проводников':'Поле исполнителей'}</h2><span>${guide?'ОПАСНОСТИ ВИДНЫ':'ОПАСНОСТИ СКРЫТЫ'}</span></div><div class="stone-board"><svg role="img" aria-label="${guide?'Карта опасностей':'Поле с фигурками'}" data-board="${guide?'guides':'movers'}"></svg></div><div class="legend">${guide?'<span class="danger-label">⊗ Опасный участок</span><span>Фигурки и перегородки скрыты</span>':'<span><b>━</b>Выдвинутая перегородка</span><span>Точка → соседняя точка</span>'}</div>`;
 $('boards').appendChild(section);draw(section.querySelector('svg'),guide);
}
function draw(svg,guide){
 const size=Math.max(290,svg.getBoundingClientRect().width||500),pad=size<400?30:40,step=(size-pad*2)/4;svg.setAttribute('viewBox',`0 0 ${size} ${size}`);
 const xy=id=>{const n=level.nodes[id];return [pad+n.c*step,pad+n.r*step];};svg._xy=xy;svg._size=size;
 svgEl(svg,'title',{},guide?'Карта проводников: опасные участки и три цветных выхода':'Поле исполнителей: фигурки, три цветных выхода и активные перегородки');
 for(let k=0;k<5;k++){svgEl(svg,'text',{x:pad+k*step,y:17,'text-anchor':'middle',class:'coordinate'},'ABCDE'[k]);svgEl(svg,'text',{x:11,y:pad+k*step+4,'text-anchor':'middle',class:'coordinate'},k+1);}
 for(const[a,b]of level.edges){const[x1,y1]=xy(a),[x2,y2]=xy(b);svgEl(svg,'line',{x1,y1,x2,y2,class:'channel-bottom'});svgEl(svg,'line',{x1,y1,x2,y2,class:'channel'});
  if((guide||reveal&&host)&&level.danger.includes(edgeKey(a,b))){const x=(x1+x2)/2,y=(y1+y2)/2;svgEl(svg,'circle',{cx:x,cy:y,r:10,class:'danger-well'});svgEl(svg,'path',{d:`M${x-4},${y-4}l8,8m0,-8l-8,8`,class:'hazard'});}
 }
 const active=engine.gates(state.pos);
 if(!guide){for(const gate of (reveal&&host?level.gates:active)){const[a,b]=gate.edge,[x1,y1]=xy(a),[x2,y2]=xy(b),x=(x1+x2)/2,y=(y1+y2)/2,dx=y1===y2?0:10,dy=y1===y2?10:0;
   svgEl(svg,'line',{x1:x-dx,y1:y-dy,x2:x+dx,y2:y+dy,class:'gate','stroke-dasharray':active.includes(gate)?'none':'2 6'});if(reveal&&host){const[tx,ty]=xy(gate.at);svgEl(svg,'circle',{cx:tx,cy:ty,r:18,fill:'none',stroke:'var(--copper)','stroke-dasharray':'2 4'});}
 }}
 for(const id in level.nodes){const[x,y]=xy(id);svgEl(svg,'circle',{cx:x,cy:y,r:4.5,class:'node','data-node':id});}
 level.exits.forEach((id,i)=>{const[x,y]=xy(id),f=figures[i],g=svgEl(svg,'g',{'data-exit':i,'aria-label':`Выход: ${f.name}`});svgEl(g,'rect',{x:x-20,y:y-20,width:40,height:40,rx:8,fill:'#182024',stroke:f.color,'stroke-width':2});svgEl(g,'text',{x,y:y+7,'text-anchor':'middle',fill:f.color,'font-size':25},f.symbol);});
 if(!guide){
  state.pos.forEach((id,i)=>{const[x,y]=xy(id),f=figures[i],done=engine.done(state.pos,i),g=svgEl(svg,'g',{class:'token','data-token':i,role:'button',tabindex:done?-1:0,'aria-label':`${f.name}, ${id}${done?', на выходе':''}`});
    svgEl(g,'circle',{cx:x,cy:y+2,r:19,fill:'#0005'});svgEl(g,'circle',{cx:x,cy:y,r:18,fill:'#1b252b',stroke:f.color,'stroke-width':2.5});svgEl(g,'circle',{cx:x,cy:y,r:14,fill:f.color,'fill-opacity':.12});svgEl(g,'text',{x,y:y+7,'text-anchor':'middle',fill:f.color,'font-size':25},done?'✓':f.symbol);
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
 $('action-strip').hidden=guide;$('proposal').hidden=!proposal;$('instruction').hidden=!!proposal;$('instruction').textContent=!online?'Ждём соединения с ведущим':pending?'Передаём общий ход…':arrived.every(Boolean)?'Все знаки достигли своих выходов':'Перетащите знак в соседнюю точку';
 if(proposal)$('proposal-text').textContent=`${figures[proposal.token].symbol} ${figures[proposal.token].name}: ${state.pos[proposal.token]} → ${proposal.to}`;
 $('confirm-move').disabled=pending||!online;$('cancel-move').disabled=pending;
 $('counters').innerHTML=`ХОД ${current.moves}<br>ПОПЫТКА ${current.attempt}`;
 const ev=current.event||{type:'start'},f=figures[ev.token];
 const messages={start:['Обсудите первый ход','У каждой команды только половина картины.','⌁'],move:['Ход принят',guide?'Партия продолжается.':`${f?.name}: ${ev.from} → ${ev.to}`,'↔'],gate:['Камень пришёл в движение',guide?'Исполнители видят изменение поля.':'Перед фигуркой поднялась перегородка.','⊣'],arrived:['Один знак нашёл выход','Помогите остальным добраться до своих.','✓'],failure:['Снова у начала','Все фигурки возвращены. Ваши записи остаются.','↺'],victory:['Привратник открывает дверь','Три знака на своих местах.','⌘']};
 notify(...(messages[ev.type]||messages.move),ev.type==='failure');
 $('solution-step').disabled=!host||engine.won(state.pos);
}
window.addEventListener('resize',()=>{if(!drag&&role&&$('game').hidden===false)render();});
document.addEventListener('visibilitychange',async()=>{if(document.visibilityState==='visible'&&host&&!local)try{wake=await navigator.wakeLock?.request('screen');}catch{}});
const initialRole=new URLSearchParams(location.search).get('role');if(['movers','guides','host'].includes(initialRole))selectRole(initialRole);
