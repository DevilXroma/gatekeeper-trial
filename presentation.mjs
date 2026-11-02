export const trapThemes=[
 {name:'Искровой чих',color:'#ffb25b',hue:0,effect:'embers',symbol:'✹',quotes:['«Апчхи. Извините, на самоуверенность пыльца».','«Ну вот, опять наискрили. Подметать кто будет?»','«Предупредить? А где бы тогда был сюрприз?»']},
 {name:'Холодное пламя',color:'#8be3f2',hue:158,effect:'frost',symbol:'❄',quotes:['«Освежились? Теперь думать будет легче».','«Не дрожите. Это всего лишь очень холодная шутка».','«Огонь холодный, зато встреча тёплая. Почти».']},
 {name:'Огненный хлопок',color:'#ff7956',hue:-18,effect:'burst',symbol:'✺',quotes:['«Вот это я понимаю — вошли с огоньком».','«Тихо-тихо. Бороду мне не подпалите».','«Ещё раз так хлопнете — решу, что аплодируете».']},
 {name:'Лиловый разряд',color:'#cf9aff',hue:234,effect:'lightning',symbol:'ϟ',quotes:['«Бодрит, правда? Лучше утренней переклички».','«Наконец-то между нами проскочила искра».','«Это не я. Это камень вас за руку поздоровался».']},
 {name:'Зелёный вихрь',color:'#91e2aa',hue:82,effect:'vortex',symbol:'❋',quotes:['«Закружились? А я-то всё время на одном месте».','«Куда-куда? Обратно, конечно. Там уже всё знакомое».','«Поворот неожиданный. Особенно когда возвращает к началу».']}
];
export const arrivalScenes=[
 {title:'Солнце заняло своё место',text:'Золотой свет растекается по гнезду. «Одно светило пристроили. Только не вздумайте теперь загорать».',effect:'solar',symbol:'☀',color:'#f0bb45'},
 {title:'Луна опускается в камень',text:'Серебристая дуга смыкается вокруг жетона. «Луна устроилась. Остальным спать пока рано».',effect:'lunar',symbol:'☾',color:'#8caeff'},
 {title:'Молния нашла своё гнездо',text:'По камню пробегает короткий разряд. «Поймали! Я уж думал, она тут до утра носиться будет».',effect:'electric',symbol:'ϟ',color:'#c895f5'}
];
export function failureScene(trap=0,variation=0){const t=trapThemes[((trap%5)+5)%5];return {title:t.name,text:t.quotes[((variation%3)+3)%3]+' Жетоны возвращаются к началу.',effect:t.effect,symbol:t.symbol,color:t.color,variation};}
export function scenesForEvent(e){if(e.type==='failure')return [{kind:'failure',...failureScene(e.trap,e.variation)}];if(e.type==='arrived'||e.type==='victory'){const arrival=arrivalScenes[e.token];return [...(arrival?[{kind:'arrival',token:e.token,...arrival}]:[]),...(e.type==='victory'?[{kind:'victory',title:'За камнем раздаётся щелчок',text:'Дверь медленно отворяется. «Проходите, проходите. А я ведь почти начал за вас переживать».',symbol:'⌘',effect:'door',color:'#c69a65'}]:[])];}return [];}
export function localPresentationEvents(state,danger,edgeKey){return (state.history||[]).map((e,i)=>({id:state.revision-state.history.length+i+1,type:e.type,token:e.token,trap:e.type==='failure'?danger.indexOf(edgeKey(e.from,e.to)):undefined,variation:state.attempt%3})).filter(e=>['arrived','victory','failure'].includes(e.type));}
export function createPresentationCursor(){let key=null,last=0;return {reset(k,revision=0){key=k;last=revision;},consume(k,state,events){if(key!==k){key=k;last=state.revision||0;return [];}const fresh=events.filter(e=>e.id>last).sort((a,b)=>a.id-b.id);last=Math.max(last,state.revision||0);return fresh.flatMap(scenesForEvent);}};}
