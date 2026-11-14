'use strict';
const $=id=>document.getElementById(id), TAU=Math.PI*2, LAPS=15;let LENGTH=3000;
const CARS=[
{name:'蒼穹・天衡',ref:'GEO GT-01',color:'#64d6ff',max:610,acc:90,handling:1.12,boost:1.44,desc:'六輪均衡型',stats:[82,80,86,80]},
{name:'赤焰・熔脈',ref:'GEO VX-02',color:'#ff5358',max:655,acc:82,handling:.87,boost:1.54,desc:'高速升壓型',stats:[96,73,65,98]},
{name:'白隼・雲隙',ref:'GEO SR-03',color:'#f4b5c7',max:625,acc:105,handling:1,boost:1.38,desc:'起步衝刺型',stats:[87,96,78,72]},
{name:'紫電・弧光',ref:'GEO CR-04',color:'#b898ff',max:590,acc:100,handling:1.3,boost:1.42,desc:'彎道操控型',stats:[76,90,99,77]},
{name:'玄武・磐石',ref:'GEO EX-05',color:'#7bc996',max:630,acc:75,handling:1.08,boost:1.46,desc:'重裝穩定型',stats:[89,65,84,83]},
{name:'雷鳴・離子',ref:'GEO LT-06',color:'#ffcf48',max:605,acc:115,handling:.93,boost:1.4,desc:'電磁加速型',stats:[80,99,72,75]},
{name:'金翼・曙光',ref:'GEO AR-07',color:'#a0caff',max:615,acc:87,handling:1.23,boost:1.45,desc:'精準轉向型',stats:[84,77,95,82]},
{name:'影刃・夜航',ref:'GEO NX-08',color:'#ff9d57',max:600,acc:98,handling:1.17,boost:1.5,desc:'靈活渦輪型',stats:[78,88,90,91]},
{name:'雷神',ref:'GEO TS-09',color:'#72baff',max:640,acc:112,handling:1.08,boost:1.45,desc:'雙渦流六輪型',stats:[91,97,84,83]},
{name:'凰呀',ref:'GEO PH-10',color:'#c58add',max:665,acc:98,handling:1.02,boost:1.53,desc:'流線升壓型',stats:[99,88,80,97]}];
let selectedTrack=0,viewer=null;let selected=0,driver='',state='home',game=null,keys={},quizOrder=[],quizCursor=0,currentQ=null,quizAnswered=false,lastFrame=0,msgTime=0,soundOn=false,audioCtx,osc,gain;
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function showScreen(s){for(const id of ['home','garage','race'])$(id).classList.toggle('hidden',id!==s);state=s;}
function modal(html){$('modalBody').innerHTML=html;$('modal').classList.remove('hidden');}
function closeModal(){$('modal').classList.add('hidden');}
function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function trackIcon(index){const tr=Racing3D.makeTrack(index),raw=tr.raw,xs=raw.map(p=>p[0]),zs=raw.map(p=>p[2]),mx=Math.min(...xs),mz=Math.min(...zs),scale=Math.min(190/(Math.max(...xs)-mx),78/(Math.max(...zs)-mz));return `<svg viewBox="0 0 220 100" aria-hidden="true"><path d="${raw.map((p,i)=>(i?'L':'M')+(15+(p[0]-mx)*scale).toFixed(1)+','+(10+(p[2]-mz)*scale).toFixed(1)).join(' ')}Z" fill="none" stroke="${index?'#8ce5ec':'#ff9d7a'}" stroke-width="4"/></svg>`;}
function garage(){
 viewer=null;showScreen('garage');$('driverLabel').textContent=driver+' / 已登記車手';
 $('cars').innerHTML=CARS.map((c,i)=>`<article class="car-card ${i===selected?'selected':''}"><button class="car-zoom" data-zoom="${i}" aria-label="放大觀看${c.name}"><canvas id="garageCar${i}" class="garage-car-canvas"></canvas><span class="car-index">${String(i+1).padStart(2,'0')} / ${c.desc}</span><span class="zoom-cue">⤢ 放大觀看</span></button><div class="car-info"><strong>${c.name}</strong><small>${c.ref} · ${c.max} km/h</small><p class="shape-note">${Racing3D.carSpecs[i].label}</p>${['極速','加速','操控','升壓'].map((n,j)=>`<div class="stat"><span>${n}</span><i><em style="width:${c.stats[j]}%"></em></i></div>`).join('')}<button class="select-car ${i===selected?'chosen':''}" data-car="${i}" aria-pressed="${i===selected}">${i===selected?'✓ 已選擇此車款':'選擇此車款'}</button></div></article>`).join('');
 $('tracks').innerHTML=Racing3D.TRACKS.map((t,i)=>`<button class="track-card ${i===selectedTrack?'selected':''}" data-track="${i}" aria-pressed="${i===selectedTrack}">${trackIcon(i)}<div><small>${t.tag}</small><strong>${t.name}</strong><span>${t.description}</span><em>難度 ${t.difficulty}</em></div></button>`).join('');
 $('raceSummary').textContent=Racing3D.TRACKS[selectedTrack].name+' · 15圈 · '+CARS.length+'位車手';
 document.querySelectorAll('[data-car]').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.car);garage();});
 document.querySelectorAll('[data-track]').forEach(b=>b.onclick=()=>{selectedTrack=Number(b.dataset.track);garage();});
 document.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>openViewer(Number(b.dataset.zoom)));
 bindDrivingOptions();refreshSteeringUI();requestAnimationFrame(()=>CARS.forEach((_,i)=>Racing3D.previewTo($('garageCar'+i),i,.72,1)));
 window.scrollTo(0,0);
}
function openViewer(i){
 viewer={i,angle:.72,zoom:1};modal(`<div class="q-meta">MACHINE VIEWER / 車款細節</div><div class="viewer-title"><div><h2>${CARS[i].name}</h2><span>${CARS[i].ref} · ${Racing3D.carSpecs[i].label}</span></div><button id="closeViewer" aria-label="關閉車款預覽">✕</button></div><canvas id="carViewer" aria-label="可拖動旋轉的立體跑車"></canvas><div class="viewer-tools"><button id="rotateLeft" aria-label="向左旋轉">↶</button><span>拖動旋轉 · 按 ＋／− 縮放</span><button id="rotateRight" aria-label="向右旋轉">↷</button><button id="zoomOut" aria-label="縮小跑車">−</button><button id="zoomIn" aria-label="放大跑車">＋</button></div><div class="panel-actions"><button id="selectViewer" class="primary">選擇 ${CARS[i].ref} →</button></div>`);
 const paint=()=>{if(viewer)Racing3D.previewTo($('carViewer'),i,viewer.angle,viewer.zoom);};
 const close=()=>{viewer=null;closeModal();};$('closeViewer').onclick=close;$('selectViewer').onclick=()=>{selected=i;close();garage();};
 $('rotateLeft').onclick=()=>{viewer.angle-=.35;paint();};$('rotateRight').onclick=()=>{viewer.angle+=.35;paint();};$('zoomIn').onclick=()=>{viewer.zoom=Math.min(1.45,viewer.zoom+.1);paint();};$('zoomOut').onclick=()=>{viewer.zoom=Math.max(.72,viewer.zoom-.1);paint();};let last=null;const cv=$('carViewer');cv.onpointerdown=e=>{last=e.clientX;cv.setPointerCapture(e.pointerId);};cv.onpointermove=e=>{if(last!==null){viewer.angle+=(e.clientX-last)*.012;last=e.clientX;paint();}};cv.onpointerup=cv.onpointercancel=()=>last=null;requestAnimationFrame(paint);
}
$('entry').onsubmit=e=>{e.preventDefault();driver=$('name').value.trim();if(!driver){$('name').focus();return;}garage();};$('backHome').onclick=()=>showScreen('home');
function help(fromRace=false){if(fromRace)game.paused=true;modal(`<div class="q-meta">DRIVER BRIEFING / 車手簡報</div><h2>讓知識帶你衝線</h2><div class="help-grid"><p><b>01 · 駕駛</b><br>手機建議橫向。按住放大半透明的 < / > 連續轉向，放開回正，無需連按。亦可選手機軚盤，允許感應器後像轉軚盤般轉動手機；按「校準」設定直行角度。按住煞車減速至停止。油門可切換 ON / OFF；電腦按 ↑ 或 W 亦可加油。</p><p><b>02 · 即時答題引擎</b><br>題目固定在畫面右側，比賽及計時持續進行。未作答時維持現有巡航速度；每答對一題提升12%車款極速的巡航目標，答錯即時減速32%。</p><p><b>03 · 升壓渦</b><br>連續答對5題可儲存一次升壓渦，手動啟動後極速提升約40–54%，持續6秒。答錯會重置連對。</p><p><b>04 · 完成賽事</b><br>選擇火山或海岸賽道，與九位電腦車手跑15圈。前輪轉向、重心側移及抓地力影響路線；碰撞車輛或護欄會反彈減速。海岸巨浪可令路面濕滑。</p></div><p class="rotate-note">題庫共100題：每輪隨機出題，不重複；用完後重新洗牌。車庫可按圖放大、拖動旋轉。海岸賽道有巨浪預警及濕滑路段。</p><div class="panel-actions"><button id="helpClose" class="primary">${fromRace?'繼續比賽':'準備好了'}</button></div>`);$('helpClose').onclick=()=>{closeModal();if(fromRace)game.paused=false;};}
$('helpHome').onclick=()=>help();
function makeGame(){
 LENGTH=Racing3D.choose(selectedTrack).length;Racing3D.resetCamera();quizOrder=shuffle([...QUESTIONS]);quizCursor=0;currentQ=null;quizAnswered=false;clearControls();
 game={selected,track:selectedTrack,dist:0,x:0,vx:0,impactVX:0,speed:0,power:38,streak:0,charge:false,boost:0,elapsed:0,correct:0,total:0,paused:true,throttle:true,collide:0,steer:0,yaw:0,cruise:CARS[selected].max*.38,finished:false,nextWave:12,wave:null,wetUntil:0,hitCount:0,
 ai:CARS.map((c,i)=>({i,name:['雲野','赤城','白川','紫月','森崎','雷堂','金城','影山','雷澤','鳳川'][i],dist:8+Math.floor(i/2)*7,lane:i%2?.45:-.45,vx:0,impactLane:0,speed:c.max*.38,pace:365+(i*13)%76,finish:null})).filter(c=>c.i!==selected)};
 $('trackLabel').textContent=Racing3D.TRACKS[selectedTrack].name;
}
$('start').onclick=()=>{makeGame();showScreen('race');resize();openQuiz(true);updateHud();let n=3;modal(`<div class="q-meta">${Racing3D.TRACKS[selectedTrack].tag} / 全場準備</div><div class="countdown">3</div><p style="text-align:center">方向鍵轉向 · 右側即時答題<br>手機請橫向握持，油門預設開啟 · 留意彎道及預警</p>`);const timer=setInterval(()=>{if(!game||state!=='race'){clearInterval(timer);return;}n--;if(n===0){clearInterval(timer);closeModal();game.paused=false;game.speed=game.cruise;message('綠燈亮起！右側答題提升車速',4);}else document.querySelector('.countdown').textContent=n;},1000);};
function message(s,t=2){$('raceMessage').textContent=s;msgTime=t;}
function pause(){clearControls();if(!game||game.finished||!$('modal').classList.contains('hidden'))return;game.paused=true;modal(`<div class="q-meta">RACE PAUSED</div><h2>賽事已暫停</h2><p>全場車輛與計時均已暫停。</p><div class="panel-actions"><button id="exitRace">返回車庫</button><button id="instructions">玩法說明</button><button id="resume" class="primary">繼續比賽 →</button></div>`);$('resume').onclick=()=>{closeModal();game.paused=false;};$('instructions').onclick=()=>help(true);$('exitRace').onclick=()=>{closeModal();garage();game=null;};}
$('pause').onclick=pause;
function openQuiz(initial=false){
 if(!game||game.finished||(!initial&&game.paused))return;
 if(currentQ&&!quizAnswered&&!initial){$('quizPanel').scrollTop=0;return;}
 if(quizCursor>=quizOrder.length){quizOrder=shuffle([...QUESTIONS]);quizCursor=0;}
 currentQ=quizOrder[quizCursor++];quizAnswered=false;
 const options=shuffle(currentQ.options.map((text,i)=>({text,correct:i===currentQ.answer})));
 $('quizPanel').innerHTML=`<div class="live-quiz-head"><span>ENGINE LINK / 地理引擎</span><b><span id="liveClock">00:00.0</span> ●</b></div><div class="live-quiz-scroll"><div class="q-meta">題庫 ${quizCursor} / 100 · 比賽持續進行</div><div class="question">${escapeHTML(currentQ.q)}</div><div class="answers">${options.map((a,i)=>`<button data-answer="${i}"><b>${'ABCD'[i]}</b><span>${escapeHTML(a.text)}</span></button>`).join('')}</div><div id="feedback" class="feedback">未作答：維持車速<br>答對：提升巡航速度 · 答錯：減速32%</div></div><div class="live-quiz-bottom"><span id="quizHint">可同時使用左側按鈕轉向、煞車</span><button id="nextQuiz" class="primary hidden">下一題 → <small>Q</small></button></div>`;
 document.querySelectorAll('[data-answer]').forEach((b,i)=>b.onclick=()=>answer(i,options));
 $('nextQuiz').onclick=()=>openQuiz();
}
function answer(index,options){
 if(!game||game.paused||game.finished||quizAnswered)return;
 quizAnswered=true;const correct=options[index].correct;game.total++;
 if(correct){game.correct++;game.cruise=Math.min(CARS[selected].max,game.cruise+CARS[selected].max*.12);game.streak++;if(game.streak>=5){game.charge=true;game.streak=0;}}
 else{game.cruise*=.68;game.speed*=.68;game.streak=0;}
 game.power=100*game.cruise/CARS[selected].max;
 document.querySelectorAll('[data-answer]').forEach((b,i)=>{b.disabled=true;if(options[i].correct)b.classList.add('correct');else if(i===index)b.classList.add('wrong');});
 $('feedback').innerHTML=`<b style="color:${correct?'#5cf1c0':'#ffa1a1'}">${correct?'答對！巡航目標 '+Math.round(game.cruise)+' km/h':'答錯！車速下降32%'}</b>${game.charge?'<br>升壓渦已就緒，可立即啟動。':''}<br>${escapeHTML(currentQ.explanation)}`;
 $('nextQuiz').classList.remove('hidden');$('quizHint').textContent='解說可向下捲動 · 下一題不暫停賽事';updateHud();
}
$('quiz').onclick=()=>openQuiz();
function activateBoost(){if(!game||game.paused||!game.charge||game.boost>0)return;game.charge=false;game.boost=6;message('升壓渦！BOOST ON',3);}
$('boost').onclick=activateBoost;$('throttle').onclick=()=>{if(game){game.throttle=!game.throttle;updateHud();}};
$('full').onclick=async()=>{try{if(!document.fullscreenElement)await $('race').requestFullscreen();else await document.exitFullscreen();}catch{message('此瀏覽器未支援全螢幕',2);}};
// Pointer IDs are held states, never click counters. Keyboard and touch remain independent.
const pointerHolds=new Map(),keyboardHolds={};
function syncHeld(name){keys[name]=!!keyboardHolds[name]||!!pointerHolds.get(name)?.size;}
function clearControls(){keys={};pointerHolds.forEach(set=>set.clear());Object.keys(keyboardHolds).forEach(k=>delete keyboardHolds[k]);}
for(const b of document.querySelectorAll('[data-hold]')){
 const name=b.dataset.hold;pointerHolds.set(name,new Set());
 b.onpointerdown=e=>{e.preventDefault();pointerHolds.get(name).add(e.pointerId);syncHeld(name);try{b.setPointerCapture(e.pointerId);}catch{}};
 b.onpointerup=b.onpointercancel=b.onlostpointercapture=e=>{pointerHolds.get(name).delete(e.pointerId);syncHeld(name);};
 b.oncontextmenu=e=>e.preventDefault();
}
const keyMap={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowDown:'brake',s:'brake',ArrowUp:'gas',w:'gas'};
document.addEventListener('keydown',e=>{if(state!=='race'||e.target.tagName==='INPUT')return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();const key=e.key.length===1?e.key.toLowerCase():e.key;if(keyMap[key]){keyboardHolds[keyMap[key]]=true;syncHeld(keyMap[key]);}if(e.repeat)return;if(key==='q')openQuiz();if(key===' ')activateBoost();if(key==='p'||key==='Escape')pause();});
document.addEventListener('keyup',e=>{const key=e.key.length===1?e.key.toLowerCase():e.key;if(keyMap[key]){keyboardHolds[keyMap[key]]=false;syncHeld(keyMap[key]);}});
window.addEventListener('blur',()=>{clearControls();if(state==='race'&&game&&!game.paused)pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearControls();if(game&&!game.paused&&state==='race')pause();}});
function refreshSteeringUI(s=SteeringInput.state){
 document.querySelectorAll('[data-drive-mode]').forEach(b=>{const yes=b.dataset.driveMode===s.mode;b.classList.toggle('chosen',yes);b.setAttribute('aria-pressed',String(yes));});
 if($('steeringStatus'))$('steeringStatus').textContent=s.status;
 if($('steeringMode'))$('steeringMode').textContent=s.mode==='tilt'?(s.ready?'軚盤：手機':'軚盤：讀取中'):'軚盤：長按';
 if($('calibrateSteering'))$('calibrateSteering').classList.toggle('hidden',s.mode!=='tilt');
 if($('garageCalibrate'))$('garageCalibrate').classList.toggle('hidden',s.mode!=='tilt');
 if($('steerMode'))$('steerMode').textContent=s.mode==='tilt'?'手機軚盤 · 方向鍵可優先控制':'按住轉向 · 放開回正';if(state==='race'&&game)message(s.status,s.ready?2:4);
}
function bindDrivingOptions(){document.querySelectorAll('[data-drive-mode]').forEach(b=>b.onclick=()=>{if(b.dataset.driveMode==='tilt')SteeringInput.enableTilt();else SteeringInput.useButtons();});if($('garageCalibrate'))$('garageCalibrate').onclick=()=>SteeringInput.calibrate();}
$('steeringMode').onclick=()=>{if(SteeringInput.state.mode==='tilt')SteeringInput.useButtons();else SteeringInput.enableTilt();};
$('calibrateSteering').onclick=()=>{SteeringInput.calibrate();message(SteeringInput.state.ready?'軚盤校準：目前握持角度為直行':'正在等待方向感應以校準',2);};
SteeringInput.subscribe(refreshSteeringUI);
$('sound').onclick=()=>{soundOn=!soundOn;if(soundOn&&!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)();osc=audioCtx.createOscillator();gain=audioCtx.createGain();osc.type='sawtooth';gain.gain.value=0;osc.connect(gain);gain.connect(audioCtx.destination);osc.start();}if(audioCtx)audioCtx.resume();$('sound').textContent='♫ '+(soundOn?'開':'關');};
function standings(){let a=game.ai.map(c=>({...c,player:false}));a.push({i:selected,name:driver,dist:game.dist,finish:game.finished?game.elapsed:null,player:true});return a.sort((a,b)=>a.finish!==null&&b.finish!==null?a.finish-b.finish:a.finish!==null?-1:b.finish!==null?1:b.dist-a.dist);}
function format(t){return `${Math.floor(t/60).toString().padStart(2,'0')}:${(t%60).toFixed(1).padStart(4,'0')}`;}
function updateHud(){if(!game)return;const steering=game.steer||0;$('steerWheel').style.transform='rotate('+(steering*75).toFixed(1)+'deg)';$('steerValue').textContent=(Math.abs(steering)<.02?'直行':(steering<0?'左 ':'右 ')+Math.round(Math.abs(steering)*100)+'%');$('position').innerHTML=(standings().findIndex(c=>c.player)+1)+'<span>/'+CARS.length+'</span>';$('lap').innerHTML=Math.min(15,Math.floor(game.dist/LENGTH)+1)+'<span>/15</span>';$('clock').textContent=format(game.elapsed);if($('liveClock'))$('liveClock').textContent=format(game.elapsed);$('speedValue').textContent=Math.round(game.speed);$('gear').textContent='GEAR '+(game.speed<1?'N':Math.min(7,Math.floor(game.speed/95)+1));$('powerText').textContent=Math.round(game.power)+'%';$('powerBar').style.width=game.power+'%';$('streak').textContent='連續答對 '+game.streak+' / 5'+(game.charge?' · 升壓渦已儲存':'');$('boost').disabled=!game.charge||game.boost>0;$('boost').classList.toggle('ready',game.charge);$('boost').innerHTML=game.boost>0?`升壓中 <small>${game.boost.toFixed(1)} 秒</small>`:game.charge?'升壓渦 <small>立即啟動 / SPACE</small>':'升壓渦 <small>5連對解鎖</small>';$('throttle').innerHTML='油門 '+(game.throttle?'ON':'OFF')+'<small>↑ / W</small>';}
function curve(z){return Racing3D.sample(z).curvature;}
function shortestGap(d){return ((d+LENGTH/2)%LENGTH+LENGTH)%LENGTH-LENGTH/2;}
function update(dt){
 if(!game||game.paused||game.finished)return;const c=CARS[selected],old=game.dist;game.elapsed+=dt;game.boost=Math.max(0,game.boost-dt);game.collide=Math.max(0,game.collide-dt);
 if(game.track===1&&game.elapsed>=game.nextWave){game.wave={at:game.elapsed,dist:(game.dist+Math.max(90,game.speed/3.6*4.5))%LENGTH,hit:false};game.nextWave=game.elapsed+27;message('巨浪預警！前方路段即將濕滑',4);}
 if(game.wave){let age=game.elapsed-game.wave.at;if(age>15)game.wave=null;else if(age>=4&&age<10&&Math.abs(shortestGap(game.dist-game.wave.dist))<48){game.wetUntil=game.elapsed+6;if(!game.wave.hit){game.wave.hit=true;game.speed*=.82;game.cruise=Math.min(game.cruise,game.speed);game.impactVX-=.65;message('浪湧越過賽道！抓地力下降',3);}}}
 const wet=game.elapsed<game.wetUntil,off=Math.abs(game.x)>.96;
 let target=game.cruise*(game.boost>0?c.boost:1);game.braking=!!keys.brake;
 if(!(game.throttle||keys.gas)||keys.brake)target=0;else if(off)target=Math.min(target,c.max*.30);
 const change=target>game.speed?c.acc:keys.brake?340:off?155:!(game.throttle||keys.gas)?45:120;
 game.speed+=Math.sign(target-game.speed)*Math.min(Math.abs(target-game.speed),change*dt);if(game.speed<.1)game.speed=0;
 if(keys.brake||!(game.throttle||keys.gas)||off)game.cruise=Math.min(game.cruise,game.speed);
 const turn=SteeringInput.axis(Number(!!keys.right)-Number(!!keys.left),dt,!!keys.right||!!keys.left),grip=wet?.43:1;
 game.steer+=(turn-game.steer)*(1-Math.exp(-dt*15));
 const centrifugal=curve(game.dist)*(game.speed/3.6)**2*.0011;
 const desiredVX=game.steer*c.handling*(.48+Math.min(game.speed,450)/450*.70)*Math.min(1,game.speed/60)-centrifugal;
 game.vx+=(desiredVX-game.vx)*(1-Math.exp(-dt*10*grip));game.impactVX*=Math.exp(-dt*3.5);game.x+=(game.vx+game.impactVX)*dt;
 const barrier=Math.min(1.08,(Racing3D.HALF+.7-Racing3D.carSpecs[selected].width/2)/(Racing3D.HALF-1.1));if(Math.abs(game.x)>barrier){const side=Math.sign(game.x);game.x=side*(barrier-.005);game.vx=-side*Math.max(.35,Math.abs(game.vx)*.43);game.impactVX=-side*.8;if(game.collide===0){game.speed*=.76;game.cruise=Math.min(game.cruise,game.speed);game.collide=.55;game.hitCount++;message('撞到護欄！車身反彈減速',1.4);}}
 const desiredYaw=Math.atan2((game.vx+game.impactVX)*(Racing3D.HALF-1.1),Math.max(18,game.speed/3.6))+game.steer*.075;
 game.yaw+=(desiredYaw-game.yaw)*(1-Math.exp(-dt*9));game.dist+=game.speed/3.6*dt;
 for(const ai of game.ai){if(ai.finish!==null)continue;const before=ai.dist,oldLane=ai.lane;
 const corner=Math.min(.18,Math.abs(curve(ai.dist))*3.5),wetAI=game.wave&&game.elapsed-game.wave.at>=4&&game.elapsed-game.wave.at<11&&Math.abs(shortestGap(ai.dist-game.wave.dist))<55;
 const pace=ai.pace*(1-corner)*(wetAI?.78:1)*(1+.025*Math.sin(game.elapsed*.22+ai.i));ai.speed+=Math.sign(pace-ai.speed)*Math.min(Math.abs(pace-ai.speed),CARS[ai.i].acc*.55*dt);
 ai.dist+=ai.speed/3.6*dt;ai.impactLane*=Math.exp(-dt*2.7);const laneTarget=Math.sin(game.elapsed*.14+ai.i*1.7)*.58+ai.impactLane;ai.lane+=(Math.max(-.8,Math.min(.8,laneTarget))-ai.lane)*(1-Math.exp(-dt*1.8));ai.vx=(ai.lane-oldLane)/dt;
 if(ai.dist>=LENGTH*LAPS){ai.finish=game.elapsed-dt+dt*(LENGTH*LAPS-before)/(ai.dist-before);ai.dist=LENGTH*LAPS;}
 const gap0=shortestGap(before-old),gap1=shortestGap(ai.dist-game.dist),swept=gap0*gap1<=0&&Math.abs(gap0-gap1)<30;
 if(game.collide===0&&(Math.abs(gap1)<(Racing3D.carSpecs[selected].length+Racing3D.carSpecs[ai.i].length)*.40||swept)&&Math.abs(ai.lane-game.x)<(Racing3D.carSpecs[selected].width+Racing3D.carSpecs[ai.i].width)*.44/(Racing3D.HALF-1.1)){const side=Math.abs(game.x-ai.lane)>.01?Math.sign(game.x-ai.lane):(ai.i%2?1:-1);const severity=.12+Math.min(.18,Math.abs(game.speed-ai.speed)/600);game.speed*=1-severity;game.cruise=Math.min(game.cruise,game.speed);game.impactVX+=side*1.0;ai.impactLane-=side*.34;ai.speed*=.92;game.collide=.65;game.hitCount++;message('車身碰撞！修正方向恢復路線',1.5);}}
 game.power=100*game.cruise/c.max;
 $('race').classList.toggle('race-hit',game.collide>0);$('roadState').textContent=wet?'濕滑 · 抓地力 43%':game.track===1&&game.wave&&game.elapsed-game.wave.at<4?'巨浪將至 · 留意預警':'乾地 · 抓地力 100%';$('roadState').classList.toggle('wet',wet);
 if(Math.floor(old/LENGTH)<Math.floor(game.dist/LENGTH)&&game.dist<LENGTH*LAPS)message(`第 ${Math.floor(game.dist/LENGTH)+1} 圈 / 15`,2);
 if(game.dist>=LENGTH*LAPS){game.elapsed-=dt*(game.dist-LENGTH*LAPS)/(game.dist-old);game.dist=LENGTH*LAPS;finish();}
 if(msgTime>0){msgTime-=dt;if(msgTime<=0)$('raceMessage').textContent='';}updateHud();
}
function finish(){game.finished=true;game.paused=true;const rows=standings(),rank=rows.findIndex(c=>c.player)+1;try{let h=JSON.parse(localStorage.getItem('geo-race-results')||'[]');h.unshift({name:driver,rank,time:game.elapsed,car:CARS[selected].name,date:new Date().toISOString()});localStorage.setItem('geo-race-results',JSON.stringify(h.slice(0,20)));}catch{}modal(`<div class="q-meta">CHEQUERED FLAG / 完成十五圈</div><h2>${escapeHTML(driver)}，衝線！</h2><div class="result-rank">P${rank}<small> / ${CARS.length}</small></div><p>${CARS[selected].name} · ${format(game.elapsed)}<br>答對 ${game.correct} / ${game.total} 題 · 正確率 ${game.total?Math.round(game.correct/game.total*100):0}%</p><table class="results">${rows.map((c,i)=>`<tr class="${c.player?'you':''}"><td>P${i+1}</td><td>${escapeHTML(c.name)}${c.player?'（你）':''}</td><td>${CARS[c.i].name}</td><td>${c.finish!==null?format(c.finish):'未衝線 · 第'+Math.min(15,Math.floor(c.dist/LENGTH)+1)+'圈'}</td></tr>`).join('')}</table><p style="font-size:12px">分享本場成績</p><div class="share-row"><button id="shareNative">分享…</button><button id="shareWA">WhatsApp</button><button id="shareFB">Facebook</button><button id="shareX">X</button><button id="copy">複製成績</button><button id="card">下載成績卡</button></div><div id="shareStatus" class="feedback"></div><div class="panel-actions"><button id="again" class="primary">返回車庫，再戰一場 →</button></div>`);const text=`🏁 地理方程式Geo｜${driver} 駕駛 ${CARS[selected].name} 完成15圈${Racing3D.TRACKS[selectedTrack].name}！排名 ${rank}/${CARS.length}，用時 ${format(game.elapsed)}，地理答題 ${game.correct}/${game.total}。`;const url=location.protocol==='file:'?'':location.href.split('#')[0];$('shareNative').onclick=async()=>{try{if(navigator.share)await navigator.share({title:'地理方程式Geo',text,url});else await copy(text+' '+url);}catch(e){if(e.name!=='AbortError')$('shareStatus').textContent='未能分享，請使用複製成績。';}};$('shareWA').onclick=()=>window.open('https://wa.me/?text='+encodeURIComponent(text+' '+url),'_blank','noopener,noreferrer');$('shareFB').onclick=()=>{copy(text);window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url),'_blank','noopener,noreferrer');};$('shareX').onclick=()=>window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(text)+'&url='+encodeURIComponent(url),'_blank','noopener,noreferrer');$('copy').onclick=()=>copy(text+' '+url);$('card').onclick=()=>downloadCard(rank);$('again').onclick=()=>{closeModal();garage();game=null;};}
async function copy(s){try{await navigator.clipboard.writeText(s);$('shareStatus').textContent='已複製成績，可貼到社交平台。';}catch{const ta=document.createElement('textarea');ta.value=s;document.body.append(ta);ta.select();const ok=document.execCommand('copy');ta.remove();$('shareStatus').textContent=ok?'已複製成績。':'請使用下載成績卡分享。';}}
function downloadCard(rank){const ca=document.createElement('canvas');ca.width=1000;ca.height=600;const c=ca.getContext('2d');c.fillStyle='#091321';c.fillRect(0,0,1000,600);c.fillStyle='#5cf1e7';c.fillRect(40,50,6,480);c.font='bold 32px sans-serif';c.fillText('地理方程式Geo / 地理大獎賽',80,105);c.fillStyle='#fff';c.font='bold 46px sans-serif';c.fillText(driver.slice(0,18),80,190);c.fillStyle='#5cf1e7';c.font='italic bold 130px sans-serif';c.fillText('P'+rank,80,340);c.font='24px sans-serif';c.fillStyle='#bacbde';c.fillText('15圈完成 · '+format(game.elapsed)+' · '+CARS[selected].name,80,410);c.fillText('地理答題：'+game.correct+' / '+game.total,80,465);c.font='18px sans-serif';c.fillText('知識，就是你的引擎。',80,530);const preview=document.createElement('canvas');preview.width=400;preview.height=260;Racing3D.previewTo(preview,selected,.72,1);c.drawImage(preview,610,210,360,240);const a=document.createElement('a');a.download='地理方程式Geo_成績卡.png';a.href=ca.toDataURL('image/png');a.click();}
const canvas=$('world');let W=1280,H=720,graphicsReady=false;
try{Racing3D.init(canvas);graphicsReady=true;}catch(e){console.error('3D renderer:',e);$('start').disabled=true;$('start').title='此瀏覽器未能啟用WebGL，請改用支援WebGL的瀏覽器。';}
function resize(){const r=canvas.getBoundingClientRect();W=Math.max(1,r.width);H=Math.max(1,r.height);const d=Math.min(window.devicePixelRatio||1,Racing3D.software?1:1.5);canvas.width=Math.round(W*d);canvas.height=Math.round(H*d);if(state==='garage')CARS.forEach((_,i)=>{if($('garageCar'+i))Racing3D.previewTo($('garageCar'+i),i,.72,1);});if(viewer)Racing3D.previewTo($('carViewer'),viewer.i,viewer.angle,viewer.zoom);}
window.addEventListener('resize',resize);
function render(dt){if(state!=='race'||!game||!graphicsReady)return;Racing3D.render(game,selected,dt);Racing3D.drawMap($('minimap'),game,CARS.map(c=>c.color));}
function frame(t){const dt=Math.min((t-lastFrame)/1000||0,.05);lastFrame=t;update(dt);render(dt);if(audioCtx){gain.gain.setTargetAtTime(soundOn&&game&&state==='race'&&!game.paused?.018:0,audioCtx.currentTime,.08);osc.frequency.setTargetAtTime(35+(game?.speed||0)*.32,audioCtx.currentTime,.07);}requestAnimationFrame(frame);}requestAnimationFrame(frame);
