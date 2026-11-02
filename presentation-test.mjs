import assert from 'node:assert/strict';import {arrivalScenes,trapThemes,failureScene,scenesForEvent,createPresentationCursor} from './presentation.mjs';
assert.equal(new Set(arrivalScenes.map(s=>s.title)).size,3);assert.equal(new Set(arrivalScenes.map(s=>s.effect)).size,3);assert.equal(new Set(trapThemes.map(s=>s.effect)).size,5);
for(let t=0;t<5;t++)assert.equal(new Set([0,1,2].map(v=>failureScene(t,v).text)).size,3);
const final=scenesForEvent({type:'victory',token:2});assert.deepEqual(final.map(s=>s.kind),['arrival','victory']);assert.equal(final[0].symbol,'ϟ');
const cursor=createPresentationCursor();cursor.reset('room',0);const events=[{id:10,type:'arrived',token:0},{id:19,type:'arrived',token:1},{id:31,type:'victory',token:2}];
assert.deepEqual(cursor.consume('room',{revision:31},events).map(s=>s.kind),['arrival','arrival','arrival','victory']);assert.equal(cursor.consume('room',{revision:31},events).length,0);assert.equal(cursor.consume('other',{revision:31},events).length,0);
assert.equal(cursor.consume('other',{revision:32},[...events,{id:32,type:'failure',trap:4,variation:1}])[0].effect,'vortex');
console.log('Presentation checks passed: unique arrivals, final arrival before victory, five trap effects, varied repeat lines, queued updates, no duplicates/replay on join.');
