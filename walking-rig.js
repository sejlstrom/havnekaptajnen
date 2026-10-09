/* Original painted puppet parts, posed continuously at the display refresh rate.
   PNGs are unchanged; source rectangles are cropped only while rendering. */
(function(root){
 'use strict';
 const rects={worker:[[[75,7,298,419],[521,141,156,206],[932,170,148,239],[1316,78,149,320],[1712,154,201,280]],[[101,429,275,355],[533,500,166,201],[938,533,141,221],[1324,438,149,308],[1746,505,164,258]]],alma:[[[162,11,234,387],[551,102,155,276],[949,128,148,260],[1283,80,173,298],[1649,81,237,307]],[[166,403,223,373],[604,462,148,277],[927,486,145,260],[1280,440,169,306],[1643,440,231,317]]]};
 // Registration points are shoulder/elbow, elbow/hand, hip/knee, knee/ankle.
 const joints={worker:[[[.68,.08],[.46,.9]],[[.46,.08],[.72,.87]],[[.40,.10],[.54,.91]],[[.36,.09],[.40,.70]]],alma:[[[.65,.1],[.28,.89]],[[.28,.1],[.81,.89]],[[.25,.08],[.60,.92]],[[.2,.07],[.43,.7]]]};
 const backJoints={worker:[[[.3,.13],[.73,.85]],[[.43,.08],[.69,.88]],[[.49,.1],[.44,.92]],[[.49,.09],[.49,.7]]],alma:[[[.45,.1],[.72,.91]],[[.68,.1],[.22,.89]],[[.73,.08],[.38,.92]],[[.8,.07],[.44,.7]]]};
 const images={};
 function image(kind){if(!images[kind]){images[kind]=new root.Image();images[kind].src='./island-'+kind+'-rig.png';}return images[kind];}
 function knee(hip,ankle){
  const dx=ankle.x-hip.x,dy=ankle.y-hip.y,length=Math.max(2.1,Math.min(37.9,Math.hypot(dx,dy)));
  const angle=Math.atan2(dy,dx)-Math.acos((18*18+length*length-20*20)/(36*length));
  return{x:hip.x+18*Math.cos(angle),y:hip.y+18*Math.sin(angle)};
 }
 function skeleton(phase,weight,vx=1,vy=0){
  const tau=Math.PI*2,bob=(1-Math.cos(phase*tau*2))*.55*weight;
  const legs=[0,.5].map((offset,i)=>{
   const t=((phase+offset)%1+1)%1,swing=t>=.5,u=swing?(t-.5)*2:t*2;
   // During stance the foot moves backwards by exactly half a stride as the body advances.
   const along=(swing?-13*Math.cos(Math.PI*u):13-26*u)*weight;
   const lift=swing?Math.sin(Math.PI*u)*9*weight:0;
   const hip={x:i?54:41,y:78+bob+(i?1:-1)};
   const ankle={x:hip.x+along*vx,y:113+(i?2:-2)+along*vy-lift};
   return{hip,knee:knee(hip,ankle),ankle,swing};
  });
  const arms=[0,.5].map((offset,i)=>{
   const angle=-Math.cos((phase+offset)*tau)*.48*weight;
   const shoulder={x:i?66:29,y:48+bob+(i?2:0)};
   const elbow={x:shoulder.x+Math.sin(angle)*18,y:shoulder.y+Math.cos(angle)*18};
   const hand={x:elbow.x+Math.sin(angle-.18)*17,y:elbow.y+Math.cos(angle-.18)*17};
   return{shoulder,elbow,hand};
  });
  return{legs,arms,bob};
 }
 function bone(ctx,img,rect,registration,from,to,cut=1){
  const [sx,sy,w,h]=rect,a={x:registration[0][0]*w,y:registration[0][1]*h},b={x:registration[1][0]*w,y:registration[1][1]*h};
  const scale=Math.hypot(to.x-from.x,to.y-from.y)/Math.hypot(b.x-a.x,b.y-a.y);
  ctx.save();ctx.translate(from.x,from.y);ctx.rotate(Math.atan2(to.y-from.y,to.x-from.x)-Math.atan2(b.y-a.y,b.x-a.x));ctx.scale(scale,scale);ctx.drawImage(img,sx,sy,w,h*cut,-a.x,-a.y,w,h*cut);ctx.restore();
 }
 function boot(ctx,img,rect,registration,ankle,mirror){
  const [sx,sy,w,h]=rect,cut=.65,scale=20/Math.hypot((registration[1][0]-registration[0][0])*w,(registration[1][1]-registration[0][1])*h);
  ctx.save();ctx.translate(ankle.x,ankle.y);if(mirror)ctx.scale(-1,1);
  ctx.drawImage(img,sx,sy+h*cut,w,h*(1-cut),-registration[1][0]*w*scale,(cut-registration[1][1])*h*scale,w*scale,h*(1-cut)*scale);ctx.restore();
 }
 function draw(canvas,pose,paused=false){
  const kind=pose.row>=2?'alma':'worker',back=pose.row%2,img=image(kind);if(!img.complete||!img.naturalWidth)return;
  const weight=paused?0:pose.weight,key=[kind,back,weight?pose.phase:0,weight,weight?pose.vx:1,weight?pose.vy:0].join(',');
  if(canvas._harborPose===key)return;
  const ctx=canvas.getContext('2d');if(!ctx)return;canvas._harborPose=key;
  if(canvas.width!==192){canvas.width=192;canvas.height=256;}
  ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,96,128);
  const rig=skeleton(pose.phase,paused?0:pose.weight,pose.vx,pose.vy),parts=rects[kind][back],reg=(back?backJoints:joints)[kind];
  const leg=i=>{const l=rig.legs[i];bone(ctx,img,parts[3],reg[2],l.hip,l.knee);bone(ctx,img,parts[4],reg[3],l.knee,l.ankle,.76);boot(ctx,img,parts[4],reg[3],l.ankle,kind==='alma'&&back);};
  const arm=i=>{const a=rig.arms[i];bone(ctx,img,parts[1],reg[0],a.shoulder,a.elbow);bone(ctx,img,parts[2],reg[1],a.elbow,a.hand);};
  // Far limbs first, hips under the torso, near arm in front. Back view reverses arm overlap.
  arm(back?0:1);leg(1);leg(0);
  const [sx,sy,w,h]=parts[0],height=74,width=w/h*height;
  ctx.drawImage(img,sx,sy,w,h,48-width/2,7+rig.bob,width,height);
  arm(back?1:0);
 }
 const api=Object.freeze({skeleton,draw});
 if(typeof module==='object'&&module.exports)module.exports=api;else root.HarborRig=api;
})(typeof window==='undefined'?globalThis:window);
