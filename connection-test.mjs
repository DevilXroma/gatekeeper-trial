import assert from 'node:assert/strict';import {createConnectionAttempt} from './connection-attempt.mjs';
let clock=0,id=0,tasks=new Map(),ticks=[],timeouts=[];
const attempt=createConnectionAttempt({now:()=>clock,schedule:(fn,ms)=>{tasks.set(++id,{fn,at:clock+ms});return id;},cancel:i=>tasks.delete(i),onTick:t=>ticks.push(t),onTimeout:s=>timeouts.push(s)});
function advance(ms){const end=clock+ms;for(;;){const entry=[...tasks].sort((a,b)=>a[1].at-b[1].at)[0];if(!entry||entry[1].at>end)break;clock=entry[1].at;tasks.delete(entry[0]);entry[1].fn();}clock=end;}
attempt.start();assert.equal(ticks.at(-1).remaining,30);advance(5000);attempt.setStage('host');assert.equal(ticks.at(-1).remaining,25);advance(24999);assert(attempt.active);advance(1);assert(!attempt.active);assert.deepEqual(timeouts,['host']);assert.equal(tasks.size,0);
attempt.start();assert.equal(ticks.at(-1).remaining,30);advance(1000);attempt.stop();const count=ticks.length;advance(40000);assert.equal(ticks.length,count);assert.equal(timeouts.length,1);
attempt.start();advance(5000);attempt.start();assert.equal(ticks.at(-1).remaining,30);assert.equal(tasks.size,1);attempt.stop();
console.log('Connection timer checks passed: 30s total across stages, timeout once, retry, cancel, no overlapping timers.');
