export function createConnectionAttempt({onTick,onTimeout,now=Date.now,schedule=setTimeout,cancel=clearTimeout,timeoutMs=30000}){
 let running=false,deadline=0,timer=null,stage='server';
 function stop(){running=false;if(timer!==null)cancel(timer);timer=null;}
 function tick(){if(!running)return;const remaining=Math.max(0,deadline-now());onTick({stage,remaining:Math.ceil(remaining/1000)});if(!running)return;if(remaining===0){stop();onTimeout(stage);return;}timer=schedule(tick,Math.min(250,remaining));}
 return {get active(){return running;},get stage(){return stage;},start(){stop();running=true;stage='server';deadline=now()+timeoutMs;tick();},setStage(value){stage=value;if(running)onTick({stage,remaining:Math.max(0,Math.ceil((deadline-now())/1000))});},stop};
}
