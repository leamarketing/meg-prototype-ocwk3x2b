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
  function oppdater(ny){
    var gammel = MK.profil;
    MK.profil = ny; MK.klar = true; skriv(ny);
    var endret = JSON.stringify(gammel) !== JSON.stringify(ny);
    var allerede = false; try{ allerede = sessionStorage.getItem(RELOAD) === "1"; }catch(e){}
    if(endret && !allerede){ try{ sessionStorage.setItem(RELOAD, "1"); }catch(e){} location.reload(); return; }
    try{ sessionStorage.removeItem(RELOAD); }catch(e){}
    document.dispatchEvent(new CustomEvent("megkonto", {detail: ny}));
    ferdig();
  }
  function sjekk(){
    var CFG = window.ME_SUPABASE;
    if(!window.supabase || !CFG || !CFG.url){ ferdig(); return; }
    var sb = MK.sb = window.supabase.createClient(CFG.url, CFG.publishable, {auth:{persistSession:true, detectSessionInUrl:false, autoRefreshToken:true}});
    sb.auth.getSession().then(function(r){
      var s = r.data && r.data.session;
      MK.bruker = s ? s.user : null;
      if(!s){ oppdater(null); return; }
      sb.from("members").select("full_name,birth_date,birth_time,birth_place,lat,lon,consent_at").eq("id", s.user.id).maybeSingle().then(function(q){
        if(q.error){ ferdig(); return; } /* nettfeil: behold kopien som den er */
        oppdater(fraRad(q.data, s.user.email));
      });
    }).catch(function(){ ferdig(); });
  }
  if(document.readyState === "loading"){ document.addEventListener("DOMContentLoaded", sjekk); } else { sjekk(); }
})();
