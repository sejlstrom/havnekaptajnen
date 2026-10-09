/* Stable map magnification, independent of browser chrome and panel resizing. */
(function(root){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function baseScale(width,height){return clamp(Math.min(width/1800,height/1080),.43,.9);}
 function scale(camera,width,height){
  if(!Number.isFinite(camera.baseScale))camera.baseScale=baseScale(width,height);
  return camera.baseScale*camera.zoom;
 }
 function wheelZoom(zoom,event){
  const {deltaX=0,deltaY=0,deltaMode=0,ctrlKey=false}=event;
  // Horizontal swipes and zero/tiny residual events must never become zoom-out clicks.
  if(!Number.isFinite(deltaY)||Math.abs(deltaY)<.25||Math.abs(deltaX)>Math.abs(deltaY))return zoom;
  const pixels=deltaY*(deltaMode===1?16:deltaMode===2?240:1);
  return clamp(zoom*Math.exp(-clamp(pixels,-120,120)*(ctrlKey?.006:.0015)),.6,2.4);
 }
 function anchor(camera,point,width,height){const s=scale(camera,width,height);return{x:camera.x+(point.x-width/2)/s,y:camera.y+(point.y-height/2)/s};}
 function zoomAt(camera,zoom,point,width,height,world=anchor(camera,point,width,height)){
  camera.zoom=clamp(zoom,.6,2.4);const s=scale(camera,width,height);
  camera.x=world.x-(point.x-width/2)/s;camera.y=world.y-(point.y-height/2)/s;
 }
 const api=Object.freeze({baseScale,scale,wheelZoom,anchor,zoomAt});
 if(typeof module==='object'&&module.exports)module.exports=api;else root.HarborCamera=api;
})(typeof window==='undefined'?globalThis:window);
