/* Sangene mine: morgensang, kveldssang og sang til noen (prototype, 20.11.2026).
   - Alt er frivillig: ingen sang lages før personen krysser av og trykker selv.
   - Sangteksten lages her på enheten fra enkle maler. Ingen KI og ingenting sendes ut.
   - Utkastet er bare tekst (demo). Den sungne versjonen skal senere lages med CloneVoice. Det er ikke koblet til ennå.
   - Horoskop og dagens tall brukes som tradisjon og inspirasjon, aldri som fakta, og gir ingen råd om helse.
   - Valgene lagres bare i nettleseren på denne enheten (nøkkelen "meg-sang"). De er helt atskilt fra stemmer og saker.
   - Strøm: ingen tidtakere, ingen løkker, ingen lyd som starter av seg selv. Alt skjer bare når personen trykker. */
(function(root, make){
  if(typeof module === "object" && module.exports){ module.exports = make(); }
  else { root.Sang = make(); }
})(typeof self !== "undefined" ? self : this, function(){
  "use strict";

  var MOTTAKERE = {
    "kjæreste": {ord:"kjære deg", kall:"min kjære", om:"deg som jeg er glad i"},
    "ektefelle": {ord:"du som går ved min side", kall:"min kjære", om:"livet vi har bygget"},
    "datter": {ord:"jenta mi", kall:"datter", om:"den dagen du kom til verden"},
    "sønn": {ord:"gutten min", kall:"sønn", om:"den dagen du kom til verden"},
    "mor": {ord:"mamma", kall:"mamma", om:"alt du har gitt meg"},
    "far": {ord:"pappa", kall:"pappa", om:"alt du har lært meg"},
    "barnebarn": {ord:"lille venn", kall:"barnebarnet mitt", om:"hvert smil du gir"},
    "venn": {ord:"gode venn", kall:"venn", om:"alt vi har delt"},
    "kollega": {ord:"gode kollega", kall:"kollega", om:"dagene vi har jobbet side om side"},
    "annen": {ord:"du", kall:"du", om:"det du betyr for meg"}
  };

  /* Sangtype: stemning, melodiforslag og faste linjer. Melodien er bare et forslag til den som lager den sungne versjonen. */
  var TYPER = {
    "vuggevise": {navn:"Rolig vuggevise", melodi:"Rolig, 3/4-takt, myk og lav", start:"Lukk dine øyne, natten er stille,", slutt:"sov nå så godt, du lille og snille.", kor:["Stjernene våker, månen er nær,", "{kall}, du er trygg her."]},
    "morgensang": {navn:"Glad morgensang", melodi:"Lett og lys, 4/4-takt, gitar og klapp", start:"Sola står opp over fjell og fjord,", slutt:"en ny dag venter, så stor og så god.", kor:["God morgen, {kall}, nå starter vi,", "dagen er din, og den er fri."]},
    "ballade": {navn:"Ballade", melodi:"Langsom, piano og strykere, stiger mot slutten", start:"Det er så mye jeg aldri fikk sagt,", slutt:"så nå legger jeg alt i denne sangen sakte.", kor:["Og {ord}, du skal vite det nå,", "du er lyset jeg alltid kan se på."]},
    "vise": {navn:"Vise", melodi:"Enkel vise, akustisk gitar, fortellende", start:"Jeg vil synge en vise om {ord},", slutt:"og visa er din, så lenge den lever."},
    "country": {navn:"Country", melodi:"Middels tempo, gitar, fele og lett trommer", start:"Langs en grusvei hjem en sommerkveld,", slutt:"så kjører vi videre, du og jeg, likevel.", kor:["Å {ord}, du er veien hjem,", "i hver eneste sang er du med igjen."]},
    "pop": {navn:"Pop", melodi:"Opptempo, synth og trommer, fengende refreng", start:"Hver gang jeg tenker på deg,", slutt:"så vet jeg at du er der for meg.", kor:["Det er deg, det er deg, {ord},", "det er deg som gjør dagen god."]}
  };

  /* Soltegn som tradisjon: ett ord til sangen. Ikke fakta. */
  var TEGNORD = {"Vær":"mot", "Tyr":"ro", "Tvilling":"nysgjerrighet", "Kreps":"omsorg", "Løve":"varme", "Jomfru":"klarhet",
    "Vekt":"balanse", "Skorpion":"dybde", "Skytte":"eventyrlyst", "Steinbukk":"utholdenhet", "Vannmann":"frihet", "Fisk":"drømmer"};
  var TALLORD = {1:"et nytt lite steg", 2:"samarbeid og lytting", 3:"å uttrykke deg", 4:"å bygge grunnmur", 5:"forandring", 6:"omsorg for de du er glad i",
    7:"ro og en stille stund", 8:"handlekraft", 9:"å gi noe videre", 11:"magefølelsen din", 22:"store planer som får føtter", 33:"omsorg i stort format"};

  function stor(s){ s = String(s || "").trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function fyll(linje, m){ return linje.replace(/\{(\w+)\}/g, function(_, k){ return m[k] != null ? m[k] : ""; }); }
  function velg(liste, frø){ return liste[Math.abs(frø) % liste.length]; }

  /* Hver linje i visningen starter med stor bokstav, slik sangtekster pleier. */
  /* Gjør den frie teksten om til korte sanglinjer: deler på punktum, komma, linjeskift og «og»,
     fjerner lange tankestreker, og beholder opptil seks biter på 2 til 9 ord. */
  function biter(tekst){
    var t = String(tekst || "").replace(/[\u2013\u2014]/g, ",").replace(/\s+/g, " ").trim();
    if(!t){ return []; }
    var deler = t.split(/[.!?;,\n]+| og /i).map(function(s){ return s.trim(); }).filter(Boolean);
    var ut = [];
    deler.forEach(function(s){
      var ord = s.split(" ");
      while(ord.length > 9){ ut.push(ord.splice(0, 7).join(" ")); }
      if(ord.length >= 2 || (ord.length === 1 && ord[0].length > 3)){ ut.push(ord.join(" ")); }
    });
    return ut.slice(0, 6).map(stor);
  }

  /* Sang til noen. inn = {mottaker, type, navn, tekst, frø}. Gir {tittel, melodi, deler:[{navn, linjer}]}. */
  function tilNoen(inn){
    var mt = MOTTAKERE[inn.mottaker] || MOTTAKERE.annen;
    var ty = TYPER[inn.type] || TYPER.vise;
    var navn = String(inn.navn || "").trim();
    var m = {ord: navn || mt.ord, kall: navn || mt.kall};
    var b = biter(inn.tekst), frø = inn.frø || 0;
    var fyllLinjer = ["og jeg husker {om}", "jeg bærer det med meg hver dag", "det er noe jeg aldri glemmer", "det varmer meg langt inn i hjertet"];
    var vers1 = [fyll(ty.start, m)];
    var vers2 = [];
    if(b.length){
      b.forEach(function(s, i){ (i < Math.ceil(b.length / 2) ? vers1 : vers2).push(s + ","); });
    } else {
      vers1.push(stor(fyll("{ord}, dette er sangen din,", m)));
    }
    vers1.push(fyll(velg(fyllLinjer, frø), {om: mt.om}) + ".");
    if(!vers2.length){ vers2.push(stor(fyll(velg(fyllLinjer, frø + 1), {om: mt.om})) + ","); }
    vers2.push(fyll(ty.slutt, m));
    var deler = [{navn:"Vers 1", linjer: vers1}];
    if(ty.kor){ deler.push({navn:"Refreng", linjer: ty.kor.map(function(l){ return stor(fyll(l, m)); })}); }
    deler.push({navn:"Vers 2", linjer: vers2});
    if(ty.kor){ deler.push({navn:"Refreng", linjer: ty.kor.map(function(l){ return stor(fyll(l, m)); })}); }
    var tittel = "En " + ty.navn.toLowerCase() + " til " + (navn || mt.kall);
    return {tittel: stor(tittel), melodi: ty.melodi, deler: deler};
  }

  /* Morgensang eller kveldssang ut fra det personen har lagt inn.
     inn = {tid:"morgen"|"kveld", type, navn, sol, maane, tall, fase, bruk:{navn,sol,maane,tall,fase}, frø}. */
  function dagsang(inn){
    var morgen = inn.tid !== "kveld", bruk = inn.bruk || {}, frø = inn.frø || 0;
    var ty = TYPER[inn.type] || (morgen ? TYPER.morgensang : TYPER.vuggevise);
    var navn = bruk.navn && inn.navn ? inn.navn : "venn";
    var m = {ord: navn, kall: navn};
    var v1 = [], v2 = [];
    if(morgen){
      v1.push(velg(["God morgen, " + navn + ", vinduet er lyst,", "Våkn opp, " + navn + ", dagen er her,", "Rist av deg natta, " + navn + ", nå er det dag,"], frø));
      if(bruk.fase && inn.fase){ v1.push("i går kveld sto himmelen med " + inn.fase.toLowerCase() + ","); }
      if(bruk.sol && inn.sol && TEGNORD[inn.sol]){ v1.push("du har " + TEGNORD[inn.sol] + " med deg fra " + inn.sol + ","); }
      v1.push("så ta det med deg ut i det blå.");
      if(bruk.tall && inn.tall && TALLORD[inn.tall]){ v2.push("Dagens tall er " + inn.tall + ", det handler om " + TALLORD[inn.tall] + ","); }
      if(bruk.maane && inn.maane && TEGNORD[inn.maane]){ v2.push("og månen gir litt " + TEGNORD[inn.maane] + " på veien,"); }
      v2.push(velg(["ett lite steg, så er du i gang,", "kaffen er varm, og dagen er lang,"], frø + 1));
      v2.push("og denne dagen er din egen sang.");
    } else {
      v1.push(velg(["Nå senker kvelden seg, " + navn + ",", "God kveld, " + navn + ", dagen er gått,", "Legg fra deg dagen, " + navn + ","], frø));
      if(bruk.fase && inn.fase){ v1.push("i kveld står himmelen med " + inn.fase.toLowerCase() + ","); }
      if(bruk.sol && inn.sol && TEGNORD[inn.sol]){ v1.push("med " + TEGNORD[inn.sol] + " fra " + inn.sol + " hviler du ut,"); }
      v1.push("det du fikk gjort, det holder i dag.");
      if(bruk.tall && inn.tall && TALLORD[inn.tall]){ v2.push("Dagens tall var " + inn.tall + ", om " + TALLORD[inn.tall] + ","); }
      if(bruk.maane && inn.maane && TEGNORD[inn.maane]){ v2.push("og månen i " + inn.maane + " gir " + TEGNORD[inn.maane] + " til natta,"); }
      v2.push(velg(["takk for det gode som dagen ga,", "pust ut, og la tankene gå,"], frø + 1));
      v2.push("i morgen er en ny dag å se fram til.");
    }
    var deler = [{navn:"Vers 1", linjer: v1}];
    if(ty.kor){ deler.push({navn:"Refreng", linjer: ty.kor.map(function(l){ return stor(fyll(l, m)); })}); }
    deler.push({navn:"Vers 2", linjer: v2});
    var tittel = (morgen ? "Morgensang" : "Kveldssang") + (bruk.navn && inn.navn ? " til " + inn.navn : "");
    return {tittel: tittel, melodi: ty.melodi, deler: deler};
  }

  /* ---------------- Visning på siden (bare i nettleseren) ---------------- */
  var KEY = "meg-sang";
  function les(){ try{ var s = localStorage.getItem(KEY); return s ? JSON.parse(s) : {}; }catch(e){ return {}; } }
  function lagre(v){ try{ localStorage.setItem(KEY, JSON.stringify(v)); }catch(e){} }
  function glem(){ try{ localStorage.removeItem(KEY); }catch(e){} }

  function vis(boks, sang){
    boks.textContent = "";
    var d = document;
    var hode = d.createElement("div"); hode.className = "card-head";
    var h = d.createElement("h4"); h.textContent = sang.tittel; hode.appendChild(h);
    var t = d.createElement("span"); t.className = "tag hyp"; t.textContent = "Utkast, demo"; hode.appendChild(t);
    boks.appendChild(hode);
    var mel = d.createElement("p"); mel.className = "muted"; mel.textContent = "Melodiforslag: " + sang.melodi + "."; boks.appendChild(mel);
    sang.deler.forEach(function(del){
      var b = d.createElement("p"); b.className = "lyr-h"; b.textContent = del.navn; boks.appendChild(b);
      var p = d.createElement("p"); p.className = "lyr";
      del.linjer.forEach(function(l, i){ if(i){ p.appendChild(d.createElement("br")); } p.appendChild(d.createTextNode(stor(l))); });
      boks.appendChild(p);
    });
    var n = d.createElement("p"); n.className = "note";
    n.textContent = "Dette er bare et tekstutkast, laget på enheten din fra enkle maler. Den ferdige, sungne versjonen kommer senere: sangene skal lages med CloneVoice, og det er ikke koblet til ennå. Ingenting er sendt noe sted.";
    boks.appendChild(n);
    boks.hidden = false;
  }

  /* person = {navn, sol, maane, tall, fase, egen}. Kalles én gang fra hovedskriptet i index.html. */
  function start(person){
    var $ = function(id){ return document.getElementById(id); };
    if(!$("sang-morgen")){ return; }
    var v = les();
    var frø = {morgen:0, kveld:0, til:0};

    $("sang-person").textContent = "Sangen bygger på " + (person.egen ? "det du har lagt inn: " : "eksempelpersonen: ") +
      person.navn + (person.sol ? ", soltegn " + person.sol : "") + (person.maane ? ", månetegn " + person.maane : "") +
      (person.tall ? ", dagens tall " + person.tall : "") + ".";

    /* Hent lagrede valg. Alt er av til personen selv slår det på. */
    $("sang-morgen").checked = !!v.morgen; $("sang-kveld").checked = !!v.kveld;
    if(v.morgenType){ $("sang-morgen-type").value = v.morgenType; }
    if(v.kveldType){ $("sang-kveld-type").value = v.kveldType; }
    if(v.stemme){ $("sang-stemme").value = v.stemme; }
    var bruk = v.bruk || {navn:true, sol:true, maane:true, tall:true, fase:true};
    document.querySelectorAll("#sang-bruk input").forEach(function(i){ i.checked = bruk[i.value] !== false; });
    if(v.til){ ["mottaker","type","navn","tekst"].forEach(function(k){ if(v.til[k] != null){ $("til-" + k).value = v.til[k]; } }); }

    function samle(){
      var b = {}; document.querySelectorAll("#sang-bruk input").forEach(function(i){ b[i.value] = i.checked; });
      return {morgen: $("sang-morgen").checked, kveld: $("sang-kveld").checked,
        morgenType: $("sang-morgen-type").value, kveldType: $("sang-kveld-type").value, stemme: $("sang-stemme").value, bruk: b,
        til: {mottaker: $("til-mottaker").value, type: $("til-type").value, navn: $("til-navn").value.slice(0, 40), tekst: $("til-tekst").value.slice(0, 400)}};
    }
    /* Knappene virker alltid (Geir 21.11.2026: ikke gi folk mer å gjøre). Avkrysningen gjelder bare om du vil ha en ny sang hver dag. */
    function oppdaterKnapper(){
      $("lag-morgen").disabled = false; $("rad-morgen").hidden = false;
      $("lag-kveld").disabled = false; $("rad-kveld").hidden = false;
      var på = $("sang-morgen").checked || $("sang-kveld").checked;
      $("sang-status").textContent = på ? (window.MegKonto && window.MegKonto.paKonto ? "Valget ditt er lagret på kontoen din." : "Valget ditt er lagret på denne enheten.") : "";
    }
    $("view-sang").addEventListener("change", function(e){
      if(e.target && e.target.id === "til-tekst"){ return; }
      lagre(samle()); oppdaterKnapper();
    });
    $("til-tekst").addEventListener("change", function(){ lagre(samle()); });
    oppdaterKnapper();

    /* Mine sangutkast: hvert utkast blir liggende til du fjerner det (maks 50, bare på denne enheten). */
    var UKEY = "meg-sang-utkast";
    function hentUtkast(){ try{ var x = JSON.parse(localStorage.getItem(UKEY) || "[]"); return Array.isArray(x) ? x : []; }catch(e){ return []; } }
    function lagreUtkast(l){ try{ localStorage.setItem(UKEY, JSON.stringify(l.slice(0, 50))); }catch(e){} visUtkast(); }
    function somTekst(s){ return s.tittel + "\n\n" + s.deler.map(function(d){ return d.navn + "\n" + d.linjer.map(stor).join("\n"); }).join("\n\n"); }
    function visUtkast(){
      var boks = $("mine-utkast"); if(!boks){ return; }
      var l = hentUtkast(); boks.textContent = "";
      $("mine-utkast-kort").hidden = !l.length;
      l.forEach(function(s, i){
        var det = document.createElement("details"); det.className = "utkast"; if(i === 0 && s.ny){ det.open = true; }
        var sum = document.createElement("summary"); sum.textContent = s.tittel + " · " + s.dato; det.appendChild(sum);
        var inn = document.createElement("div"); inn.className = "lyrics"; vis(inn, s); det.appendChild(inn);
        var rad = document.createElement("div"); rad.className = "row";
        var k = document.createElement("button"); k.type = "button"; k.textContent = "Kopier teksten";
        k.addEventListener("click", function(){ var t = somTekst(s); if(navigator.clipboard){ navigator.clipboard.writeText(t).then(function(){ k.textContent = "Kopiert"; }, function(){}); } });
        var f = document.createElement("button"); f.type = "button"; f.textContent = "Fjern";
        f.addEventListener("click", function(){ var x = hentUtkast(); x.splice(i, 1); lagreUtkast(x); });
        rad.appendChild(k); rad.appendChild(f); det.appendChild(rad);
        boks.appendChild(det);
      });
    }
    function nyttUtkast(sang){
      var l = hentUtkast().map(function(x){ delete x.ny; return x; });
      sang.ny = true; sang.dato = new Date().toLocaleDateString("nb-NO", {day: "numeric", month: "short"});
      l.unshift(sang); lagreUtkast(l);
      var k = $("mine-utkast-kort"); if(k){ k.scrollIntoView({behavior: "smooth", block: "start"}); }
    }
    visUtkast();

    function dag(tid){
      var s = samle(); lagre(s);
      nyttUtkast(dagsang({tid: tid, type: tid === "morgen" ? s.morgenType : s.kveldType, navn: person.navn, sol: person.sol,
        maane: person.maane, tall: person.tall, fase: person.fase, bruk: s.bruk, frø: frø[tid]++}));
    }
    $("lag-morgen").addEventListener("click", function(){ dag("morgen"); });
    $("lag-kveld").addEventListener("click", function(){ dag("kveld"); });

    $("til-form").addEventListener("submit", function(e){
      e.preventDefault();
      var s = samle(); lagre(s);
      if(!s.til.tekst.trim()){ $("til-msg").textContent = "Skriv noen ord om personen eller det du vil si, så lager vi et utkast av dem."; $("til-tekst").focus(); return; }
      $("til-msg").textContent = "";
      nyttUtkast(tilNoen({mottaker: s.til.mottaker, type: s.til.type, navn: s.til.navn, tekst: s.til.tekst, frø: frø.til++}));
    });

    $("sang-glem").addEventListener("click", function(){
      glem(); try{ localStorage.removeItem(UKEY); }catch(e){} visUtkast();
      ["sang-morgen","sang-kveld"].forEach(function(id){ $(id).checked = false; });
      $("til-tekst").value = ""; $("til-navn").value = "";
      ["ut-morgen","ut-kveld","ut-til"].forEach(function(id){ $(id).hidden = true; $(id).textContent = ""; });
      oppdaterKnapper();
      $("sang-status").textContent = (window.MegKonto && window.MegKonto.paKonto ? "Sangvalgene og teksten din er slettet fra enheten og kontoen." : "Sangvalgene og teksten din er slettet fra denne enheten.");
    });
  }

  return {tilNoen: tilNoen, dagsang: dagsang, biter: biter, start: start, glem: glem, MOTTAKERE: MOTTAKERE, TYPER: TYPER};
});
