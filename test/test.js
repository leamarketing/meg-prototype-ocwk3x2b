/* Testpanelet (23.11.2026).
   Flyt: logg inn, bli med med en kode (?kode=...), kryss av at du har gått gjennom modulen, send svar.
   Databasen sjekker det samme: koden, at sjekklisten er fullført, og at hvert svar har mer enn 15 ord.
   Nye moduler legges til i MODULER under. Koden lages i tabellen testpanel_invites. */
(function(){
  "use strict";
  var MIN_ORD = 16;
  var MODULER = {
    spill: {
      navn: "Spill for familie og venner",
      sjekk: [
        {id: "apnet", tekst: "Jeg har åpnet modulen og lest hva den er", lenke: "/spill/"},
        {id: "kveld", tekst: "Jeg har sett på familiens spillkveld", lenke: "/spill/#h-kveld"},
        {id: "mobil", tekst: "Jeg har prøvd modulen på mobilen"},
        {id: "noen", tekst: "Jeg har vist modulen til minst én annen person"}
      ],
      sporsmal: [
        "Hva la du merke til først, og hva syntes du om det?",
        "Hva var vanskelig, uklart eller manglet?",
        "Hva skulle til for at du eller familien din brukte dette hver uke?"
      ]
    },
    minDag: {
      navn: "Min dag",
      sjekk: [
        {id: "dag", tekst: "Jeg har sett min egen dag", lenke: "/"},
        {id: "plan", tekst: "Jeg har lagt inn noe i planen min", lenke: "/"},
        {id: "portal", tekst: "Jeg har vært innom Medlemsportalen", lenke: "/portal/"},
        {id: "mobil", tekst: "Jeg har prøvd Min dag på mobilen"}
      ],
      sporsmal: [
        "Hva la du merke til først, og hva syntes du om det?",
        "Hva var vanskelig, uklart eller manglet?",
        "Hva skulle til for at du åpnet Min dag hver morgen?"
      ]
    }
  };
  var $ = function(id){ return document.getElementById(id); };
  var boks = $("innhold"), msg = $("msg"), sb = null, bruker = null;
  function si(t, feil){ msg.textContent = t || ""; msg.className = "msg" + (feil ? " err" : ""); }
  function el(tag, attrs, tekst){ var e = document.createElement(tag); for(var a in (attrs || {})){ e.setAttribute(a, attrs[a]); } if(tekst != null){ e.textContent = tekst; } return e; }
  function ord(t){ t = String(t || "").trim(); return t ? t.split(/\s+/).length : 0; }
  function dato(s){ var d = new Date(s); return d.toLocaleDateString("nb-NO", {day: "numeric", month: "long"}); }
  var KODE = ((location.search.match(/[?&]kode=([A-Za-z0-9_-]{4,40})/) || [])[1]) || "";
  try{ if(KODE){ localStorage.setItem("testpanel_kode", KODE); } else { KODE = localStorage.getItem("testpanel_kode") || ""; } }catch(e){}

  function start(){
    var CFG = window.ME_SUPABASE || {};
    if(!window.supabase || !CFG.url){ boks.innerHTML = ""; si("Siden kunne ikke lastes. Prøv å laste den på nytt.", true); return; }
    sb = window.supabase.createClient(CFG.url, CFG.publishable, {auth: {flowType: "implicit", persistSession: true, detectSessionInUrl: false}});
    sb.auth.getSession().then(function(r){
      var s = r.data && r.data.session;
      bruker = s ? s.user : null;
      if(!bruker){ visLogginn(); return; }
      if(KODE){ bliMed(KODE); } else { visKjoringer(); }
    });
  }

  function visLogginn(){
    boks.innerHTML = "";
    var k = el("section", {"class": "card"});
    k.appendChild(el("h2", null, "Først: logg inn eller bli medlem"));
    k.appendChild(el("p", null, "Du trenger en konto, så vi kan gi deg gratis tilgang og ta vare på svarene dine. Etterpå kommer du tilbake hit."));
    var b1 = el("button", {type: "button"}, "Bli medlem"), b2 = el("button", {type: "button", style: "margin-left:8px;background:transparent;color:var(--accent);border:1px solid var(--accent)"}, "Logg inn");
    b1.onclick = function(){ if(window.MegInn){ window.MegInn.apne("ny"); } };
    b2.onclick = function(){ if(window.MegInn){ window.MegInn.apne("inn"); } };
    k.appendChild(b1); k.appendChild(b2);
    k.appendChild(el("p", {"class": "muted", style: "font-size:.9rem"}, "Har du logget inn i et annet vindu? Last denne siden på nytt."));
    boks.appendChild(k);
  }

  function bliMed(kode){
    si("Sjekker koden …");
    sb.rpc("join_testpanel", {p_code: kode}).then(function(r){
      if(r.error){ si("Noe gikk galt: " + r.error.message, true); visKjoringer(); return; }
      var d = r.data || {};
      if(!d.ok){
        si(d.why === "full" ? "Testpanelet for denne koden er fullt. Takk for at du ville være med!" : "Vi fant ikke koden. Sjekk lenken du fikk.", true);
        try{ localStorage.removeItem("testpanel_kode"); }catch(e){}
        visKjoringer(); return;
      }
      try{ localStorage.removeItem("testpanel_kode"); }catch(e){}
      history.replaceState(null, "", location.pathname);
      si(d.again ? "Du er allerede med i testpanelet." : "Velkommen i testpanelet! Du har gratis tilgang i " + d.access_days + " dager.");
      visKjoringer();
    });
  }

  function visKjoringer(){
    Promise.all([
      sb.from("testpanel_runs").select("module,test_until,checklist,walked_through_at").eq("user_id", bruker.id),
      sb.from("testpanel_answers").select("module").eq("user_id", bruker.id),
      sb.from("members").select("status,access_until").eq("id", bruker.id).maybeSingle()
    ]).then(function(q){
      boks.innerHTML = "";
      if(q[0].error){ si("Kunne ikke hente testene dine: " + q[0].error.message, true); return; }
      var kjor = q[0].data || [], sendt = {};
      (q[1].data || []).forEach(function(a){ sendt[a.module] = true; });
      var m = q[2].data;
      if(m && m.status === "testpanel" && m.access_until){ boks.appendChild(el("p", {"class": "muted"}, "Gratis tilgang til og med " + dato(m.access_until) + ".")); }
      if(!kjor.length){ visKodefelt(); return; }
      kjor.forEach(function(k){ boks.appendChild(modulKort(k, !!sendt[k.module])); });
    });
  }

  function visKodefelt(){
    var k = el("section", {"class": "card"});
    k.appendChild(el("h2", null, "Har du fått en kode?"));
    k.appendChild(el("p", null, "Skriv koden fra invitasjonen din."));
    var f = el("form"), inp = el("input", {type: "text", id: "kode", autocomplete: "off", "aria-label": "Kode"});
    var b = el("button", {type: "submit", style: "margin-top:10px;display:block"}, "Bli med");
    f.appendChild(inp); f.appendChild(b);
    f.onsubmit = function(e){ e.preventDefault(); var v = inp.value.trim(); if(/^[A-Za-z0-9_-]{4,40}$/.test(v)){ bliMed(v); } else { si("Koden har bare bokstaver, tall og bindestrek.", true); } };
    k.appendChild(f); boks.appendChild(k);
  }

  function modulKort(k, harSendt){
    var mod = MODULER[k.module] || {navn: k.module, sjekk: [], sporsmal: []};
    var kort = el("section", {"class": "card"});
    kort.appendChild(el("h2", null, mod.navn));
    if(harSendt){
      kort.appendChild(el("p", null, "Takk! Svarene dine er sendt. Du har fortsatt gratis tilgang ut perioden, så bruk gjerne modulen videre."));
      return kort;
    }
    var igjen = Math.ceil((new Date(k.test_until).getTime() - Date.now()) / 86400000);
    kort.appendChild(el("p", {"class": "muted"}, igjen > 0 ? "Testdager: til og med " + dato(k.test_until) + "." : "Testdagene er over, men du kan fortsatt sende svarene dine."));
    kort.appendChild(el("h3", null, "1. Gå gjennom modulen"));
    var ul = el("ul", {"class": "sjekk"}), valgt = Object.assign({}, k.checklist || {});
    mod.sjekk.forEach(function(p){
      var li = el("li"), lab = el("label"), cb = el("input", {type: "checkbox"});
      cb.checked = valgt[p.id] === true;
      var sp = el("span", null, p.tekst + " ");
      if(p.lenke){ var a = el("a", {href: p.lenke, target: "_blank", rel: "noopener"}, "Åpne"); sp.appendChild(a); }
      cb.onchange = function(){
        valgt[p.id] = cb.checked;
        sb.rpc("testpanel_check", {p_module: k.module, p_checklist: valgt, p_total: mod.sjekk.length}).then(function(r){
          if(r.error || !r.data || !r.data.ok){ si("Kunne ikke lagre avkrysningen. Prøv igjen.", true); cb.checked = !cb.checked; valgt[p.id] = cb.checked; return; }
          skjema.hidden = !r.data.done; låst.hidden = r.data.done; si("");
        });
      };
      lab.appendChild(cb); lab.appendChild(sp); li.appendChild(lab); ul.appendChild(li);
    });
    kort.appendChild(ul);
    var alle = mod.sjekk.every(function(p){ return valgt[p.id] === true; });
    var låst = el("p", {"class": "muted"}, "Når alle punktene er krysset av, kommer spørsmålene her.");
    låst.hidden = alle; kort.appendChild(låst);
    var skjema = el("form"); skjema.hidden = !alle;
    skjema.appendChild(el("h3", null, "2. Si hva du mener"));
    var felt = [];
    mod.sporsmal.forEach(function(q, i){
      var d = el("div", {"class": "sporsmal"}), id = "sv-" + k.module + "-" + i;
      d.appendChild(el("label", {"for": id}, q));
      var ta = el("textarea", {id: id, "aria-describedby": id + "-t"}), t = el("p", {"class": "teller", id: id + "-t", "aria-live": "polite"});
      ta.oninput = function(){ oppdater(); };
      d.appendChild(ta); d.appendChild(t); skjema.appendChild(d); felt.push({q: q, ta: ta, t: t});
    });
    var send = el("button", {type: "submit"}, "Send svarene");
    skjema.appendChild(send);
    function oppdater(){
      var ok = true;
      felt.forEach(function(f){ var n = ord(f.ta.value); var g = n >= MIN_ORD; ok = ok && g;
        f.t.textContent = g ? n + " ord. Fint!" : n + " ord. Skriv minst " + (MIN_ORD - n) + " til."; f.t.className = "teller" + (g ? " ok" : ""); });
      send.disabled = !ok; return ok;
    }
    oppdater();
    skjema.onsubmit = function(e){
      e.preventDefault(); if(!oppdater()){ return; }
      send.disabled = true; si("Sender …");
      sb.rpc("testpanel_send", {p_module: k.module, p_answers: felt.map(function(f){ return {q: f.q, a: f.ta.value.trim()}; })}).then(function(r){
        var d = r.data || {};
        if(r.error || !d.ok){
          send.disabled = false;
          si(d.why === "short" ? "Hvert svar må ha mer enn 15 ord." : d.why === "not_walked" ? "Kryss av alle punktene først." : "Svarene ble ikke sendt. Prøv igjen.", true);
          return;
        }
        si("Takk! Svarene dine er sendt."); visKjoringer();
      });
    };
    kort.appendChild(skjema);
    return kort;
  }

  if(document.readyState === "loading"){ document.addEventListener("DOMContentLoaded", start); } else { start(); }
})();
