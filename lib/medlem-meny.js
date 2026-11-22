/* Felles for Min dag og modulene:
   1. Innloggingsvinduet: window.MegInn.apne("inn") eller apne("ny"). «Logg inn» (e-post og passord, eller lenke på e-post)
      og «Bli medlem» (navn, fødselsdato, e-post og passord). Navn og fødselsdato lagres bare med samtykke,
      i EU og adskilt fra stemmesvar. Bekreftelseslenken fra e-posten åpner Medlemsportalen.
   2. «Trenger du hjelp?»: en liten knapp nederst til venstre som følger med når man blar, bare for innloggede.
      Den viser fagteamet (Lyses hjelpere) og nyttige lenker.
   Sparer strøm: ingen nettkall før man trykker, ingen løkker. Innlogget eller ikke sjekkes i nettleserens lagring.
   Tekstene oversettes av lib/sprak.js når et annet språk er valgt. */
(function(){
  "use strict";
  var NOKKEL = "sb-xprcbxubejpazmdbpsmy-auth-token";
  function innlogget(){ try{ return !!localStorage.getItem(NOKKEL); }catch(e){ return false; } }
  function el(tag, attrs, tekst){ var e = document.createElement(tag); if(attrs){ for(var a in attrs){ e.setAttribute(a, attrs[a]); } } if(tekst != null){ e.textContent = tekst; } return e; }

  var CSS = ".mm-bg{position:fixed;inset:0;background:rgba(10,20,25,.55);display:flex;align-items:flex-start;justify-content:center;padding:16px;z-index:9000;overflow:auto}" +
    ".mm-box{background:var(--surface,#fff);color:var(--ink,#14232b);border-radius:18px;max-width:420px;width:100%;margin-top:6vh;padding:18px 18px 20px;box-shadow:0 18px 50px rgba(0,0,0,.3);font:inherit}" +
    ".mm-box h2{margin:0 0 10px;font-size:22px}.mm-tabs{display:flex;gap:6px;margin:0 0 14px}" +
    ".mm-tabs button{flex:1;font:inherit;font-weight:700;padding:10px;border-radius:12px;border:1px solid var(--line,#d3dedd);background:transparent;color:inherit;cursor:pointer}" +
    ".mm-tabs button[aria-selected=true]{background:var(--accent,#1f8a6d);color:var(--accent-ink,#fff);border-color:transparent}" +
    ".mm-box form{display:flex;flex-direction:column;gap:10px}.mm-box label{display:flex;flex-direction:column;gap:4px;font-size:14px;font-weight:600}" +
    ".mm-box input[type=email],.mm-box input[type=password],.mm-box input[type=text]{font:inherit;font-weight:400;padding:11px 12px;border-radius:10px;border:1px solid var(--line,#c5d2d1);background:var(--bg,#fff);color:inherit}" +
    ".mm-box,.mm-box *{box-sizing:border-box}.mm-box input{width:100%;min-width:0}.mm-box input[type=checkbox]{width:auto;flex:none;margin-top:3px}" +
    ".mm-box .mm-rad{display:flex;gap:8px}.mm-box .mm-rad label{flex:1 1 0;min-width:0}" +
    ".mm-box label.mm-sam{flex-direction:row;align-items:flex-start;gap:8px;font-weight:400;font-size:13px}" +
    ".mm-box button.mm-hoved{font:inherit;font-weight:700;padding:12px;border-radius:12px;border:0;background:var(--accent,#1f8a6d);color:var(--accent-ink,#fff);cursor:pointer}" +
    ".mm-box button.mm-lenke{font:inherit;padding:11px;border-radius:12px;border:1px solid var(--accent,#1f8a6d);background:transparent;color:inherit;cursor:pointer}" +
    ".mm-box .mm-msg{min-height:1.2em;font-size:14px}.mm-box .mm-msg.err{color:#b3261e}.mm-box .mm-liten{font-size:12.5px;opacity:.8;margin:0}" +
    ".mm-lukk{float:right;font:inherit;font-size:22px;line-height:1;border:0;background:transparent;color:inherit;cursor:pointer;padding:2px 6px}" +
    ".mm-box :focus-visible{outline:3px solid var(--accent,#1f8a6d);outline-offset:2px}" +
    ".mh-knapp{position:fixed;left:14px;bottom:14px;z-index:8000;font:inherit;font-size:14px;font-weight:700;padding:10px 14px;border-radius:999px;border:1px solid var(--line,#c5d2d1);background:var(--surface,#fff);color:var(--ink,#14232b);box-shadow:0 6px 18px rgba(0,0,0,.18);cursor:pointer}" +
    ".mh-panel{position:fixed;left:14px;bottom:62px;z-index:8001;width:min(340px,calc(100vw - 28px));max-height:70vh;overflow:auto;background:var(--surface,#fff);color:var(--ink,#14232b);border:1px solid var(--line,#c5d2d1);border-radius:16px;box-shadow:0 14px 40px rgba(0,0,0,.25);padding:12px 14px;font-size:14px}" +
    ".mh-panel h3{margin:4px 0 6px;font-size:16px}.mh-panel h4{margin:12px 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;opacity:.75}" +
    ".mh-panel ul{list-style:none;margin:0;padding:0}.mh-panel li{padding:6px 0;border-top:1px solid var(--line,#e2e8e8)}.mh-panel li:first-child{border-top:0}" +
    ".mh-panel a,.mh-panel button.mh-ut{color:inherit;font:inherit;font-weight:700;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:2px}" +
    ".mh-panel .mh-om{display:block;font-weight:400;opacity:.8;font-size:13px}.mh-panel .mh-merke{font-size:11px;font-weight:700;padding:1px 6px;border-radius:999px;background:var(--soft-sun,#f7e8cf);margin-left:6px}" +
    "@media print{.mh-knapp,.mh-panel{display:none}}";
  function stil(){ if(document.getElementById("mm-stil")){ return; } var s = el("style", {id: "mm-stil"}); s.textContent = CSS; document.head.appendChild(s); }

  /* Egen klient med «implicit», så lenken fra e-posten virker i Medlemsportalen. Innloggingen deles fordi den lagres på samme sted. */
  var klient = null;
  /* Tilkoblingen leses først når den trengs: supabase-public.js og biblioteket lastes etter denne fila (rettet 22.11.2026). */
  function sb(){
    var CFG = window.ME_SUPABASE || {};
    if(!klient && window.supabase && CFG.url){ klient = window.supabase.createClient(CFG.url, CFG.publishable, {auth: {flowType: "implicit", persistSession: true, detectSessionInUrl: false}}); }
    return klient;
  }
  /* E-posten man har brukt på denne enheten fylles inn neste gang. Den ligger bare i nettleseren. */
  var EPOST = "me_checkout_email";
  function husketEpost(){ try{ return localStorage.getItem(EPOST) || ""; }catch(e){ return ""; } }
  function huskEpost(e){ try{ if(e){ localStorage.setItem(EPOST, e); } }catch(x){} }
  function tilPortal(){ return location.origin + "/portal/"; }
  function dato(s){
    var m = String(s || "").trim().match(/^(\d{1,2})[.\/\- ](\d{1,2})[.\/\- ](\d{4})$/); if(!m){ return null; }
    var d = +m[1], mo = +m[2], y = +m[3], t = new Date(y, mo - 1, d);
    if(t.getFullYear() !== y || t.getMonth() !== mo - 1 || t.getDate() !== d || t > new Date() || y < 1900){ return null; }
    return y + "-" + String(mo).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  }

  var bg = null;
  function lukk(){ if(bg){ bg.remove(); bg = null; document.removeEventListener("keydown", esc); if(sist){ try{ sist.focus(); }catch(e){} } } }
  function esc(e){ if(e.key === "Escape"){ lukk(); } }
  var sist = null;
  function apne(fane){
    stil(); lukk(); sist = document.activeElement;
    bg = el("div", {"class": "mm-bg"});
    var box = el("div", {"class": "mm-box", role: "dialog", "aria-modal": "true", "aria-labelledby": "mm-tittel"});
    var x = el("button", {type: "button", "class": "mm-lukk", "aria-label": "Lukk"}, "×"); x.addEventListener("click", lukk);
    box.appendChild(x); box.appendChild(el("h2", {id: "mm-tittel"}, "Medlem i Min dag"));
    var tabs = el("div", {"class": "mm-tabs", role: "tablist"});
    var tInn = el("button", {type: "button", role: "tab"}, "Logg inn"), tNy = el("button", {type: "button", role: "tab"}, "Bli medlem");
    tabs.appendChild(tInn); tabs.appendChild(tNy); box.appendChild(tabs);
    var innhold = el("div"); box.appendChild(innhold);
    var msg = el("p", {"class": "mm-msg", role: "status", "aria-live": "polite"});
    function si(t, feil){ msg.textContent = t || ""; msg.className = "mm-msg" + (feil ? " err" : ""); }
    function vis(f){
      tInn.setAttribute("aria-selected", f === "inn" ? "true" : "false"); tNy.setAttribute("aria-selected", f === "ny" ? "true" : "false");
      innhold.textContent = ""; si("");
      innhold.appendChild(f === "inn" ? skjemaInn(si) : skjemaNy(si)); innhold.appendChild(msg);
      var forste = [].filter.call(innhold.querySelectorAll("input"), function(i){ return !i.value && i.type !== "checkbox"; })[0]; if(forste){ forste.focus(); }
    }
    tInn.addEventListener("click", function(){ vis("inn"); }); tNy.addEventListener("click", function(){ vis("ny"); });
    bg.appendChild(box); document.body.appendChild(bg);
    bg.addEventListener("click", function(e){ if(e.target === bg){ lukk(); } });
    document.addEventListener("keydown", esc);
    vis(fane === "ny" ? "ny" : "inn");
  }

  function felt(lbl, attrs){ var l = el("label", null, lbl); var i = el("input", attrs); l.appendChild(i); return {l: l, i: i}; }
  function skjemaInn(si){
    var f = el("form", {novalidate: ""});
    var ep = felt("E-postadressen din", {type: "email", name: "email", autocomplete: "username", required: "", inputmode: "email"});
    var pw = felt("Passord", {type: "password", name: "password", autocomplete: "current-password"});
    ep.i.value = husketEpost();
    var knapp = el("button", {type: "submit", "class": "mm-hoved"}, "Logg inn");
    var lenke = el("button", {type: "button", "class": "mm-lenke"}, "Send meg en innloggingslenke");
    f.appendChild(ep.l); f.appendChild(pw.l); f.appendChild(knapp); f.appendChild(lenke);
    f.appendChild(el("p", {"class": "mm-liten"}, "Har du glemt passordet, eller har du ikke laget et ennå? Trykk «Send meg en innloggingslenke». Lenken åpner Medlemsportalen, der du kan lage passord."));
    f.addEventListener("submit", function(e){
      e.preventDefault();
      var e1 = ep.i.value.trim(), p = pw.i.value;
      if(!e1 || !ep.i.checkValidity()){ si("Skriv e-postadressen din først.", true); ep.i.focus(); return; }
      if(!p){ si("Skriv passordet ditt, eller trykk «Send meg en innloggingslenke» hvis du ikke har laget passord ennå.", true); pw.i.focus(); return; }
      if(!sb()){ si("Innloggingen kunne ikke lastes. Prøv å laste siden på nytt.", true); return; }
      knapp.disabled = true; si("Logger inn...");
      sb().auth.signInWithPassword({email: e1, password: p}).then(function(r){
        knapp.disabled = false;
        if(r.error){
          if(/invalid/i.test(r.error.message || "")){ si("Feil e-post eller passord. Har du ikke laget passord ennå, trykk «Send meg en innloggingslenke», og lag passordet inne på kontoen.", true); return; }
          if(/confirm/i.test(r.error.message || "")){ si("E-posten er ikke bekreftet ennå. Trykk på lenken i e-posten vi sendte deg, eller trykk «Send meg en innloggingslenke».", true); return; }
          si("Kunne ikke logge inn: " + r.error.message, true); return;
        }
        huskEpost(e1); si("Du er logget inn. Siden lastes på nytt.");
        setTimeout(function(){ location.reload(); }, 600);
      });
    });
    lenke.addEventListener("click", function(){
      var e1 = ep.i.value.trim();
      if(!e1 || !ep.i.checkValidity()){ si("Skriv e-postadressen din først.", true); ep.i.focus(); return; }
      if(!sb()){ si("Innloggingen kunne ikke lastes. Prøv å laste siden på nytt.", true); return; }
      lenke.disabled = true; si("Sender lenke...");
      sb().auth.signInWithOtp({email: e1, options: {emailRedirectTo: tilPortal(), shouldCreateUser: false}}).then(function(r){
        setTimeout(function(){ lenke.disabled = false; }, r.error ? 5000 : 60000);
        if(r.error){
          if(r.status === 429 || /rate|seconds|security purposes/i.test(r.error.message || "")){ si("En lenke er nettopp sendt til " + e1 + ". Sjekk innboksen og søppelposten. Vil du ha en ny, vent ett minutt.", true); return; }
          if(/not found|signups not allowed|user/i.test(r.error.message || "")){ si("Vi fant ingen konto med den e-posten. Trykk «Bli medlem» for å lage en.", true); return; }
          si("Kunne ikke sende lenken: " + r.error.message, true); return;
        }
        huskEpost(e1); si("Lenken er sendt til " + e1 + ". Sjekk innboksen, og søppelposten hvis den ikke kommer. Du kan be om en ny om ett minutt.");
      });
    });
    return f;
  }

  function skjemaNy(si){
    var f = el("form", {novalidate: ""});
    var rad = el("div", {"class": "mm-rad"});
    var fn = felt("Fornavn", {type: "text", autocomplete: "given-name"}), en = felt("Etternavn", {type: "text", autocomplete: "family-name"});
    rad.appendChild(fn.l); rad.appendChild(en.l); f.appendChild(rad);
    var fd = felt("Fødselsdato", {type: "text", inputmode: "numeric", placeholder: "dd.mm.åååå", autocomplete: "bday"});
    var ep = felt("E-post", {type: "email", name: "email", autocomplete: "username", required: "", inputmode: "email"});
    var pw = felt("Velg passord (minst 8 tegn)", {type: "password", name: "new-password", autocomplete: "new-password", minlength: "8"});
    f.appendChild(fd.l); f.appendChild(ep.l); f.appendChild(pw.l);
    /* Har man skrevet fornavn og fødselsdato i Min dag allerede, fylles de inn her. */
    try{ var g = JSON.parse(localStorage.getItem("meg-gjest") || "null"); if(g){ if(g.fornavn){ fn.i.value = g.fornavn; } if(g.aar){ fd.i.value = String(g.dag).padStart(2, "0") + "." + String(g.mnd).padStart(2, "0") + "." + g.aar; } } }catch(e){}
    var sam = el("label", {"class": "mm-sam"}); var sc = el("input", {type: "checkbox"});
    sam.appendChild(sc); sam.appendChild(el("span", null, "Lagre navnet og fødselsdatoen min på kontoen, så Min dag, horoskopet og modulene kan bruke dem. Dataene ligger i EU, deles ikke med andre og holdes adskilt fra stemmesvar. Jeg kan slette dem når jeg vil."));
    f.appendChild(sam);
    var knapp = el("button", {type: "submit", "class": "mm-hoved"}, "Bli medlem");
    f.appendChild(knapp);
    f.appendChild(el("p", {"class": "mm-liten"}, "De første 7 dagene er gratis. Du får en e-post med en lenke som bekrefter adressen din. Alt i VoteApp er rådgivende, og stemmen din veier like mye som alle andres."));
    f.addEventListener("submit", function(e){
      e.preventDefault();
      var e1 = ep.i.value.trim(), p = pw.i.value, fnavn = fn.i.value.trim(), enavn = en.i.value.trim(), fdt = fd.i.value.trim();
      if(!e1 || !ep.i.checkValidity()){ si("Sjekk e-postadressen, den ser ikke helt riktig ut.", true); ep.i.focus(); return; }
      if(p.length < 8){ si("Passordet må ha minst 8 tegn.", true); pw.i.focus(); return; }
      var iso = fdt ? dato(fdt) : null;
      if(fdt && !iso){ si("Skriv fødselsdatoen som dd.mm.åååå, for eksempel 14.03.1968.", true); fd.i.focus(); return; }
      if((fnavn || iso) && !sc.checked){ si("Kryss av for å lagre navn og fødselsdato, eller la de feltene stå tomme.", true); sc.focus(); return; }
      if(!sb()){ si("Innloggingen kunne ikke lastes. Prøv å laste siden på nytt.", true); return; }
      knapp.disabled = true; si("Lager kontoen...");
      var data = sc.checked ? {samtykke: true, full_name: [fnavn, "", enavn].join(" | "), birth_date: iso} : {};
      sb().auth.signUp({email: e1, password: p, options: {emailRedirectTo: tilPortal(), data: data}}).then(function(r){
        knapp.disabled = false;
        if(r.error){
          if(/registered|exists/i.test(r.error.message || "")){ si("Det finnes allerede en konto med den e-posten. Trykk «Logg inn».", true); return; }
          if(/weak|short|characters|password/i.test(r.error.message || "")){ si("Passordet er for svakt. Bruk minst 8 tegn, gjerne med tall og bokstaver.", true); return; }
          if(r.status === 429 || /rate|seconds/i.test(r.error.message || "")){ si("Mange melder seg på akkurat nå. Prøv igjen om en liten stund.", true); return; }
          si("Kunne ikke lage kontoen: " + r.error.message, true); return;
        }
        huskEpost(e1);
        if(r.data && r.data.session){ si("Velkommen! Kontoen er laget, og du er logget inn. Siden lastes på nytt."); setTimeout(function(){ location.reload(); }, 900); return; }
        si("Nesten ferdig! Vi har sendt en e-post til " + e1 + ". Trykk på lenken i den for å bekrefte, så er du med. Sjekk søppelposten hvis den ikke kommer.");
      });
    });
    return f;
  }
  window.MegInn = {apne: apne, lukk: lukk};

  /* ---- Trenger du hjelp? ---- */
  var HJELPERE = [
    {navn: "Ingrid", hva: "Juss-hjelp for privatpersoner", url: null, omrade: "Mine penger i Min dag (kommer)"},
    {navn: "Erling", hva: "Juss-hjelp for bedrifter", url: "https://my.bizplanpilot.com", omrade: "MinBiz"},
    {navn: "Astrid", hva: "Regnskap", url: "https://my.bizplanpilot.com", omrade: "MinBiz"},
    {navn: "Halvor", hva: "Skattemeldingen", url: null, omrade: "Mine penger i Min dag (kommer)"}
  ];
  var LENKER = [
    {tekst: "Min konto og passord", url: "/portal/"},
    {tekst: "Mine data og personvern", url: "/#personvern"},
    {tekst: "Sangene mine", url: "/#sang"},
    {tekst: "Lyskalenderen", url: "/julekalender/"},
    {tekst: "Spill for familie og venner", url: "/spill/"},
    {tekst: "Bli testpilot og si hva du synes", url: "/spill/#h-testpilot"}
  ];
  function hjelp(){
    if(!innlogget() || document.getElementById("mh-knapp")){ return; }
    stil();
    var k = el("button", {type: "button", id: "mh-knapp", "class": "mh-knapp", "aria-expanded": "false", "aria-controls": "mh-panel"}, "Trenger du hjelp?");
    var p = el("div", {id: "mh-panel", "class": "mh-panel", role: "region", "aria-label": "Trenger du hjelp?", hidden: ""});
    p.appendChild(el("h3", null, "Trenger du hjelp?"));
    p.appendChild(el("h4", null, "Fagteamet"));
    p.appendChild(el("p", {"class": "mh-om"}, "Lyses hjelpere er i opplæring og åpner 26. november. De gir veiledning, aldri bindende råd."));
    var ul = el("ul");
    HJELPERE.forEach(function(h){
      var li = el("li"), a = h.url ? el("a", {href: h.url}, h.navn + ": " + h.hva) : el("b", null, h.navn + ": " + h.hva);
      if(h.url && /^http/.test(h.url)){ a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener"); }
      li.appendChild(a); li.appendChild(el("span", {"class": "mh-merke"}, "I opplæring")); li.appendChild(el("span", {"class": "mh-om"}, h.omrade));
      ul.appendChild(li);
    });
    p.appendChild(ul);
    p.appendChild(el("h4", null, "Snarveier"));
    var ul2 = el("ul");
    LENKER.forEach(function(l){ var li = el("li"); li.appendChild(el("a", {href: l.url}, l.tekst)); ul2.appendChild(li); });
    var liUt = el("li"), ut = el("button", {type: "button", "class": "mh-ut"}, "Logg ut");
    ut.addEventListener("click", function(){
      var c = sb(); if(!c){ return; }
      c.auth.signOut().then(function(){ location.reload(); }, function(){ location.reload(); });
    });
    liUt.appendChild(ut); ul2.appendChild(liUt);
    p.appendChild(ul2);
    function sett(apen){ p.hidden = !apen; k.setAttribute("aria-expanded", apen ? "true" : "false"); }
    k.addEventListener("click", function(){ sett(p.hidden); });
    document.addEventListener("keydown", function(e){ if(e.key === "Escape" && !p.hidden){ sett(false); k.focus(); } });
    document.addEventListener("click", function(e){ if(!p.hidden && !p.contains(e.target) && e.target !== k){ sett(false); } });
    document.body.appendChild(p); document.body.appendChild(k);
  }
  if(document.readyState === "loading"){ document.addEventListener("DOMContentLoaded", hjelp); } else { hjelp(); }
})();
