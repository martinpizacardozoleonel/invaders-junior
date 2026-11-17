const Intro = (() => {
  const STORAGE_KEY = 'ci_intro_seen_v2';
  const HIDE_KEY = 'ci_intro_hidden';
  const SKILL_IDS = ['beginner', 'intermediate', 'advanced'];
  const seen = () => { try { return localStorage.getItem(STORAGE_KEY)==='1'; }catch(e){ return false; } };
  const logged = () => (typeof Auth!=='undefined' && !!Auth.isLogged);
  const unlocked = () => seen() && logged();
  const hiddenLocal = () => { try { return localStorage.getItem(HIDE_KEY)==='1'; }catch(e){ return false; } };
  const hiddenServer = () => !!(typeof Auth!=='undefined' && Auth.user && Auth.user.introHidden);
  const shouldAutoShow = () => !(hiddenLocal() || hiddenServer());
  let autoOpened = false;

  // El nivel elegido en la pantalla de bienvenida cambia el tutorial. Si todavía
  // no eligió, se usa Intermedio para no dejar la pantalla vacía.
  function storedSkill(){
    try{
      const v = localStorage.getItem('ci_learning_level');
      return SKILL_IDS.includes(v) ? v : 'intermediate';
    }catch(e){ return 'intermediate'; }
  }

  async function saveHide(v){
    try{ if(v) localStorage.setItem(HIDE_KEY,'1'); else localStorage.removeItem(HIDE_KEY); }catch(e){}
    if(logged()){
      try{
        if(typeof Auth!=='undefined'&&Auth.user) Auth.user.introHidden=!!v;
        await API.request('/api/settings',{method:'PUT',body:JSON.stringify({introHidden:!!v})});
      }catch(e){}
    }
    refreshNoShow();
  }
  function refreshNoShow(){
    const box=document.getElementById('introNoShow');
    const label=document.getElementById('introNoShowLabel');
    const wrap=document.getElementById('introNoShowWrap');
    if(!box) return;
    box.checked=hiddenLocal()||hiddenServer();
    const ok=unlocked();
    box.disabled=!ok;
    if(wrap) wrap.classList.toggle('locked',!ok);
    if(label) label.textContent=ok?'No volver a mostrar':'🔒 Mirá el tutorial e iniciá sesión para desbloquear "No volver a mostrar"';
  }
  function syncFromServer(){
    try{
      if(logged() && Auth.user && Auth.user.introHidden){
        try{ localStorage.setItem(HIDE_KEY,'1'); }catch(e){}
        if(autoOpened && overlay && !overlay.classList.contains('hidden')) close();
      }
    }catch(e){}
    refreshNoShow();
  }

  /* ================= CONTENIDO DEL TUTORIAL ================= */
  // Un mismo tutorial, tres explicaciones distintas:
  //   beginner     → nunca programó (chicos y adultos que no entienden el tema)
  //   intermediate → lo vio una vez pero casi no se acuerda (o no prestó
  //                  atención en clase)
  //   advanced     → lo vio y sabe un poco, no todo
  function esc(s){
    return String(s==null?'':s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function escAttr(s){ return esc(s).replace(/`/g,'&#96;'); }

  /* ---- Referencia: cada fila trae DOS ejemplos y una pista simple.
         Se usa en las tarjetas de principiante y en las tablas de los
         otros dos niveles, así todos ven el mismo contenido. ---- */
  const HTML_ROWS = [
    { badge:'H1',  code:'<h1>',        what:'El título más grande de la página.',        ex:'<h1>Hola</h1>',            ex2:'<h1>Mi página</h1>',        tip:'Como el título grande de un afiche.' },
    { badge:'P',   code:'<p>',         what:'Un párrafo: un bloque de texto normal.',    ex:'<p>Hola mundo</p>',        ex2:'<p>Bienvenidos</p>',        tip:'Como un renglón de una carta.' },
    { badge:'A',   code:'<a>',         what:'Un enlace: lleva a otra página.',           ex:'<a href="/">Ir</a>',       ex2:'<a href="/juego">Jugar</a>',tip:'Como una flecha que te lleva a otro lugar.' },
    { badge:'IMG', code:'<img>',       what:'Una imagen o foto.',                        ex:'<img src="foto.jpg">',     ex2:'<img src="nave.png">',      tip:'Como pegar una foto en la pared.' },
    { badge:'UL',  code:'<ul>',        what:'Una lista con puntitos.',                   ex:'<ul><li>Uno</li></ul>',    ex2:'<ul><li>HTML</li></ul>',    tip:'Como una lista del supermercado.' },
    { badge:'DIV', code:'<div>',       what:'Una caja grande para agrupar cosas.',       ex:'<div>...</div>',           ex2:'<div class="juego">...</div>',tip:'Como una caja de cartón.' },
    { badge:'SPAN',code:'<span>',      what:'Una caja chiquita dentro de una línea.',    ex:'<span>texto</span>',       ex2:'<span>2 vidas</span>',      tip:'Como resaltar una palabra con marcador.' },
    { badge:'BTN', code:'<button>',    what:'Un botón que se puede tocar.',              ex:'<button>Enviar</button>',  ex2:'<button>Jugar</button>',    tip:'Como el timbre de una casa.' },
    { badge:'IN',  code:'<input>',     what:'Un casillero para escribir.',               ex:'<input type="text">',      ex2:'<input type="password">',   tip:'Como un renglón en blanco para completar.' },
    { badge:'TAB', code:'<table>',     what:'Una tabla con filas y columnas.',           ex:'<table>...</table>',       ex2:'<table><tr><td>1</td></tr></table>', tip:'Como una planilla de cálculo.' },
    { badge:'STR', code:'<strong>',    what:'Pone el texto en negrita.',                 ex:'<strong>importante</strong>', ex2:'<strong>¡Ganaste!</strong>', tip:'Como remarcar con fibra gruesa.' },
    { badge:'EM',  code:'<em>',        what:'Pone el texto en cursiva.',                 ex:'<em>cursiva</em>',         ex2:'<em>¡Ojo!</em>',            tip:'Como escribir inclinado.' },
    { badge:'BR',  code:'<br>',        what:'Hace un salto de línea.',                   ex:'Hola<br>Chau',             ex2:'Uno<br>Dos',                tip:'Como apretar Enter.' },
    { badge:'HR',  code:'<hr>',        what:'Dibuja una línea para separar.',            ex:'<hr>',                     ex2:'<p>Arriba</p><hr><p>Abajo</p>', tip:'Como una raya que divide la hoja.' },
    { badge:'BQ',  code:'<blockquote>',what:'Una cita de otro texto.',                   ex:'<blockquote>cita</blockquote>', ex2:'<blockquote>“Hola”</blockquote>', tip:'Como copiar una frase entre comillas.' },
    { badge:'CD',  code:'<code>',      what:'Muestra un pedacito de código.',            ex:'<code>let x = 5;</code>',  ex2:'<code>color</code>',        tip:'Como una calculadora: se ve distinto.' }
  ];
  const CSS_ROWS = [
    { badge:'#',   code:'#',             what:'Elige un elemento por su id (nombre único).', ex:'#menu { }',                  ex2:'#juego { }',                  tip:'El numeral apunta a UNO solo.' },
    { badge:'.',   code:'.',             what:'Elige todos los elementos de una clase.',     ex:'.card { }',                  ex2:'.nave { }',                   tip:'El punto apunta a un GRUPO.' },
    { badge:'C',   code:'color',         what:'Cambia el color de la letra.',                ex:'color: red;',                ex2:'color: white;',               tip:'Como cambiarle el color a la lapicera.' },
    { badge:'BG',  code:'background',    what:'Cambia el color o la imagen de fondo.',       ex:'background: black;',         ex2:'background: #0a0e1a;',        tip:'Como pintar la pared de atrás.' },
    { badge:'M',   code:'margin',        what:'Espacio de afuera de una caja.',              ex:'margin: 8px;',               ex2:'margin: 20px;',               tip:'Como el aire alrededor de una caja.' },
    { badge:'PD',  code:'padding',       what:'Espacio de adentro de una caja.',             ex:'padding: 12px;',             ex2:'padding: 4px;',               tip:'Como el relleno de un almohadón.' },
    { badge:'B',   code:'border',        what:'Dibuja el borde o marco de una caja.',       ex:'border: 1px solid;',         ex2:'border: 2px solid red;',      tip:'Como el marco de un cuadro.' },
    { badge:'D',   code:'display',       what:'Decide cómo se muestra un elemento.',        ex:'display: block;',            ex2:'display: none;',              tip:'Como elegir si algo se ve o no.' },
    { badge:'F',   code:'display: flex', what:'Acomoda los elementos en fila o columna.',   ex:'display: flex;',             ex2:'display: flex; gap: 8px;',    tip:'Como poner soldaditos en fila.' },
    { badge:'JC',  code:'justify-content', what:'Acomoda los elementos a lo largo.',        ex:'justify-content: center;',   ex2:'justify-content: space-between;', tip:'Como repartir cosas en una repisa.' },
    { badge:'AI',  code:'align-items',   what:'Acomoda los elementos a lo alto.',           ex:'align-items: center;',       ex2:'align-items: flex-start;',    tip:'Como alinear cuadros en una pared.' },
    { badge:'POS', code:'position',      what:'Define dónde se ubica un elemento.',         ex:'position: absolute;',        ex2:'position: relative;',         tip:'Como decir “quedate justo acá”.' },
    { badge:'W',   code:'width',         what:'El ancho de un elemento.',                   ex:'width: 200px;',              ex2:'width: 100%;',                tip:'Como el ancho de una foto.' },
    { badge:'H',   code:'height',        what:'La altura de un elemento.',                  ex:'height: 100px;',             ex2:'height: 50vh;',               tip:'Como el alto de una puerta.' },
    { badge:'FS',  code:'font-size',     what:'El tamaño de la letra.',                     ex:'font-size: 20px;',           ex2:'font-size: 2rem;',            tip:'Como elegir letra chica o grande.' },
    { badge:'TA',  code:'text-align',    what:'Alinea el texto: izquierda, centro o derecha.', ex:'text-align: center;',      ex2:'text-align: right;',          tip:'Como acomodar un título en la hoja.' },
    { badge:'HOV', code:':hover',        what:'Se activa cuando pasás el mouse encima.',     ex:'a:hover { color: red; }',    ex2:'button:hover { }',            tip:'Como cuando algo se ilumina al tocarlo.' },
    { badge:'BR',  code:'border-radius', what:'Redondea las esquinas de una caja.',          ex:'border-radius: 8px;',        ex2:'border-radius: 50%;',         tip:'Como una pelota o una tarjeta.' },
    { badge:'SH',  code:'box-shadow',    what:'Le pone una sombra a una caja.',              ex:'box-shadow: 0 2px 6px #000;', ex2:'box-shadow: 0 0 12px cyan;',  tip:'Como una caja que flota.' },
    { badge:'TR',  code:'transition',    what:'Hace que un cambio ocurra suavemente.',      ex:'transition: all .3s;',       ex2:'transition: color .2s;',      tip:'Como una puerta que no da un golpe.' }
  ];
  const JS_ROWS = [
    { badge:'let',  code:'let',              what:'Crea una variable que puede cambiar.',    ex:'let vidas = 3;',                    ex2:'let puntos = 0;',                  tip:'Una cajita con un valor que podés cambiar.' },
    { badge:'const',code:'const',            what:'Crea una constante que NO cambia.',       ex:'const nombre = "Ana";',             ex2:'const URL = "/api";',              tip:'Una cajita cerrada con llave.' },
    { badge:'=>',   code:'=>',               what:'Una función flecha: una orden corta.',    ex:'() => {}',                          ex2:'(a, b) => a + b',                  tip:'Como una receta escrita en una línea.' },
    { badge:'if',   code:'if',               what:'Una condición: “si pasa esto, hacé aquello”.', ex:'if (vidas > 0) { }',           ex2:'if (puntos > 10) { }',             tip:'Como un semáforo: decide si seguís.' },
    { badge:'===',  code:'===',              what:'Compara si dos cosas son exactamente iguales.', ex:'a === b',                    ex2:'vidas === 0',                      tip:'Como preguntar “¿son igualitos?”.' },
    { badge:'push', code:'push()',           what:'Agrega un elemento al final de una lista.', ex:'lista.push(4)',                   ex2:'naves.push("<p>")',                tip:'Como agregar un ficha al final de la fila.' },
    { badge:'for',  code:'for',              what:'Un bucle: repite algo varias veces.',     ex:'for (let i = 0; i < 3; i++) {}',    ex2:'for (let i = 0; i < 5; i++) {}',   tip:'Como dar 3 vueltas a la manzana.' },
    { badge:'id',   code:'getElementById()', what:'Busca un elemento de la página por su id.', ex:'document.getElementById("menu")', ex2:'document.getElementById("juego")', tip:'Como buscar a alguien por su nombre.' },
    { badge:'fetch',code:'fetch()',          what:'Pide datos a un servidor por internet.',  ex:'fetch("/api")',                     ex2:'fetch("/api/niveles")',            tip:'Como pedir un delivery de datos.' }
  ];

  function tagMeta(kind){
    if(kind==='HTML') return {label:'HTML', color:'#e65100', text:'Etiquetas — qué hace / dos ejemplos', cls:''};
    if(kind==='CSS') return {label:'CSS', color:'#1565c0', text:'Selectores y propiedades — qué hace / dos ejemplos', cls:' css'};
    return {label:'JS', color:'#f9a825', text:'JavaScript — qué hace / dos ejemplos', cls:' js'};
  }

  /* Tabla de referencia: código + qué hace + DOS ejemplos + detalle. */
  function tagTable(kind, rows, opts){
    opts = opts || {};
    const info = tagMeta(kind);
    const head = ['CÓDIGO','QUÉ HACE','EJEMPLO 1','EJEMPLO 2'].concat(opts.tip ? ['DETALLE'] : []);
    return '<div class="intro-tag-section">'
      + '<h4 class="intro-tag-head"><span class="intro-tag-icon" style="background:'+info.color+';'+(kind==='JS'?'color:#000;':'')+'">'+info.label+'</span> '+info.text+'</h4>'
      + '<div class="intro-tag-table-wrap"><table class="intro-tag-table'+(opts.tip?' with-tip':'')+'">'
      + '<thead><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'
      + rows.map(r=>'<tr>'
        + '<td><code>'+esc(r.code)+'</code></td>'
        + '<td>'+esc(r.what)+'</td>'
        + '<td><code>'+esc(r.ex)+'</code></td>'
        + '<td><code>'+esc(r.ex2)+'</code></td>'
        + (opts.tip?'<td class="intro-tag-tip">'+esc(r.tip)+'</td>':'')
        + '</tr>').join('')
      + '</tbody></table></div></div>';
  }

  /* Tarjetas grandes para principiantes: se leen mejor que una tabla ancha. */
  // Devuelve las filas en el orden en que aparecen en los niveles 1-3, para
  // que el principiante vea primero justo lo que le van a pedir.
  function pickRows(rows, codes){
    return codes.map(c=>rows.find(r=>r.code===c)).filter(Boolean);
  }

  function tagCards(kind, rows){
    const info = tagMeta(kind);
    return '<div class="intro-tag-section">'
      + '<h4 class="intro-tag-head"><span class="intro-tag-icon" style="background:'+info.color+';'+(kind==='JS'?'color:#000;':'')+'">'+info.label+'</span> '+info.text+'</h4>'
      + '<div class="intro-tag-cards">'
      + rows.map(r=>'<div class="intro-tag-card">'
        + '<div class="intro-tag-card-head"><span class="intro-tag-img'+info.cls+'">'+esc(r.badge)+'</span><code>'+esc(r.code)+'</code></div>'
        + '<p class="intro-tag-card-what">'+esc(r.what)+'</p>'
        + '<div class="intro-tag-card-ex"><span>EJEMPLOS</span><code>'+esc(r.ex)+'</code><code>'+esc(r.ex2)+'</code></div>'
        + '<p class="intro-tag-card-tip">💡 '+esc(r.tip)+'</p>'
        + '</div>').join('')
      + '</div></div>';
  }

  function demoGrid(items){
    return '<div class="intro-demo-grid">'
      + items.map(it=>'<div class="intro-demo">'
        + '<div class="intro-demo-code"><span class="intro-demo-label">ESCRIBÍS</span><code>'+esc(it.code)+'</code></div>'
        + '<div class="intro-demo-arrow">→</div>'
        + '<div class="intro-demo-view"><span class="intro-demo-label">'+(it.label||'SE VE')+'</span><div class="intro-demo-screen">'+(it.view||'')+'</div></div>'
        + (it.note?'<p class="intro-demo-note">'+it.note+'</p>':'')
        + '</div>').join('')
      + '</div>';
  }

  function demoRows(items){
    return '<div class="intro-arcade-demo">'
      + items.map(it=>'<div class="arcade-demo-row">'
        + '<div class="arcade-nave">👾<span>'+esc(it[0])+'</span></div>'
        + '<div class="arcade-arrow">→</div>'
        + '<div class="arcade-input">'+esc(it[1])+'</div>'
        + '<div class="arcade-arrow">→</div>'
        + '<div class="arcade-boom">💥 ¡DESTRUIDA!</div>'
      + '</div>').join('') + '</div>';
  }

  function steps3(){
    return '<div class="intro-steps3">'
      + '<div class="intro-step"><span class="intro-step-num">1</span><h4>MIRÁ</h4><p>La nave te dice qué necesitás (ej.: “Renglón de texto”).</p></div>'
      + '<div class="intro-step"><span class="intro-step-num">2</span><h4>ESCRIBÍ</h4><p>Escribí la respuesta exacta en la barra de abajo.</p></div>'
      + '<div class="intro-step"><span class="intro-step-num">3</span><h4>DISPARÁ</h4><p>Presioná ENTER y tu láser destruye la nave.</p></div>'
      + '</div>';
  }

  function glossary(){
    const items = [
      ['ETIQUETA','Una palabra entre &lt; y &gt;. Le dice a la página qué es cada cosa.','&lt;p&gt;'],
      ['PROPIEDAD','Dice CÓMO se ve algo: color, tamaño, borde...','color'],
      ['VALOR','Lo que va después de los dos puntos.','red'],
      ['VARIABLE','Una cajita con nombre que guarda un dato.','let vidas = 3;'],
      ['FUNCIÓN','Una orden guardada con nombre, para usarla cuando quieras.','saludar()']
    ];
    return '<div class="intro-glossary">'
      + items.map(it=>'<div class="intro-glossary-item"><b>'+it[0]+'</b><p>'+it[1]+'</p><code>'+it[2]+'</code></div>').join('')
      + '</div>';
  }

  function translateBox(){
    return '<div class="intro-translate">'
      + '<h4>🗣️ Cómo leer la pregunta</h4>'
      + '<p class="intro-translate-lead">La nave no habla en código: te lo dice con palabras. Vos traducís.</p>'
      + '<div class="intro-translate-rows">'
      + '<div class="intro-translate-row"><span>“Título gigante”</span><i>→</i><code>&lt;h1&gt;</code></div>'
      + '<div class="intro-translate-row"><span>“Margen exterior”</span><i>→</i><code>margin</code></div>'
      + '<div class="intro-translate-row"><span>“Variable que puede cambiar”</span><i>→</i><code>let</code></div>'
      + '<div class="intro-translate-row"><span>“Selector por clase”</span><i>→</i><code>.</code></div>'
      + '<div class="intro-translate-row"><span>“Comparación estricta”</span><i>→</i><code>===</code></div>'
      + '</div>'
      + '<p class="intro-translate-note">Si no sabés qué escribir, tocá <b>❓ AYUDA</b>: te traduce la pregunta y te muestra la respuesta.</p>'
      + '</div>';
  }

  function mistakesBox(){
    const rows = [
      ['p', '<p>', 'Las etiquetas llevan &lt; y &gt;.'],
      ['<p>Hola</p>', '<p>', 'En este juego va solo la etiqueta, sin el texto de adentro.'],
      ['color;', 'color', 'En este juego va solo la propiedad, sin punto y coma.'],
      ['display:flex', 'display: flex', 'El juego pide la respuesta exactamente así, con espacio.'],
      ['==', '===', 'La comparación estricta lleva tres signos iguales, no dos.'],
      ['boton', '<button>', 'Si la pista dice “botón”, la etiqueta es &lt;button&gt;.']
    ];
    return '<div class="intro-mistakes">'
      + '<h4>🚫 Errores que se arreglan fácil</h4>'
      + rows.map(r=>'<div class="intro-mistake">'
        + '<span class="intro-mistake-wrong">✗ '+esc(r[0])+'</span>'
        + '<span class="intro-mistake-arrow">→</span>'
        + '<span class="intro-mistake-right">✓ '+esc(r[1])+'</span>'
        + '<p>'+r[2]+'</p>'
        + '</div>').join('')
      + '<p class="intro-mistakes-note">El juego compara el texto exacto: las MAYÚSCULAS no importan (<code>COLOR</code> = <code>color</code>), pero los espacios y los símbolos SÍ.</p>'
      + '</div>';
  }

  /* ================= PRÁCTICA INTERACTIVA ================= */
  // Se practica DENTRO del tutorial, sin vidas ni puntaje. La idea es que el
  // jugador ya haya hecho los 3 pasos una vez antes de entrar al juego.
  const PRACTICE_ROUNDS = {
    beginner: [
      { prompt:'Renglón de texto', mode:'pick', answer:'<p>', options:['<h1>','<p>','<button>'], hint:'Empieza con < y termina con >.', why:{'<h1>':'<h1> es un título grande, no un párrafo.','<button>':'<button> es un botón.'} },
      { prompt:'Color de la letra', mode:'pick', answer:'color', options:['margin','color','border'], hint:'Es una palabra en inglés de 5 letras.', why:{'margin':'margin es el espacio de afuera.','border':'border es el borde o marco.'} },
      { prompt:'Variable que puede cambiar', mode:'pick', answer:'let', options:['const','if','let'], hint:'Son 3 letras. const es la que NO cambia.', why:{'const':'const es una constante: no cambia.','if':'if es una condición.'} }
    ],
    intermediate: [
      { prompt:'Título gigante', mode:'pick', answer:'<h1>', options:['<p>','<h1>','<ul>'], hint:'Es la etiqueta del título más importante.', why:{'<p>':'<p> es un párrafo.','<ul>':'<ul> es una lista.'} },
      { prompt:'Margen interior', mode:'pick', answer:'padding', options:['margin','padding','border'], hint:'Es el espacio de ADENTRO de la caja.', why:{'margin':'margin es el espacio de afuera.','border':'border es el marco.'} },
      { prompt:'Selector por clase', mode:'type', answer:'.', hint:'Es un símbolo de un solo carácter.' },
      { prompt:'Variable constante', mode:'type', answer:'const', hint:'Son 5 letras y empieza con C.' }
    ],
    advanced: [
      { prompt:'Etiqueta de negrita', mode:'type', answer:'<strong>', hint:'Lleva los dos símbolos < >.' },
      { prompt:'Activar flexbox', mode:'type', answer:'display: flex', hint:'En el juego va con espacio después de los dos puntos.' },
      { prompt:'Comparación estricta', mode:'type', answer:'===', hint:'Son 3 símbolos iguales.' },
      { prompt:'Obtener un elemento por su ID', mode:'type', answer:'getElementById()', hint:'Termina con dos paréntesis ( ).' }
    ]
  };
  const practiceState = {};

  function practiceBlock(level){
    return '<div class="intro-practice" data-practice="'+level+'"></div>';
  }

  function practiceInner(st){
    const total = st.rounds.length;
    if(st.solved >= total){
      return '<div class="intro-practice-done">'
        + '<div class="intro-practice-done-ico">🏆</div>'
        + '<h4>¡Ya sabés jugar!</h4>'
        + '<p>Respondiste las '+total+' preguntas de práctica. En el juego es igual: mirá la pista, escribí y presioná ENTER.</p>'
        + '<button type="button" class="intro-practice-btn" data-pact="go">SEGUIR CON EL TUTORIAL →</button>'
        + '</div>';
    }
    const r = st.rounds[st.index];
    const solvedNow = st.phase === 'ok';
    let body = '<div class="intro-practice-ship"><span class="ips-emoji">👾</span><span class="ips-prompt">'+esc(r.prompt)+'</span></div>';

    if(solvedNow){
      body += '<div class="intro-practice-feedback ok">💥 ¡Correcto! <b>'+esc(r.answer)+'</b> destruye la nave.</div>'
        + '<div class="intro-practice-actions"><button type="button" class="intro-practice-btn" data-pact="next">SIGUIENTE PREGUNTA →</button></div>';
    } else if(r.mode === 'pick'){
      body += '<p class="intro-practice-help">Elegí la respuesta correcta. Acá no perdés vidas.</p>'
        + '<div class="intro-practice-choices">'
        + r.options.map(op=>'<button type="button" class="intro-practice-opt'+(st.wrong && st.wrong.indexOf(op)>=0?' wrong':'')+'" data-pact="pick" data-answer="'+escAttr(op)+'"><code>'+esc(op)+'</code></button>').join('')
        + '</div>';
    } else {
      const val = st.inputValue == null ? '' : st.inputValue;
      body += '<p class="intro-practice-help">Escribí la respuesta y tocá DISPARAR. Acá no perdés vidas.</p>'
        + '<div class="intro-practice-type"><input type="text" data-pinput autocomplete="off" spellcheck="false" placeholder="Escribí acá..." value="'+escAttr(val)+'"><button type="button" class="intro-practice-btn" data-pact="check">DISPARAR</button></div>';
    }

    if(!solvedNow && st.feedback){
      body += '<div class="intro-practice-feedback '+(st.feedbackOk?'ok':'bad')+'">'+esc(st.feedback)+'</div>';
    }
    if(!solvedNow && st.tries >= 1){
      body += '<p class="intro-practice-hint">💡 <b>Pista:</b> '+esc(r.hint||'Leé de nuevo la pista de la nave.')+'</p>';
    }
    if(!solvedNow && st.tries >= 3){
      body += '<p class="intro-practice-reveal">La respuesta es <code>'+esc(r.answer)+'</code>. Copiala o tocala para usarla.</p>'
        + '<button type="button" class="intro-practice-use" data-pact="use" data-answer="'+escAttr(r.answer)+'">✍️ Usar esta respuesta</button>';
    }

    return '<div class="intro-practice-head"><span class="intro-practice-badge">🎮 PROBÁ AHORA</span><span class="intro-practice-progress">'+(st.index+1)+' / '+total+'</span></div>'
      + '<div class="intro-practice-stage">'+body+'</div>';
  }

  function renderPractice(el, st){
    if(!el || !st) return;
    el.innerHTML = practiceInner(st);
    const input = el.querySelector('[data-pinput]');
    if(input) setTimeout(()=>{ try{ input.focus({preventScroll:true}); }catch(e){} }, 60);
  }

  function mountPractices(){
    if(!contentEl) return;
    contentEl.querySelectorAll('[data-practice]').forEach(el=>{
      const level = el.dataset.practice;
      if(!practiceState[level]){
        practiceState[level] = { rounds: PRACTICE_ROUNDS[level] || PRACTICE_ROUNDS.intermediate, index:0, solved:0, tries:0, phase:'', feedback:'', feedbackOk:false, wrong:[], inputValue:'' };
      }
      renderPractice(el, practiceState[level]);
    });
  }

  function checkPractice(pr, answer){
    const st = practiceState[pr.dataset.practice];
    if(!st) return;
    const r = st.rounds[st.index];
    if(!r) return;
    const got = String(answer==null?'':answer);
    const ok = got.trim().toLowerCase() === r.answer.toLowerCase();
    if(ok){
      st.phase = 'ok';
      st.solved++;
      st.feedback = '';
      st.wrong = [];
    } else {
      st.phase = '';
      st.tries++;
      st.feedbackOk = false;
      st.feedback = (r.why && r.why[got]) ? '❌ '+r.why[got]+' Probá otra vez.' : '❌ Todavía no. Leé la pista de la nave y probá de nuevo.';
      if(!st.wrong) st.wrong = [];
      if(r.mode === 'pick' && st.wrong.indexOf(got) < 0) st.wrong.push(got);
      st.inputValue = r.mode === 'type' ? got : '';
    }
    renderPractice(pr, st);
  }

  function onPracticeClick(e){
    const pr = e.target.closest('[data-practice]');
    if(!pr) return;
    const actEl = e.target.closest('[data-pact]');
    if(!actEl) return;
    const st = practiceState[pr.dataset.practice];
    if(!st) return;
    const act = actEl.dataset.pact;
    if(act === 'pick') checkPractice(pr, actEl.dataset.answer);
    else if(act === 'check'){ const inp = pr.querySelector('[data-pinput]'); checkPractice(pr, inp ? inp.value : ''); }
    else if(act === 'next'){ st.index++; st.tries = 0; st.phase = ''; st.feedback = ''; st.wrong = []; st.inputValue = ''; renderPractice(pr, st); }
    else if(act === 'use'){ const inp = pr.querySelector('[data-pinput]'); if(inp){ inp.value = actEl.dataset.answer || ''; inp.focus(); } }
    else if(act === 'go'){ next(); }
  }

  function onPracticeKey(e){
    const inp = e.target && e.target.closest ? e.target.closest('[data-pinput]') : null;
    if(!inp || e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();
    const pr = inp.closest('[data-practice]');
    if(pr) checkPractice(pr, inp.value);
  }

  function beginSlides(){
    return [
      {
        id: 1,
        kicker: 'TUTORIAL · PRINCIPIANTE',
        title: 'CODE<br>INVADERS',
        subtitle: 'No necesitás saber programar',
        desc: 'Empezamos de cero, con palabras simples y ejemplos de todos los días.',
        body: `
          <div class="intro-cover-visual">
            <div class="intro-ship">
              <div class="intro-ship-glow"></div>
              <div class="intro-ship-body">◆</div>
              <div class="intro-ship-flame"></div>
            </div>
            <div class="intro-code-rain">
              <span>&lt;h1&gt;</span><span>color</span><span>let</span><span>#</span><span>flex</span><span>async</span>
            </div>
          </div>
          <div class="intro-badges">
            <span class="intro-badge">🌱 PRINCIPIANTE</span>
            <span class="intro-badge intro-badge-gold">SIN EXPERIENCIA</span>
            <span class="intro-badge intro-badge-cyan">PRÁCTICA SIN PERDER VIDAS</span>
          </div>
          <div class="intro-highlight"><span class="intro-highlight-icon">💚</span><span class="intro-highlight-text"><strong>Esto no es un examen.</strong> Podés probar, fallar y volver a intentar todas las veces que quieras. En las próximas páginas vas a practicar de verdad.</span></div>
          <p class="intro-note">Este tutorial tiene <b>8 páginas cortas</b>. No hace falta memorizar nada: la ayuda ❓ está siempre a mano.</p>
        `
      },
      {
        id: 2,
        kicker: '01 — LA IDEA EN 30 SEGUNDOS',
        title: '¿Qué es programar?',
        subtitle: 'Es darle órdenes a la computadora, como una receta.',
        body: `
          <p class="intro-lead">Programar es escribir instrucciones en un idioma que la computadora entiende. En este juego, cada nave te pide una instrucción y vos la escribís.</p>
          <div class="intro-cards3">
            <div class="intro-card-num"><span>🍳</span><h4>Una receta</h4><p>Paso 1: rompé el huevo.<br>Paso 2: batilo.<br>Paso 3: cociná.</p></div>
            <div class="intro-card-num"><span>💻</span><h4>Un programa</h4><p>Paso 1: escribí una orden.<br>Paso 2: la compu la lee.<br>Paso 3: hace lo que pediste.</p></div>
            <div class="intro-card-num"><span>🎮</span><h4>Este juego</h4><p>La nave te pide algo.<br>Vos escribís la respuesta.<br>ENTER y la destruís.</p></div>
          </div>
          <div class="intro-highlight arcade-blink"><span class="intro-highlight-icon">💡</span><span class="intro-highlight-text"><strong>No hay que memorizar todo.</strong> La nave te dice qué escribir y el botón <b>❓ AYUDA</b> te lo explica cuando lo necesites.</span></div>
          <p class="intro-note">Ejemplo: si la nave dice <b>“Renglón de texto”</b>, vos escribís <code>&lt;p&gt;</code> y listo.</p>
        ` + glossary()
      },
      {
        id: 3,
        kicker: '02 — TU PRIMER DISPARO',
        title: 'Mirá, escribí y dispará',
        subtitle: 'Siempre son los mismos 3 pasos.',
        body: steps3() + demoRows([
          ['Renglón de texto','<p>'],
          ['Botón para tocar','<button>'],
          ['Color de texto','color']
        ]) + '<div class="intro-highlight"><span class="intro-highlight-icon">🎯</span><span class="intro-highlight-text"><strong>Truco:</strong> si hay 3 naves que piden lo mismo, una sola respuesta correcta las destruye a las 3.</span></div>'
          + practiceBlock('beginner')
          + '<p class="intro-note">En la práctica no perdés vidas. Cuando te salga, ya estás listo para el juego de verdad.</p>'
      },
      {
        id: 4,
        kicker: '03 — HTML',
        title: 'HTML: las etiquetas',
        subtitle: 'Son como cajas con nombre que arman la página.',
        body: `
          <p class="intro-lead">Cada etiqueta empieza con <code>&lt;</code> y termina con <code>&gt;</code>. Adentro va el contenido. Así se ve la misma etiqueta escrita y en pantalla:</p>
        ` + demoGrid([
          { code:'<h1>Hola</h1>', view:'<div class="demo-h1">Hola</div>', note:'Un título grande.' },
          { code:'<p>Bienvenidos</p>', view:'<p class="demo-p">Bienvenidos</p>', note:'Un párrafo normal.' },
          { code:'<button>JUGAR</button>', view:'<button type="button" tabindex="-1" class="demo-btn">JUGAR</button>', note:'Un botón que se toca.' },
          { code:'<img src="foto.jpg">', view:'<div class="demo-img">🖼️ foto.jpg</div>', note:'Una imagen o foto.' }
        ]) + tagCards('HTML', pickRows(HTML_ROWS, ['<h1>','<p>','<a>','<img>','<ul>','<div>','<span>','<button>','<input>','<table>']))
          + '<div class="intro-note">Estas son las 10 etiquetas del primer nivel. Las demás están en la ayuda ❓ AYUDA, con sus dos ejemplos. No hace falta memorizarlas.</div>'
      },
      {
        id: 5,
        kicker: '04 — CSS',
        title: 'CSS: la ropa de la página',
        subtitle: 'Le dice al HTML cómo se ve: colores, tamaños y espacios.',
        body: `
          <p class="intro-lead">HTML arma los huesos. CSS le pone la ropa. Se escribe <code>propiedad: valor;</code> y siempre termina con punto y coma.</p>
        ` + demoGrid([
          { code:'color: red;', view:'<span class="demo-red">Este texto es rojo</span>', note:'Cambia el color de la letra.' },
          { code:'border-radius: 12px;', view:'<div class="demo-round">Caja redondeada</div>', note:'Redondea las esquinas.' },
          { code:'display: flex;', view:'<div class="demo-flex"><span>1</span><span>2</span><span>3</span></div>', note:'Acomoda las cosas en fila.' }
        ]) + tagCards('CSS', pickRows(CSS_ROWS, ['margin','color','border','position','.','#','font-size','text-align',':hover','display: flex']))
          + '<div class="intro-note">En el juego solo escribís la propiedad: si la nave pide “Margen exterior”, escribís <code>margin</code> (sin valor y sin punto y coma).</div>'
      },
      {
        id: 6,
        kicker: '05 — JAVASCRIPT',
        title: 'JavaScript: el cerebro',
        subtitle: 'Hace que las cosas pasen: decide, repite y recuerda.',
        body: `
          <p class="intro-lead">JavaScript es el idioma de las órdenes. Guarda datos en variables y toma decisiones. No hace falta saber escribir programas: en el juego solo te piden la palabra clave.</p>
        ` + demoGrid([
          { code:'let vidas = 3;', label:'RESULTADO', view:'<div class="demo-console">vidas = 3</div>', note:'Guarda 3 en una cajita llamada vidas.' },
          { code:'if (vidas > 0) { }', label:'RESULTADO', view:'<div class="demo-console">Si quedan vidas, seguí jugando.</div>', note:'Toma una decisión.' },
          { code:'for (let i = 0; i < 3; i++) { }', label:'RESULTADO', view:'<div class="demo-console">Repite 3 veces.</div>', note:'Hace lo mismo varias veces.' }
        ]) + tagCards('JS', JS_ROWS)
          + '<div class="intro-note">En el juego las respuestas de JavaScript son cortas: <code>let</code>, <code>const</code>, <code>===</code>, <code>if</code>.</div>'
      },
      {
        id: 7,
        kicker: '06 — TRUCOS PARA NO TRABARTE',
        title: 'La respuesta está en la pregunta',
        subtitle: 'No hay que adivinar: hay que traducir.',
        body: translateBox() + mistakesBox()
          + '<div class="intro-highlight"><span class="intro-highlight-icon">🆘</span><span class="intro-highlight-text"><strong>Si no sale, no te quedes trabado:</strong> tocá <b>❓ AYUDA</b>. Te explica la pregunta, te da una pista y, después de 2 o 3 intentos, te muestra la respuesta.</span></div>'
      },
      {
        id: 8,
        kicker: '07 — TU MISIÓN',
        title: 'Ganar es fácil: no te apures',
        subtitle: 'Cada respuesta correcta destruye naves y te da puntos.',
        body: `
          <div class="intro-mission-grid">
            <div class="intro-mission"><span class="intro-m-icon">⭐</span><h4>PUNTOS</h4><p>Cada acierto suma puntos y monedas.</p></div>
            <div class="intro-mission"><span class="intro-m-icon">❤️</span><h4>VIDAS</h4><p>Si una nave te toca, perdés una vida. Podés reintentar.</p></div>
            <div class="intro-mission"><span class="intro-m-icon">❓</span><h4>AYUDA</h4><p>Después de 2 o 3 fallos, la ayuda se abre sola para darte una mano.</p></div>
            <div class="intro-mission"><span class="intro-m-icon">🎓</span><h4>TU NIVEL</h4><p>Podés cambiar entre Principiante, Intermedio y Avanzado cuando quieras.</p></div>
          </div>
          <div class="intro-cta-wrap">
            <p class="intro-cta-text">¿Listo para tu primer disparo?</p>
            <button class="intro-cta" id="introPlayBtn">▶ EMPEZAR EN PRINCIPIANTE</button>
            <button class="intro-cta intro-cta-warmup" id="introWarmupBtn">🎈 PROBAR EL CALENTAMIENTO</button>
            <p class="intro-cta-hint">El calentamiento son 6 naves fáciles y no cuenta para el progreso. La ayuda ❓ te acompaña siempre.</p>
          </div>
        `
      }
    ];
  }

  function intermediateSlides(){
    return [
      {
        id: 1,
        kicker: 'TUTORIAL · INTERMEDIO',
        title: 'CODE<br>INVADERS',
        subtitle: 'Aprendé HTML, CSS y JavaScript jugando',
        desc: 'Tutorial de 7 páginas para quien lo vio una vez y no se acuerda.',
        body: `
          <div class="intro-cover-visual">
            <div class="intro-ship">
              <div class="intro-ship-glow"></div>
              <div class="intro-ship-body">◆</div>
              <div class="intro-ship-flame"></div>
            </div>
            <div class="intro-code-rain">
              <span>&lt;h1&gt;</span><span>color</span><span>let</span><span>#</span><span>flex</span><span>async</span>
            </div>
          </div>
          <div class="intro-badges">
            <span class="intro-badge">🧭 INTERMEDIO</span>
            <span class="intro-badge intro-badge-gold">LO VI UNA VEZ</span>
            <span class="intro-badge intro-badge-cyan">SIN ASUMIR QUE TE ACORDÁS</span>
          </div>
          <div class="intro-highlight"><span class="intro-highlight-icon">😵‍💫</span><span class="intro-highlight-text"><strong>¿Lo viste en clase una vez y casi no se te quedó nada?</strong> Tranquilo: lo repasamos de vuelta, con ejemplos. Acá no se evalúa nada y nadie te juzga.</span></div>
        `
      },
      {
        id: 2,
        kicker: '01 — QUÉ VAS A APRENDER',
        title: 'Las bases, sin vueltas',
        subtitle: 'HTML estructura, CSS da estilo y JavaScript da comportamiento.',
        body: `
          <div class="intro-lang-grid">
            <div class="intro-lang-card intro-lang-html">
              <div class="intro-lang-icon">&lt;/&gt;</div>
              <h4>HTML</h4>
              <p class="intro-lang-sub">La estructura</p>
              <p>Son las etiquetas que arman la página: títulos, párrafos, enlaces y botones.</p>
              <code>&lt;p&gt;Hola&lt;/p&gt;</code>
            </div>
            <div class="intro-lang-card intro-lang-css">
              <div class="intro-lang-icon">#</div>
              <h4>CSS</h4>
              <p class="intro-lang-sub">El estilo</p>
              <p>Son las reglas que cambian colores, tamaños, márgenes y bordes.</p>
              <code>color: red;</code>
            </div>
            <div class="intro-lang-card intro-lang-js">
              <div class="intro-lang-icon">JS</div>
              <h4>JavaScript</h4>
              <p class="intro-lang-sub">La acción</p>
              <p>Es el lenguaje que toma decisiones y hace que la página reaccione.</p>
              <code>if (x &gt; 0) {}</code>
            </div>
          </div>
          <div class="intro-note">No hace falta que te acuerdes de nada. El juego te va recordando, pregunta por pregunta.</div>
        ` + glossary()
      },
      {
        id: 3,
        kicker: '02 — CÓMO SE JUEGA',
        title: 'Mirá la pregunta y respondé con código',
        subtitle: 'Cada nave muestra una pista; vos escribís la etiqueta o propiedad.',
        body: steps3() + demoRows([
          ['Título gigante','<h1>'],
          ['Margen exterior','margin'],
          ['Variable mutable','let']
        ]) + '<div class="intro-highlight"><span class="intro-highlight-icon">💡</span><span class="intro-highlight-text"><strong>Una respuesta correcta destruye TODAS las naves que comparten esa respuesta.</strong> Si hay 3 naves con “Link a otra página” y escribís <code>&lt;a&gt;</code>, explotan las 3.</span></div>'
          + practiceBlock('intermediate')
      },
      {
        id: 4,
        kicker: '03 — CHULETA DE ETIQUETAS',
        title: 'Las respuestas que más van a aparecer',
        subtitle: 'Cada una con dos ejemplos. No hace falta memorizar: podés volver a esta guía.',
        body: tagTable('HTML', HTML_ROWS)
          + tagTable('CSS', CSS_ROWS)
          + '<div class="intro-note">En el botón ❓ AYUDA tenés la explicación de cada respuesta, la pista y la respuesta exacta.</div>'
      },
      {
        id: 5,
        kicker: '04 — JAVASCRIPT Y TRUCOS',
        title: 'Palabras clave y cómo leer el código',
        subtitle: 'Pocas respuestas, todas cortas.',
        body: tagTable('JS', JS_ROWS)
          + translateBox()
          + '<div class="intro-note">La respuesta se escribe <b>exacta</b>: los espacios y los símbolos cuentan. Las mayúsculas no.</div>'
      },
      {
        id: 6,
        kicker: '05 — CONTROLES, VIDAS Y AYUDA',
        title: 'Jugá tranquilo: hay ayuda',
        subtitle: 'Perder no es el final: podés reintentar.',
        body: `
          <div class="intro-controls">
            <div class="intro-ctrl"><span class="intro-ctrl-key">CLICK</span><span class="intro-ctrl-label">Seleccionar la nave que quieres destruir</span></div>
            <div class="intro-ctrl"><span class="intro-ctrl-key">ENTER</span><span class="intro-ctrl-label">Disparar con la respuesta escrita</span></div>
            <div class="intro-ctrl"><span class="intro-ctrl-key">← →</span><span class="intro-ctrl-label">o <b>A / D</b> — mover la nave en los jefes</span></div>
            <div class="intro-ctrl"><span class="intro-ctrl-key">❓</span><span class="intro-ctrl-label">AYUDA: explicación + pista + respuesta</span></div>
          </div>
          <div class="intro-warn"><span>❤️</span> Si perdés todas las vidas, podés reintentar el nivel. Los fallos no te quitan el progreso.</div>
        ` + mistakesBox()
          + '<div class="intro-highlight"><span class="intro-highlight-icon">🆘</span><span class="intro-highlight-text">Si no lo recordás, no te quedes trabado: tocá <b>❓ AYUDA</b>. Después de <b>3 fallos</b> te muestra la respuesta.</span></div>'
      },
      {
        id: 7,
        kicker: '06 — MODOS Y PROGRESO',
        title: 'Elegí cómo jugar',
        subtitle: 'Un jugador para avanzar, multijugador para jugar con amigos.',
        body: `
          <div class="intro-modes">
            <div class="intro-mode intro-mode-normal">
              <div class="intro-mode-head"><span class="intro-mode-icon">👤</span><h4>UN JUGADOR</h4><span class="intro-mode-tag">RECOMENDADO</span></div>
              <p class="intro-mode-desc">Avanzá nivel por nivel, guardá tu progreso y enfrentá a los jefes.</p>
              <ul>
                <li>Niveles 1 a 3: HTML, CSS y JavaScript básico</li>
                <li>Niveles 4 a 6: tres jefes con mecánicas distintas</li>
                <li>Nivel 7: segunda galaxia con más enemigos</li>
              </ul>
              <div class="intro-mode-foot"><span class="intro-dot-cyan"></span> A tu ritmo, sin cronómetro</div>
            </div>
            <div class="intro-mode intro-mode-gold">
              <div class="intro-mode-head"><span class="intro-mode-icon">🌐</span><h4>MULTIJUGADOR</h4><span class="intro-mode-tag intro-mode-tag-gold">ONLINE</span></div>
              <p class="intro-mode-desc">Salas de 2 a 4 pilotos, públicas o privadas.</p>
              <ul>
                <li>Creá tu sala o unite con un código</li>
                <li>Partidas ranked 1v1 y 2v2</li>
                <li>También tenés el 📅 Reto Diario</li>
              </ul>
              <div class="intro-mode-foot"><span class="intro-dot-gold"></span> Para jugar con la clase</div>
            </div>
          </div>
          <div class="intro-cta-wrap">
            <p class="intro-cta-text">¿Listo para empezar?</p>
            <button class="intro-cta" id="introPlayBtn">▶ EMPEZAR EN INTERMEDIO</button>
            <button class="intro-cta intro-cta-warmup" id="introWarmupBtn">🎈 PROBAR EL CALENTAMIENTO</button>
            <p class="intro-cta-hint">Te pone en dificultad Tranquilo: 3 vidas y naves casi normales. Si no recordás nada, primero hacé el calentamiento. Podés cambiarla desde 🗺️ NIVELES.</p>
          </div>
        `
      }
    ];
  }

  function advancedSlides(){
    return [
      {
        id: 1,
        kicker: 'TUTORIAL · AVANZADO',
        title: 'CODE<br>INVADERS',
        subtitle: 'Lo viste y sabés un poco. Vamos directo al grano.',
        desc: 'Referencia completa y detalle por respuesta, para lo que se te escapa.',
        body: `
          <div class="intro-cover-visual">
            <div class="intro-ship">
              <div class="intro-ship-glow"></div>
              <div class="intro-ship-body">◆</div>
              <div class="intro-ship-flame"></div>
            </div>
            <div class="intro-code-rain">
              <span>&lt;h1&gt;</span><span>color</span><span>let</span><span>#</span><span>flex</span><span>async</span>
            </div>
          </div>
          <div class="intro-badges">
            <span class="intro-badge">🚀 AVANZADO</span>
            <span class="intro-badge intro-badge-gold">SÉ UN POCO, NO TODO</span>
            <span class="intro-badge intro-badge-cyan">REFERENCIA COMPLETA</span>
          </div>
          <div class="intro-highlight"><span class="intro-highlight-icon">⚡</span><span class="intro-highlight-text">Nadie se acuerda de todo. <b>❓ AYUDA</b> te da la explicación y la respuesta exacta sin vueltas cuando algo se te escapa.</span></div>
        `
      },
      {
        id: 2,
        kicker: '01 — REGLAS EN 60 SEGUNDOS',
        title: 'Cómo se juega',
        subtitle: 'Respondé con el código exacto y destruí la formación.',
        body: steps3() + demoRows([
          ['Selector por ID','#'],
          ['Activar flexbox','display: flex'],
          ['Comparación estricta','===']
        ]) + `
          <div class="intro-cards4">
            <div class="intro-card-num"><span>⭐</span><h4>PUNTOS</h4><p>10 × nivel por acierto + bonus por racha.</p></div>
            <div class="intro-card-num"><span>🔥</span><h4>COMBO</h4><p>3 aciertos seguidos dan bonus y pista 💡.</p></div>
            <div class="intro-card-num"><span>❤️</span><h4>VIDAS</h4><p>Dependen de la dificultad elegida.</p></div>
            <div class="intro-card-num"><span>❓</span><h4>AYUDA</h4><p>Pista y respuesta contextual en cualquier momento.</p></div>
          </div>
          <div class="intro-note">Una respuesta correcta destruye todas las naves que comparten esa respuesta.</div>
        ` + practiceBlock('advanced')
      },
      {
        id: 3,
        kicker: '02 — REFERENCIA I',
        title: 'HTML y CSS',
        subtitle: 'Etiquetas, selectores y propiedades con dos ejemplos cada una.',
        body: tagTable('HTML', HTML_ROWS, {tip:true})
          + tagTable('CSS', CSS_ROWS, {tip:true})
          + '<div class="intro-note">No hace falta recordar todo: esto es tu chuleta, no un examen. La ❓ AYUDA usa esta misma información para explicarte la pregunta actual.</div>'
      },
      {
        id: 4,
        kicker: '03 — REFERENCIA II',
        title: 'JavaScript y errores típicos',
        subtitle: 'Palabras clave y los detalles que hacen fallar una respuesta.',
        body: tagTable('JS', JS_ROWS, {tip:true})
          + mistakesBox()
      },
      {
        id: 5,
        kicker: '04 — JEFES Y PROGRESIÓN',
        title: 'Qué te espera',
        subtitle: 'Tres jefes, dos galaxias y un portal.',
        body: `
          <div class="intro-modes">
            <div class="intro-mode intro-mode-normal">
              <div class="intro-mode-head"><span class="intro-mode-icon">👑</span><h4>JEFES</h4><span class="intro-mode-tag">NIVELES 4-6</span></div>
              <ul>
                <li><b>Nivel 4:</b> jefe que se mueve por toda la pantalla; esquivalo y dispará con balas.</li>
                <li><b>Nivel 5:</b> jefe CSS estacionario que tira naves; escribí la propiedad correcta.</li>
                <li><b>Nivel 6:</b> jefe JavaScript en 3 etapas: etiquetas HTML, naves con 3 vidas y una fase furiosa donde escribís para ganar balas 🔫.</li>
              </ul>
              <div class="intro-mode-foot"><span class="intro-dot-cyan"></span> Al final del nivel 6 se abre un portal</div>
            </div>
            <div class="intro-mode intro-mode-gold">
              <div class="intro-mode-head"><span class="intro-mode-icon">🌌</span><h4>GALAXIA 2</h4><span class="intro-mode-tag intro-mode-tag-gold">NIVEL 7+</span></div>
              <ul>
                <li>Otra paleta de colores para el cartel de nivel.</li>
                <li>13 enemigos con la misma velocidad y tiempo que la primera galaxia.</li>
                <li>Más cantidad y más presión, sin cambiar las reglas.</li>
              </ul>
              <div class="intro-mode-foot"><span class="intro-dot-gold"></span> El desafío continúa</div>
            </div>
          </div>
          <div class="intro-cta-wrap">
            <p class="intro-cta-text">Todo listo. ¿Jugamos?</p>
            <button class="intro-cta" id="introPlayBtn">▶ EMPEZAR EN AVANZADO</button>
            <p class="intro-cta-hint">Te pone en dificultad Normal (la del ranking). Si querés más reto, subí a Difícil desde 🗺️ NIVELES.</p>
          </div>
        `
      }
    ];
  }

  function buildSlides(level){
    if(level==='beginner') return beginSlides();
    if(level==='advanced') return advancedSlides();
    return intermediateSlides();
  }

  let current = 0;
  let currentLevel = storedSkill();
  let slides = buildSlides(currentLevel);
  let overlay, contentEl, dotsEl, labelEl, prevBtn, nextBtn, progressFill, closeBtn, skipBtn, reopenBtn, noShowBox;

  function init() {
    overlay = document.getElementById('introOverlay');
    contentEl = document.getElementById('introContent');
    dotsEl = document.getElementById('introDots');
    labelEl = document.getElementById('introPageLabel');
    prevBtn = document.getElementById('introPrev');
    nextBtn = document.getElementById('introNext');
    progressFill = document.getElementById('introProgressFill');
    closeBtn = document.getElementById('introClose');
    skipBtn = document.getElementById('introSkip');
    reopenBtn = document.getElementById('introReopen');
    noShowBox = document.getElementById('introNoShow');
    if (!overlay) return;
    buildDots();
    bindEvents();
    if(noShowBox) noShowBox.addEventListener('change',()=>{
      if(!unlocked()){
        noShowBox.checked=false;
        if(typeof Toast!=='undefined') Toast.info('🔒 Primero mirá el tutorial e iniciá sesión');
        refreshNoShow();
        return;
      }
      saveHide(noShowBox.checked);
      if(typeof Toast!=='undefined') Toast.success(noShowBox.checked?'👁️ El intro ya no se mostrará solo':'👁️ El intro volverá a mostrarse');
    });
    if(typeof Auth!=='undefined' && !Auth._introHooked){
      Auth._introHooked=true;
      const _rs=Auth.restoreSession.bind(Auth);
      Auth.restoreSession=async function(){ const r=await _rs.apply(this,arguments); try{ syncFromServer(); }catch(e){} return r; };
    }
    // Si todavía no eligió Principiante / Intermedio / Avanzado, primero se
    // muestra el selector de nivel (lo abre Guide). Así el tutorial que ve
    // después ya está adaptado a su experiencia.
    slides = buildSlides(storedSkill());
    current = 0;
    render();
    refreshNoShow();
    setTimeout(()=>{
      refreshNoShow();
      const noSkill = (typeof Guide!=='undefined' && Guide.hasSkill) ? !Guide.hasSkill() : false;
      if(shouldAutoShow() && !noSkill) open(true);
    }, 600);
  }

  function buildDots() {
    if (!dotsEl) return;
    dotsEl.innerHTML = slides.map((_, i) => `<button class="intro-dot" data-i="${i}" aria-label="Ir a página ${i+1}"></button>`).join('');
    dotsEl.querySelectorAll('.intro-dot').forEach(d => d.addEventListener('click', () => goTo(parseInt(d.dataset.i))));
  }

  function bindEvents() {
    if (prevBtn) prevBtn.addEventListener('click', prev);
    if (nextBtn) nextBtn.addEventListener('click', next);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (skipBtn) skipBtn.addEventListener('click', close);
    if (reopenBtn) reopenBtn.addEventListener('click', open);
    // Cambiar de nivel sin salir del tutorial: se oculta el tutorial, se abre
    // la elección de experiencia y, al elegir, el tutorial vuelve adaptado.
    const introSkillBtn = document.getElementById('introSkillBtn');
    if (introSkillBtn) introSkillBtn.addEventListener('click', () => {
      overlay.classList.add('hidden');
      document.body.style.overflow='';
      try { localStorage.setItem(STORAGE_KEY,'1'); }catch(e){}
      setTimeout(()=>{ try{ if(typeof Guide!=='undefined' && Guide.openPicker) Guide.openPicker(); }catch(e){} }, 160);
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {}
      if (e.target.id === 'introPlayBtn') closeToGame();
      if (e.target.id === 'introWarmupBtn') closeToWarmup();
    });
    // La práctica del tutorial vive dentro del contenido y se vuelve a pintar
    // en cada página: se escucha una vez en el contenedor.
    if(contentEl){
      contentEl.addEventListener('click', onPracticeClick);
      contentEl.addEventListener('keydown', onPracticeKey);
    }
    document.addEventListener('keydown', (e) => {
      if (overlay.classList.contains('hidden')) return;
      if (e.key === 'Escape') { close(); return; }
      // Si está escribiendo en la práctica, Enter dispara ahí y las flechas
      // mueven el cursor: no deben cambiar de página.
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      const onButton = t && t.tagName === 'BUTTON';
      if (typing || onButton) return;
      if (e.key === 'Enter' && current === slides.length - 1) {
        const b = document.getElementById('introPlayBtn');
        if (b) { e.preventDefault(); b.click(); }
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft') prev();
    });
  }

  function render() {
    const s = slides[current];
    if (!s) return;
    if (contentEl) {
      contentEl.innerHTML = `
        <div class="intro-slide" data-slide="${s.id}" data-level="${currentLevel}">
          <div class="intro-kicker">${s.kicker}</div>
          <h2 class="intro-title">${s.title}</h2>
          <p class="intro-subtitle">${s.subtitle}</p>
          ${s.desc ? `<p class="intro-desc">${s.desc}</p>` : ''}
          <div class="intro-body">${s.body}</div>
        </div>
      `;
      contentEl.style.animation = 'none';
      contentEl.offsetHeight;
      contentEl.style.animation = '';
      const b = document.getElementById('introPlayBtn');
      if (b) b.addEventListener('click', closeToGame);
      mountPractices();
    }
    if (labelEl) labelEl.textContent = `Página ${current+1} de ${slides.length}`;
    if (dotsEl) dotsEl.querySelectorAll('.intro-dot').forEach((d,i)=> d.classList.toggle('active', i===current));
    if (prevBtn) prevBtn.disabled = current===0;
    if (nextBtn) {
      nextBtn.disabled = current===slides.length-1;
      nextBtn.style.visibility = current===slides.length-1 ? 'hidden' : 'visible';
    }
    if (progressFill) progressFill.style.width = ((current+1)/slides.length*100)+'%';
    if (contentEl) contentEl.scrollTop = 0;
  }

  function goTo(i) { if (i<0||i>=slides.length) return; current=i; render(); }
  function next() { if (current<slides.length-1) goTo(current+1); }
  function prev() { if (current>0) goTo(current-1); }
  // Se usa desde Game.init para decidir si arrancar con los botones del
  // menú ocultos o mostrarlos de una vez.
  function willAutoShow(){
    try{ return shouldAutoShow() && (typeof Guide!=='undefined' && Guide.hasSkill ? Guide.hasSkill() : false); }
    catch(e){ return false; }
  }

  function open(auto, levelId) {
    currentLevel = SKILL_IDS.includes(levelId) ? levelId : storedSkill();
    slides = buildSlides(currentLevel);
    buildDots();
    autoOpened=!!auto;
    current = 0; render();
    refreshNoShow();
    overlay.classList.remove('hidden');
    document.body.style.overflow='hidden';
    if (reopenBtn) reopenBtn.classList.add('hidden');
  }
  function openForSkill(levelId){
    open(false, levelId);
  }
  function close() {
    overlay.classList.add('hidden');
    document.body.style.overflow='';
    // Al terminar el tutorial aparecen los botones del menú (antes quedaban
    // ocultos desde la carga de la página).
    try{ if(typeof Game!=='undefined' && Game.showBtns) Game.showBtns(); }catch(e){}
    try { localStorage.setItem(STORAGE_KEY,'1'); }catch(e){}
    if (reopenBtn) {
      reopenBtn.classList.remove('hidden');
      reopenBtn.classList.add('intro-reopen-pop');
      setTimeout(()=> reopenBtn.classList.remove('intro-reopen-pop'), 600);
    }
    try{ if(typeof Guide!=='undefined' && Guide.notifyIntroClosed) Guide.notifyIntroClosed(currentLevel); }catch(e){}
    // Si el jugador todavía no eligió experiencia, después del tutorial se le
    // ofrecen las tres tarjetas. Si ya eligió, no se le interrumpe.
    setTimeout(()=>{ try{ if(typeof Guide!=='undefined' && Guide.maybeAsk) Guide.maybeAsk(); }catch(e){} }, 220);
  }
  function closeToGame() {
    close();
    const gameView = document.getElementById('view-game');
    if (gameView) {
      document.querySelectorAll('.view').forEach(v=> v.classList.toggle('active', v===gameView));
      document.querySelectorAll('.nav-btn').forEach(b=> b.classList.toggle('active', b.dataset.view==='game'));
      window.scrollTo({top:0, behavior:'smooth'});
    }
    setTimeout(()=>{
      const w = document.getElementById('gameCanvas');
      if(w) w.scrollIntoView({behavior:'smooth', block:'center'});
    }, 200);
  }
  // Cierra el tutorial y arranca el calentamiento (la partida corta y fácil
  // antes del nivel 1).
  function closeToWarmup() {
    closeToGame();
    setTimeout(()=>{ try{ if(typeof Game!=='undefined' && Game.startWarmup) Game.startWarmup(); }catch(e){} }, 120);
  }

  return { init, open, openForSkill, close, goTo, getLevel(){ return currentLevel; }, willAutoShow };
})();
