// Animated cartoon-shop login scene. Runs inside a shadow root (isolated from the app CSS).
// opts.login(identifier, password) -> Promise (reject with Error(message) on failure)
// opts.onSuccess(result)           -> called after the success animation
/* eslint-disable */
export function startCartoonScene(root, opts = {}) {
  const disposers = [];
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); disposers.push(() => t.removeEventListener(ev, fn, o)); };
    const W=1280,H=720;
  const canvas=root.querySelector('#world'),ctx=canvas.getContext('2d',{alpha:false});
  const el=id=>root.getElementById(id);
  const stage=el('stage'), enter=el('enter'), hint=el('hint'), login=el('login'), replay=el('replay'),
        copy=el('copy'), shade=el('shade'), header=el('header'), cardBody=el('cardBody');
  let alive=true;disposers.push(()=>{alive=false;});
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let phase='idle', origin=0, tl=0, prevT=0, toastTimer, lastNow=performance.now();
  let mx=0,my=0,px=0,py=0, tiltT=[0,0], tilt=[0,0];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smooth=(a,b,v)=>{let q=clamp((v-a)/(b-a),0,1);return q*q*(3-2*q);};
  const mix=(a,b,p)=>a+(b-a)*p;
  const sin=Math.sin, cos=Math.cos,pi=Math.PI;
  const rand=Math.random;
  function poly(p,fill,stroke=null,sw=1){ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)ctx.lineTo(p[i][0],p[i][1]);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=sw;ctx.strokeStyle=stroke;ctx.stroke();}}
  function rrect(x,y,w,h,rad,color,stroke=null,sw=1){ctx.beginPath();ctx.roundRect(x,y,w,h,Math.max(0,rad));if(color){ctx.fillStyle=color;ctx.fill();}if(stroke){ctx.lineWidth=sw;ctx.strokeStyle=stroke;ctx.stroke();}}
  function rect(x,y,w,h,fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);}
  function ell(x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,pi*2);ctx.fillStyle=color;ctx.fill();}
  function line(x1,y1,x2,y2,color,width=2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();}
  function txt(s,x,y,size,color,weight=700,align='center',spacing=0){ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.font=`${weight} ${size}px 'Baloo 2',Inter,system-ui,sans-serif`;if(ctx.letterSpacing!==undefined)ctx.letterSpacing=`${spacing}px`;ctx.fillText(s,x,y);if(ctx.letterSpacing!==undefined)ctx.letterSpacing='0px';}
  function gradient(x1,y1,x2,y2,stops){let g=ctx.createLinearGradient(x1,y1,x2,y2);for(let [s,c] of stops)g.addColorStop(s,c);return g;}
  function shadow(c='#123c3244',blur=16,dy=5){ctx.shadowColor=c;ctx.shadowBlur=blur;ctx.shadowOffsetY=dy;}
  function clearshadow(){ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;}
  function star(x,y,z,color='#f6c760'){ctx.save();ctx.translate(x,y);ctx.scale(z,z);poly([[0,-12],[3,-3],[12,0],[3,3],[0,12],[-3,3],[-12,0],[-3,-3]],color);ctx.restore();}
  function leaf(x,y,scale=1,live=0){ctx.save();ctx.translate(x,y);ctx.rotate(sin(live*1.3+x)*.04);ctx.scale(scale,scale);line(0,28,0,-15,'#2c7050',5);ell(-16,-4,20,25,'#2d9f65');ell(14,-14,23,28,'#4bbd7f');ell(-1,-28,20,27,'#68cd94');ell(-21,-21,12,16,'#80d9a5');ctx.restore();}
  function shrub(x,y,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ell(0,10,48,11,'#37795922');rrect(-28,-8,56,44,11,'#d2a676');rrect(-24,-8,48,34,9,'#f8d39c');ell(-18,-17,23,24,'#36a76b');ell(12,-26,28,34,'#48bd77');ell(30,-14,18,23,'#68c98a');ell(-3,-42,19,24,'#78d79c');ctx.restore();}
  function cloud(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.globalAlpha*=.82;ell(-35,0,45,17,'#ffffff');ell(0,-11,43,30,'#ffffff');ell(40,2,48,17,'#ffffff');ctx.restore();}
  function sheet(x,y,w,h,color,rot=0){ctx.save();ctx.translate(x,y);ctx.rotate(rot);shadow('#24493429',7,3);rrect(0,0,w,h,4,color);clearshadow();rect(8,9,w-16,4,'#ffffffbc');rect(8,18,w*.45,4,'#ffffff9f');rect(8,27,w*.58,4,'#ffffff75');ctx.restore();}
  function box3d(x,y,w,h,depth,front,side,top){poly([[x,y],[x+depth,y-depth],[x+w+depth,y-depth],[x+w,y]],top);poly([[x+w,y],[x+w+depth,y-depth],[x+w+depth,y+h-depth],[x+w,y+h]],side);rrect(x,y,w,h,4,front);}

  function cartoonPerson(x,y,s,walkCycle=0,reach=0,door=0,wave=0,live=0){
    ctx.save();
    ctx.translate(x,y);
    ctx.scale(s,s);
    const th = walkCycle*pi*2, gait = Math.sin(th);
    const amt = (window.__walkAmt||0);
    const bounce = (1-Math.abs(Math.cos(th)))*3*amt + Math.sin(live*2.2)*1.0*wave;
    const lean = .045*amt + .05*reach;
    ctx.translate(0,bounce);
    ctx.rotate(lean);

    function limb(x1,y1,len1,a1,len2,a2,color,width=8,hc){
      ctx.save();
      ctx.translate(x1,y1);
      ctx.rotate(a1);
      line(0,0,0,len1,color,width);
      ell(0,len1, width*.34, width*.34, color);
      ctx.translate(0,len1);
      ctx.rotate(a2);
      line(0,0,0,len2,color,width*.96);
      ell(0,len2+1, width*.46, width*.46, hc||color);
      ctx.restore();
    }

    ell(0,8,22,7,'#173d3428');

    const sw = .4*amt;
    const backArm1 = .06 + .36*amt*gait;
    const backArm2 = -(.18 + .28*amt*Math.max(0,-gait));
    let frontArm1 = .1 - .36*amt*gait;
    let frontArm2 = -(.2 + .3*amt*Math.max(0,gait));
    if(wave>0){
      frontArm1 = mix(frontArm1,-2.5+Math.sin(live*8)*0.38,wave);
      frontArm2 = mix(frontArm2,-0.35+Math.sin(live*8+1)*0.3,wave);
    }
    // reach: solve the arm to the door handle (2-bone IK)
    const DT = window.__doorT;
    if(reach>.001 && DT){
      const cl=Math.cos(-lean), sl=Math.sin(-lean);
      const wx=(DT[0]-x)/s, wy=(DT[1]-y)/s - bounce;
      const lx=wx*cl - wy*sl, ly=wx*sl + wy*cl;
      const dx=lx-14, dy=ly+64, L1=22, L2=20;
      let d=Math.hypot(dx,dy); const dd=Math.min(d, (L1+L2)*.985);
      const phi=Math.atan2(-dx,dy);
      const al=Math.acos(clamp((L1*L1+dd*dd-L2*L2)/(2*L1*dd),-1,1));
      let best=null;
      for(const sg of [1,-1]){
        const A1=phi+sg*al, ex=-Math.sin(A1)*L1, ey=Math.cos(A1)*L1;
        const tx=dx*(dd/d)-ex, ty=dy*(dd/d)-ey;
        const A2=Math.atan2(-tx,ty);
        if(!best||ey>best.ey) best={A1,a2:A2-A1,ey};
      }
      frontArm1=mix(frontArm1,best.A1,reach);
      frontArm2=mix(frontArm2,best.a2,reach);
    }
    const leftLeg1 = .04 - sw*gait;
    const leftLeg2 = amt*(.12 + .85*Math.pow(Math.max(0,Math.cos(th)),1.4));
    const rightLeg1 = -.04 + sw*gait;
    const rightLeg2 = amt*(.12 + .85*Math.pow(Math.max(0,-Math.cos(th)),1.4));

    limb(-14,-64,22,backArm1,20,backArm2,'#1b2640',9,'#e6b08c');

    // --- business suit: navy blazer, white shirt, tie ---
    shadow('#0b1a3033',9,4);
    rrect(-22,-91,44,52,9,gradient(-22,-91,22,-39,[[0,'#26365a'],[.5,'#1b2640'],[1,'#121a2e']]));
    clearshadow();
    // shirt V
    poly([[-8,-91],[0,-60],[8,-91]],'#f7f9fc');
    poly([[-8,-91],[-3,-88],[0,-80]],'#dfe5ee'); poly([[8,-91],[3,-88],[0,-80]],'#dfe5ee');
    // tie
    poly([[-2.4,-87],[2.4,-87],[1.6,-84],[-1.6,-84]],'#8d1342');
    poly([[-1.8,-84],[1.8,-84],[3.4,-66],[0,-60],[-3.4,-66]],'#b01a57');
    // lapels
    poly([[-8,-91],[-18,-78],[-9,-62],[-2,-72],[-6,-84]],'#2f4170');
    poly([[8,-91],[18,-78],[9,-62],[2,-72],[6,-84]],'#2f4170');
    ctx.globalAlpha=.4; line(-8,-91,-18,-78,'#6f82b3',1); line(8,-91,18,-78,'#6f82b3',1); ctx.globalAlpha=1;
    // centre seam + buttons + pocket square
    ctx.globalAlpha=.5; line(0,-60,0,-40,'#0c1424',1.2); ctx.globalAlpha=1;
    ell(4,-54,1.3,1.3,'#9aa8c7'); ell(4,-47,1.3,1.3,'#9aa8c7');
    poly([[-17,-64],[-11,-64],[-11,-61],[-17,-61]],'#f4f6fa');
    // company pin
    ell(-13,-74,1.6,1.6,'#ec1c8c');

    // neck
    rrect(-4.5,-48,9,10,3,gradient(0,-48,0,-38,[[0,'#d7a07f'],[1,'#e9b895']]));

    // ears
    ell(-16.5,-111,3,4.6,'#e2a984'); ell(18.5,-111,3,4.6,'#e2a984');
    // back hair
    ell(1,-118,17.5,15,'#0b0b10');
    // face with soft shading
    const fg=ctx.createRadialGradient(-3,-117,3,1,-111,22);
    fg.addColorStop(0,'#eec29b'); fg.addColorStop(.7,'#e0a980'); fg.addColorStop(1,'#c98e66');
    ctx.beginPath(); ctx.moveTo(-16,-116); ctx.bezierCurveTo(-16,-128,18,-128,18,-116); ctx.lineTo(17,-106); ctx.bezierCurveTo(16,-98,8,-91.5,1,-91); ctx.bezierCurveTo(-6,-91.5,-14,-98,-15,-106); ctx.closePath(); ctx.fillStyle=fg; ctx.fill(); ctx.globalAlpha=.2; ctx.beginPath(); ctx.moveTo(-14.5,-104); ctx.bezierCurveTo(-12,-95,-5,-92.5,1,-92); ctx.bezierCurveTo(7,-92.5,14,-95,16.5,-104); ctx.bezierCurveTo(12,-100,8,-99,1,-99); ctx.bezierCurveTo(-6,-99,-11,-100,-14.5,-104); ctx.fillStyle='#3a2418'; ctx.fill(); ctx.globalAlpha=1; ctx.globalAlpha=0; ctx.globalAlpha=.18; line(-14,-108,-9,-97,'#a8704f',2); line(16,-108,11,-97,'#a8704f',2); ctx.globalAlpha=1;
    // hair top + fringe with strands
    const hg=gradient(-16,-132,16,-110,[[0,'#2b2b33'],[1,'#0b0b10']]);
    poly([[-17.5,-109],[-18.5,-123],[-13,-133],[-3,-137],[9,-136],[18,-130],[19.5,-120],[17.5,-108],[15,-116],[9,-121],[0,-122],[-8,-119],[-14,-113]],hg); ctx.globalAlpha=.4; line(-8,-136,4,-137,'#ffffff',1.6); line(2,-136,12,-132,'#ffffff',1.2); ctx.globalAlpha=1;
    ctx.globalAlpha=.35; line(-10,-128,-3,-120,'#1f120a',1); line(-2,-131,3,-122,'#1f120a',1); line(6,-130,10,-121,'#1f120a',1); ctx.globalAlpha=1;
    ctx.globalAlpha=.25; line(-9,-128,-1,-125,'#ffffff',1.4); ctx.globalAlpha=1;
    // hair clip / bow (kept, smaller and subtler)
    
    // eyebrows
    line(-10.5,-118,-2.5,-119,'#2a1a10',2.2); line(4.5,-119,12.5,-118,'#2a1a10',2.2);
    // eyes: white, iris, pupil, lash, highlight
    const blink = (live%3.4)<0.12 ? 0.2 : 1;
    ell(-6.5,-113,4,3.2*blink,'#ffffff'); ell(8.5,-113,4,3.2*blink,'#ffffff');
    ell(-6,-113,2.5,2.7*blink,'#3a2518'); ell(8,-113,2.5,2.7*blink,'#3a2518');
    ell(-6,-113,1.2,1.3*blink,'#120a06'); ell(8,-113,1.2,1.3*blink,'#120a06');
    ell(-5.2,-114.2,.7,.7*blink,'#fff'); ell(8.8,-114.2,.7,.7*blink,'#fff');
    
    // nose with soft shadow
    ctx.globalAlpha=.35; ell(2,-106,2.6,1.4,'#b9785a'); ctx.globalAlpha=1;
    line(1,-112,1.6,-107,'#d09273',1.1);
    // subtle cheeks
    ctx.globalAlpha=.22;  ctx.globalAlpha=1;
    // lips
    ctx.beginPath(); ctx.moveTo(-3,-100.5); ctx.quadraticCurveTo(1,-100.5+1.5+wave,6,-100.5); ctx.quadraticCurveTo(1,-98.2+wave*1.2,-4,-100.5); ctx.fillStyle='#b5675a'; ctx.fill(); ctx.globalAlpha=.9; ctx.beginPath(); ctx.moveTo(-2.5,-100.3); ctx.quadraticCurveTo(1,-99+wave,4.5,-100.3); ctx.quadraticCurveTo(1,-98.6+wave,-2.5,-100.3); ctx.fillStyle='#fff'; ctx.fill(); ctx.globalAlpha=1;
    

    limb(14,-64,22,frontArm1,20,frontArm2,'#1b2640',9,'#e6b08c');



    limb(-8,-43,24,leftLeg1,19,leftLeg2,'#1a2238',9);
    limb(7,-43,24,rightLeg1,19,rightLeg2,'#141b2e',9);
    {const lax=-8-Math.sin(leftLeg1)*24-Math.sin(leftLeg1+leftLeg2)*19, lay=-43+Math.cos(leftLeg1)*24+Math.cos(leftLeg1+leftLeg2)*19; ell(lax+3,lay+1,8.5,4,'#0c0c10');}
    {const rax=7-Math.sin(rightLeg1)*24-Math.sin(rightLeg1+rightLeg2)*19, ray=-43+Math.cos(rightLeg1)*24+Math.cos(rightLeg1+rightLeg2)*19; ell(rax+3,ray+1,8.5,4,'#0c0c10');}

    if(reach>.62 && door<.24){ star(32,-63,.28,'#fff0a1'); }
    ctx.restore();
  }


  function heart(x,y,s,color,rot=0){return;ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(s,s);ctx.beginPath();ctx.moveTo(0,6);ctx.bezierCurveTo(-14,-4,-8,-16,0,-8);ctx.bezierCurveTo(8,-16,14,-4,0,6);ctx.fillStyle=color;ctx.fill();ctx.restore();}
  function cat(x,y,s,live){
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);
    ell(0,2,34,8,'#173d3424');
    // wagging tail
    ctx.save();ctx.translate(28,-14);ctx.rotate(-.5+sin(live*4)*.4);line(0,0,22,-6,'#2b1020',9);line(0,0,22,-6,'#ffb347',5);ctx.restore();
    ell(0,-18,28,22,'#2b1020');ell(0,-18,25.5,19.5,'#ffb347');
    ell(0,-8,15,11,'#fff3df');
    // head
    const hb=sin(live*2.2)*1.5;
    ctx.translate(0,hb);
    poly([[-26,-48],[-14,-72],[-4,-50]],'#2b1020');poly([[26,-48],[14,-72],[4,-50]],'#2b1020');
    poly([[-23,-50],[-14,-67],[-7,-51]],'#ffb347');poly([[23,-50],[14,-67],[7,-51]],'#ffb347');
    poly([[-20,-52],[-14,-62],[-10,-52]],'#ff9ec7');poly([[20,-52],[14,-62],[10,-52]],'#ff9ec7');
    ell(0,-40,29,24,'#2b1020');ell(0,-40,26.5,21.5,'#ffb347');
    ell(0,-33,13,9,'#fff3df');
    const bl=(live%3.1)<.12?.15:1;
    ell(-11,-43,5,6*bl,'#2b1020');ell(11,-43,5,6*bl,'#2b1020');
    ell(-9.5,-45,1.8,1.8*bl,'#fff');ell(12.5,-45,1.8,1.8*bl,'#fff');
    ell(-19,-34,5,3,'#ff8fb8');ell(19,-34,5,3,'#ff8fb8');
    poly([[-2.5,-36],[2.5,-36],[0,-32.5]],'#ff6f9f');
    ctx.beginPath();ctx.moveTo(0,-32);ctx.quadraticCurveTo(-4,-27,-8,-31);ctx.moveTo(0,-32);ctx.quadraticCurveTo(4,-27,8,-31);ctx.strokeStyle='#2b1020';ctx.lineWidth=1.6;ctx.stroke();
    line(-26,-36,-38,-39,'#2b1020',1.4);line(-26,-32,-38,-31,'#2b1020',1.4);line(26,-36,38,-39,'#2b1020',1.4);line(26,-32,38,-31,'#2b1020',1.4);
    // bow
    poly([[0,-60],[-11,-68],[-11,-52]],'#ec1c8c');poly([[0,-60],[11,-68],[11,-52]],'#ec1c8c');ell(0,-60,3.5,3.5,'#ffe600');
    ctx.restore();
  }

  function exterior(t,live){
    const R0=1.38, WD=1.9;
    const wp=clamp((RT-R0)/WD,0,1), pe=.7*wp+.3*smooth(0,1,wp);
    const enter=smooth(2.5,3.3,t);
    const reach=smooth(R0+WD-.15,R0+WD+.6,RT)*(1-smooth(2.45,2.85,t));
    const door=smooth(2.08,2.92,t), fly=smooth(2.72,4.08,t);
    const wave=1-smooth(1.3,1.5,RT);
    const walkAmt=Math.max(Math.min(1,wp*7,(1-wp)*7)*(wp>0&&wp<1?1:0), Math.sin(clamp(enter,0,1)*pi));
    const zoom=mix(1,3.34,fly);
    const cx=644,cy=410;
    ctx.save();ctx.translate(cx,cy);ctx.scale(zoom,zoom);ctx.translate(-cx,-cy);
    rect(0,0,W,H,gradient(0,0,0,650,[[0,'#aee4f6'],[.55,'#dff7f3'],[1,'#b8dccd']]));
    // sun with slow rays
    ctx.save();ctx.translate(1085,110);ctx.rotate(live*.08);
    for(let i=0;i<12;i++){ctx.rotate(pi/6);poly([[0,-88],[9,-122],[-9,-122]],'#fff4c870');}
    ctx.restore();
    ell(1085,110,76,76,'#f7eb9e');ell(1085,110,58,58,'#fff4c8');
    cloud(((215+live*9)%1500)-100,85,1.07);cloud(((970+live*5)%1500)-100,160,.64);cloud(((1170+live*7)%1500)-100,78,.86);
    // a little bird pair
    for(let b=0;b<2;b++){const bx=((live*38+b*60)%1500)-120,by=120+b*18+sin(live*2+b)*6,f=sin(live*12+b)*6;
      ctx.beginPath();ctx.moveTo(bx-9,by-f*.4);ctx.quadraticCurveTo(bx-4,by-6,bx,by);ctx.quadraticCurveTo(bx+4,by-6,bx+9,by-f*.4);ctx.strokeStyle='#2c5c4e';ctx.lineWidth=2;ctx.stroke();}
    rect(0,463,1280,80,'#c7e4d3');
    for(let i=0;i<14;i++){const x=i*106-60;rect(x,414+(i%3)*24,82,110,'#b4d7c755');}
    rect(0,555,W,165,gradient(0,555,0,720,[[0,'#d5d6bc'],[1,'#c4bea3']]));
    rect(0,572,W,14,'#fff7e5');
    for(let i=0;i<16;i++)line(i*90,594,i*90+33,720,'#a7b6a244',2);
    shadow('#1c64594d',33,20);rrect(174,127,937,464,29,'#f6f0db');clearshadow();
    rrect(170,123,937,456,26,gradient(170,110,1110,580,[[0,'#fffdf0'],[.63,'#fff4dd'],[1,'#e5e5cf']]));
    rrect(174,128,929,135,25,gradient(0,130,0,280,[[0,'#167f59'],[1,'#135c43']]));
    rrect(200,151,877,92,16,'#1b8761');
    rrect(221,170,838,63,13,'#16583f');
    // chasing marquee bulbs
    const chase=Math.floor(live*9);
    for(let i=0;i<40;i++){
      const on=(i+chase)%3===0, bx=212+i*22.2;
      for(const by of [141,246]){
        if(on){ctx.shadowColor='#ffe78a';ctx.shadowBlur=12;}
        ell(bx,by,3.6,3.6,on?'#fff6b8':'#e9cf8a77');
        clearshadow();
      }
    }
    {ctx.save();ctx.font="900 44px 'Baloo 2',Inter,system-ui,sans-serif";if(ctx.letterSpacing!==undefined)ctx.letterSpacing='4px';const tw=ctx.measureText('PRINTZ SHOP').width;ctx.restore();const ix=Math.round(652-tw/2-58);rrect(ix,180,41,40,10,'#d9f8d9');rrect(ix+7,187,27,13,3,'#13865a');rrect(ix+6,201,29,13,3,'#f9fefa');rect(ix+11,208,19,8,'#95d9b8');}
    // neon PRINTZ with occasional flicker
    const fl=((live%6)<0.09||((live+.3)%6)<0.05)?0.25:1;
    ctx.shadowColor='#8dffcf';ctx.shadowBlur=26*fl;
    txt('PRINTZ SHOP',652,203,44,fl<1?'#d9eee3':'#fffbed',900,'center',4);
    ctx.shadowBlur=10*fl;txt('PRINTZ SHOP',652,203,44,fl<1?'#d9eee3':'#fffbed',900,'center',4);
    clearshadow();
    txt('ONE STOP SHOP',900,205,13,'#c1efd9',800,'center',2.2);
    rrect(195,250,889,29,8,'#f5ead2');
    for(let i=0;i<20;i++){const x=202+i*44;poly([[x,260],[x+44,260],[x+35,302],[x-9,302]],i%2?'#fff5dc':'#2da46f');}
    rrect(194,292,888,10,4,'#d4e6ca');
    shadow('#23544955',12,5);rrect(240,314,259,260,12,'#205b49');rrect(792,314,263,260,12,'#205b49');rrect(516,304,263,278,12,'#216348');clearshadow();
    rrect(247,322,244,242,7,gradient(248,322,469,548,[[0,'#a7e5db'],[.6,'#e0f4d7'],[1,'#91bcad']]));
    // moving glass glint
    ctx.save();ctx.beginPath();ctx.rect(247,322,244,242);ctx.clip();
    const gx=((live*70)%700)-200;poly([[gx,322],[gx+40,322],[gx-40,564],[gx-80,564]],'#ffffff55');ctx.restore();
    poly([[253,328],[359,328],[280,560],[253,560]],'#ffffff50');
    rrect(266,454,211,76,5,'#dfc49f');line(266,530,477,530,'#987b56',6);
    sheet(276,384,62,75,'#ff9e7e',-.05+sin(live*1.5)*.02);sheet(354,383,47,64,'#fff5a2',.04);sheet(416,399,49,63,'#92b8ef',-.05-sin(live*1.5)*.02);
    txt('CREATE',306,426,13,'#ffffff',900);txt('PRINT',379,419,12,'#3e7957',900);txt('PACK',441,432,11,'#ffffff',900);
    box3d(286,468,60,48,13,'#80cb9e','#4c9976','#b9f1ce');box3d(367,477,41,38,11,'#f6b565','#c48950','#ffe6a7');
    line(257,379,481,379,'#dffaf05c',2);
    rrect(801,322,246,242,7,gradient(801,322,1046,564,[[0,'#b9e5d6'],[1,'#6fc0af']]));
    poly([[808,330],[894,330],[843,562],[808,562]],'#ffffff3b');
    rrect(834,427,180,85,11,'#2d8971');rrect(845,413,159,51,8,'#f6fff1');
    rrect(852,399,145,39,7,'#398f79');rect(865,408,123,6,'#12553f');
    // print head sweeping
    rrect(870+ (sin(live*3)*.5+.5)*95,404,22,14,3,'#ffd36e');
    const outY=477+((live*14)%22);
    sheet(878,outY,91,51,'#fff4d2',0);txt('HELLO',924,outY+13,17,'#159a68',900);
    rrect(854,510,135,13,6,'#1b6e58');
    rrect(523,311,251,260,6,gradient(0,311,0,580,[[0,'#7bd0ae'],[.4,'#338a6c'],[1,'#1b5648']]));
    poly([[541,319],[754,319],[706,512],[593,512]],'#c5e9cb');
    rect(600,389,93,150,'#64bd8d');
    // warm light spilling from inside as doors open
    if(door>0){ctx.save();ctx.globalAlpha=door*.85;const rg=ctx.createRadialGradient(648,430,5,648,430,190);rg.addColorStop(0,'#fffbe0');rg.addColorStop(1,'#fffbe000');ctx.fillStyle=rg;ctx.fillRect(523,311,251,260);ctx.restore();}
    line(549,338,612,530,'#e6f8db9a',2);line(748,339,691,530,'#e6f8db9a',2);
    const lw=mix(121,7,door),rw=mix(121,7,door), leftX=522,rightX=775;
    poly([[leftX,314],[leftX+lw,315+door*5],[leftX+lw,565-door*8],[leftX,568]],'#beece0ce','#e9fff4',3);
    poly([[rightX-rw,315+door*5],[rightX,314],[rightX,568],[rightX-rw,565-door*8]],'#b0e7dcdb','#e9fff4',3);
    line(leftX+lw*.78,320,leftX+lw*.78,561,'#fafff099',3);
    line(rightX-rw*.78,320,rightX-rw*.78,560,'#fafff099',3);
    if(door<.94){rrect(leftX+lw-24,486,6,28,3,'#fffde8');rrect(rightX-rw+17,486,6,28,3,'#fffde8');}
    // OPEN sign on door
    if(door<.3){ctx.save();ctx.globalAlpha=1-door/.3;ctx.translate(585,380+sin(live*2)*2);ctx.rotate(sin(live*1.6)*.06);line(0,-14,-14,0,'#e9fff4',1.5);line(0,-14,14,0,'#e9fff4',1.5);rrect(-26,0,52,20,5,'#f58d75');txt('OPEN',0,10,10,'#fff',900,'center',1.5);ctx.restore();}

    const personX = mix(336, 578, pe) + enter*52;
    const personY = mix(568, 554, pe) - enter*6;
    const personScale = mix(.88, .98, pe) - enter*.1;
    window.__walkAmt = walkAmt;
    window.__doorT = [leftX+lw-21, 500];
    ctx.save(); ctx.globalAlpha = 1-smooth(.75,1,enter);
    if(ctx.globalAlpha>.01) cartoonPerson(personX, personY, personScale, pe*2.6+enter*.8, reach, door, wave, live);
    ctx.restore();
    
    if(reach>.55 && door<.35){ star(leftX+lw-20,448,.28,'#ffe593'); star(leftX+lw-10,462,.18,'#fff6c3'); }
    // speech bubble while waving
    if(wave>0.02){
      ctx.save();ctx.globalAlpha=wave;
      const bx=personX+20,by=personY-152+sin(live*2.4)*3;
      shadow('#12453926',12,5);rrect(bx,by-22,138,40,14,'#ffffff');clearshadow();
      poly([[bx+14,by+16],[bx+28,by+16],[bx+6,by+32]],'#ffffff');
      txt('Hi! Come on in 👋',bx+69,by-2,13,'#145c42',850);
      ctx.restore();
    }
    rrect(537,310,223,25,5,'#1a7451cc');txt('WELCOME  •  WALK RIGHT IN',650,322,9,'#effee9',850,'center',1.5);

    for(let i=0;i<7;i++){
      const px2 = 274 + i*92, sw=sin(live*2.2+i)*3;
      line(px2,286,px2+52,286,'#6fa88a',2);
      poly([[px2+10,286],[px2+23+sw,307],[px2+36,286]],['#f4a26f','#7cc9da','#f0cf72','#7fd1a4','#c1a1ea','#8db8ec','#f49893'][i]);
    }
    rrect(515,571,266,8,4,'#d5ad84');
    line(195,559,1078,559,'#ebd9b9',3);
    shrub(210,535,.77);shrub(1092,535,.86);heart(985+sin(live*2)*6,490-((live*20)%40),.9,'#ff5fae',sin(live*2)*.3);
    poly([[545,585],[746,585],[820,629],[476,629]],'#c7a77e');
    poly([[555,588],[739,588],[776,610],[518,610]],'#376e55');
    txt('OPEN FOR IDEAS',648,598,14,'#d6ffe0',900,'center',1.5);
    leaf(100,512,1.18,live);leaf(1169,505,.94,live);
    for(let k=0;k<5;k++){const p=((live*.22)+k/5)%1;ctx.save();ctx.globalAlpha=sin(p*pi);heart(470+k*85+sin(live*2+k)*10,330-p*120,.8+k%2*.4,['#ff5fae','#ffd400','#5ec8f5','#ff8fb8','#c1a1ea'][k],sin(live+k)*.4);ctx.restore();}star(1120,260,1.05+sin(live*3)*.12,'#f9ca69');star(153,253,.65+sin(live*3+1)*.1,'#8bcfaf');
    if(t<2.9){const bob=sin(live*3)*4;star(806,345+bob,.72,'#f6ba64');star(489,355-bob,.55,'#f7ca6b');}
    ctx.restore();
  }

  function printer(x,y,s,time,variant='main'){
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);
    const shake=sin(time*40)*.6;ctx.translate(shake,0);
    ell(178,247,195,28,'#1f5d5544');
    rrect(35,172,42,68,5,'#214b46');rrect(284,172,42,68,5,'#214b46');
    shadow('#225b4f55',15,5);
    poly([[25,80],[68,35],[317,35],[359,80]],'#c9e8db');
    rrect(24,78,333,124,17,gradient(0,70,0,207,[[0,'#f5f9eb'],[1,'#b2cfc0']]));
    clearshadow();
    rrect(42,112,300,52,9,'#2b5d53');rrect(50,120,285,32,5,'#0b3f37');
    {const bl=(time%3.3)<.12?.12:1;
      ell(120,133,10,11*bl,'#8dffd0');ell(235,133,10,11*bl,'#8dffd0');
      ell(123,130,3.4,3.4*bl,'#fff');ell(238,130,3.4,3.4*bl,'#fff');
      ell(88,144,9,4,'#ff8fb8');ell(268,144,9,4,'#ff8fb8');
      ctx.beginPath();ctx.moveTo(158,142);ctx.quadraticCurveTo(177,156+sin(time*3)*2,196,142);ctx.strokeStyle='#8dffd0';ctx.lineWidth=4;ctx.lineCap='round';ctx.stroke();
      heart(303,134+sin(time*4)*2,.8,'#ff5fae');}
    rrect(26,162,329,44,10,'#e9f5e7');
    rrect(44,171,180,9,5,'#acc9bd');
    rrect(271,95,63,20,7,'#288864');
    const lit=Math.floor(time*4)%3;
    ell(285,105,4,4,lit===0?'#fff3a0':'#c7b55a');ell(303,105,4,4,lit===1?'#b6ffd0':'#5aa577');ell(322,105,4,4,lit===2?'#ffd2b8':'#c27552');
    txt(variant==='main'?'DIGITAL PRESS':'LARGE FORMAT',134,99,13,'#316351',850,'center',1.3);
    rrect(101,182,156,11,6,'#6c9989');
    const yy=173+sin(time*3.8)*4;
    poly([[113,yy],[242,yy],[238,yy+60],[118,yy+60]],'#fff8db');
    rect(127,yy+15,105,14,'#f4a88b');rect(127,yy+35,72,8,'#86d9b5');
    rrect(90,231,184,12,6,'#3f816a');
    ctx.restore();
  }
  function shelves(){
    rrect(910,199,280,214,13,'#e8dfc9');
    rrect(924,216,250,16,6,'#a88d6e');rrect(924,307,250,16,6,'#a88d6e');rrect(924,398,250,13,6,'#a88d6e');
    for(let i=0;i<6;i++){
      const color=['#f4b55c','#85cbb8','#7eafdf','#f28e85','#caace8','#9dcf92'][i];
      rrect(936+i*39,243+(i%2)*4,31,64-(i%2)*4,3,color);
      rect(944+i*39,251+(i%2)*4,15,2,'#fff9');
    }
    for(let i=0;i<4;i++){
      rrect(936+i*60,331,51,60,4,['#f39a7f','#7cbec8','#f2c479','#7dcaab'][i]);
      txt(['CATALOG','BAGS','CARDS','BOXES'][i],961+i*60,363,7,'#ffffff',750);
    }
    for(let i=0;i<5;i++){
      rrect(924+i*49,175,29,43,10,['#d3a8f0','#f8b96e','#86d4b0','#f4a2ad','#7cbadf'][i]);
      ell(938+i*49,175,14,6,'#fff9ea');
    }
  }
  function interior(t,live){
    const advance=smooth(3.4,5.55,t), z=mix(.93,1.13,advance);
    ctx.save();ctx.translate(640,365);ctx.scale(z,z);ctx.translate(-640,-365);
    rect(0,0,W,H,gradient(0,0,0,H,[[0,'#f4fbef'],[1,'#e4f1d5']]));
    rect(239,77,801,403,gradient(0,90,0,482,[[0,'#e3f7e1'],[1,'#b2d9bf']]));
    poly([[0,0],[310,85],[300,476],[0,610]],gradient(0,0,300,600,[[0,'#8fbea9'],[1,'#d1e4c4']]));
    poly([[1280,0],[970,85],[978,476],[1280,610]],gradient(970,0,1280,610,[[0,'#bce6cb'],[1,'#83bca7']]));
    poly([[0,0],[1280,0],[978,91],[304,91]],gradient(0,0,0,95,[[0,'#fbfff1'],[1,'#d0eacd']]));
    for(let j=0;j<7;j++){ const x=j*195; line(x,0,mix(x,640,.24),87,'#c3deca',2); }
    for(const x of [390,660,920]){
      poly([[x-65,10],[x+67,10],[x+37,44],[x-37,44]],'#ffffff');
      line(x-36,44,x+35,44,'#ffedb0',7);
      ctx.save();ctx.globalAlpha=.16+sin(live*2+x)*.03;poly([[x-36,44],[x+36,44],[x+120,470],[x-120,470]],'#fff6c9');ctx.restore();
    }
    poly([[300,470],[975,470],[1280,720],[0,720]],gradient(0,468,0,720,[[0,'#d4bd96'],[1,'#f3dbb1']]));
    for(let j=-10;j<=10;j++)line(640+j*34,470,640+j*124,720,'#b8916e44',2);
    for(let y of [501,541,602,697])line(0,y,1280,y,'#b994704a',2);
    line(298,479,973,479,'#eafce4',8);
    rrect(335,137,496,193,15,'#d5e8cf');
    rrect(344,147,475,170,11,'#fdf7e7');
    rrect(359,162,442,138,8,'#f8fbf1');
    rrect(371,177,151,110,7,'#f9af88');
    rrect(529,177,146,110,7,'#8dcfab');
    rrect(683,177,101,110,7,'#86b9ea');
    txt('BIG IDEAS',446,203,19,'#ffffff',900,'center',1.0);
    txt('BOLD PRINTS',447,228,11,'#fff',700,'center',.5);
    txt('CREATE',601,205+sin(live*2)*2,21,'#fff',900);
    txt('MORE',601,230+sin(live*2+.6)*2,18,'#fff',900);
    ctx.save();ctx.translate(736,215);ctx.scale(1+sin(live*4)*.06,1+sin(live*4)*.06);txt('WOW!',0,0,19,'#fef9ea',900);ctx.restore();
    rrect(30,160,300,119,12,'#f5ecda');
    txt('DESIGN',180,199,24,'#2a8c67',900,'center',2.5);
    txt('PRINT',180,235,21,'#276d54',900,'center',2.5);
    for(let j=0;j<5;j++)star(58+j*55,269+(j%2)*9,.33+sin(live*3+j)*.06,'#ecbb6b');
    printer(3,346,.98,live,'main');
    line(16,311,224,287,'#30654d',4);
    for(let j=0;j<5;j++){const x=36+j*41;ctx.save();ctx.translate(x,309-j*3);ctx.rotate(.03+sin(live*1.8+j)*.07);rrect(0,0,27,34,2,['#f4b99c','#8acde1','#f5db80','#b5aadf','#83d7ae'][j]);rect(8,8,12,4,'#ffffffae');ctx.restore();}
    shelves();
    printer(690,340,.56,live+1,'small');
    // flying freshly printed sheets
    for(let k=0;k<6;k++){
      const p=((live*.32)+k/6)%1;
      const x=mix(200,520,p), y=540-sin(p*pi)*175, a=sin(p*pi);
      ctx.save();ctx.globalAlpha=a;ctx.translate(x,y);ctx.rotate(p*5+k);
      rrect(-13,-17,26,34,3,'#fffdf2');rect(-8,-11,16,5,['#f4a88b','#86d9b5','#7cbadf','#f2c479','#c1a1ea','#f58d75'][k]);rect(-8,-2,11,3,'#cfe7da');rect(-8,4,14,3,'#cfe7da');
      ctx.restore();
    }
    ell(637,600,222,28,'#2c644d2c');
    poly([[440,471],[501,431],[788,431],[833,471]],'#aee2c1');
    shadow('#22513c55',12,8);
    rrect(443,468,388,119,14,gradient(450,470,810,580,[[0,'#1f8b62'],[.8,'#187658'],[1,'#125943']]));clearshadow();
    rrect(480,489,308,81,8,'#25966b');
    rrect(564,498,144,61,7,'#197251');
    ctx.shadowColor='#8dffcf';ctx.shadowBlur=14+sin(live*3)*6;
    txt('PRINTZ SHOP',636,524,21,'#fdf4df',900,'center',2.2);clearshadow();
    txt('ONE STOP SHOP FOR ALL YOUR PRINTING NEEDS',638,548,7,'#d2f6de',850,'center',.8);
    rrect(734,395,56,61,6,'#225f50');rrect(741,402,43,43,3,'#9adfbd');
    // little live bar chart on the terminal
    for(let b=0;b<4;b++){const h=8+(sin(live*2.5+b*1.3)*.5+.5)*24;rect(746+b*9,441-h,6,h,['#12895b','#f9b660','#f58d75','#7cbadf'][b]);}
    rect(756,452,15,12,'#1e6651');rrect(744,460,42,7,3,'#3c8966');
    sheet(505,439,68,28,'#fbd3a5',-.12);sheet(534,445,71,29,'#ff99a0',.1);
    star(845,109,.66+sin(live*3)*.12,'#ffcb6d');star(218,139,.53+sin(live*3+2)*.1,'#f8c87a');
    for(let k=0;k<16;k++){
      const x=50+k*79+sin(live*1.3+k)*14, y=98+(k%4)*60+sin(live*2+k)*12;
      ell(x,y,2+(k%2),2+(k%2),['#ffffffa0','#e1f5da80','#f9ddb080','#c8eaff80'][k%4]);
    }
    ctx.restore();
  }

  const R0W=1.38, DW=2.7;
  let RT=0;
  function draw(t,live){
    RT=t; t = t<R0W ? t : (t<R0W+DW ? R0W : t-DW);
    t=clamp(t,0,9.1);
    ctx.clearRect(0,0,W,H);
    // cinematic camera: slow dolly-in that follows the walk, relaxes before the fly-through
    {const dp=smooth(1.38,4.1,RT), relax=smooth(2.4,3.2,t), cs=1+.09*dp*(1-relax);
     const fx=mix(640,560,dp), fy=mix(360,420,dp);
     ctx.save(); ctx.translate(640,360); ctx.scale(cs,cs); ctx.translate(-mix(640,fx,1-relax),-mix(360,fy,1-relax)); exterior(t,live); ctx.restore();}
    const ip=smooth(3.30,4.28,t);
    if(ip>0){ctx.save();ctx.globalAlpha=ip;interior(t,live);ctx.restore();}
    // light burst as the camera flies through the door
    const b=smooth(2.45,3.05,t)*(1-smooth(3.25,4.3,t));
    if(b>0){const g=ctx.createRadialGradient(648,440,10,648,440,820);g.addColorStop(0,`rgba(255,252,225,${b})`);g.addColorStop(.45,`rgba(220,255,236,${b*.6})`);g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
    // floating dust in the light
    {const da=smooth(1.2,1.8,RT)*(1-smooth(3.4,4.2,t));
     if(da>.01){ctx.save();for(let i=0;i<26;i++){const px=(i*149+live*(6+i%4*3))%W, py=(80+i*53+Math.sin(live*.7+i)*18+live*(2+i%3))%(H-80);
      ctx.globalAlpha=da*(.18+.22*((i*7)%5)/5);ell(px,py,1.2+(i%3)*.6,1.2+(i%3)*.6,'#ffffff');}ctx.restore();}}
    // vignette
    {const va=.32*(1-smooth(3.4,4.4,t));
     if(va>.01){const vg=ctx.createRadialGradient(640,360,260,640,360,780);vg.addColorStop(0,'rgba(10,30,28,0)');vg.addColorStop(1,'rgba(10,30,28,'+va+')');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);}}
    // letterbox bars
    {const bar=smooth(1.38,1.95,RT)*(1-smooth(3.7,4.5,t));
     if(bar>.005){const bh=54*bar;ctx.fillStyle='#07120f';ctx.fillRect(0,0,W,bh);ctx.fillRect(0,H-bh,W,bh);}}
    // lower-third caption
    {const la=smooth(2.2,2.8,RT)*(1-smooth(3.2,3.7,t));
     if(la>.01){ctx.save();ctx.globalAlpha=la;const sl=(1-smooth(2.2,3.0,RT))*-40;ctx.translate(sl,0);
      ctx.fillStyle='rgba(7,18,15,.72)';ctx.beginPath();ctx.roundRect(64,566,420,64,8);ctx.fill();
      ctx.fillStyle='#ec1c8c';ctx.fillRect(64,566,5,64);
      txt('PRINTZ SHOP',86,588,22,'#ffffff',800,'left',2.5);
      txt('ONE STOP SHOP FOR ALL YOUR PRINTING NEEDS',86,614,11,'#bfe9d6',600,'left',1.4);
      ctx.restore();}}
    if(t>5.0){ctx.save();ctx.globalAlpha=smooth(5.1,6.3,t)*.30;rect(0,0,W,H,'#183e35');ctx.restore();}
    const ep=1-smooth(1.37,1.95,RT);
    enter.style.opacity=String(ep);
    enter.style.pointerEvents=(RT<1.4&&phase==='idle')?'auto':'none';
    enter.style.transform=`translate(-50%,${(1-ep)*35}px) scale(${.94+ep*.06})`;
    hint.style.opacity=String(1-smooth(1.45,2.01,RT));
    shade.style.opacity=String(smooth(5.08,6.18,t)*.64);
    const lp=smooth(5.34,6.42,t),cp=smooth(5.56,6.76,t);
    login.style.opacity=String(lp);
    const mobile=window.innerWidth<701;
    const tx=mobile?0:tilt[0], ty=mobile?0:tilt[1];
    login.style.transform=mobile
      ?`translate3d(-50%,${mix(-30,-50,lp)}%,0) scale(${mix(.93,1,lp)})`
      :`translate3d(${mix(110,0,lp)}px,-50%,0) perspective(1000px) rotateX(${tx}deg) rotateY(${ty+mix(-14,0,lp)}deg) scale(${mix(.93,1,lp)})`;
    login.style.filter=lp<1?`blur(${mix(8,0,lp)}px)`:'none';
    login.style.pointerEvents=(lp>.97)?'auto':'none';
    copy.style.opacity=String(cp);
    copy.style.transform=`translateY(${mix(25,0,cp)}px)`;
    header.style.color=t>4.7?'#ffffff':'#134934';
    header.style.textShadow=t>4.7?'0 2px 16px #17463966':'0 1px 0 #ffffffaa';
    replay.style.opacity=String(smooth(7.1,7.8,t));
    replay.style.pointerEvents=t>7.65?'auto':'none';
  }

  /* ---------- FX layer: confetti, flying sheets, cursor sparkles ---------- */
  const fx=el('fx'),fctx=fx.getContext('2d');let dpr=1,parts=[];
  const PAL=['#12895b','#1ac081','#f9b660','#f58d75','#7cbadf','#c1a1ea','#ffd84a','#ff6fa5','#2fd1e8'];
  const pick=a=>a[Math.floor(rand()*a.length)];
  function resize(){dpr=Math.min(2,window.devicePixelRatio||1);fx.width=innerWidth*dpr;fx.height=innerHeight*dpr;}
  resize();on(window,'resize',resize);
  function spawn(o){if(parts.length>700)return;parts.push(Object.assign({vx:0,vy:0,rot:0,vr:0,g:0,drag:.99,life:0,max:1.5,size:8,z:0,vz:0},o));}
  function confetti(x,y,n,power=1){
    for(let i=0;i<n;i++)spawn({kind:rand()<.25?'heart':'conf',x,y,vx:(rand()-.5)*15*power,vy:(-rand()*13-4)*power,g:.3,drag:.982,rot:rand()*6,vr:(rand()-.5)*.4,size:5+rand()*7,color:pick(PAL),max:2.2+rand()*1.3,round:rand()<.3});
  }
  function sheetBurst(){
    const cx=innerWidth/2,cy=innerHeight*.58;
    for(let i=0;i<28;i++){const a=rand()*pi*2,sp=2+rand()*8;
      spawn({kind:'sheet',x:cx+(rand()-.5)*80,y:cy+(rand()-.5)*50,vx:cos(a)*sp,vy:sin(a)*sp-1.5,rot:rand()*6,vr:(rand()-.5)*.14,size:10+rand()*12,vz:.03+rand()*.03,color:pick(PAL),max:1.5+rand()*.7,drag:.996});}
    
  }
  function sparkle(x,y,n=2){for(let i=0;i<n;i++)spawn({kind:rand()<.45?'heart':'spark',x:x+(rand()-.5)*8,y:y+(rand()-.5)*8,vx:(rand()-.5)*1.4,vy:(rand()-.5)*1.4-.4,size:3+rand()*5,color:pick(PAL),max:.55+rand()*.45,drag:.95,g:.03,vr:(rand()-.5)*.2});}
  function fxStep(){
    fctx.setTransform(dpr,0,0,dpr,0,0);fctx.clearRect(0,0,innerWidth,innerHeight);
    for(let i=parts.length-1;i>=0;i--){
      const p=parts[i];p.life+=1/60;
      if(p.life>p.max||p.y>innerHeight+60){parts.splice(i,1);continue;}
      p.vx*=p.drag;p.vy=p.vy*p.drag+p.g;p.x+=p.vx;p.y+=p.vy;p.rot+=p.vr;p.z+=p.vz;
      const fade=1-smooth(p.max*.6,p.max,p.life);
      fctx.save();fctx.globalAlpha=fade;fctx.translate(p.x,p.y);fctx.rotate(p.rot);
      if(p.kind==='conf'){
        fctx.scale(1,Math.cos(p.life*9+p.rot));fctx.fillStyle=p.color;
        if(p.round){fctx.beginPath();fctx.arc(0,0,p.size*.45,0,pi*2);fctx.fill();}
        else fctx.fillRect(-p.size/2,-p.size*.3,p.size,p.size*.6);
      }else if(p.kind==='sheet'){
        const s=p.size*(1+p.z*9);
        fctx.shadowColor='#0a3a2c33';fctx.shadowBlur=8;
        fctx.fillStyle='#fffdf3';fctx.beginPath();fctx.roundRect(-s*.7,-s*.9,s*1.4,s*1.8,s*.1);fctx.fill();
        fctx.shadowBlur=0;fctx.fillStyle=p.color;fctx.fillRect(-s*.5,-s*.65,s,s*.35);
        fctx.fillStyle='#d6e9df';fctx.fillRect(-s*.5,-s*.12,s*.75,s*.12);fctx.fillRect(-s*.5,s*.12,s*.9,s*.12);
      }else if(p.kind==='heart'){
        const s=Math.max(.5,p.size*.14)*(p.max>1.4?1.6:1);fctx.fillStyle=p.color;fctx.beginPath();fctx.moveTo(0,6*s);fctx.bezierCurveTo(-14*s,-4*s,-8*s,-16*s,0,-8*s);fctx.bezierCurveTo(8*s,-16*s,14*s,-4*s,0,6*s);fctx.fill();
      }else{
        const s=p.size*fade;fctx.fillStyle=p.color;fctx.beginPath();
        fctx.moveTo(0,-s);fctx.lineTo(s*.25,-s*.25);fctx.lineTo(s,0);fctx.lineTo(s*.25,s*.25);fctx.lineTo(0,s);fctx.lineTo(-s*.25,s*.25);fctx.lineTo(-s,0);fctx.lineTo(-s*.25,-s*.25);fctx.closePath();fctx.fill();
      }
      fctx.restore();
    }
  }
  function events(a,b){
    if(reduce)return;
    
    if(a<5.7&&b>=5.7){const r=login.getBoundingClientRect();}
  }

  /* ---------- main loop ---------- */
  function loop(now){
    if(!alive)return;
    const live=now/1000;
    if(phase==='play'){tl=1.36+(now-origin)/1000;if(tl>=9.1+DW){tl=9.1+DW;phase='done';}}
    events(prevT,tl);prevT=tl;
    px+=(mx-px)*.06;py+=(my-py)*.06;
    tilt[0]+=(tiltT[0]-tilt[0])*.12;tilt[1]+=(tiltT[1]-tilt[1])*.12;
    if(!reduce)canvas.style.transform=`scale(1.04) translate(${-px*12}px,${-py*8}px)`;
    draw(tl,reduce?0:live);
    fxStep();
    requestAnimationFrame(loop);
  }
  function go(){if(phase!=='idle')return;phase='play';origin=performance.now();if(!reduce)sparkle(innerWidth/2,innerHeight*.9,24);}
  enter.addEventListener('click',go);
  on(document,'keydown',e=>{const tg=(e.composedPath&&e.composedPath()[0])||e.target;if(e.key==='Enter'&&phase==='idle'&&tg.tagName!=='INPUT'){e.preventDefault();go();}});
  replay.addEventListener('click',()=>{phase='idle';tl=0;prevT=0;resetSubmit();setTimeout(go,600);});

  /* ---------- pointer: parallax, card tilt + glare, sparkle trail ---------- */
  let lastX=0,lastY=0;
  stage.addEventListener('pointermove',e=>{
    mx=e.clientX/innerWidth*2-1;my=e.clientY/innerHeight*2-1;
    const r=login.getBoundingClientRect();
    if(tl>=6.4&&e.clientX>r.left&&e.clientX<r.right&&e.clientY>r.top&&e.clientY<r.bottom){
      const nx=(e.clientX-r.left)/r.width, ny=(e.clientY-r.top)/r.height;
      tiltT=[0,0];
      login.style.setProperty('--gx',(nx*100)+'%');login.style.setProperty('--gy',(ny*100)+'%');
    } else tiltT=[0,0];
    
  });

  /* ---------- rotating headline word ---------- */
  const words=['Printing & Operations'];let wi=0;const word=el('word');

  /* ---------- form niceties ---------- */
  function toast(message){const node=el('toast');node.textContent=message;node.style.opacity='1';clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.style.opacity='0',3300);}
  const pass=el('password'), user=el('username'), btn=el('submit');
  el('eye').addEventListener('click',()=>{const show=pass.type==='password';pass.type=show?'text':'password';el('eye').setAttribute('aria-label',show?'Hide password':'Show password');el('eye').style.color=show?'#12895b':'';pass.focus();});
  pass.addEventListener('keyup',e=>{el('caps').style.display=e.getModifierState&&e.getModifierState('CapsLock')?'block':'none';});
  [user,pass].forEach(i=>i.addEventListener('input',()=>i.parentElement.classList.remove('err')));
  btn.addEventListener('pointerdown',e=>{const r=btn.getBoundingClientRect(),s=Math.max(r.width,r.height),d=document.createElement('span');d.className='rip';d.style.width=d.style.height=s+'px';d.style.left=(e.clientX-r.left-s/2)+'px';d.style.top=(e.clientY-r.top-s/2)+'px';btn.appendChild(d);setTimeout(()=>d.remove(),700);});
  const btnLabel=btn.innerHTML;let busy=false,resetTimer;
  function resetSubmit(){clearTimeout(resetTimer);busy=false;btn.classList.remove('success');btn.innerHTML=btnLabel;}
  el('form').addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;
    const missing=[user,pass].filter(i=>!i.value.trim());
    if(missing.length){missing.forEach(i=>i.parentElement.classList.add('err'));cardBody.classList.remove('shake');void cardBody.offsetWidth;cardBody.classList.add('shake');missing[0].focus();toast('Please enter your email or phone and password.');return;}
    busy=true;btn.innerHTML='<span class="spinner"></span> Signing In...';
    try{
      const result=await opts.login(user.value.trim(),pass.value);
      if(!alive)return;
      btn.classList.add('success');btn.innerHTML='✓ Signed In';
      const m=root.querySelector('.mascot');if(m){m.classList.add('joy');setTimeout(()=>m.classList.remove('joy'),1800);}
      resetTimer=setTimeout(resetSubmit,3200);
      if(opts.onSuccess)setTimeout(()=>{if(alive)opts.onSuccess(result);},650);
    }catch(err){
      if(!alive)return;
      resetSubmit();
      [user,pass].forEach(i=>i.parentElement.classList.add('err'));
      cardBody.classList.remove('shake');void cardBody.offsetWidth;cardBody.classList.add('shake');
      const m=root.querySelector('.mascot');if(m){m.classList.add('sad');setTimeout(()=>m.classList.remove('sad'),1100);}
      toast(err&&err.message?err.message:'Failed to log in. Please check credentials.');
    }
  });
  


  /* ---------- mascot reactions + fit card to screen ---------- */
  const mascot=root.querySelector('.mascot'), look=root.querySelector('.mascot .look');
  const eyeMove=(x,y)=>{if(look)look.style.transform='translate('+x+'px,'+y+'px)';};
  user.addEventListener('focus',()=>{mascot.classList.remove('cover');eyeMove(Math.min(6,(user.value.length-8)*.6),3);});
  user.addEventListener('input',()=>eyeMove(Math.max(-6,Math.min(6,(user.value.length-8)*.7)),3));
  user.addEventListener('blur',()=>eyeMove(0,0));
  pass.addEventListener('focus',()=>{if(pass.type==='password')mascot.classList.add('cover');eyeMove(0,0);});
  pass.addEventListener('blur',()=>mascot.classList.remove('cover'));
  el('eye').addEventListener('click',()=>{if(root.activeElement===pass||true){mascot.classList.toggle('cover',pass.type==='password');}});
  el('form').addEventListener('submit',()=>{
    const bad=!user.value.trim()||!pass.value.trim();
    mascot.classList.remove('cover');
    if(bad){mascot.classList.add('sad');setTimeout(()=>mascot.classList.remove('sad'),1100);}
    
  });
  function fitCard(){
    const total=cardBody.offsetHeight+96;
    const z=Math.min(1,Math.max(.5,(innerHeight-10)/total));
    login.style.zoom=z<.995?z:1;
  }
  fitCard();on(window,'resize',fitCard);{const fitIv=setInterval(fitCard,700);disposers.push(()=>clearInterval(fitIv));}

  
  // The entrance always plays, even when the system asks for reduced motion (parallax and sparkles stay off in that case)
  requestAnimationFrame(loop);

  return {toast, dispose(){disposers.forEach(f=>{try{f();}catch(e){}});}};

}
