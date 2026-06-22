(function(){
  document.addEventListener('gesturestart',function(e){e.preventDefault()});
  document.addEventListener('gesturechange',function(e){e.preventDefault()});
  document.addEventListener('gestureend',function(e){e.preventDefault()});
  document.addEventListener('touchstart',function(e){if(e.touches.length>1)e.preventDefault()},{passive:false});
  var lastTouchEnd=0;
  document.addEventListener('touchend',function(e){var n=Date.now();if(n-lastTouchEnd<=300)e.preventDefault();lastTouchEnd=n},{passive:false});
  document.addEventListener('wheel',function(e){if(e.ctrlKey)e.preventDefault()},{passive:false});
  document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&(e.key==='+'||e.key==='-'||e.key==='='||e.key==='0'))e.preventDefault()});

  var c=document.getElementById('sparkles');
  if(c){for(var i=0;i<30;i++){
    var s=document.createElement('div');
    s.className='sparkle';
    s.style.left=Math.random()*100+'%';
    s.style.top=Math.random()*100+'%';
    s.style.animationDelay=Math.random()*4+'s';
    s.style.animationDuration=(3+Math.random()*3)+'s';
    c.appendChild(s);
  }}
  var api=window.location.origin.indexOf('localhost')>-1&&window.location.port!=='3001'?'http://localhost:3001':'';
  fetch(api+'/api/settings/public').then(function(r){return r.json()}).then(function(d){
    var t=document.getElementById('maintenanceTitle');
    var m=document.getElementById('maintenanceMessage');
    if(t&&d.maintenance_title)t.textContent=d.maintenance_title;
    if(m&&d.maintenance_message)m.textContent=d.maintenance_message;
  }).catch(function(){});

  fetch(api+'/api/visit',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      page:'/maintenance',
      referrer:document.referrer||'',
      timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||''
    })
  }).catch(function(){});
})();
