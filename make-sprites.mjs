import fs from 'node:fs';
const flames=[
 'M32 59C9 58 10 40 18 29C19 39 24 38 24 26C24 15 35 6 34 2C45 16 38 24 44 29C47 22 49 24 49 24C61 44 54 60 32 59Z',
 'M32 59C9 57 10 42 16 31C19 42 23 38 23 28C22 15 31 14 29 3C44 12 40 24 46 30C48 26 47 21 49 19C62 39 57 58 32 59Z',
 'M32 59C12 59 7 44 17 27C16 38 22 39 22 28C21 18 34 10 36 3C43 16 36 22 42 31C47 28 48 23 48 20C60 36 57 59 32 59Z',
 'M32 59C10 59 8 43 18 30C20 41 24 37 24 26C24 14 36 15 40 4C43 18 34 24 42 33C46 31 49 22 48 17C61 35 58 59 32 59Z',
 'M32 59C12 59 8 43 16 31C18 41 24 40 24 28C22 15 32 9 30 2C43 13 37 25 44 30C48 27 49 22 48 20C61 37 56 59 32 59Z',
 'M32 59C10 58 10 42 18 28C18 37 22 40 23 27C23 17 31 13 33 3C44 17 39 24 44 30C46 26 49 25 50 21C60 40 56 59 32 59Z',
 'M32 59C12 60 7 45 17 28C19 40 25 36 24 26C23 15 37 9 38 2C44 17 36 24 42 31C48 29 48 22 48 19C59 36 59 59 32 59Z',
 'M32 59C11 59 9 43 16 31C18 42 24 39 24 27C24 15 33 13 34 4C44 14 39 24 44 31C48 28 48 22 50 20C61 39 56 59 32 59Z'
];
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="64" viewBox="0 0 512 64"><defs><linearGradient id="fire" x2="0" y2="1"><stop stop-color="#ffd888"/><stop offset=".5" stop-color="#ffae4e"/><stop offset="1" stop-color="#f46537"/></linearGradient><radialGradient id="halo"><stop stop-color="#ffad54" stop-opacity=".4"/><stop offset="1" stop-color="#ffad54" stop-opacity="0"/></radialGradient></defs>${flames.map((d,i)=>`<g transform="translate(${i*64},0)"><ellipse cx="32" cy="47" rx="29" ry="17" fill="url(#halo)"/><path d="${d}" fill="url(#fire)"/><path d="M32 57C19 56 23 43 29 35C27 44 33 42 35 31C39 42 46 56 32 57Z" fill="#ffecad"/><path d="M32 56C26 54 29 48 33 43C32 50 39 53 32 56Z" fill="#fff9d4"/><circle cx="${21+i%3*6}" cy="${7+i%4*4}" r="1.3" fill="#ffe7ae" opacity=".7"/></g>`).join('')}</svg>`;
fs.writeFileSync(new URL('./flame-sprites.svg',import.meta.url),svg);
