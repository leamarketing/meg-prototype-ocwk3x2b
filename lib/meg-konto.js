/* Felles for alle moduler under me.voteapp.eu: henter det personen har lagret i Medlemsportalen
   (navn, fødselsdato, fødselstid og fødested), når hen er innlogget i samme nettleser.
   - Innloggingen deles fordi portalen og modulene ligger på samme adresse.
   - En kopi av profilen holdes på enheten ("meg-profil"), så siden kan vise riktig navn med en gang,
     uten å vente på nettet. Etterpå sjekkes kontoen én gang. Har noe endret seg, lastes siden på nytt én gang.
   - Logger man ut i portalen, slettes kopien neste gang en modul åpnes.
   - Sparer strøm: én henting når siden åpnes, ingen løkker og ingen spørring i bakgrunnen.
   Bruk: window.MegKonto.profil er null (ikke innlogget eller ingen lagrede data) eller
   {navn, fornavn, aar, mnd, dag, tid, sted, lat, lon, epost}.
   window.MegKonto.sb er databaseklienten og window.MegKonto.bruker den innloggede brukeren (eller null).
   Når sjekken er ferdig, sendes hendelsen "megkonto-klar", også når man ikke er innlogget eller nettet feiler.
   Andre kort (for eksempel MyBiz) bruker samme klient og samme innlogging. */
(function(){
  var KEY = "meg-profil", RELOAD = "meg-profil-lastet";
  function les(){ try{ var s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; }catch(e){ return null; } }
  function skriv(p){ try{ if(p){ localStorage.setItem(KEY, JSON.stringify(p)); } else { localStorage.removeItem(KEY); } }catch(e){} }
  var MK = window.MegKonto = { profil: les(), klar: false, sb: null, bruker: null };
  function ferdig(){ MK.klar = true; document.dispatchEvent(new CustomEvent("megkonto-klar")); }

  function fraRad(rad, epost){
    if(!rad || !rad.consent_at){ return null; }
    var deler = String(rad.full_name || "").split(" | ").map(function(s){ return s.trim(); });
    var navn = deler.filter(Boolean).join(" ");
    var p = { epost: epost || null, navn: navn || null, fornavn: deler[0] || null,
              aar: null, mnd: null, dag: null, tid: rad.birth_time ? String(rad.birth_time).slice(0, 5) : null,
              sted: rad.birth_place || null,
              lat: typeof rad.lat === "number" ? rad.lat : null, lon: typeof rad.lon === "number" ? rad.lon : null };
    if(rad.birth_date){ var d = String(rad.birth_date).split("-"); p.aar = +d[0]; p.mnd = +d[1]; p.dag = +d[2]; }
    if(!p.fornavn && !p.aar){ return null; }
    return p;
  }
  function oppdater(ny, dataByttet){
    var gammel = MK.profil;
    MK.profil = ny; MK.klar = true; skriv(ny);
    var endret = dataByttet || JSON.stringify(gammel) !== JSON.stringify(ny);
    var allerede = false; try{ allerede = sessionStorage.getItem(RELOAD) === "1"; }catch(e){}
    if(endret && !allerede){ try{ sessionStorage.setItem(RELOAD, "1"); }catch(e){} location.reload(); return; }
    try{ sessionStorage.removeItem(RELOAD); }catch(e){}
    if(bruker){ klarTilSending = true; MK.paKonto = true; visKontoTekst(); send(); }
    document.dispatchEvent(new CustomEvent("megkonto", {detail: ny}));
    ferdig();
  }
  /* Tekster som sier hvor ting lagres: elementer med data-konto får den teksten når det lagres på kontoen. */
  function visKontoTekst(){ var l = document.querySelectorAll("[data-konto]"); for(var i = 0; i < l.length; i++){ l[i].textContent = l[i].getAttribute("data-konto"); } }

  /* ---- Lagring på kontoen (tabellen medag_lagring) ----
     Det personen lager i Min dag og modulene (plan, middager, interesser, grupper, store dager, sangvalg,
     sangutkast og Lotto-rekker) ligger fortsatt i nettleseren, så siden virker med en gang og uten nett.
     Er man innlogget, sendes endringene også til kontoen, og ved åpning hentes kontoens versjon.
     Slik finner man det samme på mobilen og på PC-en. Dataene ligger adskilt fra stemmesvar.
     Sparer strøm: én henting når siden åpnes, og én samlet sending 1,5 sekunder etter siste endring. Ingen løkker. */
  var SYNK = ["todos","chosen","have","following","interests","joined","dager","sang","sang-utkast","lotto-rekker"];
  var META = "meg-synk", setI = Storage.prototype.setItem, remI = Storage.prototype.removeItem, getI = Storage.prototype.getItem;
  var bruker = null, klarTilSending = false, venter = null, iGang = false;
  function synkNokkel(k){ return typeof k === "string" && k.indexOf("meg-") === 0 && SYNK.indexOf(k.slice(4)) !== -1; }
  function lesMeta(){ try{ var m = JSON.parse(getI.call(localStorage, META) || "null"); if(m && typeof m === "object"){ m.tid = m.tid || {}; return m; } }catch(e){} return {eier: null, sist: 0, tid: {}}; }
  function skrivMeta(m){ try{ setI.call(localStorage, META, JSON.stringify(m)); }catch(e){} }
  function lokal(k){ try{ return getI.call(localStorage, "meg-" + k); }catch(e){ return null; } }
  function settLokal(k, v){ try{ if(v === null){ remI.call(localStorage, "meg-" + k); } else { setI.call(localStorage, "meg-" + k, v); } }catch(e){} }
  /* Fanger opp alle endringer av disse nøklene, uansett hvilken modul som gjør dem. */
  function merk(k){ var m = lesMeta(); m.tid[k.slice(4)] = Date.now(); skrivMeta(m); planlegg(); }
  try{
    Storage.prototype.setItem = function(k, v){ setI.call(this, k, v); if(this === window.localStorage && synkNokkel(k)){ merk(k); } };
    Storage.prototype.removeItem = function(k){ remI.call(this, k); if(this === window.localStorage && synkNokkel(k)){ merk(k); } };
  }catch(e){}
  function planlegg(){ if(!klarTilSending){ return; } if(venter){ clearTimeout(venter); } venter = setTimeout(send, 1500); }
  function send(){
    venter = null; if(!klarTilSending || !MK.sb || !bruker || iGang){ return; }
    var m = lesMeta(), keys = Object.keys(m.tid).filter(function(k){ return SYNK.indexOf(k) !== -1; });
    if(!keys.length){ return; }
    var opp = [], ned = [], tider = {};
    keys.forEach(function(k){
      tider[k] = m.tid[k]; var v = lokal(k), j = null;
      if(v !== null){ try{ j = JSON.parse(v); }catch(e){ j = v; } }
      if(j === null){ ned.push(k); } else { opp.push({user_id: bruker.id, noekkel: k, verdi: j, endret: new Date(m.tid[k]).toISOString()}); }
    });
    iGang = true;
    var jobber = [];
    if(opp.length){ jobber.push(MK.sb.from("medag_lagring").upsert(opp, {onConflict: "user_id,noekkel"})); }
    if(ned.length){ jobber.push(MK.sb.from("medag_lagring").delete().eq("user_id", bruker.id).in("noekkel", ned)); }
    Promise.all(jobber).then(function(svar){
      iGang = false;
      if(svar.some(function(r){ return r && r.error; })){ return; } /* prøves igjen ved neste endring eller neste åpning */
      var n = lesMeta();
      Object.keys(tider).forEach(function(k){ if(n.tid[k] === tider[k]){ delete n.tid[k]; } });
      n.sist = Date.now(); skrivMeta(n);
      if(Object.keys(n.tid).length){ planlegg(); }
    }).catch(function(){ iGang = false; });
  }
  document.addEventListener("visibilitychange", function(){ if(document.visibilityState === "hidden" && venter){ clearTimeout(venter); send(); } });
  /* Logget ut: det som tilhørte kontoen, fjernes fra enheten, så neste person på samme enhet ikke ser det. */
  function glemKonto(){ var m = lesMeta(); if(!m.eier){ return false; } SYNK.forEach(function(k){ settLokal(k, null); }); try{ remI.call(localStorage, META); }catch(e){} return true; }
  /* Slår sammen kontoen og enheten. Nyeste endring vinner. Gir true hvis noe på enheten ble byttet ut. */
  function flett(rader){
    var m = lesMeta(), byttet = false;
    if(m.eier && m.eier !== bruker.id){ SYNK.forEach(function(k){ settLokal(k, null); }); m = {eier: null, sist: 0, tid: {}}; byttet = true; }
    var forste = !m.eier || !m.sist; m.eier = bruker.id;
    var fjernt = {}; (rader || []).forEach(function(r){ fjernt[r.noekkel] = r; });
    SYNK.forEach(function(k){
      var r = fjernt[k], l = lokal(k), lt = m.tid[k];
      var rv = r ? JSON.stringify(r.verdi) : null;
      if(lt){ /* endret her og ikke sendt ennå: beholdes, med mindre kontoen har en nyere versjon */
        if(r && Date.parse(r.endret) > lt){ if(rv !== l){ settLokal(k, rv); byttet = true; } delete m.tid[k]; }
        return;
      }
      if(r){ if(rv !== l){ settLokal(k, rv); byttet = true; } return; }
      if(l !== null){
        if(forste){ m.tid[k] = Date.now(); } /* første gang på denne enheten: det som ligger her, tas med til kontoen */
        else { settLokal(k, null); byttet = true; } /* slettet fra en annen enhet */
      }
    });
    skrivMeta(m);
    return byttet;
  }

  function sjekk(){
    var CFG = window.ME_SUPABASE;
    if(!window.supabase || !CFG || !CFG.url){ ferdig(); return; }
    var sb = MK.sb = window.supabase.createClient(CFG.url, CFG.publishable, {auth:{persistSession:true, detectSessionInUrl:false, autoRefreshToken:true}});
    sb.auth.getSession().then(function(r){
      var s = r.data && r.data.session;
      bruker = MK.bruker = s ? s.user : null;
      if(!s){ var bort = !r.error && glemKonto(); oppdater(null, bort); return; }
      Promise.all([
        sb.from("members").select("full_name,birth_date,birth_time,birth_place,lat,lon,consent_at").eq("id", s.user.id).maybeSingle(),
        sb.from("medag_lagring").select("noekkel,verdi,endret").eq("user_id", s.user.id)
      ]).then(function(q){
        if(q[0].error){ ferdig(); return; } /* nettfeil: behold kopien som den er */
        var byttet = false;
        if(q[1].error){ bruker = null; } /* lagringen svarte ikke: alt blir liggende på enheten og sendes neste gang */
        else { byttet = flett(q[1].data); }
        /* Ny konto fra «Bli medlem» med samtykke: navn og fødselsdato ligger i kontoens metadata til første innlogging, og flyttes da til medlemsraden. */
        var rad = q[0].data, md = s.user.user_metadata || {};
        if(rad && !rad.consent_at && md.samtykke === true && (md.full_name || md.birth_date)){
          var na = new Date().toISOString(), patch = {consent_at: na, updated_at: na};
          if(md.full_name){ patch.full_name = String(md.full_name).slice(0, 200); }
          if(/^\d{4}-\d{2}-\d{2}$/.test(md.birth_date || "")){ patch.birth_date = md.birth_date; }
          sb.from("members").update(patch).eq("id", s.user.id).then(function(u){
            if(!u.error){ Object.keys(patch).forEach(function(k){ rad[k] = patch[k]; }); }
            oppdater(fraRad(rad, s.user.email), byttet);
          }, function(){ oppdater(fraRad(rad, s.user.email), byttet); });
          return;
        }
        oppdater(fraRad(rad, s.user.email), byttet);
      }).catch(function(){ ferdig(); });
    }).catch(function(){ ferdig(); });
  }
  if(document.readyState === "loading"){ document.addEventListener("DOMContentLoaded", sjekk); } else { sjekk(); }
})();
