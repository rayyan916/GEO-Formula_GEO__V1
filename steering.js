'use strict';
// Device axes follow W3C Device Orientation; convert gravity to screen-space roll.
const SteeringInput=(()=>{
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rad=Math.PI/180;
 function rollFromOrientation(beta,gamma,screenAngle=0){if(!Number.isFinite(beta)||!Number.isFinite(gamma))return null;const b=beta*rad,g=gamma*rad,a=screenAngle*rad,x=-Math.cos(b)*Math.sin(g),y=Math.sin(b),sx=x*Math.cos(a)-y*Math.sin(a),sy=x*Math.sin(a)+y*Math.cos(a);if(Math.hypot(sx,sy)<.22)return null;return Math.atan2(-sx,sy)/rad;}
 function wrap(v){return ((v+180)%360+360)%360-180;}
 function create(host){
  const state={mode:'buttons',ready:false,status:'長按 < / > 轉向，放開回正。',zero:0,target:0,filtered:0,roll:0,lastAt:0,screenAngle:null,needsCalibration:true};
  const listeners=new Set();let listening=false,timer=null,attempt=0;
  const now=()=>host.Date?.now?.()??Date.now();
  const screenAngle=()=>Number.isFinite(host.screen?.orientation?.angle)?host.screen.orientation.angle:(Number.isFinite(host.orientation)?host.orientation:0);
  const emit=()=>listeners.forEach(f=>f({...state}));
  const status=s=>{if(s!==state.status){state.status=s;emit();}};
  function onReading(event){if(state.mode!=='tilt')return;const angle=screenAngle(),r=rollFromOrientation(event.beta,event.gamma,angle);if(r===null){status('請稍為豎起手機，像軚盤般橫向握持。');return;}state.roll=r;state.lastAt=now();state.ready=true;if(timer!==null){(host.clearTimeout||clearTimeout)(timer);timer=null;}if(state.needsCalibration||state.screenAngle!==angle){state.zero=r;state.filtered=0;state.needsCalibration=false;state.screenAngle=angle;}
   const delta=wrap(r-state.zero),magnitude=Math.max(0,Math.abs(delta)-2);state.target=clamp(Math.sign(delta)*magnitude/24,-1,1);status('手機軚盤已啟用 · 水平握持為直行，可隨時校準。');
  }
  function stop(){if(listening){host.removeEventListener('deviceorientation',onReading);listening=false;}if(timer!==null){(host.clearTimeout||clearTimeout)(timer);timer=null;}}
  function useButtons(message='長按 < / > 轉向，放開回正。'){attempt++;stop();state.mode='buttons';state.ready=false;state.target=state.filtered=0;state.status=message;emit();}
  async function enableTilt(){const id=++attempt;stop();state.mode='buttons';state.ready=false;state.target=state.filtered=0;
   if(host.isSecureContext===false){status('請用網上HTTPS版本啟用手機軚盤；方向鍵仍可使用。');return false;}
   const Type=host.DeviceOrientationEvent;
   if(!Type&&!('ondeviceorientation' in host)){status('這部裝置未提供方向感應，請使用長按方向鍵。');return false;}
   try{if(typeof Type?.requestPermission==='function'){const permission=await Type.requestPermission();if(id!==attempt)return false;if(permission!=='granted'){useButtons('未獲感應器權限，已保留長按方向鍵。');return false;}}}
   catch{if(id===attempt)useButtons('未能啟用感應器，請使用方向鍵，或在瀏覽器允許感應後重試。');return false;}
   if(id!==attempt)return false;state.mode='tilt';state.needsCalibration=true;state.lastAt=0;state.status='請穩定橫向握持手機，正在讀取及校準軚盤…';host.addEventListener('deviceorientation',onReading,{passive:true});listening=true;
   timer=(host.setTimeout||setTimeout)(()=>{if(state.mode==='tilt'&&!state.ready)useButtons('未收到方向感應，請確認手機支援及已允許權限；方向鍵仍可用。');},4000);emit();return true;
  }
  function calibrate(){if(state.mode!=='tilt')return false;if(state.ready&&now()-state.lastAt<1800){state.zero=state.roll;state.target=state.filtered=0;state.status='已校準：目前握持角度為直行。';}else{state.needsCalibration=true;state.status='請穩定握持，等待新的方向感應資料以校準。';}emit();return true;}
  function axis(buttonDirection,dt,manualEngaged=false){buttonDirection=clamp(Number(buttonDirection)||0,-1,1);if(state.mode==='tilt'&&state.ready&&now()-state.lastAt>1800){useButtons('方向感應已中斷，已切回長按方向鍵。');}
   state.filtered+=(state.target-state.filtered)*(1-Math.exp(-Math.max(0,dt)*12));if(buttonDirection||manualEngaged)return buttonDirection;return state.mode==='tilt'&&state.ready?clamp(state.filtered,-1,1):0;
  }
  return {enableTilt,useButtons,calibrate,axis,subscribe(fn){listeners.add(fn);fn({...state});return()=>listeners.delete(fn);},get state(){return {...state};}};
 }
 return Object.assign(create(window),{create,rollFromOrientation,wrap});
})();
