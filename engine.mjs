export const edgeKey=(a,b)=>[a,b].sort().join('-');
export const figures=[{name:'Солнце',symbol:'☀',color:'#f0bb45',tone:'sun'},{name:'Луна',symbol:'☾',color:'#8caeff',tone:'moon'},{name:'Молния',symbol:'ϟ',color:'#c895f5',tone:'storm'}];
export function createEngine(level){
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
