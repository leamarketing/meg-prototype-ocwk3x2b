/* Slektsgransking i Min dag: klikkbart utkast med OPPDIKTEDE eksempeldata (21.11.2026).
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
  var P = {
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
  var L = [
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
  var GEN = [["du"], ["per","mor"], ["johan","marie","anders","ingrid"], ["ole","anna"], ["olefar"]];
  var GENNAVN = ["Deg", "Foreldre", "Besteforeldre", "Oldeforeldre", "Tippoldeforeldre"];

  var S = { valgt:null, somAndre:false, minStemme:null, ignorert:{}, fraProfil:false,
    logg:[
      {hvem:"Min dag (KI)", naar:"2026-11-20", hva:"Foreslo avskrift av dåpen til Johan, 1915", hvorfor:"Kirkebokside funnet ved søk på navn og sted. Ikke kontrollert av et menneske."},
      {hvem:"Kari (eksempel)", naar:"2026-11-02", hva:"La til folketellingen 1891 på Oles far, og merket koblingen omstridt", hvorfor:"Ole står som pleiesønn hos Peder, mens bygdeboka sier Lars."},
      {hvem:"Kari (eksempel)", naar:"2026-10-12", hva:"Leste dåpen til Johan mot bildet og bekreftet Anna som mor", hvorfor:"Avskriften stemmer med bildet i Digitalarkivet."},
      {hvem:"Nils (eksempel)", naar:"2026-09-30", hva:"La til to bygdebøker som kilde", hvorfor:"Funnet på Nasjonalbiblioteket."}
    ]};
  function idag(){ var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); }
  function loggFor(hva, hvorfor){ S.logg.unshift({hvem:"Du", naar:idag(), hva:hva, hvorfor:hvorfor}); visLogg(); }

  /* ---------- Hjelpere ---------- */
  function aar(d){ return d && d.dato ? +String(d.dato).slice(0,4) : null; }
  function dt(d){ return d && d.dato ? new Date(d.dato + "T12:00:00") : null; }
  function levende(p){ return !p.omstridt && !p.dod && aar(p.fodt) && aar(p.fodt) > IAAR - 110; }
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
    return (f ? "f. " + f : "") + (d ? ", d. " + d : (levende(p) ? ", lever" : "")) + (p.fodt && p.fodt.sted ? " · " + p.fodt.sted : "");
  }

  /* ---------- Motsigelser ---------- */
  function motsigelser(){
    var ut = [];
    L.forEach(function(l){
      var b = P[l.barn], f = P[l.forelder];
      if(!b || !f || f.omstridt){ return; }
      if(S.fraProfil && (l.barn === "du" || l.forelder === "du")){ return; } /* ekte profil mot oppdiktede foreldre: sjekkes ikke */
      var bf = dt(b.fodt), ff = dt(f.fodt), fd = dt(f.dod);
      if(bf && ff){
        var alder = (bf - ff) / 31557600000;
        if(alder < 0){ ut.push({id:"eldre-"+l.id, type:"Barn er eldre enn forelder", personer:[b.id,f.id], tekst: navnPa(b) + " er født før " + navnPa(f) + "."}); }
        else if(alder < 14){ ut.push({id:"ung-"+l.id, type:"Forelder veldig ung", personer:[b.id,f.id], tekst: navnPa(f) + " var " + Math.floor(alder) + " år da " + navnPa(b) + " ble født."}); }
        else if(l.rolle === "mor" && alder > 55){ ut.push({id:"gammel-"+l.id, type:"Mor i veldig høy alder", personer:[b.id,f.id], tekst: navnPa(f) + " var " + Math.floor(alder) + " år da " + navnPa(b) + " ble født."}); }
      }
      if(bf && fd){
        var dager = (bf - fd) / 86400000;
        if(l.rolle === "mor" && dager > 0){ ut.push({id:"etterdod-"+l.id, type:"Barn født etter at mor døde", personer:[b.id,f.id], tekst: navnPa(b) + " er født etter at " + navnPa(f) + " døde."}); }
        if(l.rolle === "far" && dager > 280){ ut.push({id:"etterdod-"+l.id, type:"Barn født mer enn 9 måneder etter at far døde", personer:[b.id,f.id],
          tekst: navnPa(f) + " døde " + f.dod.dato.split("-").reverse().join(".") + ", og " + navnPa(b) + " er født " + b.fodt.dato.split("-").reverse().join(".") + ". Det er " + Math.round(dager/30.4) + " måneder."}); }
      }
    });
    Object.keys(P).forEach(function(k){ var p = P[k]; if(p.fodt && p.dod && dt(p.dod) < dt(p.fodt)){ ut.push({id:"dod-"+k, type:"Død før fødsel", personer:[k], tekst: navnPa(p) + " har dødsdato før fødselsdato."}); } });
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
    var off = S.somAndre, h = "";
    h += '<div class="knapper" role="group" aria-label="Vis treet som"><button type="button" class="' + (off ? "lys" : "") + '" data-som="meg" aria-pressed="' + (!off) + '">Slik du ser det</button>' +
         '<button type="button" class="' + (off ? "" : "lys") + '" data-som="andre" aria-pressed="' + off + '">Slik andre i familien ser det</button></div>';
    GEN.forEach(function(rad, gi){
      h += '<p class="gen">' + GENNAVN[gi] + '</p><div class="rad">';
      rad.forEach(function(id){
        var p = P[id], l = linkTilForelder(id), privat = levende(p) && id !== "du";
        h += '<div class="person' + (l && S.valgt === l.id ? " valgt" : "") + '">';
        h += '<span class="navn">' + esc(navnPa(p, off)) + (privat && !off ? ' <span class="small" title="Privat">🔒</span>' : "") + '</span>';
        h += '<span class="aar">' + esc(aarTekst(p, off)) + '</span>';
        if(id === "du"){ h += '<span class="rel">' + (S.fraProfil ? "Hentet fra profilen din" : "Eksempel. Logg inn, så hentes navn og fødselsdato fra profilen din.") + '</span>'; }
        if(l){
          var m = linkMerke(l);
          h += '<span class="rel">' + (l.rolle === "far" ? "Far" : "Mor") + ' til ' + esc(barnNavn(P[l.barn], off)) + '</span>';
          h += merkeHtml(m.m, m.t, true, 'data-link="' + l.id + '" aria-label="Kilder for koblingen: ' + esc(m.t) + '"');
        }
        if(privat && !off){ h += '<span class="rel">Privat: bare du ser full informasjon.</span>'; }
        h += '</div>';
      });
      h += '</div>';
    });
    $("tre").innerHTML = h;
    var p = P.du;
    $("duInfo").textContent = S.fraProfil
      ? "Du står først i treet med navn og fødselsdato fra profilen din. Familien over deg er oppdiktet eksempel."
      : "Ikke innlogget: «Du» er et eksempel. Logg inn i Min dag, så hentes navn, fødselsdato og fødested fra profilen din.";
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
    if(k.lenke){ h += '<p class="small"><a href="' + esc(k.lenke) + '" target="_blank" rel="noopener">Åpne kilden</a> (eksempel: går til forsiden, ikke et ekte oppslag)</p>'; }
    if(k.ki && !k.kontrollert){ h += '<p><span class="ki">KI-lest, ikke kontrollert</span></p>'; }
    if(k.avskrift){ h += '<div class="avs">' + esc(k.avskrift) + '</div>'; }
    h += '<p class="small">Lagt inn av ' + esc(k.hvem) + ', ' + esc(k.naar.split("-").reverse().join(".")) + (k.samtykke ? ". Begge parter har samtykket til at treffet vises." : "") + '</p>';
    if(k.ki && !k.kontrollert){
      h += '<p class="small">KI har lest håndskriften og foreslått avskriften. Sammenlign med bildet i kilden før du godkjenner. Merket endres ikke før et menneske har gjort det.</p>' +
           '<label class="small" for="kiGrunn">Hva sjekket du? (kreves)</label><input type="text" id="kiGrunn" placeholder="For eksempel: navn og datoer stemmer med bildet">' +
           '<div class="knapper"><button type="button" data-kikontroll="' + l.id + ":" + i + '">Jeg har lest avskriften mot bildet</button></div><p id="kiSvar" class="svar" role="status"></p>';
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
      h += '<div class="kilde"><p><strong>Levende person, privat.</strong> Bare du som la henne inn, og hun selv, ser full informasjon. Andre ser «Levende person · ' + esc(f.etternavn) + '».</p>' +
           '<div class="knapper"><button type="button" id="inviter">Inviter ' + esc(f.fornavn) + ' til å se og godkjenne profilen sin</button></div><p id="invSvar" class="svar" role="status"></p></div>';
    }
    h += '<h3>Bevis-sjekkliste</h3>' + sjekkliste(l);
    if(l.omstridt){ h += omstridtHtml(l); }
    h += '<h3>Kilder</h3>' + l.kilder.map(function(k, i){ return kildeHtml(l, k, i); }).join("");
    h += '<h3>Konklusjon og begrunnelse</h3><p class="small">Skriv kort hvorfor koblingen er riktig, så andre kan vurdere det. Endringen kommer i loggen.</p>' +
         '<textarea id="begr" aria-label="Begrunnelse">' + esc(l.begrunnelse) + '</textarea><div class="knapper"><button type="button" id="lagreBegr">Lagre begrunnelsen</button></div><p id="begrSvar" class="svar" role="status"></p>';
    $("detaljInnhold").innerHTML = h;
    var d = $("detalj"); d.hidden = false; d.dataset.link = id;
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
      if(!t.omstridt && t.id !== "du" && p.fodt && p.fodt.aar === aar(t.fodt) && norm(p.navn).split(" ")[0] === norm(t.fornavn) && norm(p.navn).indexOf(norm(t.etternavn).split(" ")[0]) !== -1){ dupl.push({imp:p, tre:t}); }
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
    h += ferdig ? '<p class="svar">Importen kan fortsette. I dette utkastet legges ingenting inn i treet, og fila er ikke lagret noe sted.</p>' : "";
    h += '<details><summary>Personer i fila</summary><table><thead><tr><th>Navn</th><th>Født</th><th>Merke</th></tr></thead><tbody>' +
      alle.slice(0, 60).map(function(p){ var lv = lev.indexOf(p) !== -1;
        return '<tr><td>' + esc(p.navn || "(uten navn)") + (lv ? ' <span class="small">🔒 levende, privat</span>' : "") + '</td><td>' + esc(p.fodt && p.fodt.aar ? p.fodt.aar : "Mangler") + (p.fodt && p.fodt.sted ? ", " + esc(p.fodt.sted) : "") + '</td><td>' + merkeHtml("imp", "Importert") + '</td></tr>'; }).join("") +
      '</tbody></table>' + (alle.length > 60 ? '<p class="small">Viser de første 60 av ' + alle.length + '.</p>' : "") + '</details>';
    IMP.dupl = dupl;
    ut.innerHTML = h;
  }
  function importer(tekst, navn){ IMP = lesGedcom(tekst); IMP.avgj = {}; IMP.navn = navn; visImport(); }
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
      P.du.fornavn = p.navn || "Du"; P.du.etternavn = "";
      P.du.fodt = {dato: p.aar ? p.aar + "-" + String(p.mnd || 1).padStart(2,"0") + "-" + String(p.dag || 1).padStart(2,"0") : null, sted: p.sted || ""};
    }
  }

  /* ---------- Klikk ---------- */
  document.addEventListener("click", function(e){
    var t = e.target.closest("button"); if(!t){ return; }
    if(t.dataset.link){ visDetalj(t.dataset.link); return; }
    if(t.dataset.som){ S.somAndre = t.dataset.som === "andre"; visTre(); return; }
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
      var g = $("kiGrunn").value.trim(), deler = t.dataset.kikontroll.split(":");
      if(!g){ $("kiSvar").textContent = "Skriv kort hva du sjekket først."; $("kiGrunn").focus(); return; }
      var l = null; L.forEach(function(x){ if(x.id === deler[0]){ l = x; } });
      var k = l.kilder[+deler[1]]; k.kontrollert = true; k.hvem = "Du, lest mot bildet (forslag fra KI)"; k.naar = idag();
      loggFor("Leste KI-avskriften av «" + k.tittel + "» mot bildet", g); visAlt(); return;
    }
    if(t.id === "lagreBegr"){
      var dl = $("detalj").dataset.link, lb = null; L.forEach(function(x){ if(x.id === dl){ lb = x; } });
      var nb = $("begr").value.trim(); if(!nb){ $("begrSvar").textContent = "Skriv en begrunnelse først."; return; }
      lb.begrunnelse = nb; loggFor("Skrev konklusjon for " + navnPa(P[lb.forelder]) + " og " + navnPa(P[lb.barn]), nb); visAlt(); $("begrSvar").textContent = "Lagret i loggen."; return;
    }
    if(t.id === "inviter"){ $("invSvar").textContent = "I den ekte modulen får hun en invitasjon og ser profilen sin før noen andre gjør det. I dette utkastet sendes ingenting."; return; }
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

  function start(){ brukProfil(); visMerkeliste(); visAlt(); }
  start();
  document.addEventListener("megkonto", function(){ brukProfil(); visAlt(); });
  document.addEventListener("megkonto-klar", function(){ brukProfil(); visAlt(); });
})();
