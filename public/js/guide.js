/* ============================================================================
   GUIDE — niveles de experiencia + ayuda contextual
   ----------------------------------------------------------------------------
   Tres públicos distintos:
     🌱 Principiante  → nunca programó. La ayuda explica con analogías y, si
                        falla 2 veces, le muestra la respuesta.
     🧭 Intermedio    → lo vio una vez pero casi no se acuerda (o no prestó
                        atención en clase). Repaso con ejemplos + pista.
     🚀 Avanzado      → lo vio y sabe un poco, no todo. Referencia directa
                        y ayuda corta.
   No reemplaza al tutorial: lo complementa mientras se juega.
   ========================================================================== */
const Guide = (() => {
  const STORAGE_KEY = 'ci_learning_level';
  const SKILLS = {
    beginner: {
      id: 'beginner', label: 'PRINCIPIANTE', short: 'Principiante', icon: '🌱',
      color: '#43a047', diff: 'facil',
      tagline: 'Nunca programé o casi no entiendo nada.',
      desc: 'Te explico desde cero, con palabras simples y ejemplos de todos los días.',
      bullets: ['4 vidas y naves lentas', 'Ejemplos cortos y visuales', 'La ayuda te muestra la respuesta'],
      firstHelpAt: 1, autoHelpAt: 2,
      toast: 'Tranquilo, es normal trabarse. Tocá ❓ AYUDA y te lo explico paso a paso.'
    },
    intermediate: {
      id: 'intermediate', label: 'INTERMEDIO', short: 'Intermedio', icon: '🧭',
      color: '#2196f3', diff: 'tranquilo',
      tagline: 'Lo vi una vez, pero casi no me acuerdo.',
      desc: 'Para quien vio el tema en clase una vez (o no le prestó atención 😅). Lo repasamos de vuelta, sin asumir que sabés.',
      bullets: ['3 vidas y naves casi normales', 'Chuleta copiable con ejemplos', 'Pista y respuesta al 3er fallo'],
      firstHelpAt: 2, autoHelpAt: 3,
      toast: 'No pasa nada por no acordarte. Tocá ❓ AYUDA y te lo repito con palabras simples.'
    },
    advanced: {
      id: 'advanced', label: 'AVANZADO', short: 'Avanzado', icon: '🚀',
      color: '#fdd835', diff: 'normal',
      tagline: 'Lo vi y me acuerdo de un poco.',
      desc: 'Para quien vio el tema y sabe algo, no todo. Referencia completa y ayuda directa para cuando algo se te escapa.',
      bullets: ['2 vidas, naves normales', 'Referencia completa con dos ejemplos', 'Ayuda corta: definición y respuesta'],
      firstHelpAt: 3, autoHelpAt: 4,
      toast: 'Si se te escapó algo, ❓ AYUDA tiene la referencia y la respuesta exacta.'
    }
  };
  const IDS = Object.keys(SKILLS);

  let currentSkill = null;
  let pickerOpen = false;
  let helpOpen = false;
  let mistakes = 0;
  let autoShown = false;
  let helpRevealed = false;
  let helpAuto = false;
  let helpCtx = null;
  let introClosedLevel = null;
  let introClosedAt = 0;

  function esc(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function escAttr(s){ return esc(s).replace(/`/g,'&#96;'); }
  function storeGet(){
    try{ const v = localStorage.getItem(STORAGE_KEY); return IDS.includes(v) ? v : null; }
    catch(e){ return null; }
  }
  function storeSet(v){ try{ localStorage.setItem(STORAGE_KEY, v); }catch(e){} }
  function current(){ return currentSkill || storeGet() || 'intermediate'; }
  function hasSkill(){ return !!storeGet(); }
  function skill(){ return SKILLS[current()] || SKILLS.intermediate; }
  function ensure(){ if(!currentSkill) currentSkill = storeGet(); return currentSkill; }

  function toast(msg, kind){
    try{
      if(typeof Toast!=='undefined' && Toast[kind||'info']) Toast[kind||'info'](msg);
    }catch(e){}
  }

  function applyDifficulty(id){
    const s = SKILLS[id];
    if(!s || typeof Game==='undefined' || !Game.setDifficulty) return;
    try{ Game.setDifficulty(s.diff); }catch(e){}
  }

  /* ================= PANTALLA DE NIVEL ================= */
  function renderPicker(){
    const grid = document.getElementById('skillGrid');
    if(!grid) return;
    const active = hasSkill() ? current() : null;
    grid.innerHTML = IDS.map(id => {
      const s = SKILLS[id];
      const on = active === id;
      return '<button type="button" class="skill-option'+(on?' active':'')+'" data-skill="'+id+'" style="--sk:'+s.color+'" aria-pressed="'+on+'">'
        + '<span class="skill-option-icon">'+s.icon+'</span>'
        + '<span class="skill-option-body">'
        +   '<b class="skill-option-title">'+s.label+'</b>'
        +   '<span class="skill-option-tagline">'+esc(s.tagline)+'</span>'
        +   '<span class="skill-option-desc">'+esc(s.desc)+'</span>'
        +   '<span class="skill-option-list">'+s.bullets.map(b=>'<span>✓ '+esc(b)+'</span>').join('')+'</span>'
        + '</span>'
        + '<span class="skill-option-cta">'+(on?'✓ ELEGIDO':'ELEGIR '+s.short.toUpperCase()+' →')+'</span>'
        + '</button>';
    }).join('');
    // Atajo para quien no sabe qué elegir (chicos y adultos que llegan sin
    // experiencia): un clic y arranca en Principiante.
    if(active !== 'beginner'){
      grid.innerHTML += '<button type="button" class="skill-option skill-option-unsure" data-skill="beginner" style="--sk:#43a047">'
        + '<span class="skill-option-icon">🤷</span>'
        + '<span class="skill-option-body">'
        +   '<b class="skill-option-title">NO SÉ QUÉ ELEGIR</b>'
        +   '<span class="skill-option-tagline">Empezá en Principiante y subí cuando quieras.</span>'
        +   '<span class="skill-option-desc">El tutorial te lleva de la mano, con ejemplos y práctica sin perder vidas.</span>'
        + '</span>'
        + '<span class="skill-option-cta">EMPEZAR DESDE CERO →</span>'
        + '</button>';
    }
  }

  function openPicker(opts){
    opts = opts || {};
    const ov = document.getElementById('skillOverlay');
    if(!ov) return;
    // Si el tutorial está abierto, no se tapa: el tutorial es lo primero.
    const intro = document.getElementById('introOverlay');
    if(intro && !intro.classList.contains('hidden')) return;
    renderPicker();
    pickerOpen = true;
    ov.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    const title = document.getElementById('skillHeadline');
    if(title && opts.firstTime) title.textContent = '¿CUÁNTO SABÉS DE PROGRAMACIÓN?';
    const first = ov.querySelector('[data-skill]');
    if(first && first.focus) setTimeout(()=>{ try{ first.focus(); }catch(e){} }, 80);
  }

  function closePicker(){
    const ov = document.getElementById('skillOverlay');
    if(ov) ov.classList.add('hidden');
    pickerOpen = false;
    const introOv = document.getElementById('introOverlay');
    const introHidden = !introOv || introOv.classList.contains('hidden');
    if(!helpOpen && introHidden) {
      document.body.style.overflow = '';
    }
    // Si el tutorial no está abierto, al cerrar el selector aparecen los
    // botones del menú.
    if(introHidden){
      try{ if(typeof Game!=='undefined' && Game.showBtns) Game.showBtns(); }catch(e){}
    }
  }

  function choose(id){
    if(!SKILLS[id]) return;
    currentSkill = id;
    storeSet(id);
    applyDifficulty(id);
    closePicker();
    const s = SKILLS[id];
    toast('🎓 Nivel '+s.short+' activado', 'success');
    const justSeen = introClosedLevel === id && (Date.now() - introClosedAt) < 5000;
    const state = (typeof Game!=='undefined' && Game.getState) ? Game.getState() : 'title';
    if(!justSeen && state === 'title'){
      setTimeout(()=>{ try{ if(typeof Intro!=='undefined' && Intro.openForSkill) Intro.openForSkill(id); }catch(e){} }, 120);
    } else if(state === 'title' && typeof Game!=='undefined' && Game.showBtns){
      try{ Game.showBtns(); }catch(e){}
    }
  }

  /* ================= AYUDA CONTEXTUAL ================= */
  // Cada respuesta trae: explicación normal (intermedio/avanzado),
  // explicación simple (principiante), DOS ejemplos y un truco para recordarla.
  const EXPLAIN = {
    // HTML
    '<h1>': { tag:'HTML', text:'Es un título grande. Se usa para el encabezado más importante de la página.', simple:'Es el título más grande de la página, como el nombre en la tapa de un cuaderno.', ex:'<h1>Mi título</h1>', ex2:'<h1>Hola</h1>', tip:'Como el título grande de un afiche.' },
    '<p>': { tag:'HTML', text:'Es un párrafo: un bloque de texto normal.', simple:'Es un pedazo de texto normal, como un renglón de una carta.', ex:'<p>Hola mundo</p>', ex2:'<p>Bienvenidos</p>', tip:'Como un renglón de una carta.' },
    '<a>': { tag:'HTML', text:'Es un enlace: sirve para ir a otra página o sección.', simple:'Es una palabra que se puede tocar para ir a otra página.', ex:'<a href="/">Ir</a>', ex2:'<a href="/juego">Jugar</a>', tip:'Como una flecha que te lleva a otro lugar.' },
    '<img>': { tag:'HTML', text:'Es una imagen. Muestra una foto o dibujo.', simple:'Es una foto o dibujo que aparece en la página.', ex:'<img src="foto.jpg">', ex2:'<img src="nave.png">', tip:'Como pegar una foto en la pared.' },
    '<ul>': { tag:'HTML', text:'Es una lista con puntitos.', simple:'Es una lista con puntitos, como la del supermercado.', ex:'<ul><li>Uno</li></ul>', ex2:'<ul><li>HTML</li></ul>', tip:'Como una lista de compras.' },
    '<div>': { tag:'HTML', text:'Es una caja o contenedor grande. Agrupa cosas.', simple:'Es una caja grande que agrupa varias cosas juntas.', ex:'<div>...</div>', ex2:'<div class="juego">...</div>', tip:'Como una caja de cartón.' },
    '<span>': { tag:'HTML', text:'Es una caja chiquita que va dentro de una línea de texto.', simple:'Es una caja chiquita para una palabra o dos.', ex:'<span>texto</span>', ex2:'<span>2 vidas</span>', tip:'Como resaltar una palabra con marcador.' },
    '<button>': { tag:'HTML', text:'Es un botón: algo que se puede tocar o hacer clic.', simple:'Es algo que se toca para que pase una acción.', ex:'<button>Enviar</button>', ex2:'<button>Jugar</button>', tip:'Como el timbre de una casa.' },
    '<input>': { tag:'HTML', text:'Es un casillero para escribir, como el de usuario o contraseña.', simple:'Es un renglón en blanco para escribir.', ex:'<input type="text">', ex2:'<input type="password">', tip:'Como un renglón para completar.' },
    '<table>': { tag:'HTML', text:'Es una tabla, con filas y columnas.', simple:'Es una planilla con filas y columnas.', ex:'<table>...</table>', ex2:'<table><tr><td>1</td></tr></table>', tip:'Como una planilla de cálculo.' },
    '<strong>': { tag:'HTML', text:'Pone el texto en negrita, para que resalte.', simple:'Pone el texto más grueso y oscuro para que resalte.', ex:'<strong>negrita</strong>', ex2:'<strong>¡Ganaste!</strong>', tip:'Como remarcar con fibra gruesa.' },
    '<em>': { tag:'HTML', text:'Pone el texto en cursiva (inclinado).', simple:'Pone el texto inclinado, como cuando escribís con otra letra.', ex:'<em>cursiva</em>', ex2:'<em>¡Ojo!</em>', tip:'Como escribir inclinado.' },
    '<br>': { tag:'HTML', text:'Hace un salto de línea, como apretar Enter.', simple:'Baja el texto a la línea de abajo.', ex:'Hola<br>Chau', ex2:'Uno<br>Dos', tip:'Como apretar Enter.' },
    '<hr>': { tag:'HTML', text:'Dibuja una línea horizontal para separar cosas.', simple:'Dibuja una raya horizontal que separa dos partes.', ex:'<hr>', ex2:'<p>Arriba</p><hr><p>Abajo</p>', tip:'Como una raya que divide la hoja.' },
    '<blockquote>': { tag:'HTML', text:'Es una cita: un texto que viene de otra fuente.', simple:'Es una frase de otra persona, como una cita entre comillas.', ex:'<blockquote>cita</blockquote>', ex2:'<blockquote>“Hola”</blockquote>', tip:'Como copiar una frase entre comillas.' },
    '<code>': { tag:'HTML', text:'Muestra un pedacito de código con otra letra.', simple:'Muestra código con una letra distinta, para que se note.', ex:'<code>let x = 5;</code>', ex2:'<code>color</code>', tip:'Como la pantalla de una calculadora.' },
    // CSS
    '#': { tag:'CSS', text:'El numeral sirve para elegir un elemento por su id (un nombre único).', simple:'El numeral elige UN solo elemento por su nombre único.', ex:'#menu { }', ex2:'#juego { }', tip:'El numeral apunta a UNO solo.' },
    '.': { tag:'CSS', text:'El punto sirve para elegir todos los elementos de una clase.', simple:'El punto elige TODOS los elementos que tienen esa clase.', ex:'.card { }', ex2:'.nave { }', tip:'El punto apunta a un GRUPO.' },
    'color': { tag:'CSS', text:'Cambia el color de la letra.', simple:'Cambia el color de las letras.', ex:'color: red;', ex2:'color: white;', tip:'Como cambiarle el color a la lapicera.' },
    'background': { tag:'CSS', text:'Cambia el color o la imagen de fondo.', simple:'Pinta la pared de atrás del contenido.', ex:'background: black;', ex2:'background: #0a0e1a;', tip:'Como pintar la pared de atrás.' },
    'margin': { tag:'CSS', text:'Es el espacio de afuera de una caja (la separa de las demás).', simple:'Es el aire de afuera de la caja: la separa de las demás.', ex:'margin: 8px;', ex2:'margin: 20px;', tip:'Como el aire alrededor de una caja.' },
    'padding': { tag:'CSS', text:'Es el espacio de adentro de una caja (entre el borde y el contenido).', simple:'Es el relleno de adentro: separa el texto del borde.', ex:'padding: 12px;', ex2:'padding: 4px;', tip:'Como el relleno de un almohadón.' },
    'border': { tag:'CSS', text:'Dibuja el borde o marco de una caja.', simple:'Dibuja el marco de la caja.', ex:'border: 1px solid black;', ex2:'border: 2px solid red;', tip:'Como el marco de un cuadro.' },
    'display': { tag:'CSS', text:'Decide cómo se muestra un elemento (en bloque, en línea, etc.).', simple:'Decide si el elemento se ve como bloque, en línea o no se ve.', ex:'display: block;', ex2:'display: none;', tip:'Como elegir si algo se ve o no.' },
    'display: flex': { tag:'CSS', text:'Activa flexbox: acomoda los elementos en fila o columna de forma flexible.', simple:'Pone los elementos en fila, como soldaditos.', ex:'display: flex;', ex2:'display: flex; gap: 8px;', tip:'Como poner soldaditos en fila.' },
    'justify-content': { tag:'CSS', text:'Acomoda los elementos a lo largo del eje principal (centro, izquierda, etc.).', simple:'Reparte los elementos a lo largo: al centro, a la izquierda, etc.', ex:'justify-content: center;', ex2:'justify-content: space-between;', tip:'Como repartir cosas en una repisa.' },
    'align-items': { tag:'CSS', text:'Acomoda los elementos en el eje cruzado (arriba, centro, abajo).', simple:'Acomoda los elementos a lo alto: arriba, al centro o abajo.', ex:'align-items: center;', ex2:'align-items: flex-start;', tip:'Como alinear cuadros en una pared.' },
    'position': { tag:'CSS', text:'Define cómo se ubica un elemento en la página.', simple:'Decide en qué lugar de la página se queda el elemento.', ex:'position: absolute;', ex2:'position: relative;', tip:'Como decir “quedate justo acá”.' },
    'width': { tag:'CSS', text:'Es el ancho de un elemento.', simple:'Es cuánto mide de ancho.', ex:'width: 200px;', ex2:'width: 100%;', tip:'Como el ancho de una foto.' },
    'height': { tag:'CSS', text:'Es la altura de un elemento.', simple:'Es cuánto mide de alto.', ex:'height: 100px;', ex2:'height: 50vh;', tip:'Como el alto de una puerta.' },
    'font-size': { tag:'CSS', text:'Es el tamaño de la letra.', simple:'Es el tamaño de las letras: chicas o grandes.', ex:'font-size: 20px;', ex2:'font-size: 2rem;', tip:'Como elegir letra chica o grande.' },
    'text-align': { tag:'CSS', text:'Alinea el texto: izquierda, centro o derecha.', simple:'Acomoda el texto: a la izquierda, al centro o a la derecha.', ex:'text-align: center;', ex2:'text-align: right;', tip:'Como acomodar un título en la hoja.' },
    ':hover': { tag:'CSS', text:'Se activa cuando pasás el mouse por encima de un elemento.', simple:'Es lo que pasa cuando apoyás el mouse encima.', ex:'a:hover { color: red; }', ex2:'button:hover { }', tip:'Como cuando algo se ilumina al tocarlo.' },
    'border-radius': { tag:'CSS', text:'Redondea las esquinas de una caja.', simple:'Redondea las puntas de la caja.', ex:'border-radius: 8px;', ex2:'border-radius: 50%;', tip:'Como una pelota o una tarjeta.' },
    'box-shadow': { tag:'CSS', text:'Le pone una sombra a una caja.', simple:'Le pone una sombra abajo a la caja, como si flotara.', ex:'box-shadow: 0 2px 6px black;', ex2:'box-shadow: 0 0 12px cyan;', tip:'Como una caja que flota.' },
    'transition': { tag:'CSS', text:'Hace que un cambio (color, tamaño, etc.) ocurra suavemente.', simple:'Hace que los cambios pasen despacito, sin saltos.', ex:'transition: all .3s;', ex2:'transition: color .2s;', tip:'Como una puerta que no da un golpe.' },
    // JS
    'let': { tag:'JS', text:'Crea una variable: una caja con un valor que puede cambiar.', simple:'Crea una cajita con un nombre que guarda un dato que puede cambiar.', ex:'let vidas = 3;', ex2:'let puntos = 0;', tip:'Una cajita con un valor que podés cambiar.' },
    'const': { tag:'JS', text:'Crea una constante: un valor que NO cambia.', simple:'Crea una cajita con un valor que NO se puede cambiar.', ex:'const nombre = "Ana";', ex2:'const URL = "/api";', tip:'Una cajita cerrada con llave.' },
    '===': { tag:'JS', text:'Compara si dos cosas son exactamente iguales (valor y tipo).', simple:'Pregunta si dos cosas son igualitas, sin trampa.', ex:'a === b', ex2:'vidas === 0', tip:'Como preguntar “¿son igualitos?”.' },
    '=>': { tag:'JS', text:'Es una función flecha: una forma corta de escribir una función.', simple:'Es una orden corta, escrita en una sola línea.', ex:'() => {}', ex2:'(a, b) => a + b', tip:'Como una receta escrita en una línea.' },
    'if': { tag:'JS', text:'Es una condición: “si pasa esto, hacé aquello”.', simple:'Es una decisión: “si pasa esto, hacé aquello”.', ex:'if (vidas > 0) { }', ex2:'if (puntos > 10) { }', tip:'Como un semáforo: decide si seguís.' },
    'for': { tag:'JS', text:'Es un bucle: repite algo varias veces.', simple:'Repite algo varias veces, como dar vueltas a la manzana.', ex:'for (let i = 0; i < 3; i++) {}', ex2:'for (let i = 0; i < 5; i++) {}', tip:'Como dar 3 vueltas a la manzana.' },
    'push()': { tag:'JS', text:'Agrega un elemento al final de una lista (array).', simple:'Agrega una cosa al final de una lista.', ex:'lista.push(4)', ex2:'naves.push("<p>")', tip:'Como agregar una ficha al final de la fila.' },
    'getelementbyid()': { tag:'JS', text:'Busca un elemento de la página por su id.', simple:'Busca una cosa de la página por su nombre único.', ex:'document.getElementById("menu")', ex2:'document.getElementById("juego")', tip:'Como buscar a alguien por su nombre.' },
    'fetch()': { tag:'JS', text:'Pide datos a un servidor por internet.', simple:'Pide datos a otra computadora por internet.', ex:'fetch("/api")', ex2:'fetch("/api/niveles")', tip:'Como pedir un delivery de datos.' }
  };

  function explain(answer){
    const key = String(answer==null?'':answer).trim().toLowerCase().replace(/\s+/g,' ');
    return EXPLAIN[key] || null;
  }
  function softHint(answer){
    const a = String(answer==null?'':answer);
    const low = a.toLowerCase();
    if(!a) return '';
    if(low.startsWith('<') && low.endsWith('>')) return 'Es una etiqueta HTML: empieza con <b>&lt;</b> y termina con <b>&gt;</b>.';
    if(['#','.'].includes(a)) return 'Es un símbolo de CSS de un solo carácter.';
    if(['===','=>'].includes(a)) return 'Es un símbolo de JavaScript de '+a.length+' caracteres.';
    if(low.includes(':')) return 'Es una propiedad CSS con dos partes separadas por dos puntos (:).';
    if(/^[a-z-]+$/i.test(a)) return 'Es una palabra en inglés que empieza con la letra «'+esc(a.charAt(0).toUpperCase())+'» y tiene '+a.length+' letras.';
    return 'Copiá la respuesta exactamente como te la muestra la ayuda.';
  }

  function contextChips(ctx){
    const s = skill();
    const chips = ['<span class="help-chip" style="--hc:'+s.color+'">'+s.icon+' '+s.label+'</span>'];
    if(ctx && ctx.inGame){
      if(ctx.title) chips.push('<span class="help-chip">🗺️ '+esc(ctx.title)+'</span>');
      if(ctx.maxLives) chips.push('<span class="help-chip">❤️ '+Math.max(0,ctx.lives||0)+' / '+ctx.maxLives+'</span>');
      if(ctx.diffLabel) chips.push('<span class="help-chip">🎚️ '+esc(ctx.diffLabel)+'</span>');
    }
    return '<div class="help-chips">'+chips.join('')+'</div>';
  }

  function answerBlock(item, index){
    const info = explain(item.a);
    const skillId = skill().id;
    const isBeginner = skillId === 'beginner';
    const tag = info ? info.tag : '';
    const shown = helpRevealed;
    const main = info
      ? ((isBeginner && info.simple) ? info.simple : info.text)
      : 'Buscá la palabra o etiqueta que corresponde a esa pista. La ayuda te muestra la respuesta exacta abajo.';
    const examples = info ? [info.ex, info.ex2].filter(Boolean) : [];
    return '<div class="help-item">'
      + '<div class="help-question">La nave dice: <b>“'+esc(item.q)+'”</b></div>'
      + (info
          ? '<div class="help-explain"><span class="help-tag">'+tag+'</span>'+main
            + examples.map(ex=>'<span class="help-example">Ejemplo: <code>'+esc(ex)+'</code></span>').join('')
            + (isBeginner && info.tip ? '<span class="help-example help-tip">💡 '+esc(info.tip)+'</span>' : '')
            + '</div>'
          : '<div class="help-explain">Buscá la palabra o etiqueta que corresponde a esa pista. La ayuda te muestra la respuesta exacta abajo.</div>')
      + '<div class="help-hint"><b>Pista:</b> '+softHint(item.a)+'</div>'
      + (shown
          ? '<div class="help-answer-box"><span class="help-answer-label">Escribí exactamente:</span><code class="help-answer">'+esc(item.a)+'</code>'
            + '<button type="button" class="btn btn-primary btn-sm" data-help-action="fill" data-answer="'+escAttr(item.a)+'">✍️ Usar esta respuesta</button></div>'
          : '<button type="button" class="help-reveal-btn" data-help-action="reveal">💡 Mostrar la respuesta</button>')
      + '</div>';
  }

  function genericBody(ctx){
    const state = ctx && ctx.state;
    if(state === 'gameover'){
      return '<div class="help-big-emoji">💚</div>'
        + '<h3 class="help-title">Perdiste las vidas, pero no pasa nada</h3>'
        + '<p class="help-lead">Podés reintentar el nivel todas las veces que quieras. Te recomiendo empezar por el nivel 1 y usar la ayuda cuando una pregunta no salga.</p>'
        + '<div class="help-steps"><div class="help-step"><span>1</span><p>Tocá <b>↺ REINTENTAR</b>.</p></div>'
        + '<div class="help-step"><span>2</span><p>Leé la pregunta de la nave con calma.</p></div>'
        + '<div class="help-step"><span>3</span><p>Si no sabés qué escribir, tocá <b>❓ AYUDA</b> otra vez.</p></div></div>';
    }
    if(!ctx || !ctx.inGame || state === 'title'){
      return '<div class="help-big-emoji">🎮</div>'
        + '<h3 class="help-title">Cómo jugar</h3>'
        + '<p class="help-lead">Elegí un nivel, tocá una nave para leer su pregunta, escribí la respuesta exacta y presioná <b>ENTER</b>. Si no sabés qué escribir, esta ayuda te lo explica.</p>'
        + '<div class="help-steps"><div class="help-step"><span>1</span><p>Tocá una nave.</p></div>'
        + '<div class="help-step"><span>2</span><p>Mirá la pregunta del cartel verde.</p></div>'
        + '<div class="help-step"><span>3</span><p>Escribí la respuesta y presioná ENTER.</p></div></div>';
    }
    return '<div class="help-big-emoji">👾</div>'
      + '<h3 class="help-title">Todavía no hay una nave seleccionada</h3>'
      + '<p class="help-lead">Tocá una nave en el espacio para ver su pregunta. Mientras tanto, recordá: escribís la respuesta en la barra de abajo y disparás con ENTER.</p>';
  }

  function renderHelp(){
    const body = document.getElementById('helpBody');
    if(!body) return;
    const ctx = helpCtx || {};
    const s = skill();
    const items = Array.isArray(ctx.items) ? ctx.items : [];
    let html = contextChips(ctx);
    html += '<h3 class="help-title">'+(helpAuto?'Te ayudo paso a paso':'Ayuda paso a paso')+'</h3>';
    html += '<p class="help-lead">'+(helpAuto ? 'Vi que te trabaste un par de veces. Vamos juntos:' : s.id==='advanced'?'Menos charla, más referencia:':s.id==='beginner'?'Te explico la pregunta actual con palabras simples:':'Te lo repito con palabras simples:')+'</p>';

    if(items.length){
      html += '<div class="help-step-block"><span class="help-step-num">1</span><div><h4>Leé la pregunta</h4><p>La nave te está pidiendo <b>'+items.map(i=>'“'+esc(i.q)+'”').join(', ')+'</b>. Esa es la pista.</p></div></div>';
      html += '<div class="help-step-block"><span class="help-step-num">2</span><div><h4>Entendé qué significa</h4>'+items.map((it,i)=>answerBlock(it,i)).join('')+'</div></div>';
      html += '<div class="help-step-block"><span class="help-step-num">3</span><div><h4>Escribí y dispará</h4><p>Copiá la respuesta en la barra de abajo y presioná <b>ENTER</b>.</p></div></div>';
    } else {
      html += genericBody(ctx);
    }

    if(ctx.jsBoss && ctx.jsBossPhase === 3 && !ctx.jsBossPortal){
      html += '<div class="help-note help-note-gold">🔫 <b>Fase furiosa:</b> escribir el código correcto NO destruye la nave; te da 1 bala. Después dispará con <b>SPACE</b> o el botón 💥.</div>';
    } else if(ctx.boss && ctx.inGame){
      html += '<div class="help-note">👑 <b>Es un jefe:</b> escribí la respuesta y presioná ENTER para dañarlo. En el jefe final también podés recoger balas 🔫 y disparar con SPACE.</div>';
    }
    if(s.id==='beginner' && !helpRevealed && items.length){
      html += '<div class="help-note">💡 La ayuda te muestra la respuesta completa después de <b>'+s.autoHelpAt+' fallos</b>, o cuando toques “Mostrar la respuesta”.</div>';
    }

    html += '<div class="help-actions">'
      + '<button type="button" class="btn btn-ghost btn-sm" data-help-action="tutorial">📖 Abrir tutorial completo</button>'
      + '<button type="button" class="btn btn-ghost btn-sm" data-help-action="skill">🎓 Cambiar mi nivel</button>'
      + '</div>';

    body.innerHTML = html;
  }

  function openHelp(opts){
    opts = opts || {};
    const ov = document.getElementById('helpOverlay');
    if(!ov) return;
    ensure();
    helpCtx = (typeof Game!=='undefined' && Game.getHelpContext) ? Game.getHelpContext() : { inGame:false, state:'title' };
    helpAuto = !!opts.auto;
    const autoRevealAt = skill().autoHelpAt || 3;
    helpRevealed = !!opts.reveal || (helpAuto && mistakes >= autoRevealAt);
    helpOpen = true;
    renderHelp();
    ov.classList.remove('hidden');
    document.body.style.overflow='hidden';
    const input = document.getElementById('answerInput');
    if(input) input.blur();
    const hb = document.getElementById('helpFocusBtn');
    if(hb) hb.classList.remove('help-pulse');
  }

  function closeHelp(){
    const ov = document.getElementById('helpOverlay');
    if(ov) ov.classList.add('hidden');
    helpOpen = false;
    document.body.style.overflow='';
    if(typeof Game!=='undefined' && Game.getState && Game.getState()==='playing'){
      const input = document.getElementById('answerInput');
      if(input) setTimeout(()=>{ try{ input.focus(); }catch(e){} }, 80);
    }
  }

  function fillAnswer(answer){
    if(typeof Game!=='undefined' && Game.fillAnswer && Game.fillAnswer(answer)){ closeHelp(); return; }
    const input = document.getElementById('answerInput');
    if(input){ input.value = answer; input.focus(); closeHelp(); }
  }

  /* ================= FALLOS Y AYUDA PROGRESIVA ================= */
  function pulseHelp(){
    const b = document.getElementById('helpFocusBtn');
    if(!b) return;
    b.classList.add('help-pulse');
    clearTimeout(pulseHelp._t);
    pulseHelp._t = setTimeout(()=>{ try{ b.classList.remove('help-pulse'); }catch(e){} }, 8000);
  }

  function registerMistake(kind){
    ensure();
    mistakes++;
    const s = skill();
    pulseHelp();
    if(mistakes === (s.firstHelpAt || 2)){
      toast('💡 '+(s.toast || 'Si te trabaste, tocá ❓ AYUDA.'), 'info');
    }
    if(mistakes >= (s.autoHelpAt || 3) && !autoShown){
      autoShown = true;
      const state = (typeof Game!=='undefined' && Game.getState) ? Game.getState() : '';
      if(state === 'playing' || state === 'gameover') openHelp({ auto:true });
    }
  }

  function resetMistakes(){
    mistakes = 0;
    autoShown = false;
    helpRevealed = false;
    const b = document.getElementById('helpFocusBtn');
    if(b) b.classList.remove('help-pulse');
  }

  function notifyIntroClosed(level){
    introClosedLevel = level || null;
    introClosedAt = Date.now();
  }

  function maybeAsk(){
    if(hasSkill()) return;
    if(pickerOpen || helpOpen) return;
    const intro = document.getElementById('introOverlay');
    if(intro && !intro.classList.contains('hidden')) return;
    // Si ya arrancó una partida (por ejemplo, el calentamiento lanzado desde
    // el tutorial), no le tapamos el juego con el selector de experiencia.
    const st = (typeof Game!=='undefined' && Game.getState) ? Game.getState() : 'title';
    if(st !== 'title') return;
    openPicker({ firstTime:true });
  }

  function anyOverlayOpen(){
    return ['skillOverlay','helpOverlay','introOverlay','levelsOverlay'].some(id=>{
      const el = document.getElementById(id);
      return el && !el.classList.contains('hidden');
    });
  }

  function init(){
    const ov = document.getElementById('skillOverlay');
    const grid = document.getElementById('skillGrid');
    const close = document.getElementById('skillClose');
    const helpOv = document.getElementById('helpOverlay');
    const helpBody = document.getElementById('helpBody');
    const helpClose = document.getElementById('helpClose');
    const helpBack = document.getElementById('helpBack');
    const helpBtn = document.getElementById('helpFocusBtn');
    const gameHelpBtn = document.getElementById('gameHelpBtn');
    const modeSkillBtn = document.getElementById('modeSkillBtn');

    if(grid){
      grid.addEventListener('click', (e)=>{
        const b = e.target.closest('[data-skill]');
        if(b) choose(b.dataset.skill);
      });
    }
    if(close) close.addEventListener('click', closePicker);
    if(ov) ov.addEventListener('click', (e)=>{ if(e.target===ov) closePicker(); });

    if(helpBtn) helpBtn.addEventListener('click', ()=>openHelp());
    if(gameHelpBtn) gameHelpBtn.addEventListener('click', ()=>{
      const menu = document.getElementById('gameOptionsMenu');
      if(menu) menu.classList.add('hidden');
      openHelp();
    });
    if(modeSkillBtn) modeSkillBtn.addEventListener('click', ()=>openPicker());
    if(helpClose) helpClose.addEventListener('click', closeHelp);
    if(helpBack) helpBack.addEventListener('click', closeHelp);
    if(helpOv) helpOv.addEventListener('click', (e)=>{ if(e.target===helpOv) closeHelp(); });
    if(helpBody){
      helpBody.addEventListener('click', (e)=>{
        const b = e.target.closest('[data-help-action]');
        if(!b) return;
        const action = b.dataset.helpAction;
        if(action === 'reveal'){ helpRevealed = true; renderHelp(); }
        else if(action === 'fill'){ fillAnswer(b.dataset.answer || ''); }
        else if(action === 'tutorial'){
          closeHelp();
          try{ if(typeof Intro!=='undefined' && Intro.openForSkill) Intro.openForSkill(current()); }catch(err){}
        }
        else if(action === 'skill'){ closeHelp(); openPicker(); }
      });
    }

    document.addEventListener('keydown', (e)=>{
      if(e.key !== 'Escape') return;
      if(helpOpen){ e.preventDefault(); closeHelp(); return; }
      if(pickerOpen){ e.preventDefault(); closePicker(); return; }
      // Atajo H para abrir la ayuda cuando no estás escribiendo una respuesta.
      if(e.key === 'h' || e.key === 'H') return;
    });
    document.addEventListener('keydown', (e)=>{
      if((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey && !e.altKey){
        const a = document.activeElement;
        const typing = a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable);
        if(typing || anyOverlayOpen()) return;
        e.preventDefault();
        openHelp();
      }
    });

    // Si es la primera vez, primero se pregunta la experiencia. El tutorial
    // adaptado se abre recién después de elegir.
    setTimeout(()=>{ try{ maybeAsk(); }catch(e){} }, 900);
  }

  return {
    init, openPicker, closePicker, openHelp, closeHelp,
    registerMistake, resetMistakes, notifyIntroClosed, maybeAsk,
    hasSkill, current, skill, choose,
    get mistakes(){ return mistakes; }
  };
})();
