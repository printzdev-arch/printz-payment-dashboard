// Markup for the animated login scene (rendered inside a shadow root).
export function getSceneMarkup(LOGO) {
  return `<div id="stage">
  <canvas id="world" width="1280" height="720" aria-label="Cartoon entrance to Printz Shop with staff character"></canvas>
  <div class="scene-shade" id="shade"></div>
  <div class="welcome-header" id="header">
    <img class="brand-logo" src="${LOGO}" alt="Printz Shop logo"/>
  </div>
  <button id="enter" class="start-cta" aria-label="Enter Printz Shop">ENTER PRINTZ SHOP <span class="arrow">→</span></button>
  <div id="hint" class="stage-hint">ONE STOP SHOP FOR ALL YOUR PRINTING NEEDS · PRESS <kbd>ENTER</kbd></div>
  <div id="copy" class="scene-copy">
    <div class="eyebrow">PRINTZ ENTERPRISE PORTAL</div>
    <h2>Intelligent<br><em id="word">Printing &amp; Operations</em></h2>
    
    
  </div>
  <section id="login" class="login-card" aria-label="Printz Shop login form">
    <div class="mascot" aria-hidden="true"><svg viewBox="0 0 104 92" width="104" height="92">
      <g class="paper"><rect x="34" y="2" width="36" height="26" rx="4" fill="#fff" stroke="#f3b6d6" stroke-width="2"/><rect x="40" y="9" width="24" height="3" rx="1.5" fill="#ffb3d9"/><rect x="40" y="15" width="16" height="3" rx="1.5" fill="#bfe8ff"/></g>
      <rect x="10" y="22" width="84" height="56" rx="22" fill="#ec1c8c"/>
      <rect x="10" y="22" width="84" height="56" rx="22" fill="none" stroke="#2b1020" stroke-width="3"/>
      <rect x="18" y="28" width="68" height="14" rx="7" fill="#ff7cc0" opacity=".55"/>
      <g class="look"><g class="eyes"><ellipse cx="36" cy="52" rx="8" ry="9.5" fill="#2b1020"/><ellipse cx="68" cy="52" rx="8" ry="9.5" fill="#2b1020"/>
      <circle cx="39" cy="48" r="3.2" fill="#fff"/><circle cx="71" cy="48" r="3.2" fill="#fff"/><circle cx="34" cy="55" r="1.5" fill="#fff"/><circle cx="66" cy="55" r="1.5" fill="#fff"/></g></g>
      <ellipse cx="23" cy="63" rx="7" ry="4" fill="#ffd400" opacity=".85"/><ellipse cx="81" cy="63" rx="7" ry="4" fill="#ffd400" opacity=".85"/>
      <path class="m-happy" d="M44 63q8 9 16 0" fill="none" stroke="#2b1020" stroke-width="3" stroke-linecap="round"/><path class="m-sad" d="M44 68q8 -9 16 0" fill="none" stroke="#2b1020" stroke-width="3" stroke-linecap="round"/>
      <g class="arm"><path d="M12 60Q-2 54 2 40" fill="none" stroke="#2b1020" stroke-width="9" stroke-linecap="round"/><path d="M12 60Q-2 54 2 40" fill="none" stroke="#ec1c8c" stroke-width="5" stroke-linecap="round"/></g>
      <path d="M92 60Q102 62 100 74" fill="none" stroke="#2b1020" stroke-width="9" stroke-linecap="round"/><path d="M92 60Q102 62 100 74" fill="none" stroke="#ec1c8c" stroke-width="5" stroke-linecap="round"/>
      <g class="hands"><circle cx="36" cy="51" r="12" fill="#ff7cc0" stroke="#2b1020" stroke-width="3"/><circle cx="68" cy="51" r="12" fill="#ff7cc0" stroke="#2b1020" stroke-width="3"/><circle cx="32" cy="47" r="3" fill="#fff" opacity=".6"/><circle cx="64" cy="47" r="3" fill="#fff" opacity=".6"/></g>
    </svg></div>
    <div class="card-body" id="cardBody">
      <img class="card-logo" src="${LOGO}" alt="Printz Shop logo"/>
      <h1 style="text-align:center">Sign in to your account</h1>
      <p class="intro" style="text-align:center">Enter your credentials to access the PrintZ portal</p>
      <form id="form" novalidate>
        <label for="username">Email or Phone</label>
        <div class="input-wrap" id="uWrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 8 9 6 9-6"/></svg><input id="username" autocomplete="username" placeholder="Enter your email or phone"/></div>
        <label for="password">Password</label>
        <div class="input-wrap" id="pWrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="10" width="14" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 018 0v3"/></svg><input id="password" type="password" autocomplete="current-password" placeholder="Enter your password"/>
          <button type="button" class="eye" id="eye" aria-label="Show password"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button></div>
        <div class="caps" id="caps">Caps Lock is on</div>
        
        <button class="submit" id="submit" type="submit">Sign In</button>
      </form>
      
    </div>
  </section>
  <button id="replay" class="replay">↻ Replay entrance</button>
  <div id="toast" class="notification" role="status"></div>
  <canvas id="fx" aria-hidden="true"></canvas>
</div>`;
}
