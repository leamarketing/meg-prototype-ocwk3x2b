/* Språk i Min dag: én side på norsk, og en oversettelsesfil per språk (lib/sprak/<språk>.js).
   - Norsk (nb) er standard. Da gjør denne filen ingenting, og siden koster ikke mer strøm enn før.
   - Valget lagres i "meg-lang" (språkmenyen, eller ?lang=en i adressen). Telefonens språk brukes ikke.
   - Når siden vises på et annet språk, byttes teksten ut der den står på siden. Tekst som koden lager mens
     siden er åpen (horoskop, himmel, planen), fanges opp når den dukker opp. Ingen løkker, ingen spørring i bakgrunnen.
   - Oversettelsesfilen har to deler:
       ORD: hele tekster, eller mønstre der tall er {n1}, {n2} ..., faste ord (stjernetegn, planeter, måneder,
            ukedager) er {t1}, {t2} ..., og personens fornavn er {navn}.
       TERM: de faste ordene, for eksempel "Fisk": "Pisces".
   - Tekst som ikke finnes i filen, blir stående på norsk. Med ?sprak-sjekk=1 i adressen listes den i konsollen.
   - Sangtekstene (.lyrics) oversettes ikke: sangene er på norsk. */
(function(){
  "use strict";
  var STOTTE = {en: "en-GB", pt: "pt-BR", es: "es-ES", zh: "zh-CN"};
  /* Andre sider enn Min dag sier hvilken ekstra ordliste de trenger: <script src="/lib/sprak.js" data-del="portal">.
     Den lastes etter fellesfilen og legges til med MegSprakLegg. */
  var DEL = document.currentScript && document.currentScript.getAttribute("data-del");
  var lang = "nb";
  try{
    var q = new URLSearchParams(location.search).get("lang");
    if(q && (STOTTE[q] || q === "nb")){ localStorage.setItem("meg-lang", q); }
    lang = localStorage.getItem("meg-lang") || "nb";
  }catch(e){}
  if(!STOTTE[lang]){ lang = "nb"; }
  var MS = window.MegSprak = { lang: lang, locale: STOTTE[lang] || "nb-NO", t: function(s){ return s; }, mangler: [] };
  if(lang === "nb"){ return; }

  document.documentElement.lang = lang;
  /* Ordlisten lastes med en gang, før resten av siden, så teksten ikke blinker på norsk. */
  document.write('<script src="/lib/sprak/' + lang + '.js?v=2026-11-22c"><\/script>');
  window.MegSprakLegg = function(d){
    var B = window.MEG_SPRAK = window.MEG_SPRAK || {ORD: {}, TERM: {}, MONSTER: []};
    Object.keys(d.ORD || {}).forEach(function(k){ B.ORD[k] = d.ORD[k]; });
    Object.keys(d.TERM || {}).forEach(function(k){ B.TERM[k] = d.TERM[k]; });
    B.MONSTER = (d.MONSTER || []).concat(B.MONSTER || []);
  };
  if(DEL && /^[a-z]+$/.test(DEL)){ document.write('<script src="/lib/sprak/' + DEL + '/' + lang + '.js?v=2026-11-22c"><\/script>'); }

  /* Datoer og klokkeslett som koden skriver med norsk oppsett, skrives på valgt språk. */
  function byttLocale(l){ return (l === "nb-NO" || l === "nb" || l === "no" || l === "nn-NO") ? MS.locale : l; }
  ["toLocaleDateString", "toLocaleString", "toLocaleTimeString"].forEach(function(f){
    var orig = Date.prototype[f];
    Date.prototype[f] = function(l, o){ return orig.call(this, byttLocale(l), o); };
  });

  var ORD = {}, TERM = {}, MONSTER = [], TERMRE = null, TERMLISTE = [];
  var BOKSTAV = "A-Za-zÀ-ÖØ-öø-ÿ";
  function forbered(){
    var D = window.MEG_SPRAK || {};
    ORD = D.ORD || {}; TERM = D.TERM || {}; MONSTER = D.MONSTER || [];
    TERMLISTE = Object.keys(TERM).sort(function(a, b){ return b.length - a.length; });
    if(TERMLISTE.length){
      TERMRE = new RegExp("(^|[^" + BOKSTAV + "])(" + TERMLISTE.map(function(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")(?=$|[^" + BOKSTAV + "])", "g");
    }
  }
  function navn(){ var p = window.MegKonto && window.MegKonto.profil; return (p && p.fornavn) || "Kari"; }
  /* Lager mønsteret for en tekst: tall blir {n1}, faste ord {t1}, fornavnet {navn}. */
  function skjelett(s){
    var n = [], t = [], nv = navn();
    var k = s;
    if(nv){ k = k.split(nv).join("\u0002"); }
    if(TERMRE){ k = k.replace(TERMRE, function(m, f, ord){ t.push(ord); return f + String.fromCharCode(0xE000 + t.length); }); }
    k = k.replace(/\d+(?:[.,:]\d+)*/g, function(m){ n.push(m); return "{n" + n.length + "}"; });
    k = k.replace(/[-]/g, function(c){ return "{t" + (c.charCodeAt(0) - 0xE000) + "}"; }).replace(/\u0002/g, "{navn}");
    return { k: k, n: n, t: t };
  }
  function tall(x){ return (lang === "en" || lang === "zh") ? x.replace(/(\d),(\d)/g, "$1.$2") : x; }
  function oversett(s){
    if(Object.prototype.hasOwnProperty.call(ORD, s)){ return ORD[s]; }
    var sk = skjelett(s);
    if(sk.k !== s && Object.prototype.hasOwnProperty.call(ORD, sk.k)){
      return ORD[sk.k].replace(/\{n(\d+)\}/g, function(m, i){ return tall(sk.n[i - 1] || ""); })
        .replace(/\{t(\d+)\}/g, function(m, i){ var w = sk.t[i - 1]; return w ? (TERM[w] || w) : ""; })
        .replace(/\{navn\}/g, navn());
    }
    /* Setninger satt sammen av flere deler: MONSTER er [regexp, mal], der {1}, {2} ... er delene, og hver del oversettes for seg.
       {~1} betyr en del som kan være personens egen tekst: finnes den ikke i ordlisten, står den som den er. */
    for(var i = 0; i < MONSTER.length; i++){
      var mm = s.match(MONSTER[i][0]);
      if(mm && typeof MONSTER[i][2] === "function"){ try{ return MONSTER[i][2](mm); }catch(e){ continue; } }
      if(mm && typeof MONSTER[i][1] === "string"){
        var ok = true;
        var ut = MONSTER[i][1].replace(/\{(~?)(\d+)\}/g, function(x, fri, j){ var del = mm[+j] || ""; if(!/[A-Za-zÆØÅæøå]/.test(del)){ return tall(del); } var r = oversett(del); if(r == null){ if(!fri){ ok = false; } return del; } return r; });
        if(ok){ return ut; }
      }
    }
    return bytt(s);
  }
  /* Ordlistene er skrevet med «Storslett» og «Norsk tid.». Har siden et annet sted eller lokal tid, legger den parene i
     window.MEG_BYTT = [[det som står, det ordlista kjenner], ...]. Teksten oversettes med ordlistas ord, og så byttes det tilbake. */
  var iBytt = false;
  function bytt(s){
    var par = window.MEG_BYTT; if(iBytt || !par || !par.length){ return null; }
    var s2 = s;
    par.forEach(function(p){ if(p[0] && s2.indexOf(p[0]) !== -1){ s2 = s2.split(p[0]).join(p[1]); } });
    if(s2 === s){ return null; }
    iBytt = true; var r = null;
    try{ r = oversett(s2); }finally{ iBytt = false; }
    if(r == null){ return null; }
    par.forEach(function(p){
      var fra = Object.prototype.hasOwnProperty.call(ORD, p[1]) ? ORD[p[1]] : p[1];
      var til = Object.prototype.hasOwnProperty.call(ORD, p[0]) ? ORD[p[0]] : p[0];
      if(fra && r.indexOf(fra) !== -1){ r = r.split(fra).join(til); }
    });
    return r;
  }
  MS.t = function(s){ var r = oversett(s); return r == null ? s : r; };
  /* Spørsmål i egne vinduer («Slette alt?») oversettes også. */
  ["confirm", "alert"].forEach(function(f){
    var orig = window[f]; if(typeof orig !== "function"){ return; }
    window[f] = function(s){ return orig.call(window, typeof s === "string" ? MS.t(s.replace(/\s+/g, " ").trim()) : s); };
  });
  MS.skjelett = function(s){ return skjelett(s).k; };

  var sjekk = /[?&]sprak-sjekk=1/.test(location.search), sett = new WeakMap(), mangelSett = {};
  function mangel(s){ if(sjekk && /[A-Za-zæøåÆØÅ]{2}/.test(s) && !mangelSett[s]){ mangelSett[s] = 1; MS.mangler.push(s); } }
  function tekstnode(node){
    var raw = node.data, fra = sett.get(node);
    if(fra === raw){ return; }
    var m = raw.match(/^(\s*)([\s\S]*?)(\s*)$/), kjerne = m[2].replace(/\s+/g, " ");
    if(!kjerne || !/[A-Za-zÆØÅæøå]/.test(kjerne)){ return; }
    var el = node.parentElement;
    if(el && el.closest(".lyrics, script, style, [data-ikke-oversett]")){ return; }
    /* Samme ord kan bety to ting (Mars er både planet og måned). data-sprak-ns="maned" gir egne nøkler: "maned:Mars". */
    var ns = el && el.closest("[data-sprak-ns]"), nk = ns ? ns.getAttribute("data-sprak-ns") + ":" + kjerne : null;
    var r = (nk && Object.prototype.hasOwnProperty.call(ORD, nk)) ? ORD[nk] : oversett(kjerne);
    if(r == null){ mangel(kjerne); sett.set(node, raw); return; }
    var ny = m[1] + r + m[3];
    sett.set(node, ny);
    if(ny !== raw){ node.data = ny; }
  }
  var ATTR = ["placeholder", "aria-label", "title", "alt", "data-konto"];
  function attributter(el){
    for(var i = 0; i < ATTR.length; i++){
      var a = ATTR[i]; if(!el.hasAttribute(a)){ continue; }
      var v = el.getAttribute(a), merke = "data-sprak-" + a;
      if(el.getAttribute(merke) === v){ continue; }
      var r = oversett(v.replace(/\s+/g, " ").trim());
      if(r == null){ mangel(v); el.setAttribute(merke, v); continue; }
      el.setAttribute(merke, r); if(r !== v){ el.setAttribute(a, r); }
    }
  }
  function gjennom(rot){
    if(rot.nodeType === 3){ tekstnode(rot); return; }
    if(rot.nodeType !== 1){ return; }
    attributter(rot);
    var w = document.createTreeWalker(rot, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT), n;
    while((n = w.nextNode())){ if(n.nodeType === 3){ tekstnode(n); } else { attributter(n); } }
  }
  function start(){
    forbered();
    var t = oversett(document.title); if(t){ document.title = t; }
    gjennom(document.body);
    new MutationObserver(function(liste){
      for(var i = 0; i < liste.length; i++){
        var m = liste[i];
        if(m.type === "characterData"){ tekstnode(m.target); }
        else if(m.type === "attributes"){ if(ATTR.indexOf(m.attributeName) !== -1){ attributter(m.target); } }
        else { for(var j = 0; j < m.addedNodes.length; j++){ gjennom(m.addedNodes[j]); } }
      }
    }).observe(document.body, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR});
    if(sjekk){ setTimeout(function(){ console.log("Mangler oversettelse (" + MS.mangler.length + "):\n" + MS.mangler.join("\n")); }, 3000); }
  }
  if(document.readyState === "loading"){ document.addEventListener("DOMContentLoaded", start); } else { start(); }
})();
