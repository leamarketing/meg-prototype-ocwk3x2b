/* Slektsgransking i Min dag: eksempeltre med OPPDIKTEDE data (21.11.2026) og «Mitt eget tre» (27.11.2026).
   - Mitt eget tre lagres bare i nettleseren på denne enheten (localStorage «slekt-mitt-tre»). Ingenting sendes til oss.
   - Første person hentes fra profilen i Medlemsportalen (window.MegKonto.profil) når man er innlogget.
   - Hver kobling (barn og forelder) får et kildemerke. Svakeste ledd bestemmer styrken bakover.
   - Motsigelser finnes av seg selv. Å la en stå krever en begrunnelse.
   - GEDCOM-fil leses bare i nettleseren. Ingenting lagres eller sendes.
   Sparer strøm: ingen løkker og ingen henting i bakgrunnen. */
(function(){
  "use strict";
  var $ = function(id){ return document.getElementById(id); };
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
  var IAAR = new Date().getFullYear();

  /* ---------- Merkene ---------- */
  var MERKER = {
    bek:  {kl:"m-bek",  ik:"✓", rang:5, tekst:"Bekreftet",          forkl:"En primærkilde (kirkebok eller folketelling) viser koblingen, og noen har lest avskriften mot bildet."},
    sto:  {kl:"m-sto",  ik:"◐", rang:3, tekst:"Støttet",            forkl:"En annen kilde støtter koblingen: bygdebok, gravminne, attest, skifte, eller en KI-lest avskrift som ingen har kontrollert ennå."},
    dna:  {kl:"m-dna",  ik:"⧉", rang:3, tekst:"Støttet: DNA",       forkl:"Et DNA-treff passer med koblingen. DNA alene gir aldri Bekreftet."},
    munt: {kl:"m-munt", ik:"✎", rang:1, tekst:"Muntlig",            forkl:"Familiefortelling uten kilde ennå. Vi viser hvem som fortalte det og når."},
    omst: {kl:"m-omst", ik:"?", rang:0, tekst:"Omstridt",           forkl:"Kildene eller familien er uenige. Begge versjoner bevares og kan diskuteres."},
    imp:  {kl:"m-imp",  ik:"↧", rang:0, tekst:"Importert, ikke kildekontrollert", forkl:"Hentet fra en GEDCOM-fil. Får et sterkere merke når noen legger på en kilde."}
  };
  function merkeHtml(m, tekst, knapp, data){
    var M = MERKER[m];
    var inn = '<span class="ik" aria-hidden="true">' + M.ik + '</span>' + esc(tekst || M.tekst);
    return knapp ? '<button type="button" class="merke ' + M.kl + '" ' + data + '>' + inn + '</button>'
                 : '<span class="merke ' + M.kl + '">' + inn + '</span>';
  }

  /* ---------- Eksempeldata (oppdiktet) ---------- */
  var EKS_P = {
    du:     {id:"du", fornavn:"Du", etternavn:"", fodt:{dato:"1975-05-17", sted:"Tromsø"}, eks:true},
    per:    {id:"per", fornavn:"Per", etternavn:"Eksempelsen", fodt:{dato:"1948-02-03", sted:"Nordreisa"}, dod:{dato:"2019-09-30", sted:"Tromsø"}},
    mor:    {id:"mor", fornavn:"Solveig", etternavn:"Fjellstad", fodt:{dato:"1952-08-11", sted:"Skjervøy"}},
    johan:  {id:"johan", fornavn:"Johan", etternavn:"Eksempelsen", fodt:{dato:"1915-06-20", sted:"Nordreisa"}, dod:{dato:"1990-01-14", sted:"Nordreisa"}},
    marie:  {id:"marie", fornavn:"Marie", etternavn:"Eksempelsen, f. Nilsen", fodt:{dato:"1919-03-02", sted:"Kvænangen"}, dod:{dato:"2004-11-05", sted:"Nordreisa"}},
    anders: {id:"anders", fornavn:"Anders", etternavn:"Fjellstad", fodt:{dato:"1922-04-09", sted:"Skjervøy"}, dod:{dato:"1951-10-02", sted:"Skjervøy"}},
    ingrid: {id:"ingrid", fornavn:"Ingrid", etternavn:"Fjellstad", fodt:{dato:"1925-12-24", sted:"Skjervøy"}, dod:{dato:"2011-07-19", sted:"Tromsø"}},
    ole:    {id:"ole", fornavn:"Ole", etternavn:"Johansen Eksempelsen", fodt:{dato:"1876-10-01", sted:"Nordreisa"}, dod:{dato:"1951-03-12", sted:"Nordreisa"}},
    anna:   {id:"anna", fornavn:"Anna", etternavn:"Olsdatter", fodt:{dato:"1882-01-15", sted:"Nordreisa"}, dod:{dato:"1946-05-08", sted:"Nordreisa"}},
    olefar: {id:"olefar", omstridt:true}
  };
  var DA = "https://www.digitalarkivet.no/", NB = "https://www.nb.no/", GM = "https://www.slektogdata.no/gravminner";
  var EKS_L = [
    {id:"du-per", barn:"du", forelder:"per", rolle:"far", begrunnelse:"Fødselsattesten min viser Per som far.",
      kilder:[{type:"dokument", tittel:"Fødselsattest (eget dokument, opplastet)", hvem:"Du", naar:"2026-11-01", avskrift:"Far: Per Eksempelsen, født 3. februar 1948."}]},
    {id:"du-mor", barn:"du", forelder:"mor", rolle:"mor", begrunnelse:"Fødselsattesten min viser Solveig som mor.",
      kilder:[{type:"dokument", tittel:"Fødselsattest (eget dokument, opplastet)", hvem:"Du", naar:"2026-11-01", avskrift:"Mor: Solveig Fjellstad, født 11. august 1952."}]},
    {id:"per-johan", barn:"per", forelder:"johan", rolle:"far", begrunnelse:"Kirkeboka for 1948 er fortsatt sperret. Dåpsattesten fra familien viser Johan som far.",
      kilder:[{type:"dokument", tittel:"Dåpsattest for Per, 1948 (familiens papirer, opplastet)", hvem:"Kari (eksempel)", naar:"2026-10-12", avskrift:"Fader: Johan Eksempelsen, fisker. Moder: Marie f. Nilsen."}]},
    {id:"per-marie", barn:"per", forelder:"marie", rolle:"mor", begrunnelse:"",
      kilder:[{type:"muntlig", tittel:"Fortalt av Per Eksempelsen", hvem:"Kari (eksempel)", naar:"2015-07-04"}]},
    {id:"mor-anders", barn:"mor", forelder:"anders", rolle:"far", begrunnelse:"Bygdeboka oppgir Anders som far til Solveig.",
      kilder:[{type:"bygdebok", tittel:"Bygdebok for Skjervøy, bind 2, side 214 (eksempel)", lenke:NB, hvem:"Nils (eksempel)", naar:"2026-09-30", avskrift:"Anders Fjellstad, f. 1922, d. 1951. Barn: Solveig f. 1952."}]},
    {id:"mor-ingrid", barn:"mor", forelder:"ingrid", rolle:"mor", begrunnelse:"DNA-treffet mellom Solveig og Ingrids søster passer med at Ingrid er mor.",
      kilder:[{type:"dna", tittel:"DNA-treff hos en DNA-tjeneste: Solveig og Ingrids søster (eksempel)", hvem:"Solveig (har samtykket)", naar:"2026-08-15", avskrift:"Delt DNA: 1 780 cM. Passer med tante og niese, men også med andre slektskap.", samtykke:true},
               {type:"muntlig", tittel:"Fortalt av Solveig", hvem:"Du", naar:"2026-11-01"}]},
    {id:"johan-ole", barn:"johan", forelder:"ole", rolle:"far", begrunnelse:"Dåpen i kirkeboka 1915 viser Ole Johansen som far.",
      kilder:[{type:"kirkebok", tittel:"Kirkebok for Nordreisa, døpte 1915, side 41, nr. 87 (eksempel)", lenke:DA, primar:true, ki:true, kontrollert:false, hvem:"KI-lest, foreslått av Min dag", naar:"2026-11-20",
               avskrift:"Johan. Født 20. juni 1915, døpt 18. juli.\nForeldre: Fisker Ole Johansen Eksempelsen og hustru Anna Olsdatter."},
              {type:"bygdebok", tittel:"Bygdebok for Nordreisa, bind 1, side 388 (eksempel)", lenke:NB, hvem:"Nils (eksempel)", naar:"2026-09-30",
               avskrift:"Ole Johansen Eksempelsen, f. 1876. G. m. Anna Olsdatter. Barn: Johan f. 1915."}]},
    {id:"johan-anna", barn:"johan", forelder:"anna", rolle:"mor", begrunnelse:"Dåpen 1915 og folketellingen 1920 viser begge Anna som mor.",
      kilder:[{type:"kirkebok", tittel:"Kirkebok for Nordreisa, døpte 1915, side 41, nr. 87 (eksempel)", lenke:DA, primar:true, ki:false, hvem:"Kari (eksempel), lest mot bildet", naar:"2026-10-12",
               avskrift:"Johan. Født 20. juni 1915, døpt 18. juli.\nForeldre: Fisker Ole Johansen Eksempelsen og hustru Anna Olsdatter."},
              {type:"folketelling", tittel:"Folketelling 1920, Nordreisa, bosted 14 (eksempel)", lenke:DA, primar:true, ki:false, hvem:"Frivillig avskrift (eksempel)", naar:"2026-10-12",
               avskrift:"Anna Olsdatter, hustru, f. 1882. Johan Olsen, sønn, f. 1915."}]},
    {id:"ole-olefar", barn:"ole", forelder:"olefar", rolle:"far", begrunnelse:"", omstridt:{
      versjoner:[
        {key:"a", navn:"Peder Olsen Haugen", aar:"f. 1849", grunnlag:"Folketelling 1891: Ole bor hos Peder, oppført som «pleiesønn»."},
        {key:"b", navn:"Lars Olsen Haugen", aar:"f. 1852", grunnlag:"Bygdeboka oppgir Lars som far, uten å si hvor opplysningen kommer fra."}],
      stemmer:{a:3, b:2},
      innlegg:[
        {hvem:"Onkel Arne (eksempel)", tekst:"Bestemor sa alltid at det var Peder som var faren."},
        {hvem:"Kari (eksempel)", tekst:"Folketellingen 1891 viser Ole som pleiesønn hos Peder. Pleiesønn betyr at han ikke var Peders egen sønn. Det taler for Lars.", kilde:"Folketelling 1891, Nordreisa (eksempel)"},
        {hvem:"Nils (eksempel)", tekst:"Bygdeboka sier Lars, men oppgir ikke kilden. Vi bør finne dåpen til Ole i kirkeboka for 1878.", kilde:"Bygdebok for Nordreisa, bind 1, side 388 (eksempel)"}]},
      kilder:[{type:"folketelling", tittel:"Folketelling 1891, Nordreisa (eksempel)", lenke:DA, primar:true, hvem:"Kari (eksempel)", naar:"2026-11-02", avskrift:"Peder Olsen Haugen, husfar, f. 1849. Ole Johansen, pleiesønn, f. 1878.", sier:{person:"ole", fodtAar:1878}},
              {type:"bygdebok", tittel:"Bygdebok for Nordreisa, bind 1, side 388 (eksempel)", lenke:NB, hvem:"Nils (eksempel)", naar:"2026-09-30", avskrift:"Ole, sønn av Lars Olsen Haugen."}]}
  ];
  var P = EKS_P, L = EKS_L;
  function genNavn(i){ return ["Deg","Foreldre","Besteforeldre","Oldeforeldre","Tippoldeforeldre","Tipp-tippoldeforeldre"][i] || ("Generasjon " + (i + 1) + " bakover"); }
  /* Generasjonene regnes ut fra treet: start med deg, så foreldrene, så deres foreldre. */
  function generasjoner(){
    var rader = [["du"]], sett = {du:true};
    while(rader.length < 15){
      var neste = [];
      rader[rader.length - 1].forEach(function(id){
        L.filter(function(l){ return l.barn === id; })
         .sort(function(a, b){ return (a.rolle === "far" ? 0 : 1) - (b.rolle === "far" ? 0 : 1); })
         .forEach(function(l){ if(!sett[l.forelder] && P[l.forelder]){ sett[l.forelder] = true; neste.push(l.forelder); } });
      });
      if(!neste.length){ break; }
      rader.push(neste);
    }
    return {rader:rader, lose:Object.keys(P).filter(function(k){ return !sett[k]; })};
  }

  var EKS_LOGG = [
      {hvem:"Min dag (KI)", naar:"2026-11-20", hva:"Foreslo avskrift av dåpen til Johan, 1915", hvorfor:"Kirkebokside funnet ved søk på navn og sted. Ikke kontrollert av et menneske."},
      {hvem:"Kari (eksempel)", naar:"2026-11-02", hva:"La til folketellingen 1891 på Oles far, og merket koblingen omstridt", hvorfor:"Ole står som pleiesønn hos Peder, mens bygdeboka sier Lars."},
      {hvem:"Kari (eksempel)", naar:"2026-10-12", hva:"Leste dåpen til Johan mot bildet og bekreftet Anna som mor", hvorfor:"Avskriften stemmer med bildet i Digitalarkivet."},
      {hvem:"Nils (eksempel)", naar:"2026-09-30", hva:"La til to bygdebøker som kilde", hvorfor:"Funnet på Nasjonalbiblioteket."}
    ];
  var S = { modus:"eks", valgt:null, somAndre:false, minStemme:null, eksIgn:{}, ignorert:null, fraProfil:false, logg:EKS_LOGG, skjema:null, lagret:true };
  S.ignorert = S.eksIgn;

  /* ---------- Mitt eget tre: lagres bare på denne enheten ---------- */
  var NOKKEL = "slekt-mitt-tre", EGEN = null;
  function nyEgen(){ return {P:{du:{id:"du", fornavn:"Meg", etternavn:"", fodt:{dato:null, sted:""}}}, L:[], logg:[], ignorert:{}, teller:1}; }
  function lastEgen(){ try{ var t = localStorage.getItem(NOKKEL); if(t){ var d = JSON.parse(t); if(d && d.P && d.L && d.P.du){ d.logg = d.logg || []; d.ignorert = d.ignorert || {}; d.teller = d.teller || 1; return d; } } }catch(e){} return null; }
  function lagreEgen(){
    if(S.modus !== "egen" || !EGEN){ return; }
    try{ localStorage.setItem(NOKKEL, JSON.stringify(EGEN)); S.lagret = true; }catch(e){ S.lagret = false; }
  }
  function byttModus(m){
    S.modus = m === "egen" ? "egen" : "eks";
    if(S.modus === "egen"){ EGEN = EGEN || lastEgen() || nyEgen(); P = EGEN.P; L = EGEN.L; S.logg = EGEN.logg; S.ignorert = EGEN.ignorert; }
    else { P = EKS_P; L = EKS_L; S.logg = EKS_LOGG; S.ignorert = S.eksIgn; }
    S.valgt = null; S.skjema = null; IMP = null;
    $("detalj").hidden = true; $("skjema-kort").hidden = true; $("importUt").innerHTML = "";
    try{ localStorage.setItem("slekt-modus", S.modus); }catch(e){}
    brukProfil(); visAlt();
  }
  function nyId(){ return "p" + (EGEN.teller++); }
  function lid(barn, forelder){ return barn + "--" + forelder; }
  function idag(){ var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); }
  function loggFor(hva, hvorfor){ S.logg.unshift({hvem:"Du", naar:idag(), hva:hva, hvorfor:hvorfor}); lagreEgen(); visLogg(); }

  /* ---------- Hjelpere ---------- */
  function aar(d){ return d && d.dato ? +String(d.dato).slice(0,4) : null; }
  function full(d){ return !!(d && d.dato && /^\d{4}-\d{2}-\d{2}$/.test(d.dato)); }
  function dt(d){ if(!d || !d.dato){ return null; } var t = String(d.dato); if(/^\d{4}$/.test(t)){ t += "-07-01"; } var x = new Date(t + "T12:00:00"); return isNaN(x) ? null : x; }
  function datoTekst(d){ return d && d.dato ? String(d.dato).split("-").reverse().join(".") : ""; }
  /* Levende: ingen dødsdato og født for under 110 år siden. Uten fødselsår regnes personen også som levende, for sikkerhets skyld. */
  function levende(p){ return !p.omstridt && !p.dod && (!aar(p.fodt) || aar(p.fodt) > IAAR - 110); }
  function linkFor(barn, forelder){ for(var i = 0; i < L.length; i++){ if(L[i].barn === barn && L[i].forelder === forelder){ return L[i]; } } return null; }
  function linkTilForelder(id){ for(var i = 0; i < L.length; i++){ if(L[i].forelder === id){ return L[i]; } } return null; }
  function hovedversjon(o){ return o.stemmer.a >= o.stemmer.b ? o.versjoner[0] : o.versjoner[1]; }
  function navnPa(p, offentlig){
    if(p.omstridt){ var o = linkTilForelder(p.id).omstridt, v = hovedversjon(o); return v.navn + " eller " + (v.key === "a" ? o.versjoner[1].navn : o.versjoner[0].navn).split(" ")[0] + "?"; }
    if(p.id === "du"){ return p.fornavn + (p.etternavn ? " " + p.etternavn : ""); }
    if(offentlig && levende(p)){ return "Levende person · " + p.etternavn.split(",")[0]; }
    return p.fornavn + " " + p.etternavn;
  }
  function barnNavn(p, offentlig){ return p.id === "du" && !S.fraProfil ? "deg" : navnPa(p, offentlig); }
  function aarTekst(p, offentlig){
    if(p.omstridt){ return "To versjoner i kildene"; }
    if(offentlig && levende(p) && p.id !== "du"){ return "Privat"; }
    var f = aar(p.fodt), d = aar(p.dod);
    var deler = [];
    deler.push(f ? "f. " + f : "fødselsår mangler");
    deler.push(d ? "d. " + d : (p.dod ? "død, år mangler" : (levende(p) ? "lever" : "")));
    return deler.filter(Boolean).join(", ") + (p.fodt && p.fodt.sted ? " · " + p.fodt.sted : "");
  }

  /* ---------- Motsigelser ---------- */
  function motsigelser(){
    var ut = [];
    L.forEach(function(l){
      var b = P[l.barn], f = P[l.forelder];
      if(!b || !f || f.omstridt){ return; }
      if(S.modus === "eks" && S.fraProfil && (l.barn === "du" || l.forelder === "du")){ return; } /* ekte profil mot oppdiktede foreldre: sjekkes ikke */
      var bf = dt(b.fodt), ff = dt(f.fodt), fd = dt(f.dod);
      if(bf && ff){
        var alder = (bf - ff) / 31557600000;
        if(alder < 0){ ut.push({id:"eldre-"+l.id, type:"Barn er eldre enn forelder", personer:[b.id,f.id], tekst: navnPa(b) + " er født før " + navnPa(f) + "."}); }
        else if(alder < 14){ ut.push({id:"ung-"+l.id, type:"Forelder veldig ung", personer:[b.id,f.id], tekst: navnPa(f) + " var " + Math.floor(alder) + " år da " + navnPa(b) + " ble født."}); }
        else if(l.rolle === "mor" && alder > 55){ ut.push({id:"gammel-"+l.id, type:"Mor i veldig høy alder", personer:[b.id,f.id], tekst: navnPa(f) + " var " + Math.floor(alder) + " år da " + navnPa(b) + " ble født."}); }
      }
      if(bf && fd && !(full(b.fodt) && full(f.dod)) && aar(b.fodt) > aar(f.dod) + 1){
        ut.push({id:"etterdod-"+l.id, type:"Barn født etter at forelder døde", personer:[b.id,f.id], tekst: navnPa(b) + " er født " + aar(b.fodt) + ", men " + navnPa(f) + " døde " + aar(f.dod) + "."});
      }
      if(bf && fd && full(b.fodt) && full(f.dod)){
        var dager = (bf - fd) / 86400000;
        if(l.rolle === "mor" && dager > 0){ ut.push({id:"etterdod-"+l.id, type:"Barn født etter at mor døde", personer:[b.id,f.id], tekst: navnPa(b) + " er født etter at " + navnPa(f) + " døde."}); }
        if(l.rolle === "far" && dager > 280){ ut.push({id:"etterdod-"+l.id, type:"Barn født mer enn 9 måneder etter at far døde", personer:[b.id,f.id],
          tekst: navnPa(f) + " døde " + f.dod.dato.split("-").reverse().join(".") + ", og " + navnPa(b) + " er født " + b.fodt.dato.split("-").reverse().join(".") + ". Det er " + Math.round(dager/30.4) + " måneder."}); }
      }
    });
    Object.keys(P).forEach(function(k){ var p = P[k]; if(dt(p.fodt) && dt(p.dod) && dt(p.dod) < dt(p.fodt)){ ut.push({id:"dod-"+k, type:"Død før fødsel", personer:[k], tekst: navnPa(p) + " har dødsdato før fødselsdato."}); } });
    L.forEach(function(l){ l.kilder.forEach(function(k, i){
      if(k.sier && k.sier.fodtAar && P[k.sier.person] && aar(P[k.sier.person].fodt) !== k.sier.fodtAar){
        var p = P[k.sier.person];
        ut.push({id:"kilde-"+l.id+"-"+i, type:"Profildata i konflikt med kilde", personer:[p.id], kildeFiks:{person:p.id, aar:k.sier.fodtAar},
          tekst: "Treet sier " + navnPa(p) + " er født " + aar(p.fodt) + ". " + k.tittel + " sier " + k.sier.fodtAar + "."});
      }
    }); });
    return ut;
  }
  function uloste(){ return motsigelser().filter(function(m){ return !S.ignorert[m.id]; }); }
  function harUlost(l){ var u = uloste(); return u.some(function(m){ return m.personer.indexOf(l.barn) !== -1 || m.personer.indexOf(l.forelder) !== -1; }); }

  /* ---------- Styrke på kilder og koblinger ---------- */
  function kildeMerke(k){
    if((k.type === "kirkebok" || k.type === "folketelling") && k.primar){
      if(k.ki && !k.kontrollert){ return {m:"sto", t:"Støttet: KI-lest kirkebok, ikke kontrollert"}; }
      if(k.kontrollert === false){ return {m:"sto", t:"Støttet: " + k.type + ", ikke lest mot bildet"}; }
      return {m:"bek", t:"Bekreftet: " + k.type};
    }
    if(k.type === "dna"){ return {m:"dna", t:"Støttet: DNA"}; }
    if(k.type === "muntlig"){ return {m:"munt", t:"Muntlig"}; }
    if(k.type === "import"){ return {m:"imp", t:MERKER.imp.tekst}; }
    var navn = {bygdebok:"bygdebok", dokument:"eget dokument", gravminne:"gravminne", skifte:"skifte"}[k.type] || "annen kilde";
    return {m:"sto", t:"Støttet: " + navn};
  }
  function linkMerke(l){
    if(l.omstridt && !l.avgjort){ return {m:"omst", t:"Omstridt"}; }
    var best = null;
    l.kilder.forEach(function(k){ var km = kildeMerke(k); if(!best || MERKER[km.m].rang > MERKER[best.m].rang){ best = km; } });
    if(!best){ return {m:"munt", t:"Muntlig"}; }
    if(best.m === "bek" && harUlost(l)){ return {m:"sto", t:"Støttet: venter på at en motsigelse løses"}; }
    return best;
  }
  /* Linjen fra deg og bakover: finn veien gjennom barna og ta det svakeste merket. */
  function svakesteLedd(id){
    var vei = [], cur = id, vakt = 0;
    while(cur !== "du" && vakt++ < 10){ var l = linkTilForelder(cur); if(!l){ break; } vei.push(l); cur = l.barn; }
    var svak = null;
    vei.forEach(function(l){ var m = linkMerke(l); if(!svak || MERKER[m.m].rang < MERKER[svak.m.m].rang){ svak = {m:m, l:l}; } });
    return {vei:vei, svak:svak};
  }

  /* ---------- Treet ---------- */
  function visTre(){
    var off = S.somAndre, egen = S.modus === "egen", h = "", G = generasjoner();
    h += '<div class="knapper" role="group" aria-label="Hvilket tre"><button type="button" class="' + (egen ? "lys" : "") + '" data-modus="eks" aria-pressed="' + (!egen) + '">Eksempeltreet</button>' +
         '<button type="button" class="' + (egen ? "" : "lys") + '" data-modus="egen" aria-pressed="' + egen + '">Mitt eget tre</button></div>';
    if(egen){
      h += '<p class="eks" style="background:var(--m-sto-bg);border-color:var(--m-sto)">Mitt eget tre lagres bare i denne nettleseren på denne enheten. Ingenting sendes til oss. Tømmer du nettleseren, forsvinner treet, så ta ut en GEDCOM-fil som sikkerhetskopi innimellom.' +
           (S.lagret ? "" : ' <strong>Treet ble ikke lagret: nettleseren sa nei, eller treet er for stort.</strong>') + '</p>' +
           (Object.keys(P).length > 1 ? '<div class="knapper"><button type="button" class="lys" id="tomTre">Slett mitt tre fra denne enheten</button></div>' : "");
    }
    h += '<div class="knapper" role="group" aria-label="Vis treet som"><button type="button" class="' + (off ? "lys" : "") + '" data-som="meg" aria-pressed="' + (!off) + '">Slik du ser det</button>' +
         '<button type="button" class="' + (off ? "" : "lys") + '" data-som="andre" aria-pressed="' + off + '">Slik andre i familien ser det</button></div>';
    var rader = G.rader.map(function(r, i){ return {navn:genNavn(i), ider:r}; });
    if(G.lose.length){ rader.push({navn:"Ikke koblet til treet ennå", ider:G.lose}); }
    rader.forEach(function(rad){
      h += '<p class="gen">' + esc(rad.navn) + '</p><div class="rad">';
      rad.ider.forEach(function(id){
        var p = P[id], l = linkTilForelder(id), privat = levende(p) && id !== "du";
        h += '<div class="person' + (l && S.valgt === l.id ? " valgt" : "") + '">';
        h += '<span class="navn">' + esc(navnPa(p, off)) + (privat && !off ? ' <span class="small" title="Privat">🔒</span>' : "") + '</span>';
        h += '<span class="aar">' + esc(aarTekst(p, off)) + '</span>';
        if(id === "du"){ h += '<span class="rel">' + (S.fraProfil ? "Hentet fra profilen din" : (egen ? "Logg inn i Min dag, så hentes navn og fødselsdato fra profilen din." : "Eksempel. Logg inn, så hentes navn og fødselsdato fra profilen din.")) + '</span>'; }
        if(l){
          var m = linkMerke(l);
          h += '<span class="rel">' + (l.rolle === "far" ? "Far" : "Mor") + ' til ' + esc(barnNavn(P[l.barn], off)) + '</span>';
          h += merkeHtml(m.m, m.t, true, 'data-link="' + l.id + '" aria-label="Kilder for koblingen: ' + esc(m.t) + '"');
        }
        if(privat && !off){ h += '<span class="rel">Privat: bare du ser full informasjon.</span>'; }
        if(egen && !off){
          var harFar = L.some(function(x){ return x.barn === id && x.rolle === "far"; }), harMor = L.some(function(x){ return x.barn === id && x.rolle === "mor"; });
          h += '<div class="knapper" style="margin:2px 0 0">' +
               (harFar ? "" : '<button type="button" class="lys" data-nyforelder="' + id + ':far">+ Far</button>') +
               (harMor ? "" : '<button type="button" class="lys" data-nyforelder="' + id + ':mor">+ Mor</button>') +
               ((id === "du" && S.fraProfil) ? "" : '<button type="button" class="lys" data-endre="' + id + '">Endre</button>') + '</div>';
        }
        h += '</div>';
      });
      h += '</div>';
    });
    $("tre").innerHTML = h;
    $("duInfo").textContent = egen
      ? (Object.keys(P).length === 1 ? "Begynn med foreldrene dine: trykk «+ Far» eller «+ Mor». Eller hent inn en GEDCOM-fil fra Geni eller MyHeritage lenger ned." : "Ditt eget tre. Trykk på et merke for å se og legge til kilder.")
      : (S.fraProfil
        ? "Du står først i treet med navn og fødselsdato fra profilen din. Familien over deg er oppdiktet eksempel."
        : "Ikke innlogget: «Du» er et eksempel. Logg inn i Min dag, så hentes navn, fødselsdato og fødested fra profilen din.");
  }

  /* ---------- Detaljer for én kobling ---------- */
  function sjekkliste(l){
    var ikkeMunt = l.kilder.filter(function(k){ return k.type !== "muntlig"; });
    var punkter = [
      {ok: l.kilder.length >= 2 || linkMerke(l).m === "bek", t:"Søkt grundig: " + l.kilder.length + (l.kilder.length === 1 ? " kilde" : " kilder") + " funnet"},
      {ok: l.kilder.every(function(k){ return k.tittel && (k.lenke || k.type === "muntlig" || k.type === "dokument" || k.type === "dna"); }), t:"Kilden oppgitt nøyaktig"},
      {ok: ikkeMunt.length > 0 && ikkeMunt.every(function(k){ return k.avskrift && !(k.ki && !k.kontrollert); }), t:"Kildene lest og sammenlignet"},
      {ok: !harUlost(l) && !(l.omstridt && !l.avgjort), t:"Motsigelser løst"},
      {ok: !!(l.begrunnelse && l.begrunnelse.trim()), t:"Konklusjon skrevet"}
    ];
    return '<ul class="sjekk">' + punkter.map(function(x){ return '<li class="' + (x.ok ? "ok" : "nei") + '">' + esc(x.t) + (x.ok ? "" : " <span class=\"small\">(mangler)</span>") + '</li>'; }).join("") + '</ul>';
  }
  function kildeHtml(l, k, i){
    var km = kildeMerke(k), h = '<div class="kilde">';
    h += merkeHtml(km.m, km.t) + ' ';
    h += '<p style="margin:6px 0 2px"><strong>' + esc(k.tittel) + '</strong></p>';
    if(k.lenke && /^https?:\/\//i.test(k.lenke)){ h += '<p class="small"><a href="' + esc(k.lenke) + '" target="_blank" rel="noopener">Åpne kilden</a>' + (S.modus === "eks" ? " (eksempel: går til forsiden, ikke et ekte oppslag)" : "") + '</p>'; }
    if(k.ki && !k.kontrollert){ h += '<p><span class="ki">KI-lest, ikke kontrollert</span></p>'; }
    if(k.avskrift){ h += '<div class="avs">' + esc(k.avskrift) + '</div>'; }
    h += '<p class="small">Lagt inn av ' + esc(k.hvem) + ', ' + esc(k.naar.split("-").reverse().join(".")) + (k.samtykke ? ". Begge parter har samtykket til at treffet vises." : "") + '</p>';
    if((k.ki || k.kontrollert === false) && !k.kontrollert){
      h += '<p class="small">' + (k.ki ? "KI har lest håndskriften og foreslått avskriften. " : "Avskriften er ikke lest mot bildet ennå. ") + 'Sammenlign med bildet i kilden før du godkjenner. Merket endres ikke før et menneske har gjort det.</p>' +
           '<label class="small" for="kiGrunn-' + i + '">Hva sjekket du? (kreves)</label><input type="text" id="kiGrunn-' + i + '" placeholder="For eksempel: navn og datoer stemmer med bildet">' +
           '<div class="knapper"><button type="button" data-kikontroll="' + l.id + ":" + i + '">Jeg har lest avskriften mot bildet</button></div><p id="kiSvar-' + i + '" class="svar" role="status"></p>';
    }
    return h + '</div>';
  }
  function omstridtHtml(l){
    var o = l.omstridt, sum = o.stemmer.a + o.stemmer.b, hv = hovedversjon(o), h = "";
    h += '<h3>To versjoner, begge bevares</h3><div class="versjoner">';
    o.versjoner.forEach(function(v){
      var n = o.stemmer[v.key], pr = sum ? Math.round(100 * n / sum) : 0;
      h += '<div class="kilde"><p><strong>' + esc(v.navn) + '</strong> <span class="small">' + esc(v.aar) + '</span>' + (v === hv ? ' <span class="small">(vises nå først)</span>' : "") + '</p>' +
           '<p class="small">' + esc(v.grunnlag) + '</p><div class="stolpe" aria-hidden="true"><span style="width:' + pr + '%"></span></div>' +
           '<p class="small">' + n + (n === 1 ? " stemme" : " stemmer") + '</p>' +
           '<button type="button" class="' + (S.minStemme === v.key ? "" : "lys") + '" data-stem="' + v.key + '" aria-pressed="' + (S.minStemme === v.key) + '">' + (S.minStemme === v.key ? "Din stemme" : "Stem for denne") + '</button></div>';
    });
    h += '</div><p class="small">Rådgivende stemme med lik vekt for alle i familiegruppen. Stemmen bestemmer bare hvilken versjon som vises først. Bare en kilde, som dåpen i kirkeboka, kan gjøre koblingen bekreftet.</p>';
    h += '<h3>Diskusjon</h3><p class="small">Innlegg med kilde vises over innlegg uten.</p>';
    o.innlegg.slice().sort(function(a, b){ return (b.kilde ? 1 : 0) - (a.kilde ? 1 : 0); }).forEach(function(x){
      h += '<div class="innlegg"><p><strong>' + esc(x.hvem) + '</strong>: ' + esc(x.tekst) + '</p>' + (x.kilde ? '<p class="small">Kilde: ' + esc(x.kilde) + '</p>' : '<p class="small">Uten kilde</p>') + '</div>';
    });
    h += '<label class="small" for="nyttInnlegg">Skriv et innlegg</label><textarea id="nyttInnlegg"></textarea>' +
         '<label class="small" for="nyKilde">Kilde (valgfri, men innlegg med kilde vises først)</label><input type="text" id="nyKilde">' +
         '<div class="knapper"><button type="button" id="sendInnlegg">Legg til innlegg</button></div>';
    return h;
  }
  function visDetalj(id){
    var l = null; L.forEach(function(x){ if(x.id === id){ l = x; } });
    if(!l){ return; }
    S.valgt = id; visTre();
    var f = P[l.forelder], b = P[l.barn], m = linkMerke(l), sv = svakesteLedd(l.forelder), h = "";
    $("h-detalj").textContent = (f.omstridt ? "Hvem er far til " + navnPa(b) + "?" : navnPa(f) + " er " + (l.rolle === "far" ? "far" : "mor") + " til " + barnNavn(b));
    h += '<p>' + merkeHtml(m.m, m.t) + '</p><p class="small">' + esc(MERKER[m.m].forkl) + '</p>';
    if(sv.vei.length > 1 && sv.svak){
      h += '<p><strong>Linjen fra deg hit</strong> går gjennom ' + sv.vei.length + ' koblinger. Det svakeste leddet er ' + merkeHtml(sv.svak.m.m, sv.svak.m.t) +
           ' (' + esc(navnPa(P[sv.svak.l.forelder])) + ' og ' + esc(navnPa(P[sv.svak.l.barn])) + '), så hele linjen er ikke sterkere enn det.</p>';
    }
    if(levende(f)){
      h += '<div class="kilde"><p><strong>Levende person, privat.</strong> Bare du som la personen inn, og personen selv, ser full informasjon. Andre ser «Levende person · ' + esc(String(f.etternavn || "").split(",")[0]) + '».</p>' +
           '<div class="knapper"><button type="button" id="inviter">Inviter ' + esc(f.fornavn) + ' til å se og godkjenne profilen</button></div><p id="invSvar" class="svar" role="status"></p></div>';
    }
    h += '<h3>Bevis-sjekkliste</h3>' + sjekkliste(l);
    if(l.omstridt){ h += omstridtHtml(l); }
    h += '<h3>Kilder</h3>' + l.kilder.map(function(k, i){ return kildeHtml(l, k, i); }).join("");
    if(S.modus === "egen"){
      h += '<div class="knapper"><button type="button" data-nykilde="' + l.id + '">Legg til kilde</button>' +
           '<a class="lys" style="display:inline-flex;align-items:center;padding:9px 14px;border:1px solid var(--line);border-radius:8px;background:var(--chip);min-height:44px" href="' + esc(sokLenke(f)) + '" target="_blank" rel="noopener">Søk etter ' + esc(f.fornavn || "personen") + ' i Digitalarkivet</a>' +
           '<button type="button" class="lys" data-fjernlink="' + l.id + '">Fjern koblingen</button></div>';
    }
    h += '<h3>Konklusjon og begrunnelse</h3><p class="small">Skriv kort hvorfor koblingen er riktig, så andre kan vurdere det. Endringen kommer i loggen.</p>' +
         '<textarea id="begr" aria-label="Begrunnelse">' + esc(l.begrunnelse) + '</textarea><div class="knapper"><button type="button" id="lagreBegr">Lagre begrunnelsen</button></div><p id="begrSvar" class="svar" role="status"></p>';
    $("detaljInnhold").innerHTML = h;
    var d = $("detalj"); d.hidden = false; d.dataset.link = id; $("skjema-kort").hidden = true;
    d.scrollIntoView({behavior:"smooth", block:"start"}); d.focus({preventScroll:true});
  }

  /* ---------- Motsigelser ---------- */
  function visMotsigelser(){
    var alle = motsigelser(), u = alle.filter(function(m){ return !S.ignorert[m.id]; }), h = "";
    h += '<p><strong>' + u.length + (u.length === 1 ? " uløst motsigelse" : " uløste motsigelser") + '</strong>' + (alle.length - u.length ? ", " + (alle.length - u.length) + " latt stå med begrunnelse" : "") + '.</p>';
    if(!alle.length){ h += '<p>Ingen motsigelser funnet.</p>'; }
    alle.forEach(function(m){
      var ign = S.ignorert[m.id];
      h += '<div class="mots' + (ign ? " ignorert" : "") + '"><p><strong>' + esc(m.type) + '</strong></p><p>' + esc(m.tekst) + '</p>';
      if(ign){ h += '<p class="small">Latt stå av deg: «' + esc(ign) + '»</p>'; }
      else {
        h += '<div class="knapper">' + (m.kildeFiks ? '<button type="button" data-fiks="' + m.id + '">Bruk årstallet fra kilden (' + m.kildeFiks.aar + ')</button>' : "") +
             '<button type="button" class="lys" data-visign="' + m.id + '">La det stå</button></div>' +
             '<div data-ignboks="' + m.id + '" hidden><label class="small" for="ign-' + m.id + '">Hvorfor skal det stå? (kreves)</label><input type="text" id="ign-' + m.id + '">' +
             '<div class="knapper"><button type="button" data-ign="' + m.id + '">Lagre</button></div><p class="svar" role="status" data-ignsvar="' + m.id + '"></p></div>';
      }
      h += '</div>';
    });
    $("motsigelser").innerHTML = h;
  }

  function visLogg(){
    $("logg").innerHTML = S.logg.map(function(x){ return '<li><strong>' + esc(x.hvem) + '</strong>, ' + esc(x.naar.split("-").reverse().join(".")) + ': ' + esc(x.hva) + (x.hvorfor ? '<br><span class="small">Hvorfor: ' + esc(x.hvorfor) + '</span>' : "") + '</li>'; }).join("");
  }
  function visMerkeliste(){
    $("merkeliste").innerHTML = ["bek","sto","dna","munt","omst","imp"].map(function(k){ return '<div>' + merkeHtml(k) + '</div><div class="small">' + esc(MERKER[k].forkl) + '</div>'; }).join("");
  }
  function visAlt(){ visTre(); visMotsigelser(); visLogg(); var d = $("detalj"); if(!d.hidden && d.dataset.link){ visDetaljStille(d.dataset.link); } }
  function visDetaljStille(id){ var y = window.scrollY; visDetalj(id); window.scrollTo(0, y); }

  /* ---------- GEDCOM ---------- */
  function lesGedcom(tekst){
    var ind = {}, fam = {}, cur = null, sub = null;
    String(tekst).split(/\r?\n/).forEach(function(linje){
      var m = linje.trim().match(/^(\d+)\s+(@[^@]+@\s+)?(\w+)(?:\s(.*))?$/);
      if(!m){ return; }
      var niv = +m[1], xref = m[2] ? m[2].trim() : null, tag = m[3], val = (m[4] || "").trim();
      if(niv === 0){ sub = null;
        if(tag === "INDI" && xref){ cur = ind[xref] = {id:xref, navn:"", fodt:null, dod:null, famc:[], fams:[]}; }
        else if(tag === "FAM" && xref){ cur = fam[xref] = {id:xref, husb:null, wife:null, chil:[]}; }
        else { cur = null; }
        return;
      }
      if(!cur){ return; }
      if(niv === 1){ sub = tag;
        if(tag === "NAME" && !cur.navn){ cur.navn = val.replace(/\//g, "").replace(/\s+/g, " ").trim(); cur.etter = (val.match(/\/([^\/]*)\//) || [,""])[1].trim(); }
        if(tag === "BIRT"){ cur.fodt = {}; } if(tag === "DEAT"){ cur.dod = cur.dod || {}; }
        if(tag === "FAMC"){ cur.famc.push(val); } if(tag === "FAMS"){ cur.fams.push(val); }
        if(tag === "HUSB"){ cur.husb = val; } if(tag === "WIFE"){ cur.wife = val; } if(tag === "CHIL"){ cur.chil.push(val); }
      } else if(niv === 2 && (sub === "BIRT" || sub === "DEAT")){
        var o = sub === "BIRT" ? cur.fodt : cur.dod;
        if(tag === "DATE"){ var y = val.match(/\d{4}/); o.aar = y ? +y[0] : null; o.tekst = val; }
        if(tag === "PLAC"){ o.sted = val.split(",")[0].trim(); }
      }
    });
    return {ind:ind, fam:fam};
  }
  function norm(s){ return String(s || "").toLowerCase().replace(/[^a-zæøå ]/g, "").replace(/\s+/g, " ").trim(); }
  var IMP = null;
  function visImport(){
    var g = IMP, ut = $("importUt"), alle = Object.keys(g.ind).map(function(k){ return g.ind[k]; });
    if(!alle.length){ ut.innerHTML = '<p class="svar">Fant ingen personer i fila. Er det en GEDCOM-fil?</p>'; return; }
    var kob = 0; Object.keys(g.fam).forEach(function(k){ var f = g.fam[k]; kob += f.chil.length * ((f.husb ? 1 : 0) + (f.wife ? 1 : 0)); });
    var lev = alle.filter(function(p){ return !p.dod && p.fodt && p.fodt.aar && p.fodt.aar > IAAR - 110; });
    var h = '<p><strong>Lest: ' + alle.length + ' personer og ' + kob + ' koblinger mellom barn og foreldre.</strong> Alle koblinger får merket ' + merkeHtml("imp") + ' til noen legger på en kilde.</p>';
    h += '<p class="small">' + lev.length + (lev.length === 1 ? " person regnes" : " personer regnes") + ' som levende (ingen dødsdato, født for under 110 år siden). De blir private og vises for andre bare som «Levende person» og etternavn.</p>';
    /* Mulige dubletter: samme navn og fødselsår som en person i treet. Importen stopper til de er avgjort. */
    var dupl = [];
    alle.forEach(function(p){ Object.keys(P).forEach(function(k){ var t = P[k];
      if(!t.omstridt && !(S.modus === "eks" && t.id === "du") && p.fodt && p.fodt.aar && p.fodt.aar === aar(t.fodt) && sammeNavn(p.navn, (t.fornavn || "") + " " + (t.etternavn || ""))){ dupl.push({imp:p, tre:t}); }
    }); });
    if(dupl.length){
      h += '<h3>Importen har stoppet: ' + dupl.length + (dupl.length === 1 ? " mulig dublett" : " mulige dubletter") + '</h3><p class="small">Disse ligner personer som allerede er i treet ditt. Avgjør hver før importen kan fortsette, så ingen blir lagt inn to ganger.</p>';
      dupl.forEach(function(d, i){
        var svar = IMP.avgj[i];
        h += '<div class="kilde"><p>Fra fila: <strong>' + esc(d.imp.navn) + '</strong>, f. ' + esc(d.imp.fodt.aar) + (d.imp.fodt.sted ? ", " + esc(d.imp.fodt.sted) : "") + '<br>I treet: <strong>' + esc(navnPa(d.tre)) + '</strong>, ' + esc(aarTekst(d.tre)) + '</p>' +
             (svar ? '<p class="svar">' + (svar === "samme" ? "Avgjort: samme person. Kildene fra fila legges til den som finnes." : "Avgjort: ikke samme person. Legges inn som egen person.") + '</p>'
                   : '<div class="knapper"><button type="button" data-dupl="' + i + ':samme">Samme person</button><button type="button" class="lys" data-dupl="' + i + ':ulik">Ikke samme</button></div>') + '</div>';
      });
    }
    var ferdig = dupl.every(function(d, i){ return IMP.avgj[i]; });
    if(ferdig){
      h += S.modus === "egen"
        ? '<p class="svar">Importen kan fortsette.</p><div class="knapper"><button type="button" id="leggInn">Legg ' + alle.length + ' personer inn i mitt tre</button></div><p class="small">Alt blir liggende bare på denne enheten.</p>'
        : '<p class="svar">Importen kan fortsette. I eksempeltreet legges ingenting inn. Bytt til «Mitt eget tre» øverst for å hente inn ditt eget.</p>';
    }
    h += '<details><summary>Personer i fila</summary><table><thead><tr><th>Navn</th><th>Født</th><th>Merke</th></tr></thead><tbody>' +
      alle.slice(0, 60).map(function(p){ var lv = lev.indexOf(p) !== -1;
        return '<tr><td>' + esc(p.navn || "(uten navn)") + (lv ? ' <span class="small">🔒 levende, privat</span>' : "") + '</td><td>' + esc(p.fodt && p.fodt.aar ? p.fodt.aar : "Mangler") + (p.fodt && p.fodt.sted ? ", " + esc(p.fodt.sted) : "") + '</td><td>' + merkeHtml("imp", "Importert") + '</td></tr>'; }).join("") +
      '</tbody></table>' + (alle.length > 60 ? '<p class="small">Viser de første 60 av ' + alle.length + '.</p>' : "") + '</details>';
    IMP.dupl = dupl;
    ut.innerHTML = h;
  }
  function importer(tekst, navn){ IMP = lesGedcom(tekst); IMP.avgj = {}; IMP.navn = navn; visImport(); }
  function sammeNavn(a, b){
    var x = norm(a).split(" ").filter(Boolean), y = norm(b).split(" ").filter(Boolean);
    return x.length > 0 && y.length > 0 && x[0] === y[0] && x[x.length - 1] === y[y.length - 1];
  }
  var MND = {JAN:"01",FEB:"02",MAR:"03",APR:"04",MAY:"05",JUN:"06",JUL:"07",AUG:"08",SEP:"09",OCT:"10",NOV:"11",DEC:"12"};
  /* GEDCOM-dato til vårt format: «20 JUN 1915» blir 1915-06-20, «ABT 1912» blir 1912. */
  function fraGedDato(t){
    var m = String(t || "").toUpperCase().match(/^(?:(\d{1,2})\s+)?([A-Z]{3})\s+(\d{4})$/);
    if(m && MND[m[2]] && m[1]){ return m[3] + "-" + MND[m[2]] + "-" + String(m[1]).padStart(2, "0"); }
    var y = String(t || "").match(/\d{4}/); return y ? y[0] : null;
  }
  function tilGedDato(d){
    if(!d || !d.dato){ return null; }
    var x = String(d.dato).split("-"), N = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    return x.length === 3 ? (+x[2]) + " " + N[+x[1] - 1] + " " + x[0] : x[0];
  }
  function leggInnImport(){
    var g = IMP, map = {}, nye = 0, kob = 0;
    (IMP.dupl || []).forEach(function(d, i){ if(IMP.avgj[i] === "samme" && !map[d.imp.id]){ map[d.imp.id] = d.tre.id; } });
    Object.keys(g.ind).forEach(function(x){
      if(map[x]){ return; }
      var p = g.ind[x], id = nyId(), etter = (p.etter || "").trim(), fornavn = (p.navn || "").replace(etter, "").replace(/\s+/g, " ").trim();
      P[id] = {id:id, fornavn:fornavn || "(uten navn)", etternavn:etter,
               fodt:{dato:p.fodt ? fraGedDato(p.fodt.tekst) : null, sted:p.fodt && p.fodt.sted || ""}};
      if(p.dod){ P[id].dod = {dato:fraGedDato(p.dod.tekst), sted:p.dod.sted || ""}; }
      map[x] = id; nye++;
    });
    Object.keys(g.fam).forEach(function(k){
      var f = g.fam[k];
      f.chil.forEach(function(c){
        [["far", f.husb], ["mor", f.wife]].forEach(function(par){
          var barn = map[c], forelder = map[par[1]];
          if(!barn || !forelder || linkFor(barn, forelder)){ return; }
          if(L.some(function(x){ return x.barn === barn && x.rolle === par[0]; })){ return; }
          L.push({id:lid(barn, forelder), barn:barn, forelder:forelder, rolle:par[0], begrunnelse:"",
                  kilder:[{type:"import", tittel:"Importert fra " + (IMP.navn || "GEDCOM-fil"), hvem:"Du", naar:idag()}]});
          kob++;
        });
      });
    });
    loggFor("Hentet inn " + nye + " personer og " + kob + " koblinger fra " + (IMP.navn || "en GEDCOM-fil"), "Alle koblinger er merket «Importert, ikke kildekontrollert».");
    IMP = null;
    $("importUt").innerHTML = '<p class="svar">' + nye + ' personer og ' + kob + ' koblinger er lagt inn i treet ditt.' + (S.lagret ? "" : " Men nettleseren klarte ikke å lagre treet.") + '</p>';
    visAlt();
    $("tre-kort").scrollIntoView({behavior:"smooth"});
  }
  function tilGedcom(){
    var nr = {}, i = 1, ut = ["0 HEAD", "1 SOUR MinDag-Slekt", "1 GEDC", "2 VERS 5.5.1", "2 FORM LINEAGE-LINKED", "1 CHAR UTF-8"];
    Object.keys(P).forEach(function(k){ if(!P[k].omstridt){ nr[k] = "@I" + (i++) + "@"; } });
    var fam = {}, fi = 1;
    L.forEach(function(l){
      if(!nr[l.barn] || !nr[l.forelder]){ return; }
      var far = L.filter(function(x){ return x.barn === l.barn && x.rolle === "far" && nr[x.forelder]; })[0];
      var mor = L.filter(function(x){ return x.barn === l.barn && x.rolle === "mor" && nr[x.forelder]; })[0];
      var key = (far ? far.forelder : "-") + "|" + (mor ? mor.forelder : "-");
      if(!fam[key]){ fam[key] = {id:"@F" + (fi++) + "@", far:far && far.forelder, mor:mor && mor.forelder, barn:[], notater:[]}; }
      if(fam[key].barn.indexOf(l.barn) === -1){ fam[key].barn.push(l.barn); }
      l.kilder.forEach(function(k){ fam[key].notater.push(navnPa(P[l.forelder]) + " er " + l.rolle + " til " + navnPa(P[l.barn]) + ": " + kildeMerke(k).t + ". " + k.tittel + (k.lenke ? " " + k.lenke : "")); });
    });
    function ren(t){ return String(t || "").replace(/[\r\n]+/g, " / "); }
    Object.keys(nr).forEach(function(k){
      var p = P[k];
      ut.push("0 " + nr[k] + " INDI", "1 NAME " + ren(p.fornavn) + " /" + ren(String(p.etternavn || "").split(",")[0]) + "/");
      if(p.fodt && (p.fodt.dato || p.fodt.sted)){ ut.push("1 BIRT"); if(p.fodt.dato){ ut.push("2 DATE " + tilGedDato(p.fodt)); } if(p.fodt.sted){ ut.push("2 PLAC " + ren(p.fodt.sted)); } }
      if(p.dod){ ut.push("1 DEAT"); if(p.dod.dato){ ut.push("2 DATE " + tilGedDato(p.dod)); } if(p.dod.sted){ ut.push("2 PLAC " + ren(p.dod.sted)); } }
      Object.keys(fam).forEach(function(f){ var F = fam[f]; if(F.barn.indexOf(k) !== -1){ ut.push("1 FAMC " + F.id); } if(F.far === k || F.mor === k){ ut.push("1 FAMS " + F.id); } });
    });
    Object.keys(fam).forEach(function(f){
      var F = fam[f]; ut.push("0 " + F.id + " FAM");
      if(F.far){ ut.push("1 HUSB " + nr[F.far]); } if(F.mor){ ut.push("1 WIFE " + nr[F.mor]); }
      F.barn.forEach(function(b){ ut.push("1 CHIL " + nr[b]); });
      F.notater.forEach(function(n){ ut.push("1 NOTE " + ren(n)); });
    });
    ut.push("0 TRLR");
    return ut.join("\r\n") + "\r\n";
  }
  function lastNed(){
    var blob = new Blob([tilGedcom()], {type:"text/plain;charset=utf-8"}), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "slekt_" + (S.modus === "egen" ? "mitt-tre" : "eksempeltre") + "_" + idag() + ".ged";
    document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function sokLenke(p){
    var q = [p.fornavn, String(p.etternavn || "").split(",")[0], aar(p.fodt) || "", p.fodt && p.fodt.sted || ""].filter(Boolean).join(" ");
    return "https://www.digitalarkivet.no/search/persons?s=" + encodeURIComponent(q);
  }

  /* ---------- Skjema: person, forelder og kilde ---------- */
  var TYPER = [["kirkebok","Kirkebok"],["folketelling","Folketelling"],["bygdebok","Bygdebok"],["gravminne","Gravminne"],["dokument","Eget dokument (attest, brev)"],["skifte","Skifte"],["dna","DNA-treff"],["muntlig","Muntlig (familiefortelling)"]];
  function feltDato(navn, lbl, verdi){
    return '<label class="small" for="' + navn + '">' + lbl + '</label><input type="text" id="' + navn + '" inputmode="numeric" placeholder="1878 eller 01.10.1878" value="' + esc(verdi || "") + '">';
  }
  function felt(navn, lbl, verdi, ph){
    return '<label class="small" for="' + navn + '">' + lbl + '</label><input type="text" id="' + navn + '" value="' + esc(verdi || "") + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : "") + '>';
  }
  function personFelt(p){
    p = p || {fodt:{}, dod:null};
    return '<div class="versjoner">' +
      '<div>' + felt("sFor", "Fornavn", p.fornavn) + '</div><div>' + felt("sEtter", "Etternavn", p.etternavn) + '</div>' +
      '<div>' + feltDato("sFodt", "Født", p.fodt && p.fodt.dato) + '</div><div>' + felt("sFodtSted", "Fødested", p.fodt && p.fodt.sted) + '</div>' +
      '<div>' + feltDato("sDod", "Død (tomt hvis personen lever)", p.dod && p.dod.dato) + '</div><div>' + felt("sDodSted", "Dødssted", p.dod && p.dod.sted) + '</div></div>' +
      '<label class="small" style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" id="sErDod"' + (p.dod ? " checked" : "") + '> Personen er død (også når datoen er ukjent)</label>';
  }
  function kildeFelt(medMuntligHvem){
    return '<label class="small" for="kType">Hva slags kilde?</label><select id="kType" style="font:inherit;width:100%;padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink)">' +
      TYPER.map(function(t){ return '<option value="' + t[0] + '"' + (t[0] === "muntlig" && medMuntligHvem ? " selected" : "") + '>' + esc(t[1]) + '</option>'; }).join("") + '</select>' +
      felt("kTittel", "Hvilken kilde? (for eksempel: Kirkebok for Skjervøy, døpte 1915, side 41)", "", "") +
      felt("kLenke", "Lenke til kilden (valgfri)", "", "https://www.digitalarkivet.no/...") +
      '<label class="small" for="kAvs">Avskrift, det som står i kilden (valgfri)</label><textarea id="kAvs"></textarea>' +
      '<label class="small" style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" id="kLest"> Jeg har lest avskriften mot bildet av kilden</label>' +
      '<label class="small" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="kSamtykke"> DNA: begge parter har sagt ja til at treffet vises</label>';
  }
  function visSkjema(sk){
    S.skjema = sk; var h = "", tittel = "";
    if(sk.type === "person"){
      var p = P[sk.id]; tittel = "Endre " + navnPa(p);
      h += personFelt(p);
      h += '<div class="knapper"><button type="button" id="lagreSkjema">Lagre</button><button type="button" class="lys" id="avbrytSkjema">Avbryt</button>' +
           (sk.id === "du" ? "" : '<button type="button" class="lys" id="slettPerson">Fjern personen fra treet</button>') + '</div>';
    } else if(sk.type === "forelder"){
      var b = P[sk.barn]; tittel = (sk.rolle === "far" ? "Far" : "Mor") + " til " + barnNavn(b);
      var andre = Object.keys(P).filter(function(k){ return k !== sk.barn && !P[k].omstridt; });
      if(andre.length){
        h += '<label class="small" for="sFinnes">Er personen allerede i treet?</label><select id="sFinnes" style="font:inherit;width:100%;padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink)"><option value="">Nei, legg inn en ny person</option>' +
             andre.map(function(k){ return '<option value="' + esc(k) + '">' + esc(navnPa(P[k]) + " (" + aarTekst(P[k]) + ")") + '</option>'; }).join("") + '</select>';
      }
      h += '<h3>Ny person</h3>' + personFelt({fodt:{}, etternavn:sk.rolle === "far" ? (String(b.etternavn || "").split(",")[0]) : ""});
      h += '<p class="small">Levende personer lagres bare her på enheten. Spør dem gjerne før du legger dem inn.</p>';
      h += '<h3>Hvordan vet du det?</h3><p class="small">Velg kilde. Har du ingen ennå, velg «Muntlig» og skriv hvem som fortalte det. <a href="' + esc(sokLenke(b)) + '" target="_blank" rel="noopener">Søk etter ' + esc(b.fornavn || "personen") + ' i Digitalarkivet</a></p>' + kildeFelt(true);
      h += '<label class="small" for="sBegr">Konklusjon: hvorfor er dette riktig? (valgfri)</label><textarea id="sBegr"></textarea>';
      h += '<div class="knapper"><button type="button" id="lagreSkjema">Legg til</button><button type="button" class="lys" id="avbrytSkjema">Avbryt</button></div>';
    } else if(sk.type === "kilde"){
      var l = L.filter(function(x){ return x.id === sk.link; })[0]; tittel = "Ny kilde: " + navnPa(P[l.forelder]) + " og " + barnNavn(P[l.barn]);
      h += kildeFelt(false) + '<div class="knapper"><button type="button" id="lagreSkjema">Legg til kilden</button><button type="button" class="lys" id="avbrytSkjema">Avbryt</button></div>';
    }
    h += '<p id="skjemaSvar" class="svar" role="alert"></p>';
    $("h-skjema").textContent = tittel; $("skjemaInnhold").innerHTML = h;
    var k = $("skjema-kort"); k.hidden = false; $("detalj").hidden = true;
    k.scrollIntoView({behavior:"smooth", block:"start"}); k.focus({preventScroll:true});
  }
  function lesDato(id){
    var v = $(id).value.trim(); if(!v){ return {ok:true, v:null}; }
    if(/^\d{4}$/.test(v) || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v + "T12:00:00")))){ return {ok:true, v:v}; }
    var m = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); if(m){ return {ok:true, v:m[3] + "-" + m[2].padStart(2,"0") + "-" + m[1].padStart(2,"0")}; }
    return {ok:false};
  }
  function lesPerson(){
    var f = lesDato("sFodt"), d = lesDato("sDod");
    if(!f.ok || !d.ok){ return {feil:"Skriv datoer som 1878, 1878-10-01 eller 01.10.1878."}; }
    var fn = $("sFor").value.trim(); if(!fn){ return {feil:"Skriv minst fornavnet."}; }
    var p = {fornavn:fn, etternavn:$("sEtter").value.trim(), fodt:{dato:f.v, sted:$("sFodtSted").value.trim()}};
    if(d.v || $("sDodSted").value.trim() || $("sErDod").checked){ p.dod = {dato:d.v, sted:$("sDodSted").value.trim()}; }
    return {p:p};
  }
  function lesKilde(){
    var type = $("kType").value, tittel = $("kTittel").value.trim(), lenke = $("kLenke").value.trim();
    if(!tittel){ return {feil:type === "muntlig" ? "Skriv hvem som fortalte det, for eksempel «Fortalt av mor, 2026»." : "Skriv hvilken kilde det er."}; }
    if(lenke && !/^https?:\/\//i.test(lenke)){ return {feil:"Lenken må begynne med https://"}; }
    if(type === "dna" && !$("kSamtykke").checked){ return {feil:"Et DNA-treff kan bare legges inn når begge parter har sagt ja."}; }
    var k = {type:type, tittel:tittel, lenke:lenke || null, avskrift:$("kAvs").value.trim(), hvem:"Du", naar:idag()};
    if(type === "kirkebok" || type === "folketelling"){ k.primar = true; k.ki = false; k.kontrollert = $("kLest").checked; }
    if(type === "dna"){ k.samtykke = true; }
    return {k:k};
  }
  function lagreSkjema(){
    var sk = S.skjema, svar = $("skjemaSvar");
    if(sk.type === "person"){
      var r1 = lesPerson(); if(r1.feil){ svar.textContent = r1.feil; return; }
      var p = P[sk.id]; p.fornavn = r1.p.fornavn; p.etternavn = r1.p.etternavn; p.fodt = r1.p.fodt; if(r1.p.dod){ p.dod = r1.p.dod; } else { delete p.dod; }
      loggFor("Endret " + navnPa(p), "");
    } else if(sk.type === "forelder"){
      var fid = $("sFinnes") ? $("sFinnes").value : "", rk = lesKilde();
      if(rk.feil){ svar.textContent = rk.feil; return; }
      if(!fid){ var r2 = lesPerson(); if(r2.feil){ svar.textContent = r2.feil; return; } fid = nyId(); r2.p.id = fid; P[fid] = r2.p; }
      if(linkFor(sk.barn, fid)){ svar.textContent = "Den koblingen finnes allerede."; return; }
      L.push({id:lid(sk.barn, fid), barn:sk.barn, forelder:fid, rolle:sk.rolle, begrunnelse:$("sBegr").value.trim(), kilder:[rk.k]});
      loggFor("La inn " + navnPa(P[fid]) + " som " + sk.rolle + " til " + navnPa(P[sk.barn]), "Kilde: " + rk.k.tittel);
    } else if(sk.type === "kilde"){
      var rk2 = lesKilde(); if(rk2.feil){ svar.textContent = rk2.feil; return; }
      var l = L.filter(function(x){ return x.id === sk.link; })[0]; l.kilder.push(rk2.k);
      loggFor("La til kilde for " + navnPa(P[l.forelder]) + " og " + navnPa(P[l.barn]), rk2.k.tittel);
      $("skjema-kort").hidden = true; S.skjema = null; visAlt(); visDetalj(l.id); return;
    }
    $("skjema-kort").hidden = true; S.skjema = null; visAlt();
    $("tre-kort").scrollIntoView({behavior:"smooth"});
  }
  var EKS_GED = [
    "0 HEAD","1 SOUR Eksempel","1 GEDC","2 VERS 5.5.1","1 CHAR UTF-8",
    "0 @I1@ INDI","1 NAME Johan /Eksempelsen/","1 SEX M","1 BIRT","2 DATE 20 JUN 1915","2 PLAC Nordreisa, Troms, Norge","1 DEAT","2 DATE 14 JAN 1990","1 FAMS @F1@","1 FAMC @F2@",
    "0 @I2@ INDI","1 NAME Marie /Nilsen/","1 SEX F","1 BIRT","2 DATE 2 MAR 1919","2 PLAC Kvænangen","1 DEAT","2 DATE 5 NOV 2004","1 FAMS @F1@",
    "0 @I3@ INDI","1 NAME Hans /Eksempelsen/","1 SEX M","1 BIRT","2 DATE ABT 1912","2 PLAC Nordreisa","1 DEAT","2 DATE 1977","1 FAMC @F2@","1 FAMS @F3@",
    "0 @I4@ INDI","1 NAME Ole Johansen /Eksempelsen/","1 SEX M","1 BIRT","2 DATE 1876","2 PLAC Nordreisa","1 DEAT","2 DATE 1951","1 FAMS @F2@",
    "0 @I5@ INDI","1 NAME Anna /Olsdatter/","1 SEX F","1 BIRT","2 DATE 15 JAN 1882","1 DEAT","2 DATE 1946","1 FAMS @F2@",
    "0 @I6@ INDI","1 NAME Elise /Berg/","1 SEX F","1 BIRT","2 DATE 1914","2 PLAC Skjervøy","1 DEAT","2 DATE 1999","1 FAMS @F3@",
    "0 @I7@ INDI","1 NAME Kari /Eksempelsen/","1 SEX F","1 BIRT","2 DATE 1949","2 PLAC Nordreisa","1 FAMC @F3@",
    "0 @I8@ INDI","1 NAME Per /Eksempelsen/","1 SEX M","1 BIRT","2 DATE 3 FEB 1948","1 DEAT","2 DATE 2019","1 FAMC @F1@",
    "0 @F1@ FAM","1 HUSB @I1@","1 WIFE @I2@","1 CHIL @I8@",
    "0 @F2@ FAM","1 HUSB @I4@","1 WIFE @I5@","1 CHIL @I1@","1 CHIL @I3@",
    "0 @F3@ FAM","1 HUSB @I3@","1 WIFE @I6@","1 CHIL @I7@",
    "0 TRLR"].join("\n");

  /* ---------- Profilen fra Min dag ---------- */
  function brukProfil(){
    var p = window.MegKonto && window.MegKonto.profil;
    if(p && (p.navn || p.aar)){
      S.fraProfil = true;
      var fodt = {dato: p.aar ? p.aar + "-" + String(p.mnd || 1).padStart(2,"0") + "-" + String(p.dag || 1).padStart(2,"0") : null, sted: p.sted || ""};
      [EKS_P.du, P.du].forEach(function(du){ du.fornavn = p.navn || "Du"; du.etternavn = ""; du.fodt = {dato:fodt.dato, sted:fodt.sted}; });
      lagreEgen();
    }
  }

  /* ---------- Klikk ---------- */
  document.addEventListener("click", function(e){
    var t = e.target.closest("button"); if(!t){ return; }
    if(t.dataset.link){ visDetalj(t.dataset.link); return; }
    if(t.dataset.som){ S.somAndre = t.dataset.som === "andre"; visTre(); return; }
    if(t.dataset.modus){ byttModus(t.dataset.modus); return; }
    if(t.dataset.nyforelder){ var nf = t.dataset.nyforelder.split(":"); visSkjema({type:"forelder", barn:nf[0], rolle:nf[1]}); return; }
    if(t.dataset.endre){ visSkjema({type:"person", id:t.dataset.endre}); return; }
    if(t.dataset.nykilde){ visSkjema({type:"kilde", link:t.dataset.nykilde}); return; }
    if(t.id === "lagreSkjema"){ lagreSkjema(); return; }
    if(t.id === "avbrytSkjema"){ $("skjema-kort").hidden = true; S.skjema = null; return; }
    if(t.id === "slettPerson"){
      var sid = S.skjema.id, sn = navnPa(P[sid]);
      if(!window.confirm("Fjerne " + sn + " og alle koblingene til personen fra treet ditt?")){ return; }
      delete P[sid]; for(var i = L.length - 1; i >= 0; i--){ if(L[i].barn === sid || L[i].forelder === sid){ L.splice(i, 1); } }
      $("skjema-kort").hidden = true; S.skjema = null; loggFor("Fjernet " + sn + " fra treet", ""); visAlt(); return;
    }
    if(t.dataset.fjernlink){
      var fl = L.filter(function(x){ return x.id === t.dataset.fjernlink; })[0]; if(!fl){ return; }
      if(!window.confirm("Fjerne koblingen mellom " + navnPa(P[fl.forelder]) + " og " + navnPa(P[fl.barn]) + "? Personene blir liggende i treet.")){ return; }
      L.splice(L.indexOf(fl), 1); $("detalj").hidden = true; loggFor("Fjernet koblingen mellom " + navnPa(P[fl.forelder]) + " og " + navnPa(P[fl.barn]), ""); visAlt(); return;
    }
    if(t.id === "leggInn"){ leggInnImport(); return; }
    if(t.id === "lastNed"){ lastNed(); return; }
    if(t.id === "tomTre"){
      if(!window.confirm("Slette hele treet ditt fra denne enheten? Det kan ikke angres. Ta ut en GEDCOM-fil først hvis du vil ta vare på det.")){ return; }
      try{ localStorage.removeItem(NOKKEL); }catch(e){} EGEN = null; byttModus("egen"); return;
    }
    if(t.dataset.stem){
      var o = linkFor("ole","olefar").omstridt;
      if(S.minStemme){ o.stemmer[S.minStemme]--; }
      if(S.minStemme === t.dataset.stem){ S.minStemme = null; loggFor("Trakk stemmen sin om Oles far", ""); }
      else { S.minStemme = t.dataset.stem; o.stemmer[t.dataset.stem]++; loggFor("Stemte rådgivende for " + (t.dataset.stem === "a" ? o.versjoner[0].navn : o.versjoner[1].navn) + " som Oles far", "Endrer bare hvilken versjon som vises først."); }
      visAlt(); return;
    }
    if(t.id === "sendInnlegg"){
      var tx = $("nyttInnlegg").value.trim(), kl = $("nyKilde").value.trim(); if(!tx){ $("nyttInnlegg").focus(); return; }
      linkFor("ole","olefar").omstridt.innlegg.push({hvem:"Du", tekst:tx, kilde:kl || null});
      loggFor("Skrev et innlegg om Oles far", kl ? "Med kilde: " + kl : "Uten kilde"); visAlt(); return;
    }
    if(t.dataset.kikontroll){
      var deler = t.dataset.kikontroll.split(":"), g = $("kiGrunn-" + deler[1]).value.trim();
      if(!g){ $("kiSvar-" + deler[1]).textContent = "Skriv kort hva du sjekket først."; $("kiGrunn-" + deler[1]).focus(); return; }
      var l = null; L.forEach(function(x){ if(x.id === deler[0]){ l = x; } });
      var k = l.kilder[+deler[1]], varKi = k.ki; k.kontrollert = true; k.hvem = "Du, lest mot bildet" + (varKi ? " (forslag fra KI)" : ""); k.naar = idag();
      loggFor("Leste " + (varKi ? "KI-avskriften" : "avskriften") + " av «" + k.tittel + "» mot bildet", g); visAlt(); return;
    }
    if(t.id === "lagreBegr"){
      var dl = $("detalj").dataset.link, lb = null; L.forEach(function(x){ if(x.id === dl){ lb = x; } });
      var nb = $("begr").value.trim(); if(!nb){ $("begrSvar").textContent = "Skriv en begrunnelse først."; return; }
      lb.begrunnelse = nb; loggFor("Skrev konklusjon for " + navnPa(P[lb.forelder]) + " og " + navnPa(P[lb.barn]), nb); visAlt(); $("begrSvar").textContent = "Lagret i loggen."; return;
    }
    if(t.id === "inviter"){ $("invSvar").textContent = "I den ekte modulen får personen en invitasjon og ser profilen sin før noen andre gjør det. I dette utkastet sendes ingenting."; return; }
    if(t.dataset.fiks){
      var m = motsigelser().filter(function(x){ return x.id === t.dataset.fiks; })[0];
      if(m){ var p = P[m.kildeFiks.person], gl = aar(p.fodt); p.fodt.dato = m.kildeFiks.aar + p.fodt.dato.slice(4); loggFor("Endret fødselsåret til " + navnPa(p) + " fra " + gl + " til " + m.kildeFiks.aar, "Bruker årstallet fra kilden."); visAlt(); }
      return;
    }
    if(t.dataset.visign){ var bx = document.querySelector('[data-ignboks="' + t.dataset.visign + '"]'); bx.hidden = false; $("ign-" + t.dataset.visign).focus(); return; }
    if(t.dataset.ign){
      var id = t.dataset.ign, v = $("ign-" + id).value.trim();
      if(!v){ document.querySelector('[data-ignsvar="' + id + '"]').textContent = "Skriv hvorfor først, så andre i familien ser det."; return; }
      var mm = motsigelser().filter(function(x){ return x.id === id; })[0];
      S.ignorert[id] = v; loggFor("Lot motsigelsen «" + (mm ? mm.type : id) + "» stå", v); visAlt(); return;
    }
    if(t.dataset.dupl){ var dd = t.dataset.dupl.split(":"); IMP.avgj[+dd[0]] = dd[1]; visImport(); return; }
    if(t.id === "gedEks"){ importer(EKS_GED, "eksempelfil"); return; }
  });
  $("gedFil").addEventListener("change", function(){
    var f = this.files && this.files[0]; if(!f){ return; }
    if(f.size > 20 * 1024 * 1024){ $("importUt").innerHTML = '<p class="svar">Fila er større enn 20 MB. Del den opp eller ta ut en mindre del av treet.</p>'; return; }
    var r = new FileReader(); r.onload = function(){ importer(r.result, f.name); }; r.readAsText(f);
  });

  function start(){
    var m = "eks"; try{ m = localStorage.getItem("slekt-modus") || "eks"; }catch(e){}
    if(/[?&]tre=egen/.test(location.search)){ m = "egen"; }
    visMerkeliste(); byttModus(m);
  }
  start();
  document.addEventListener("megkonto", function(){ brukProfil(); visAlt(); });
  document.addEventListener("megkonto-klar", function(){ brukProfil(); visAlt(); });
})();
