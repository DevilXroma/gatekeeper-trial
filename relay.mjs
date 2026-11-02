export const API_ORIGIN='https://gatekeeper-game-relay.devilxrom.chatgpt.site';
const requests=new Set();
export function abortRequests(){for(const c of requests)c.abort();requests.clear();}
export async function api(path,{method='GET',body,session,timeoutMs=8000}={}){
 const controller=new AbortController();requests.add(controller);const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{const response=await fetch(API_ORIGIN+path,{method,signal:controller.signal,cache:'no-store',headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(session?{Authorization:'Bearer '+session.token,'X-Game-Role':session.role}:{})},body:body===undefined?undefined:JSON.stringify(body)});let data;try{data=await response.json();}catch{throw new Error('server_unavailable');}if(!response.ok)throw new Error(data.error||'server_unavailable');return data;}
 finally{clearTimeout(timer);requests.delete(controller);}
}
