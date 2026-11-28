/* Julepynt for Min dag (første søndag i advent til 6. januar).
   - Pynten kommer og går av seg selv etter datoen (norsk tid). ?jul=1 viser den for test, ?jul=0 skrur testen av.
   - Alle kan slå pynten av med knappen nede til venstre. Valget huskes på enheten.
   - Ingen løkker i bakgrunnen: alt som beveger seg starter av et trykk, eller én gang når siden åpnes.
   - Klikk-moro: lys som ramler ned, stjerne som snurrer, nisselue på navnet, nisse i snøen, rein over månen.
   - Har noen slått av bevegelse på telefonen, vises bare resultatet, uten bevegelse. */
(function(){
  "use strict";
  function les(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function skriv(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  function lesS(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }
  function skrivS(k, v){ try{ if(v === null){ sessionStorage.removeItem(k); } else { sessionStorage.setItem(k, v); } }catch(e){} }

  var q = location.search;
  if(/[?&]jul=1/.test(q)){ skrivS("meg-jul-test", "1"); }
  if(/[?&]jul=0/.test(q)){ skrivS("meg-jul-test", null); }
  var test = lesS("meg-jul-test") === "1";

  var p = new Intl.DateTimeFormat("en-CA", {timeZone: "Europe/Oslo", year: "numeric", month: "2-digit", day: "2-digit"}).format(new Date()).split("-");
  var Y = +p[0], M = +p[1], D = +p[2];
  /* Sesongen starter første søndag i advent (søndagen fra 27. november til 3. desember) og varer til 6. januar. */
  var advent = new Date(Date.UTC(Y, 10, 27)); advent.setUTCDate(27 + (7 - advent.getUTCDay()) % 7);
  var forsteAdvent = advent.getUTCMonth() === 10 ? advent.getUTCDate() : 100;
  var sesong = M === 12 || (M === 1 && D <= 6) || (M === 11 && D >= forsteAdvent);
  if(!sesong && !test){ return; }

  var rolig = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lang = (window.MegSprak && window.MegSprak.lang) || "nb";

  /* ---- Tekster ---- */
  var T = {
    nb: {dager: "{n} dager til jul", dag: "1 dag til jul", julaften: "God jul! I dag er det julaften", jul: "God jul!", romjul: "Romjul", nyttar: "Godt nytt år!",
      snur: "Lyset snur om {n} dager", snur1: "Lyset snur i morgen", snur0: "Lyset snur i dag", tilbake: "Lyset er på vei tilbake",
      dorIdag: "Dør {n} er åpen i dag", aapne: "Åpne dør {n}", lesDor: "Les dagens fortelling og tenn en stjerne.",
      pa: "Julepynt: på", av: "Julepynt: av", hint: "Psst! Trykk på lysene, stjerna, månen, navnet og snøen.",
      alle: "Hvem har plukket ned alle lysene mine?!", tilbakeLys: "Sånn. Nå henger de der igjen.",
      vitser: ["Hvorfor har nissen skjegg? For å holde haka varm i mørketida!", "Har noen sett lua mi? Den var her i stad.",
        "Reinsdyra mine har lært å fly. Nå mangler de bare å lære å lande.", "Hva sier den ene snømannen til den andre? Lukter det gulrot her?",
        "Psst! Dagens dør i Lyskalenderen er ekstra fin.", "Jeg har spist sju pepperkaker. Det var bare for å teste dem."]},
    en: {dager: "{n} days until Christmas", dag: "1 day until Christmas", julaften: "Merry Christmas! It is Christmas Eve", jul: "Merry Christmas!", romjul: "Between Christmas and New Year", nyttar: "Happy New Year!",
      snur: "The light turns in {n} days", snur1: "The light turns tomorrow", snur0: "The light turns today", tilbake: "The light is on its way back",
      dorIdag: "Door {n} is open today", aapne: "Open door {n}", lesDor: "Read today's story and light a star.",
      pa: "Decorations: on", av: "Decorations: off", hint: "Psst! Tap the lights, the star, the moon, the name and the snow.",
      alle: "Who took down all my lights?!", tilbakeLys: "There. They are back up again.",
      vitser: ["Why does Santa have a beard? To keep his chin warm in the polar night!", "Has anyone seen my hat? It was here a minute ago.",
        "My reindeer have learned to fly. Now they just need to learn to land.", "What did one snowman say to the other? Do you smell carrots?",
        "Psst! Today's door in the Light Calendar is extra nice.", "I ate seven gingerbread cookies. Only to test them."]},
    es: {dager: "Faltan {n} días para Navidad", dag: "Falta 1 día para Navidad", julaften: "¡Feliz Navidad! Hoy es Nochebuena", jul: "¡Feliz Navidad!", romjul: "Entre Navidad y Año Nuevo", nyttar: "¡Feliz Año Nuevo!",
      snur: "La luz vuelve en {n} días", snur1: "La luz vuelve mañana", snur0: "La luz vuelve hoy", tilbake: "La luz está volviendo",
      dorIdag: "La puerta {n} está abierta hoy", aapne: "Abrir la puerta {n}", lesDor: "Lee la historia de hoy y enciende una estrella.",
      pa: "Adornos: sí", av: "Adornos: no", hint: "¡Psst! Toca las luces, la estrella, la luna, el nombre y la nieve.",
      alle: "¡¿Quién ha quitado todas mis luces?!", tilbakeLys: "Listo. Ya están colgadas otra vez.",
      vitser: ["¿Por qué Papá Noel tiene barba? ¡Para tener la barbilla caliente en la noche polar!", "¿Alguien ha visto mi gorro? Estaba aquí hace un momento.",
        "Mis renos han aprendido a volar. Ahora solo les falta aprender a aterrizar.", "¿Qué le dice un muñeco de nieve al otro? ¿Huele a zanahoria?",
        "¡Psst! La puerta de hoy en el Calendario de Luz es especialmente bonita.", "Me he comido siete galletas de jengibre. Solo para probarlas."]},
    pt: {dager: "Faltam {n} dias para o Natal", dag: "Falta 1 dia para o Natal", julaften: "Feliz Natal! Hoje é véspera de Natal", jul: "Feliz Natal!", romjul: "Entre o Natal e o Ano Novo", nyttar: "Feliz Ano Novo!",
      snur: "A luz volta em {n} dias", snur1: "A luz volta amanhã", snur0: "A luz volta hoje", tilbake: "A luz está voltando",
      dorIdag: "A porta {n} está aberta hoje", aapne: "Abrir a porta {n}", lesDor: "Leia a história de hoje e acenda uma estrela.",
      pa: "Enfeites: sim", av: "Enfeites: não", hint: "Psiu! Toque nas luzes, na estrela, na lua, no nome e na neve.",
      alle: "Quem tirou todas as minhas luzes?!", tilbakeLys: "Pronto. Elas estão penduradas de novo.",
      vitser: ["Por que o Papai Noel tem barba? Para manter o queixo quente na noite polar!", "Alguém viu meu gorro? Estava aqui agora mesmo.",
        "Minhas renas aprenderam a voar. Agora só falta aprender a pousar.", "O que um boneco de neve disse para o outro? Está cheirando a cenoura?",
        "Psiu! A porta de hoje no Calendário de Luz está especialmente bonita.", "Comi sete biscoitos de gengibre. Só para testar."]},
    zh: {dager: "距离圣诞节还有 {n} 天", dag: "距离圣诞节还有 1 天", julaften: "圣诞快乐！今天是平安夜", jul: "圣诞快乐！", romjul: "圣诞与新年之间", nyttar: "新年快乐！",
      snur: "{n} 天后白昼开始变长", snur1: "明天白昼开始变长", snur0: "今天白昼开始变长", tilbake: "光明正在回来",
      dorIdag: "今天第 {n} 扇门已打开", aapne: "打开第 {n} 扇门", lesDor: "读读今天的故事，点亮一颗星。",
      pa: "节日装饰：开", av: "节日装饰：关", hint: "嘘！点点彩灯、星星、月亮、名字和雪地试试。",
      alle: "谁把我的灯全摘下来了？！", tilbakeLys: "好了，灯又挂回去了。",
      vitser: ["圣诞老人为什么留胡子？为了在极夜里给下巴保暖！", "有人看见我的帽子吗？刚才还在这儿。",
        "我的驯鹿学会飞了，现在只差学会降落。", "一个雪人对另一个雪人说什么？你闻到胡萝卜味了吗？",
        "嘘！光之日历今天那扇门特别好看。", "我吃了七块姜饼，只是为了测试一下。"]}
  };
  var S = T[lang] || T.nb;
  /* Tekster til julemoroen (krakker, gave, juletre, pæra som er i stykker) */
  var T2 = {
    nb: {moro: "Julemoro", krakker: "Julekrakker", krakkerHjelp: "Trykk tre ganger", gave: "Gaven", gaveHjelp: "Trykk for å åpne", igjen: "Pakk inn igjen",
      tre: "Pynt ditt eget juletre", ustabil: "Den har vært sånn siden 1987.", lille: "Dagens lille ting: ",
      overrask: ["Ho ho ho! Der var du jo!", "Snømannen sier hei. Han smelter litt av glede.", "En pepperkake! Synd den bare er på skjermen.", "En bjelle! Kling, kling."]},
    en: {moro: "Christmas fun", krakker: "Christmas cracker", krakkerHjelp: "Tap three times", gave: "The present", gaveHjelp: "Tap to open", igjen: "Wrap it again",
      tre: "Decorate your own tree", ustabil: "It has been like that since 1987.", lille: "Today's little thing: ",
      overrask: ["Ho ho ho! There you are!", "The snowman says hello. He is melting a little from joy.", "A gingerbread cookie! Too bad it is only on the screen.", "A bell! Ding, ding."]},
    es: {moro: "Diversión navideña", krakker: "Petardo navideño", krakkerHjelp: "Toca tres veces", gave: "El regalo", gaveHjelp: "Toca para abrir", igjen: "Envolver de nuevo",
      tre: "Decora tu propio árbol", ustabil: "Está así desde 1987.", lille: "La pequeña cosa de hoy: ",
      overrask: ["¡Jo, jo, jo! ¡Ahí estás!", "El muñeco de nieve te saluda. Se derrite un poco de alegría.", "¡Una galleta de jengibre! Lástima que solo esté en la pantalla.", "¡Una campana! Tilín, tilín."]},
    pt: {moro: "Diversão de Natal", krakker: "Biscoito-surpresa de Natal", krakkerHjelp: "Toque três vezes", gave: "O presente", gaveHjelp: "Toque para abrir", igjen: "Embrulhar de novo",
      tre: "Enfeite sua própria árvore", ustabil: "Está assim desde 1987.", lille: "A pequena coisa de hoje: ",
      overrask: ["Ho ho ho! Aí está você!", "O boneco de neve diz olá. Ele derrete um pouco de alegria.", "Um biscoito de gengibre! Pena que é só na tela.", "Um sino! Blim, blém."]},
    zh: {moro: "圣诞乐趣", krakker: "圣诞拉炮", krakkerHjelp: "点三下", gave: "礼物", gaveHjelp: "点一下打开", igjen: "重新包好",
      tre: "装饰你自己的圣诞树", ustabil: "它从1987年起就这样了。", lille: "今天的一件小事：",
      overrask: ["嗬嗬嗬！原来你在这儿！", "雪人向你问好，他开心得有点融化了。", "一块姜饼！可惜只在屏幕上。", "一个铃铛！叮叮当。"]}
  };
  var S2 = T2[lang] || T2.nb;
  var NAVNELINJE = "All emojis designed by OpenMoji, the open-source emoji and icon project. License: CC BY-SA 4.0";
  function t(k, n){ return (S[k] || T.nb[k]).replace("{n}", n); }

  /* ---- Utseende ---- */
  var css = [
    ".jul-av .jul-el{display:none!important}",
    ".jul-lenke{position:absolute;top:0;left:0;right:0;height:38px;z-index:6;pointer-events:none}",
    ".jul-lenke svg{position:absolute;inset:0;width:100%;height:30px}",
    ".jul-paere{position:absolute;top:6px;width:24px;height:30px;margin-left:-12px;border:0;padding:0;background:none;cursor:pointer;pointer-events:auto;transition:transform .9s cubic-bezier(.5,0,.75,0)}",
    ".jul-paere::before{content:'';display:block;width:12px;height:16px;margin:6px auto 0;border-radius:50% 50% 45% 45%;background:var(--f);box-shadow:0 0 10px var(--f)}",
    ".jul-paere.ned{transform:translateY(var(--ned)) rotate(200deg)}",
    ".jul-paere.glimt::before{animation:julGlimt 2.4s ease-in-out 3}",
    "@keyframes julGlimt{50%{opacity:.3}}",
    ".jul-stjerne{position:absolute;top:30px;right:16px;width:34px;height:34px;border:0;padding:0;background:none;cursor:pointer;z-index:6;transition:transform .8s}",
    "#sky > .jul-stjerne{top:2px;right:6px;width:30px;height:30px}",
    ".jul-stjerne.snurr{transform:rotate(720deg) scale(1.35)}",
    ".jul-gnist{position:absolute;font-size:15px;pointer-events:none;z-index:7;animation:julGnist 1.1s ease-out forwards}",
    "@keyframes julGnist{to{transform:translate(var(--gx),var(--gy)) rotate(180deg);opacity:0}}",
    ".jul-mane{position:absolute;top:34px;left:46%;width:30px;height:30px;border-radius:50%;border:0;padding:0;cursor:pointer;z-index:4;background:#f4efd8;box-shadow:inset -8px -3px 0 0 #d9d2b0,0 0 16px rgba(244,239,216,.55)}",
    ".jul-rein{position:absolute;top:40px;left:-170px;font-size:28px;white-space:nowrap;pointer-events:none;z-index:7;transform:scaleX(-1)}",
    ".jul-rein.fly{animation:julFly 3.4s ease-in-out forwards}",
    "@keyframes julFly{0%{transform:translate(0,30px) scaleX(-1)}50%{transform:translate(calc(50vw + 80px),-4px) scaleX(-1)}100%{transform:translate(calc(100vw + 360px),26px) scaleX(-1)}}",
    ".jul-snokant{position:absolute;left:0;right:0;bottom:0;height:16px;z-index:5;cursor:pointer;background:#f4f7fb;",
    "-webkit-mask:radial-gradient(14px 10px at 14px 0,transparent 98%,#000) 0 0/28px 16px repeat-x;mask:radial-gradient(14px 10px at 14px 0,transparent 98%,#000) 0 0/28px 16px repeat-x}",
    ".jul-nisse{position:absolute;bottom:8px;font-size:44px;line-height:1;z-index:4;pointer-events:none;transform:translateY(70px);transition:transform .6s cubic-bezier(.3,1.5,.5,1)}",
    ".jul-nisse.opp{transform:translateY(0)}",
    ".jul-boble{position:absolute;max-width:240px;background:#fff;color:#1d2430;font:600 .88rem/1.35 system-ui,sans-serif;padding:8px 12px;border-radius:14px;box-shadow:0 4px 16px rgba(0,0,0,.3);opacity:0;transition:opacity .25s;pointer-events:none;z-index:8}",
    ".jul-boble.vis{opacity:1}",
    ".jul-lue{position:absolute;left:-16px;top:-34px;width:52px;height:46px;pointer-events:none;transform:translateY(-160px) rotate(-30deg);opacity:0;transition:transform .7s cubic-bezier(.3,1.6,.5,1),opacity .2s}",
    ".jul-lue.pa{transform:translateY(0) rotate(-16deg);opacity:1}",
    ".jul-klikk{cursor:pointer}",
    ".jul-teller{font-size:.82rem;font-weight:800;letter-spacing:.03em;color:#ffd98a}",
    ".jul-sno{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:6}",
    ".jul-sno i{position:absolute;top:-10px;border-radius:50%;background:#fff;opacity:.9;animation:julFall 5s linear forwards}",
    "@keyframes julFall{to{transform:translate(var(--dx),var(--h));opacity:0}}",
    ".jul-bryter{position:fixed;left:12px;bottom:12px;z-index:60;font:700 .85rem system-ui,sans-serif;border-radius:999px;border:1px solid rgba(0,0,0,.15);background:#0d1a2b;color:#ffd98a;padding:8px 14px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25)}",
    ".jul-topp{position:absolute;top:0;left:0;right:0;height:120px;pointer-events:none;z-index:50;overflow:visible}",
    ".jul-topp .jul-stjerne{top:6px;right:10px;pointer-events:auto}",
    ".jul-paere:focus-visible,.jul-stjerne:focus-visible,.jul-mane:focus-visible,.jul-bryter:focus-visible,.jul-klikk:focus-visible{outline:3px solid #ffd98a;outline-offset:3px}",
    /* Figurer, silhuett over månen, pæra som er i stykker, lys som rister */
    ".jul-nisse img{display:block}",
    ".jul-rein img{filter:brightness(0);opacity:.85;margin-right:-8px;vertical-align:bottom}",
    ".jul-paere:not(.ned):hover{animation:julRist .4s ease-in-out}",
    "@keyframes julRist{25%{transform:rotate(14deg)}75%{transform:rotate(-14deg)}}",
    ".jul-paere.ustabil::before{animation:julFlimmer 1.6s steps(1) 4;opacity:.75}",
    "@keyframes julFlimmer{0%,40%,100%{opacity:1}20%,60%{opacity:.2}}",
    ".jul-paere.zap{animation:julZap .5s linear}",
    "@keyframes julZap{20%{transform:translateX(-4px) rotate(-20deg)}40%{transform:translateX(4px) rotate(20deg)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}",
    /* Julemoro-kortet: krakker og gave */
    "#jul-moro .jul-rad{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;margin-top:8px}",
    "#jul-moro .jul-boks{flex:1 1 200px;text-align:center;position:relative;min-height:150px}",
    "#jul-moro .jul-boks small{display:block;color:inherit;opacity:.75;font-size:.82rem}",
    ".jul-krakker,.jul-gave{border:0;background:none;padding:6px;cursor:pointer;position:relative;display:inline-block}",
    ".jul-krakker svg{overflow:visible;display:block}",
    ".jul-krakker .h{transform-box:fill-box;transform-origin:center;transition:transform .6s cubic-bezier(.3,1.4,.5,1)}",
    ".jul-krakker.r1{animation:julRist .35s}.jul-krakker.r2{animation:julRist .25s 2}",
    ".jul-krakker.pang .v{transform:translateX(-34px) rotate(-25deg)}.jul-krakker.pang .hh{transform:translateX(34px) rotate(25deg)}",
    ".jul-pang{position:absolute;left:50%;top:-6px;transform:translateX(-50%) scale(.3);font:900 1.4rem system-ui,sans-serif;color:#c2493c;opacity:0;pointer-events:none}",
    ".jul-krakker.pang .jul-pang{animation:julPang .9s ease-out forwards}",
    "@keyframes julPang{30%{transform:translateX(-50%) scale(1.3);opacity:1}100%{transform:translateX(-50%) scale(1) translateY(-20px);opacity:0}}",
    ".jul-lapp{margin:8px auto 0;max-width:280px;background:#fff8e6;color:#1d2430;border:1px dashed #b8862b;border-radius:10px;padding:8px 10px;font-size:.9rem;font-weight:600}",
    ".jul-gave:not(.apen):hover img{animation:julRist .4s}",
    ".jul-gave img{transition:transform .5s cubic-bezier(.3,1.6,.5,1)}",
    ".jul-gave.apen img.pakke{transform:translateY(-26px) rotate(-25deg) scale(.6);opacity:.35}",
    ".jul-overrask{display:block;margin:-30px auto 0;transform:scale(0);transition:transform .5s cubic-bezier(.3,1.8,.5,1)}",
    ".jul-gave.apen .jul-overrask{transform:scale(1)}",
    ".jul-lenkeknapp{display:inline-block;margin-top:10px;font-weight:700}",
    ".jul-regn{position:fixed;inset:0;pointer-events:none;z-index:70;overflow:hidden}",
    ".jul-regn img{position:absolute;top:-70px;animation:julRegn 2.8s cubic-bezier(.4,0,.7,1) forwards}",
    "@keyframes julRegn{80%{transform:translateY(calc(100vh + 40px)) rotate(var(--r))}100%{transform:translateY(calc(100vh + 80px)) rotate(var(--r))}}",
    ".jul-navn{font-size:.75rem;opacity:.7;margin:8px 0 0}",
    "@media (prefers-reduced-motion:reduce){.jul-paere,.jul-stjerne,.jul-lue,.jul-nisse,.jul-krakker .h,.jul-gave img,.jul-overrask{transition:none}.jul-paere.glimt::before,.jul-paere.ustabil::before{animation:none}",
    ".jul-paere:hover,.jul-gave:hover img,.jul-krakker.r1,.jul-krakker.r2,.jul-paere.zap{animation:none!important}.jul-rein.fly,.jul-gnist,.jul-pang,.jul-regn img{animation-duration:.01s!important}.jul-sno{display:none}}"
  ].join("\n");
  var stil = document.createElement("style"); stil.textContent = css; document.head.appendChild(stil);

  /* ---- Faneikon: gullstjerne ---- */
  var ikon = document.createElement("link"); ikon.rel = "icon"; ikon.className = "jul-el";
  ikon.href = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#f2c76b" d="M12 1l2.9 7.2 7.6.5-5.9 4.9 1.9 7.4L12 17l-6.5 4 1.9-7.4L1.5 8.7l7.6-.5z"/></svg>');
  document.head.appendChild(ikon);

  /* Figurene er fra OpenMoji (CC BY-SA 4.0), lagret i /lib/jul/. Navnelinja legges nederst på siden. */
  function fig(navn, px){ return '<img src="/lib/jul/' + navn + '.svg?v=1" width="' + px + '" height="' + px + '" alt="" draggable="false">'; }
  function el(tag, cls, html){ var e = document.createElement(tag); if(cls){ e.className = cls; } if(html){ e.innerHTML = html; } return e; }
  var STJERNE = '<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path fill="#ffd98a" stroke="#b8862b" stroke-width=".6" d="M12 1l2.9 7.2 7.6.5-5.9 4.9 1.9 7.4L12 17l-6.5 4 1.9-7.4L1.5 8.7l7.6-.5z"/></svg>';
  var LUE = '<svg viewBox="0 0 52 46" aria-hidden="true"><path d="M4 36 C10 14 26 2 44 8 C38 12 34 20 34 34Z" fill="#c2493c"/><rect x="2" y="32" width="36" height="10" rx="5" fill="#f4f7fb"/><circle cx="45" cy="9" r="6" fill="#f4f7fb"/></svg>';

  function boble(beholder, tekst, x, y, tid){
    var b = el("div", "jul-boble jul-el"); b.textContent = tekst;
    b.style.left = x + "px"; b.style.top = y + "px";
    beholder.appendChild(b);
    requestAnimationFrame(function(){ b.classList.add("vis"); });
    setTimeout(function(){ b.classList.remove("vis"); setTimeout(function(){ b.remove(); }, 300); }, tid || 3500);
    return b;
  }

  /* ---- Lyslenka med lys som kan ramle ned ---- */
  var FARGER = ["#ffd98a", "#ff8a7a", "#8fe3c4", "#a9b8ff", "#ffd98a", "#ffb36b"];
  function lyslenke(beholder, nedHoyde){
    var l = el("div", "jul-lenke jul-el");
    l.innerHTML = '<svg viewBox="0 0 800 30" preserveAspectRatio="none" aria-hidden="true"><path d="M0 4 Q100 26 200 6 T400 6 T600 6 T800 4" fill="none" stroke="#6b7b8d" stroke-width="2"/></svg>';
    var antall = window.innerWidth < 600 ? 8 : 12, paerer = [], nede = 0;
    for(var i = 0; i < antall; i++){
      var b = el("button", "jul-paere"); b.type = "button"; b.tabIndex = -1; b.setAttribute("aria-hidden", "true");
      b.style.left = ((i + 0.5) / antall * 100) + "%";
      b.style.setProperty("--f", FARGER[i % FARGER.length]);
      b.style.setProperty("--ned", (nedHoyde() - 40) + "px");
      b.style.top = (i % 2 ? 10 : 4) + "px";
      if(i === 2){ b.classList.add("ustabil"); b.dataset.zap = "1"; }
      paerer.push(b); l.appendChild(b);
    }
    l.addEventListener("click", function(e){
      var b = e.target.closest(".jul-paere"); if(!b || b.classList.contains("ned")){ return; }
      /* Pæra som er litt i stykker: første trykk gir støt og en kommentar, neste trykk får den til å ramle */
      if(b.dataset.zap === "1"){
        delete b.dataset.zap; b.classList.remove("ustabil"); b.classList.add("zap");
        var rb = b.getBoundingClientRect(), rr = beholder.getBoundingClientRect();
        boble(beholder, S2.ustabil, Math.max(8, Math.min(rb.left - rr.left - 40, rr.width - 250)), 40, 3000);
        setTimeout(function(){ b.classList.remove("zap"); }, 600);
        return;
      }
      b.style.setProperty("--ned", (nedHoyde() - 40) + "px");
      b.classList.add("ned"); nede++;
      if(nede === paerer.length){
        setTimeout(function(){
          var r = beholder.getBoundingClientRect();
          nisseOpp(beholder, t("alle"), r.width * 0.4, function(){
            paerer.forEach(function(p){ p.classList.remove("ned"); }); nede = 0;
            boble(beholder, t("tilbakeLys"), Math.max(10, r.width * 0.4 - 40), 44, 2500);
          });
        }, 900);
      }
    });
    beholder.appendChild(l);
    if(!rolig){ setTimeout(function(){ paerer.forEach(function(p, i){ if(i % 3 === 0){ p.classList.add("glimt"); } }); }, 400); }
  }

  /* ---- Stjerna som snurrer og gnistrer ---- */
  function stjerne(beholder){
    var s = el("button", "jul-stjerne jul-el", STJERNE); s.type = "button"; s.setAttribute("aria-label", "★");
    s.addEventListener("click", function(){
      s.classList.remove("snurr"); void s.offsetWidth; s.classList.add("snurr");
      var r = s.getBoundingClientRect(), br = beholder.getBoundingClientRect();
      for(var i = 0; i < 12; i++){
        var g = el("span", "jul-gnist jul-el"); g.textContent = i % 2 ? "✦" : "★";
        g.style.color = FARGER[i % FARGER.length];
        g.style.left = (r.left - br.left + 10) + "px"; g.style.top = (r.top - br.top + 10) + "px";
        var v = i / 12 * Math.PI * 2;
        g.style.setProperty("--gx", Math.round(Math.cos(v) * 70) + "px"); g.style.setProperty("--gy", Math.round(Math.sin(v) * 70) + "px");
        beholder.appendChild(g); setTimeout(function(x){ return function(){ x.remove(); }; }(g), 1200);
      }
    });
    beholder.appendChild(s);
  }

  /* ---- Nissen som titter opp av snøen ---- */
  var nisseOpptatt = false, vits = Math.floor(Math.random() * 6);
  function nisseOpp(beholder, tekst, x, ferdig){
    if(nisseOpptatt){ return; } nisseOpptatt = true;
    var n = el("div", "jul-nisse jul-el", fig("nisse", 52)); n.style.left = x + "px";
    beholder.appendChild(n);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ n.classList.add("opp"); }); });
    var h = beholder.getBoundingClientRect().height;
    setTimeout(function(){ boble(beholder, tekst, Math.max(8, Math.min(x - 60, beholder.clientWidth - 250)), Math.max(8, h - 120), 3800); }, 450);
    setTimeout(function(){ n.classList.remove("opp"); setTimeout(function(){ n.remove(); nisseOpptatt = false; if(ferdig){ ferdig(); } }, 650); }, 4300);
  }

  /* ---- Snøbyge én gang om dagen ---- */
  function snobyge(beholder){
    if(rolig){ return; }
    var idag = Y + "-" + M + "-" + D;
    if(les("meg-jul-sno") === idag && !test){ return; }
    skriv("meg-jul-sno", idag);
    var b = el("div", "jul-sno jul-el"), h = "", hoyde = beholder.getBoundingClientRect().height + 20;
    for(var i = 0; i < 40; i++){
      var s = (3 + Math.random() * 5).toFixed(1);
      h += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;width:' + s + 'px;height:' + s + 'px;animation-delay:' + (Math.random() * 1.5).toFixed(2) + 's;--dx:' + Math.round(Math.random() * 40 - 20) + 'px;--h:' + Math.round(hoyde) + 'px"></i>';
    }
    b.innerHTML = h; beholder.appendChild(b);
    setTimeout(function(){ b.remove(); }, 7500);
  }

  /* ---- Nedtelling og lyset som snur ---- */
  function nedtelling(){
    var nå = Date.UTC(Y, M - 1, D), linje;
    if(M === 12 && D === 24){ linje = t("julaften"); }
    else if(M === 12 && (D === 25 || D === 26)){ linje = t("jul"); }
    else if(M === 12 && D >= 27 && D <= 30){ linje = t("romjul"); }
    else if((M === 12 && D === 31) || M === 1){ linje = t("nyttar"); }
    else { var n = Math.round((Date.UTC(Y, 11, 24) - nå) / 86400000); linje = n === 1 ? t("dag") : t("dager", n); }
    var s = Math.round((Date.UTC(Y, 11, 21) - nå) / 86400000), lys;
    if(M === 1 || s < 0){ lys = t("tilbake"); } else if(s === 0){ lys = t("snur0"); } else if(s === 1){ lys = t("snur1"); } else { lys = t("snur", s); }
    return linje + " · " + lys;
  }

  /* ---- Dagens dør i Lyskalenderen (kortet på forsiden) ---- */
  function dagensDor(){
    var kort = document.getElementById("jul-card");
    if(!kort || M !== 12 || D > 24){ return; }
    var tittel = kort.querySelector("h3"), ps = kort.querySelectorAll("p");
    if(tittel){ tittel.innerHTML = '<span aria-hidden="true">❄ </span>' + t("dorIdag", D); }
    if(ps[0]){ ps[0].textContent = t("lesDor"); }
    var a = kort.querySelector("a"); if(a){ a.href = "/julekalender/#dor-" + D; a.textContent = t("aapne", D); }
    var sc = document.createElement("script"); sc.src = "/julekalender/dorer.js?v=2026-11-22";
    sc.onload = function(){ var d = window.JUL_DORER && window.JUL_DORER[D - 1]; if(d && ps[0] && lang === "nb"){ ps[0].textContent = d.t + ". " + t("lesDor"); } };
    document.head.appendChild(sc);
  }

  /* ---- Bryteren ---- */
  function bryter(){
    var root = document.documentElement;
    if(les("meg-jul") === "av"){ root.classList.add("jul-av"); }
    var b = el("button", "jul-bryter"); b.type = "button";
    function vis(){ var av = root.classList.contains("jul-av"); b.textContent = "❄ " + (av ? t("av") : t("pa")); b.setAttribute("aria-pressed", av ? "false" : "true"); }
    b.addEventListener("click", function(){ root.classList.toggle("jul-av"); skriv("meg-jul", root.classList.contains("jul-av") ? "av" : "pa"); vis(); });
    vis(); document.body.appendChild(b);
  }

  /* ---- Julemoro-kortet på forsiden: krakker, gave og lenke til juletreet ---- */
  var KRAKKER = '<svg viewBox="0 0 140 48" width="140" height="48" aria-hidden="true">' +
    '<g class="h v"><path d="M4 10 L22 18 L22 30 L4 38 Z" fill="#c2493c"/><rect x="22" y="14" width="48" height="20" rx="4" fill="#c2493c"/><rect x="40" y="14" width="8" height="20" fill="#f2c76b"/></g>' +
    '<g class="h hh"><rect x="70" y="14" width="48" height="20" rx="4" fill="#c2493c"/><rect x="92" y="14" width="8" height="20" fill="#f2c76b"/><path d="M136 10 L118 18 L118 30 L136 38 Z" fill="#c2493c"/></g></svg>';
  function lapp(boks, tekst){ var g = boks.querySelector(".jul-lapp"); if(!g){ g = el("p", "jul-lapp"); boks.appendChild(g); } g.textContent = tekst; }
  function julemoro(){
    var etter = document.getElementById("jul-card");
    if(!etter || document.getElementById("jul-moro")){ return; }
    var kort = el("article", "card wide jul-el"); kort.id = "jul-moro";
    kort.innerHTML = '<div class="card-head"><h3><span aria-hidden="true">❄ </span>' + S2.moro + '</h3></div><div class="jul-rad"></div>';
    var rad = kort.querySelector(".jul-rad");

    /* Krakker: tre trykk, så smeller den og gir en vits eller dagens lille ting */
    var kb = el("div", "jul-boks");
    var k = el("button", "jul-krakker", KRAKKER + '<span class="jul-pang" aria-hidden="true">PANG!</span>'); k.type = "button";
    k.setAttribute("aria-label", S2.krakker + ". " + S2.krakkerHjelp);
    kb.appendChild(k); kb.appendChild(el("small", "", S2.krakker + " · " + S2.krakkerHjelp));
    var trykk = 0;
    k.addEventListener("click", function(){
      if(k.classList.contains("pang")){ k.classList.remove("pang"); trykk = 0; var g = kb.querySelector(".jul-lapp"); if(g){ g.remove(); } return; }
      trykk++;
      k.classList.remove("r1", "r2"); void k.offsetWidth;
      if(trykk === 1){ k.classList.add("r1"); }
      else if(trykk === 2){ k.classList.add("r2"); }
      else {
        k.classList.add("pang");
        var d = window.JUL_DORER && M === 12 && D <= 24 ? window.JUL_DORER[D - 1] : null;
        var tekst = (d && lang === "nb" && Math.random() < 0.5) ? S2.lille + d.l : S.vitser[vits++ % S.vitser.length];
        setTimeout(function(){ lapp(kb, tekst); }, 350);
      }
    });
    rad.appendChild(kb);

    /* Gaven: rister når musa er over, spretter opp med en overraskelse */
    var gb = el("div", "jul-boks");
    var g = el("button", "jul-gave", '<img class="pakke" src="/lib/jul/gave.svg?v=1" width="84" height="84" alt="" draggable="false"><span class="jul-overrask"></span>'); g.type = "button";
    g.setAttribute("aria-label", S2.gave + ". " + S2.gaveHjelp);
    gb.appendChild(g); gb.appendChild(el("small", "", S2.gave + " · " + S2.gaveHjelp));
    var figurer = ["nisse", "snomann", "pepperkake", "bjelle"], nr = Math.floor(Math.random() * 4);
    g.addEventListener("click", function(){
      if(g.classList.contains("apen")){ g.classList.remove("apen"); var l = gb.querySelector(".jul-lapp"); if(l){ l.remove(); } g.setAttribute("aria-label", S2.gave + ". " + S2.gaveHjelp); return; }
      var i = nr++ % figurer.length;
      g.querySelector(".jul-overrask").innerHTML = fig(figurer[i], 64);
      g.classList.add("apen"); g.setAttribute("aria-label", S2.igjen);
      setTimeout(function(){ lapp(gb, S2.overrask[i]); }, 300);
    });
    rad.appendChild(gb);

    /* Lenke til juletreet */
    var tb = el("div", "jul-boks");
    tb.innerHTML = '<a href="/juletre/" style="text-decoration:none;color:inherit">' + fig("juletre", 84) + '</a><br><a class="jul-lenkeknapp" href="/juletre/">' + S2.tre + '</a>';
    rad.appendChild(tb);

    etter.parentNode.insertBefore(kort, etter.nextSibling);
  }

  /* ---- Det hemmelige ordet: skriv «nisse» (eller «santa»), så regner det nisser ---- */
  function hemmeligOrd(){
    var buffer = "";
    document.addEventListener("keydown", function(e){
      var m = e.target && e.target.tagName;
      if(m === "INPUT" || m === "TEXTAREA" || (e.target && e.target.isContentEditable)){ return; }
      if(!e.key || e.key.length !== 1){ return; }
      buffer = (buffer + e.key.toLowerCase()).slice(-5);
      if(buffer === "nisse" || buffer === "santa"){
        buffer = "";
        if(document.documentElement.classList.contains("jul-av") || document.querySelector(".jul-regn")){ return; }
        var r = el("div", "jul-regn jul-el"), h = "";
        var antall = rolig ? 6 : 18;
        for(var i = 0; i < antall; i++){
          h += '<img src="/lib/jul/nisse.svg?v=1" width="56" height="56" alt="" style="left:' + (Math.random() * 92).toFixed(1) + '%;animation-delay:' + (Math.random() * 1.2).toFixed(2) + 's;--r:' + Math.round(Math.random() * 720 - 360) + 'deg">';
        }
        r.innerHTML = h; document.body.appendChild(r);
        setTimeout(function(){ r.remove(); }, 4500);
      }
    });
  }

  /* ---- Navnelinja som OpenMoji-lisensen krever ---- */
  function navnelinje(){
    var p = el("p", "jul-navn jul-el"); p.textContent = NAVNELINJE;
    var f = document.querySelector("footer");
    if(f){ f.appendChild(p); } else { p.style.cssText = "text-align:center;padding:0 16px 56px"; document.body.appendChild(p); }
  }

  function start(){
    hemmeligOrd();
    navnelinje();
    bryter();
    var himmel = document.getElementById("sky");
    if(himmel){
      /* Forsiden i Min dag: hele julehimmelen */
      lyslenke(himmel, function(){ return himmel.getBoundingClientRect().height; });
      stjerne(himmel);
      var mane = el("button", "jul-mane jul-el"); mane.type = "button"; mane.setAttribute("aria-label", "☾");
      mane.addEventListener("click", function(){
        var r = himmel.querySelector(".jul-rein"); if(r){ return; }
        r = el("div", "jul-rein jul-el", fig("rein", 34) + fig("rein", 34) + fig("slede", 38) + fig("nisse", 30)); himmel.appendChild(r);
        requestAnimationFrame(function(){ r.classList.add("fly"); });
        setTimeout(function(){ r.remove(); }, rolig ? 300 : 3600);
      });
      himmel.appendChild(mane);
      var sno = el("div", "jul-snokant jul-el"); sno.setAttribute("aria-hidden", "true");
      sno.addEventListener("click", function(e){
        var r = himmel.getBoundingClientRect();
        nisseOpp(himmel, S.vitser[vits++ % S.vitser.length], Math.min(Math.max(20, e.clientX - r.left - 20), r.width - 60));
      });
      himmel.appendChild(sno);
      var hvem = himmel.querySelector(".who");
      var h1 = document.getElementById("greeting");
      if(hvem && h1){
        var linje = el("span", "jul-teller jul-el"); linje.textContent = nedtelling();
        hvem.insertBefore(linje, h1);
        /* Lua ligger ved siden av overskriften, så den ikke forsvinner når siden skriver ny hilsen */
        hvem.style.position = "relative"; h1.classList.add("jul-klikk"); h1.tabIndex = 0;
        var lue = el("span", "jul-lue jul-el", LUE); hvem.appendChild(lue);
        function lueKlikk(){
          lue.style.left = (h1.offsetLeft - 16) + "px"; lue.style.top = (h1.offsetTop - 30) + "px";
          lue.classList.toggle("pa");
        }
        h1.addEventListener("click", lueKlikk);
        h1.addEventListener("keydown", function(e){ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); lueKlikk(); } });
      }
      snobyge(himmel);
      dagensDor();
      julemoro();
      if(les("meg-jul-hint") !== Y + "-" + M + "-" + D){
        skriv("meg-jul-hint", Y + "-" + M + "-" + D);
        setTimeout(function(){ boble(himmel, t("hint"), 16, 44, 5000); }, 1200);
      }
    } else {
      /* Andre sider: lyslenke, stjerne og snøbyge øverst */
      if(getComputedStyle(document.body).position === "static"){ document.body.style.position = "relative"; }
      var topp = el("div", "jul-topp jul-el"); document.body.insertBefore(topp, document.body.firstChild);
      lyslenke(topp, function(){ return 240; });
      stjerne(topp);
      snobyge(topp);
    }
  }
  if(document.readyState === "loading"){ document.addEventListener("DOMContentLoaded", start); } else { start(); }
})();
