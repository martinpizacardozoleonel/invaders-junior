/* App principal: arranque y navegación SPA */
(function init() {
  document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
    Notifications.init();
    Docs.init();
    if (typeof Guide !== 'undefined') Guide.init();
    if (typeof Intro !== 'undefined') Intro.init();
    Game.init();
    if (typeof Profile !== 'undefined') Profile.init();
    if (typeof Ranked !== 'undefined') Ranked.init();

    const logoBtn = document.getElementById('logoMenuBtn');
    const logoWrap = document.getElementById('logoWrap');
    const logoMenu = document.getElementById('logoMenu');
    const logoBackdrop = document.getElementById('logoBackdrop');
    const menuTutorial = document.getElementById('menuTutorial');
    function openMenu(){
      logoMenu.classList.remove('hidden','closing');
      void logoMenu.offsetWidth;
      if (logoWrap) logoWrap.classList.add('open');
      if (logoBackdrop) logoBackdrop.classList.remove('hidden');
      logoBtn.setAttribute('aria-expanded','true');
    }
    function closeMenu(instant){
      if (logoMenu.classList.contains('hidden')) return;
      if (instant){ logoMenu.classList.add('hidden'); }
      else {
        logoMenu.classList.add('closing');
        setTimeout(()=>{ logoMenu.classList.add('hidden'); logoMenu.classList.remove('closing'); },170);
      }
      if (logoWrap) logoWrap.classList.remove('open');
      if (logoBackdrop) logoBackdrop.classList.add('hidden');
      logoBtn.setAttribute('aria-expanded', 'false');
    }
    if (logoBtn && logoMenu) {
      logoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = logoMenu.classList.contains('hidden') || logoMenu.classList.contains('closing');
        if (isHidden) openMenu(); else closeMenu();
      });
      if (logoBackdrop) logoBackdrop.addEventListener('click', ()=>closeMenu());
      document.addEventListener('click', (e) => {
        if (!logoWrap.contains(e.target)) closeMenu();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
      });
      if (menuTutorial) menuTutorial.addEventListener('click', () => {
        closeMenu();
        setTimeout(()=>{ if (typeof Intro !== 'undefined') Intro.open(); },120);
      });
      const menuSkill = document.getElementById('menuSkill');
      if (menuSkill) menuSkill.addEventListener('click', () => {
        closeMenu();
        setTimeout(()=>{ if (typeof Guide !== 'undefined') Guide.openPicker(); },120);
      });
      const tutorialBtn = document.getElementById('tutorialBtn');
      if (tutorialBtn) tutorialBtn.addEventListener('click', () => {
        // Si todavía no eligió experiencia, primero se le ofrecen los tres
        // niveles; el tutorial se abre solo y ya adaptado después de elegir.
        if (typeof Guide !== 'undefined' && Guide.hasSkill && !Guide.hasSkill()) {
          Guide.openPicker({ firstTime:true });
          return;
        }
        if (typeof Intro !== 'undefined') Intro.open();
      });
      const menuSettings=document.getElementById('menuSettings');
      if(menuSettings) menuSettings.addEventListener('click',()=>{
        closeMenu();
        setTimeout(()=>{
          const ov=document.getElementById('settingsOverlay');
          if(ov) ov.classList.remove('hidden');
          if(typeof Profile!=='undefined') Profile.renderProfile();
        },120);
      });
      logoMenu.querySelectorAll('[data-view]').forEach(el => {
        el.addEventListener('click', () => closeMenu());
      });
      const shopBtn = document.getElementById('shopBtn');
      if (shopBtn) shopBtn.addEventListener('click', () => closeMenu());
      const menuAchievements = document.getElementById('menuAchievements');
      if (menuAchievements) menuAchievements.addEventListener('click', () => closeMenu());
      const menuClans = document.getElementById('menuClans');
      if (menuClans) menuClans.addEventListener('click', () => closeMenu());
      const shopBack = document.getElementById('shopBack');
      if (shopBack) shopBack.addEventListener('click', () => {
        const m = document.getElementById('shopModal');
        if (m) m.classList.add('hidden');
        // Las vistas previas de la tienda se animan solas: si la tienda está
        // cerrada no hace falta seguir dibujándolas.
        if (window.Game && Game.stopPreviews) Game.stopPreviews();
      });
    }

    const views = document.querySelectorAll('.view');
    const mainEl = document.querySelector('main');
    function switchView(target){
      views.forEach(v => v.classList.toggle('active', v.id === 'view-' + target));
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === target));
      if (target === 'ranked' && typeof Ranked !== 'undefined') Ranked.loadRanking();
      if (target === 'chat' && typeof Chat !== 'undefined') Chat.start();
      if (target === 'friends' && typeof Friends !== 'undefined') Friends.load();
      if(mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    /* El canvas del juego conserva la proporción 7:5. Si lo dejábamos con
       width:100% y max-height, el flex lo aplastaba en ventanas anchas y
       bajas: el dibujo se veía estirado. Acá medimos el alto real que queda
       después del HUD, la barra de respuesta y el cartel de pregunta. */
    const gameView = document.getElementById('view-game');
    const gameWrapper = document.querySelector('#view-game .game-wrapper');
    const gameCanvasWrap = document.querySelector('#view-game .canvas-wrap');
    let fitTimer = 0;
    // En celular acostado el CSS arma dos columnas: el canvas a la izquierda
    // y la pregunta + controles a la derecha. Ahí el alto disponible es el
    // del contenedor completo y el ancho se descuenta de la columna lateral.
    const landscapeLayout = window.matchMedia
      ? window.matchMedia('(max-height:560px) and (orientation:landscape) and (min-width:600px)')
      : { matches:false };
    function fitGameCanvas(){
      if(!gameView || !gameWrapper || !gameCanvasWrap) return;
      if(!gameView.classList.contains('active')) return;
      if(gameWrapper.clientHeight < 80 || gameWrapper.clientWidth < 80) return;
      const cs = getComputedStyle(gameWrapper);
      const gap = parseFloat(cs.rowGap) || 0;
      const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
      let availW, availH;
      if(landscapeLayout.matches){
        const cols = cs.gridTemplateColumns;
        let sideW = 0;
        if(cols && cols !== 'none'){
          const parts = cols.trim().split(/\s+/).map(parseFloat).filter(n => !isNaN(n));
          if(parts.length > 1) sideW = parts[parts.length - 1];
        }
        const colGap = parseFloat(cs.columnGap) || 0;
        availW = Math.max(140, gameWrapper.clientWidth - padX - sideW - colGap);
        availH = Math.max(140, gameWrapper.clientHeight - padY);
      } else {
        const siblings = [...gameWrapper.children].filter(el =>
          el !== gameCanvasWrap && getComputedStyle(el).display !== 'none'
        );
        let used = padY + gap * siblings.length;
        siblings.forEach(el => { used += el.getBoundingClientRect().height; });
        availW = Math.max(140, gameWrapper.clientWidth - padX);
        availH = Math.max(140, gameWrapper.clientHeight - used);
      }
      const w = Math.floor(Math.min(availW, availH * 7 / 5));
      const h = Math.floor(w * 5 / 7);
      gameCanvasWrap.style.width = w + 'px';
      gameCanvasWrap.style.height = h + 'px';
    }
    function scheduleCanvasFit(){
      // setTimeout y no requestAnimationFrame: el ajuste también tiene que
      // correr cuando la pestaña está en segundo plano o el navegador
      // pausa los frames (el canvas se quedaba con el tamaño viejo).
      clearTimeout(fitTimer);
      fitTimer = setTimeout(fitGameCanvas, 40);
    }
    window.addEventListener('resize', scheduleCanvasFit);
    if(landscapeLayout.addEventListener) landscapeLayout.addEventListener('change', scheduleCanvasFit);
    window.addEventListener('orientationchange', () => setTimeout(scheduleCanvasFit, 150));
    window.addEventListener('load', scheduleCanvasFit);
    if(window.ResizeObserver && gameWrapper){
      const ro = new ResizeObserver(scheduleCanvasFit);
      ro.observe(gameWrapper);
      [...gameWrapper.children].forEach(el => {
        if(el !== gameCanvasWrap) ro.observe(el);
      });
    }
    setTimeout(scheduleCanvasFit, 0);

    document.querySelectorAll('[data-view]').forEach(el => {
      const handler = (e) => {
        e.preventDefault();
        const target = el.dataset.view;
        switchView(target);
        if(target === 'game') scheduleCanvasFit();
      };
      el.addEventListener('click', handler);
      el.addEventListener('touchend', handler, {passive:false});
    });

    (async()=>{
      const b=document.getElementById('dbBadge'); if(!b) return;
      b.classList.remove('hidden');
      try{
        const r=await fetch('/api/health?_='+Date.now());
        const s=await r.json();
        if(s.connected){
          b.textContent='PG '+s.users;
          b.classList.add('db-ok');
          b.title='PostgreSQL conectada ('+s.users+' cuentas). Todo se guarda.';
        }else{
          b.textContent='JSON';
          b.classList.add('db-warn');
          b.title='PostgreSQL NO conectada — '+(s.error||'sin configuración de base de datos')+'\nLas cuentas se guardan solo en este servidor y se pierden al reiniciar.';
        }
      }catch(e){
        b.textContent='JSON';
        b.classList.add('db-warn');
        b.title='No se pudo consultar el estado del servidor: '+e.message;
      }
    })();
    Notifications.sync();
  });
})();
