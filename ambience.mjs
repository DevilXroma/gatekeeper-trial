export function startAmbience(canvas){
 const context=canvas.getContext('2d');if(!context)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let particles=[],w=0,h=0,frame=0,last=0;
 function resize(){const dpr=Math.min(devicePixelRatio||1,1.5);w=innerWidth;h=innerHeight;canvas.width=w*dpr;canvas.height=h*dpr;context.setTransform(dpr,0,0,dpr,0,0);particles=Array.from({length:w<600?22:48},(_,i)=>({x:(i*.61803398875%1)*w,y:(i*.381966%1)*h,r:.6+(i%4)*.38,speed:5+(i%7)*1.9,phase:i*1.7}));}
 function draw(t){frame=0;if(document.hidden||reduced.matches)return;const dt=Math.min((t-last)/1000,.05);last=t;context.clearRect(0,0,w,h);for(const p of particles){p.y-=p.speed*dt;p.x+=Math.sin(t*.0002+p.phase)*dt*2;if(p.y<-10)p.y=h+10;const alpha=.12+.22*(Math.sin(t*.0007+p.phase)+1)/2;context.fillStyle=`rgba(204,170,111,${alpha})`;context.shadowColor='rgba(197,156,93,.5)';context.shadowBlur=9;context.beginPath();context.arc(p.x,p.y,p.r,0,Math.PI*2);context.fill();}frame=requestAnimationFrame(draw);}
 function run(){cancelAnimationFrame(frame);frame=0;context.clearRect(0,0,w,h);if(!document.hidden&&!reduced.matches){last=performance.now();frame=requestAnimationFrame(draw);}}
 resize();run();addEventListener('resize',()=>{resize();run();});document.addEventListener('visibilitychange',run);reduced.addEventListener('change',run);
}
