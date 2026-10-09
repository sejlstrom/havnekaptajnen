/* Harbor pedestrians: foot positions, obstacle-aware routes and distance-driven steps.
   This module is visual only. It never reads or writes the player's economy/save. */
(function(root){
 'use strict';
 const STEP=20, X0=380, Y0=300, COLS=56, ROWS=27;
 const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
 function onGround(x,y){
  const grass=x>=380&&x<=1480&&y>=300&&y<=Math.min(705,690+.045*(x-550));
  const quay=x>=570&&x<=1340&&Math.abs(y-(744+.065*(x-560)))<=23;
  const approach=(x>=580&&x<=650&&y>=640&&y<=765)||(x>=860&&x<=980&&y>=640&&y<=780)||(x>=1280&&x<=1340&&y>=650&&y<=800);
  return grass||quay||approach;
 }
 function navigation(layout,buildings){
  const obstacles=buildings.map(b=>{const p=layout.positions[b.id];return{x:p.x,y:p.y-48,rx:b.width*.35+12,ry:76};});
  const sizes={tree:[30,20],bench:[53,23],flowers:[36,17],lamp:[16,14],fountain:[61,29]};
  for(const d of layout.decor){const [rx,ry]=sizes[d.type]||[35,20];obstacles.push({x:d.x,y:d.y-13,rx:rx+10,ry:ry+10});}
  obstacles.push({x:830,y:770,rx:58,ry:35}); // Order board and its legs.
  const clear=(x,y)=>onGround(x,y)&&!obstacles.some(o=>Math.abs(x-o.x)<=o.rx&&Math.abs(y-o.y)<=o.ry);
  const safe=(x,y)=>clear(x,y)&&clear(x-3,y)&&clear(x+3,y)&&clear(x,y-3)&&clear(x,y+3);
  const nodes=[];
  for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++){const x=X0+col*STEP,y=Y0+row*STEP;nodes.push({x,y,col,row,id:row*COLS+col,open:safe(x,y)});}
  const nearest=p=>nodes.filter(n=>n.open).reduce((best,n)=>!best||distance(n,p)<distance(best,p)?n:best,null);
  const segmentClear=(a,b)=>{const length=distance(a,b),n=Math.max(1,Math.ceil(length/2));for(let i=0;i<=n;i++)if(!safe(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n))return false;return true;};
  function route(from,to){
   const start=nearest(from),goal=nearest(to);if(!start||!goal)return [];
   const queue=new Set([start.id]),cost=new Map([[start.id,0]]),parent=new Map();
   while(queue.size){
    let current=null,score=Infinity;
    for(const id of queue){const n=nodes[id],f=cost.get(id)+distance(n,goal);if(f<score){current=n;score=f;}}
    if(current.id===goal.id){
     const path=[goal];let id=goal.id;while(parent.has(id)){id=parent.get(id);path.unshift(nodes[id]);}
     // Remove grid zigzags only where the entire shortcut remains on dry ground.
     const smooth=[path[0]];let i=0;
     while(i<path.length-1){let next=i+1;for(let j=i+2;j<path.length;j++){if(segmentClear(path[i],path[j]))next=j;else break;}smooth.push(path[next]);i=next;}
     return smooth.map(n=>({x:n.x,y:n.y}));
    }
    queue.delete(current.id);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     if(!dx&&!dy)continue;const col=current.col+dx,row=current.row+dy;if(col<0||col>=COLS||row<0||row>=ROWS)continue;
     const next=nodes[row*COLS+col];if(!next.open||!segmentClear(current,next))continue;
     if(dx&&dy&&(!nodes[current.row*COLS+col].open||!nodes[row*COLS+current.col].open))continue;
     const value=cost.get(current.id)+distance(current,next);
     if(value<(cost.get(next.id)??Infinity)){cost.set(next.id,value);parent.set(next.id,current.id);queue.add(next.id);}
    }
   }
   return [{x:start.x,y:start.y}]; // An enclosed character waits; never crosses water to get out.
  }
  return {route,clear,segmentClear};
 }
 function createRoutes(layout,buildings){
  const nav=navigation(layout,buildings),destinations=[{x:650,y:750},{x:1160,y:780},{x:1100,y:510}];
  const specs=buildings.map((b,i)=>({id:b.id,kind:i===1?'worker':'alma',from:{x:layout.positions[b.id].x,y:layout.positions[b.id].y+55},to:destinations[i],speed:29+i*2,pause:2.2+i*.4,offset:i*7}));
  specs.push({id:'visitor',kind:'worker',from:{x:630,y:750},to:{x:1290,y:790},speed:27,pause:3.2,offset:19});
  return specs.map(s=>{const points=nav.route(s.from,s.to),lengths=points.slice(1).map((p,i)=>distance(points[i],p)),length=lengths.reduce((a,b)=>a+b,0);return{...s,points,lengths,length};});
 }
 function pose(route,seconds){
  const duration=route.length/route.speed,period=duration*2+route.pause*2,t=((seconds+route.offset)%period+period)%period;
  let backward=false,idle=false,travel=0;
  if(t<duration)travel=t*route.speed;
  else if(t<duration+route.pause){travel=route.length;idle=true;}
  else if(t<2*duration+route.pause){backward=true;travel=route.length-(t-duration-route.pause)*route.speed;}
  else{travel=0;backward=true;idle=true;}
  if(route.points.length<2){const p=route.points[0]||{x:900,y:740};return{...p,frame:1,row:route.kind==='alma'?2:0,facing:1,idle:true,distance:0};}
  let index=0,remainder=Math.max(0,Math.min(route.length,travel));
  while(index<route.lengths.length-1&&remainder>route.lengths[index])remainder-=route.lengths[index++];
  const a=route.points[index],b=route.points[index+1],ratio=remainder/route.lengths[index],sign=backward?-1:1,dx=(b.x-a.x)*sign,dy=(b.y-a.y)*sign;
  return {x:a.x+(b.x-a.x)*ratio,y:a.y+(b.y-a.y)*ratio,frame:idle?1:Math.floor((backward?route.length-travel:travel)/4)%8,row:(route.kind==='alma'?2:0)+(dy<-Math.abs(dx)*.15?1:0),facing:dx<0?-1:1,idle,distance:travel};
 }
 const api=Object.freeze({navigation,createRoutes,pose,onGround});
 if(typeof module==='object'&&module.exports)module.exports=api;else root.HarborWalking=api;
})(typeof window==='undefined'?globalThis:window);
