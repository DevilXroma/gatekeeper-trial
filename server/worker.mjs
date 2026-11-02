const level = {
  "version": 2,
  "nodes": {
    "A1": {
      "c": 0,
      "r": 0
    },
    "B1": {
      "c": 1,
      "r": 0
    },
    "C1": {
      "c": 2,
      "r": 0
    },
    "D1": {
      "c": 3,
      "r": 0
    },
    "E1": {
      "c": 4,
      "r": 0
    },
    "A2": {
      "c": 0,
      "r": 1
    },
    "B2": {
      "c": 1,
      "r": 1
    },
    "C2": {
      "c": 2,
      "r": 1
    },
    "D2": {
      "c": 3,
      "r": 1
    },
    "E2": {
      "c": 4,
      "r": 1
    },
    "A3": {
      "c": 0,
      "r": 2
    },
    "B3": {
      "c": 1,
      "r": 2
    },
    "C3": {
      "c": 2,
      "r": 2
    },
    "D3": {
      "c": 3,
      "r": 2
    },
    "E3": {
      "c": 4,
      "r": 2
    },
    "A4": {
      "c": 0,
      "r": 3
    },
    "B4": {
      "c": 1,
      "r": 3
    },
    "C4": {
      "c": 2,
      "r": 3
    },
    "D4": {
      "c": 3,
      "r": 3
    },
    "E4": {
      "c": 4,
      "r": 3
    },
    "A5": {
      "c": 0,
      "r": 4
    },
    "B5": {
      "c": 1,
      "r": 4
    },
    "C5": {
      "c": 2,
      "r": 4
    },
    "D5": {
      "c": 3,
      "r": 4
    },
    "E5": {
      "c": 4,
      "r": 4
    }
  },
  "edges": [
    [
      "C1",
      "D1"
    ],
    [
      "C4",
      "D4"
    ],
    [
      "E4",
      "E5"
    ],
    [
      "B1",
      "B2"
    ],
    [
      "E3",
      "E4"
    ],
    [
      "D1",
      "D2"
    ],
    [
      "C3",
      "D3"
    ],
    [
      "B3",
      "B4"
    ],
    [
      "B1",
      "C1"
    ],
    [
      "A3",
      "A4"
    ],
    [
      "C2",
      "C3"
    ],
    [
      "B2",
      "C2"
    ],
    [
      "A2",
      "A3"
    ],
    [
      "A4",
      "B4"
    ],
    [
      "B4",
      "C4"
    ],
    [
      "D3",
      "D4"
    ],
    [
      "A1",
      "A2"
    ],
    [
      "E2",
      "E3"
    ],
    [
      "A5",
      "B5"
    ],
    [
      "D5",
      "E5"
    ],
    [
      "D4",
      "D5"
    ],
    [
      "C4",
      "C5"
    ],
    [
      "A4",
      "A5"
    ],
    [
      "E1",
      "E2"
    ],
    [
      "C2",
      "D2"
    ],
    [
      "B2",
      "B3"
    ],
    [
      "D2",
      "E2"
    ],
    [
      "D2",
      "D3"
    ],
    [
      "A2",
      "B2"
    ],
    [
      "D4",
      "E4"
    ],
    [
      "B3",
      "C3"
    ]
  ],
  "danger": [
    "D2-E2",
    "D2-D3",
    "A2-B2",
    "D4-E4",
    "B3-C3"
  ],
  "gates": [
    {
      "at": "D3",
      "edge": [
        "D3",
        "D4"
      ]
    },
    {
      "at": "C4",
      "edge": [
        "B4",
        "C4"
      ]
    },
    {
      "at": "D1",
      "edge": [
        "D1",
        "D2"
      ]
    }
  ],
  "start": [
    "E2",
    "C3",
    "A5"
  ],
  "exits": [
    "A1",
    "E1",
    "C5"
  ]
};

const edgeKey=(a,b)=>[a,b].sort().join('-');
const figures=[{name:'Солнце',symbol:'☀',color:'#f0bb45',tone:'sun'},{name:'Луна',symbol:'☾',color:'#8caeff',tone:'moon'},{name:'Молния',symbol:'ϟ',color:'#c895f5',tone:'storm'}];
function createEngine(level){
 const hazards=new Set(level.danger),adj=Object.fromEntries(Object.keys(level.nodes).map(n=>[n,[]]));
 for(const[a,b]of level.edges){adj[a].push(b);adj[b].push(a);}
 const gates=p=>level.gates.filter(g=>p.includes(g.at));
 const done=(p,i)=>p[i]===level.exits[i],won=p=>p.every((_,i)=>done(p,i));
 function initial(){return {version:2,pos:[...level.start],moves:0,attempt:1,revision:0,event:{type:'start'},history:[]};}
 function move(state,i,to){
  const p=state.pos,from=p[i];
  if(!Number.isInteger(i)||i<0||i>2||!level.nodes[to]||done(p,i)||!adj[from].includes(to))return {accepted:false,type:'invalid'};
  if(p.includes(to)||level.exits.some((n,j)=>n===to&&j!==i))return {accepted:false,type:'occupied'};
  const edge=edgeKey(from,to);
  if(gates(p).some(g=>edgeKey(...g.edge)===edge))return {accepted:false,type:'blocked',edge:[from,to]};
  const failed=hazards.has(edge),next=failed?[...level.start]:p.map((n,j)=>j===i?to:n);
  const newly=gates(next).filter(g=>!gates(p).includes(g));
  const type=failed?'failure':won(next)?'victory':done(next,i)?'arrived':newly.length?'gate':'move';
  const event={type,token:i,from,to,gates:newly.map(g=>g.edge)};
  return {accepted:true,state:{...state,pos:next,moves:state.moves+1,attempt:state.attempt+Number(failed),revision:state.revision+1,event,history:[...state.history.slice(-11),event]}};
 }
 return {adj,gates,done,won,initial,move};
}

const engine=createEngine(level);
// HTTPS relay. No direct connection between tablets is required.
const ALLOWED='https://devilxroma.github.io';
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const random=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),b=>alphabet[b%32]).join('');
const json=(data,status=200)=>new Response(status===204?null:JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':ALLOWED,'Access-Control-Allow-Headers':'Authorization, Content-Type, X-Game-Role','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Vary':'Origin'}});
function snapshot(room,role){return {code:room.code,role,players:room.players,state:role==='guides'?{moves:room.state.moves,attempt:room.state.attempt,arrived:room.state.pos.map((_,i)=>engine.done(room.state.pos,i)),event:{type:room.state.event.type}}:room.state};}
async function read(bucket,code){const o=await bucket.get('rooms/'+code+'.json');if(!o)return null;const room=await o.json();if(room.expires<Date.now())return null;return {room,etag:o.etag};}
function authenticate(request,room){const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');const role=request.headers.get('X-Game-Role');if(!['host','movers','guides'].includes(role)||!token||token!==room.keys[role])return null;return role;}
async function body(request){if(Number(request.headers.get('content-length'))>4096)throw Error('body');const raw=await request.text();if(raw.length>4096)throw Error('body');return raw?JSON.parse(raw):{};}
export default {async fetch(request,env){
 try{
  const u=new URL(request.url),p=u.pathname.replace(/\/$/,'');
  if(request.method==='OPTIONS')return json({},204);
  if(p==='/health'||p==='')return json({ok:true,transport:'https',version:3});
  if(!env.BUCKET)return json({error:'storage_unavailable'},503);
  if(p==='/rooms'&&request.method==='POST'){
   for(let n=0;n<4;n++){const code=random(8),room={code,keys:{host:random(32),movers:random(32),guides:random(32)},players:{movers:false,guides:false},state:engine.initial(),expires:Date.now()+86400000};
    const saved=await env.BUCKET.put('rooms/'+code+'.json',JSON.stringify(room),{onlyIf:{etagDoesNotMatch:'*'}});if(saved)return json({...snapshot(room,'host'),token:room.keys.host},201);
   }return json({error:'room_creation_failed'},503);
  }
  const match=p.match(/^\/rooms\/([A-Z2-9]{8})(?:\/(join|move|reset))?$/);if(!match)return json({error:'not_found'},404);
  const code=match[1],action=match[2];
  if(request.method==='GET'&&!action){const found=await read(env.BUCKET,code);if(!found)return json({error:'room_not_found'},404);const role=authenticate(request,found.room);return role?json(snapshot(found.room,role)):json({error:'unauthorized'},403);}
  if(request.method!=='POST')return json({error:'method_not_allowed'},405);
  const input=await body(request);
  for(let tries=0;tries<5;tries++){
   const found=await read(env.BUCKET,code);if(!found)return json({error:'room_not_found'},404);const {room,etag}=found;
   if(action==='join'){
    const role=input.role;if(!['movers','guides'].includes(role))return json({error:'invalid_role'},400);
    if(room.players[role])return json({...snapshot(room,role),token:room.keys[role]});
    room.players[role]=true;const result=await env.BUCKET.put('rooms/'+code+'.json',JSON.stringify(room),{onlyIf:{etagMatches:etag}});if(result)return json({...snapshot(room,role),token:room.keys[role]});continue;
   }
   const role=authenticate(request,room);if(!role)return json({error:'unauthorized'},403);
   if(action==='move'){
    if(!['host','movers'].includes(role))return json({error:'forbidden'},403);
    if(input.revision!==room.state.revision)return json({...snapshot(room,role),accepted:false,type:'stale'});
    const result=engine.move(room.state,input.token,input.to);if(!result.accepted)return json({...snapshot(room,role),...result});room.state=result.state;
   }else if(action==='reset'){
    if(role!=='host')return json({error:'forbidden'},403);room.state={...engine.initial(),revision:room.state.revision+1};
   }else return json({error:'not_found'},404);
   const saved=await env.BUCKET.put('rooms/'+code+'.json',JSON.stringify(room),{onlyIf:{etagMatches:etag}});if(saved)return json({...snapshot(room,role),accepted:true});
  }
  return json({error:'busy'},409);
 }catch{return json({error:'invalid_request'},400);}
}};
