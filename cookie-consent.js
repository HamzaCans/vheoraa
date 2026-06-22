(function(){
  if(document.cookie.indexOf('vheora_cookie_consent=')>-1)return;

  var bg=document.createElement('div');
  bg.id='cookie-consent-banner';
  bg.innerHTML='<div class="cc-inner">'
    +'<div class="cc-text">'
    +'<span class="cc-icon">🍪</span>'
    +'<div class="cc-body">'
    +'<p class="cc-title">Çerez Kullanımı</p>'
    +'<p class="cc-desc">Sizlere en iyi deneyimi sunmak için çerezler kullanıyoruz. İnternet sitemizi kullanmaya devam ederek çerez politikamızı kabul etmiş olursunuz.</p>'
    +'</div>'
    +'</div>'
    +'<div class="cc-actions">'
    +'<button class="cc-btn cc-accept" onclick="window._ccAccept()">Kabul Et</button>'
    +'<button class="cc-btn cc-settings" onclick="window._ccSettings()">Ayarlar</button>'
    +'</div>'
    +'</div>';

  var style=document.createElement('style');
  style.textContent='#cookie-consent-banner{position:fixed;bottom:0;left:0;right:0;z-index:99999;background:rgba(13,58,53,.97);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid rgba(212,168,83,.15);padding:0;transform:translateY(100%);animation:ccSlideUp .6s cubic-bezier(.22,1,.36,1) .8s forwards;font-family:Montserrat,-apple-system,BlinkMacSystemFont,sans-serif}@keyframes ccSlideUp{0%{transform:translateY(100%)}100%{transform:translateY(0)}}#cookie-consent-banner .cc-inner{max-width:900px;margin:0 auto;padding:clamp(14px,3vw,20px) clamp(16px,4vw,28px);display:flex;align-items:center;gap:clamp(12px,2vw,24px)}#cookie-consent-banner .cc-text{display:flex;align-items:flex-start;gap:10px;flex:1;min-width:0}#cookie-consent-banner .cc-icon{font-size:1.4rem;flex-shrink:0;margin-top:2px}#cookie-consent-banner .cc-body{min-width:0}#cookie-consent-banner .cc-title{font-size:clamp(.8rem,2vw,.9rem);font-weight:600;color:#D4A853;margin-bottom:4px;letter-spacing:.5px}#cookie-consent-banner .cc-desc{font-size:clamp(.72rem,1.8vw,.82rem);color:#B1B7AB;line-height:1.55;font-weight:300;margin:0}#cookie-consent-banner .cc-actions{display:flex;gap:8px;flex-shrink:0}#cookie-consent-banner .cc-btn{padding:clamp(8px,1.5vw,10px) clamp(14px,3vw,22px);border:none;border-radius:4px;font-family:Montserrat,sans-serif;font-size:clamp(.72rem,1.8vw,.8rem);font-weight:500;cursor:pointer;transition:all .25s ease;letter-spacing:.5px;white-space:nowrap}#cookie-consent-banner .cc-accept{background:#D4A853;color:#0D3A35}#cookie-consent-banner .cc-accept:hover{background:#c9994a;transform:translateY(-1px);box-shadow:0 4px 12px rgba(212,168,83,.3)}#cookie-consent-banner .cc-settings{background:transparent;color:#B1B7AB;border:1px solid rgba(177,183,171,.25)}#cookie-consent-banner .cc-settings:hover{border-color:#D4A853;color:#D4A853}@media(max-width:540px){#cookie-consent-banner .cc-inner{flex-direction:column;align-items:stretch}#cookie-consent-banner .cc-actions{justify-content:flex-end}#cookie-consent-banner .cc-text{gap:8px}}';
  document.head.appendChild(style);

  var settingsBg=document.createElement('div');
  settingsBg.id='cc-settings-modal';
  settingsBg.style.cssText='display:none;position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);justify-content:center;align-items:center;padding:20px';
  settingsBg.innerHTML='<div style="background:#0D3A35;border:1px solid rgba(212,168,83,.15);border-radius:8px;max-width:440px;width:100%;padding:clamp(20px,4vw,32px);position:relative">'
    +'<button onclick="document.getElementById(\'cc-settings-modal\').style.display=\'none\'" style="position:absolute;top:12px;right:14px;background:none;border:none;color:#B1B7AB;font-size:1.3rem;cursor:pointer;padding:8px;line-height:1">&times;</button>'
    +'<h3 style="font-family:Montserrat,sans-serif;font-size:1rem;font-weight:600;color:#D4A853;margin-bottom:12px;letter-spacing:.5px">Çerez Tercihleri</h3>'
    +'<p style="font-family:Montserrat,sans-serif;font-size:.78rem;color:#B1B7AB;line-height:1.6;margin-bottom:18px">Hangi çerez türlerine izin vermek istediğinizi seçebilirsiniz. Zorunlu çerezler siteyi kullanmanız için gereklidir.</p>'
    +'<div style="display:flex;flex-direction:column;gap:12px">'
    +'<label style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid rgba(177,183,171,.12);border-radius:4px;cursor:default">'
    +'<span style="font-family:Montserrat,sans-serif;font-size:.78rem;color:#FBF6F0;font-weight:400">Zorunlu Çerezler</span>'
    +'<span style="font-family:Montserrat,sans-serif;font-size:.68rem;color:#B1B7AB">Her zaman aktif</span>'
    +'</label>'
    +'<label style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid rgba(177,183,171,.12);border-radius:4px;cursor:default">'
    +'<span style="font-family:Montserrat,sans-serif;font-size:.78rem;color:#FBF6F0;font-weight:400">Analitik Çerezler</span>'
    +'<span style="font-family:Montserrat,sans-serif;font-size:.68rem;color:#B1B7AB">Şu anda kullanılmıyor</span>'
    +'</label>'
    +'<label style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid rgba(177,183,171,.12);border-radius:4px;cursor:default">'
    +'<span style="font-family:Montserrat,sans-serif;font-size:.78rem;color:#FBF6F0;font-weight:400">Pazarlama Çerezleri</span>'
    +'<span style="font-family:Montserrat,sans-serif;font-size:.68rem;color:#B1B7AB">Şu anda kullanılmıyor</span>'
    +'</label>'
    +'</div>'
    +'<button onclick="window._ccAccept();document.getElementById(\'cc-settings-modal\').style.display=\'none\'" style="margin-top:18px;width:100%;padding:10px;background:#D4A853;color:#0D3A35;border:none;border-radius:4px;font-family:Montserrat,sans-serif;font-size:.82rem;font-weight:600;cursor:pointer;letter-spacing:.5px;transition:all .25s">Onayla</button>'
    +'</div>';
  document.body.appendChild(settingsBg);

  document.body.appendChild(bg);

  window._ccAccept=function(){
    document.cookie='vheora_cookie_consent=accepted;path=/;max-age=31536000;SameSite=Lax;Secure';
    bg.style.animation='ccSlideDown .4s cubic-bezier(.22,1,.36,1) forwards';
    var d=document.getElementById('cc-settings-modal');if(d)d.style.display='none';
    setTimeout(function(){bg.remove()},400);
  };

  window._ccSettings=function(){
    document.getElementById('cc-settings-modal').style.display='flex';
  };

  var downStyle=document.createElement('style');
  downStyle.textContent='@keyframes ccSlideDown{0%{transform:translateY(0)}100%{transform:translateY(100%)}}';
  document.head.appendChild(downStyle);
})();
