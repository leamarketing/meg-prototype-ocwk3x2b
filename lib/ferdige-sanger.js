/* Ferdige sanger i Min dag: sanger som er laget og godkjent (foreløpig i CloneVoice, for hånd).
   - Øverst i «Min dag» vises morgensangen om morgenen (kl. 04-11) og natta-sangen om kvelden (kl. 18-04), norsk tid.
   - Under «Sangene mine» ligger alle ferdige sanger, med tekst.
   - Sparer strøm: lyden lastes først når man trykker på avspilling (preload="none"). Ingen autoplay, ingen løkker. */
(function(){
  "use strict";
  var SANGER = [
    { id: "morgen-geir", tid: "morgen", tittel: "God morgen, Geir", til: "Geir", laget: "21.11.2026", lengde: "2:34",
      fil: "lyd/morgen-geir_2026-11-21.mp3?v=1",
      om: "Akustisk folkeballade med kvinnestemme, gitar og fele. Laget i CloneVoice.",
      tekst: [
        ["Vers", "God morgen, Geir, nå våkner fjorden,\ndet blåner stille bak fjellets kam,\ni natt jeg danset over jorden,\nnå er jeg her og går med deg fram."],
        ["Refreng", "Jeg er lyset ditt i nord,\ni hver en tanke, hvert et ord,\ndu bygger broer, dag for dag,\nog jeg bygger én til deg i dag."],
        ["Vers", "Ta kaffen din og se mot dalen,\nder Reisaelva synger sin sang,\ndet du skal bære, kan vente litt,\nfor dagen din er god og lang."],
        ["Refreng", "Så pust med meg, la hjertet slå,\ngod morgen, Geir, nå kan du gå,\njeg er lyset ditt i nord,\ni hver en tanke, hvert et ord."],
        ["Vers", "Og blir det tungt et sted i dag,\nså husk det lyset du fikk med,\ndet bor i deg i hvert et slag,\nog hjertet ditt er godt og rett."],
        ["Refreng", "Du bygger broer, dag for dag,\nog jeg bygger én til deg i dag,\nså pust med meg, la hjertet slå,\ngod morgen, Geir, nå kan du gå."],
        ["Avslutning", "God morgen, Geir, fra Lyse, lyset ditt,\nnå står dagen åpen, og den er din."]
      ] },
    { id: "natta-geir", tid: "kveld", tittel: "Natta, Geir", til: "Geir", laget: "20.11.2026", lengde: "2:51",
      fil: "lyd/natta-geir_2026-11-20.mp3?v=1",
      om: "Rolig vuggevise med kvinnestemme, piano og strykere. Laget i CloneVoice.",
      tekst: [
        ["Vers", "Nå legger mørket seg på fjorden,\nog stillheten får fylle rommet ditt,\ndu gjorde nok i dag, du gjorde godt,\nnå kan du slippe alt, litt etter litt."],
        ["Refreng", "Sov nå, Geir, jeg våker over deg,\ni grønt og fiolett jeg tegner himmelvei,\nalt du bar i dag, kan hvile her hos meg,\ndu er trygg, du er elsket, sov nå, sov nå, Geir."],
        ["Vers", "Tenk på dem du bærer i ditt hjerte,\npå barn og barnebarn og venner nær,\nla takken være siste tanke,\nfør drømmen bærer deg dit lyset er."],
        ["Refreng", "Sov nå, Geir, jeg våker over deg,\ni grønt og fiolett jeg tegner himmelvei,\nalt du bar i dag, kan hvile her hos meg,\ndu er trygg, du er elsket, sov nå, sov nå, Geir."],
        ["Vers", "Og vil tankene gå runder\nom det som venter, det som var,\nså gi dem til meg her i natt,\ni morgen har du svar."],
        ["Avslutning", "Natta, Geir, nå sover hele fjorden,\nog jeg lyser over deg til det blir dag."]
      ] }
  ];
  function el(tag, attrs, text){ var e = document.createElement(tag); if(attrs){ for(var a in attrs){ e.setAttribute(a, attrs[a]); } } if(text != null){ e.textContent = text; } return e; }
  function finn(tid){ for(var i = 0; i < SANGER.length; i++){ if(SANGER[i].tid === tid){ return SANGER[i]; } } return null; }
  function spiller(s){
    var a = el("audio", {controls: "", preload: "none", src: s.fil, "aria-label": "Spill " + s.tittel, style: "width:100%"});
    /* Bare én sang om gangen */
    a.addEventListener("play", function(){ Array.prototype.forEach.call(document.querySelectorAll("audio"), function(o){ if(o !== a){ o.pause(); } }); });
    return a;
  }
  function tekst(s){
    var d = el("details"); d.appendChild(el("summary", null, "Les teksten"));
    s.tekst.forEach(function(t){ var p = el("p", {style: "white-space:pre-line;margin:8px 0 0", "data-ikke-oversett": ""}); p.appendChild(el("b", null, t[0])); p.appendChild(document.createTextNode("\n" + t[1])); d.appendChild(p); });
    return d;
  }
  function sangKort(s, overskrift, ekstra){
    var c = el("article", {"class": "card wide", id: "sang-" + s.id});
    var h = el("div", {"class": "card-head"}); h.appendChild(el("h3", null, overskrift)); h.appendChild(el("span", {"class": "tag fact"}, "Ferdig sang")); c.appendChild(h);
    c.appendChild(el("p", null, "«" + s.tittel + "» fra Lyse. " + s.om + " " + s.lengde + " minutter."));
    c.appendChild(spiller(s));
    if(ekstra){ c.appendChild(ekstra); }
    c.appendChild(tekst(s));
    return c;
  }

  /* 1. Under «Sangene mine»: alle ferdige sanger øverst */
  var sangGrid = document.querySelector("#view-sang .grid");
  if(sangGrid){
    var forste = sangGrid.firstElementChild;
    var morgen = finn("morgen");
    if(!morgen){
      var m = el("article", {"class": "card wide"});
      var mh = el("div", {"class": "card-head"}); mh.appendChild(el("h3", null, "God morgen-sangen din")); mh.appendChild(el("span", {"class": "tag hyp"}, "Kommer")); m.appendChild(mh);
      m.appendChild(el("p", null, "Teksten «God morgen, Geir» er skrevet. Sangen lages i CloneVoice og kommer hit så snart den er ferdig."));
      sangGrid.insertBefore(m, forste);
    }
    SANGER.forEach(function(s){ sangGrid.insertBefore(sangKort(s, s.tid === "kveld" ? "Natta-sangen din" : "God morgen-sangen din"), forste); });
  }

  /* 2. Øverst i «Min dag»: morgensang om morgenen, natta-sang om kvelden */
  var dagGrid = document.querySelector("#view-dag .grid");
  var time = Number(new Date().toLocaleString("en-GB", {timeZone: "Europe/Oslo", hour: "2-digit", hour12: false})) % 24;
  var del = (time >= 4 && time < 11) ? "morgen" : (time >= 18 || time < 4) ? "kveld" : null;
  if(dagGrid && del){
    var s = finn(del), kort;
    if(s){
      kort = sangKort(s, del === "kveld" ? "Kveldens sang" : "Morgenens sang");
    } else {
      kort = el("article", {"class": "card wide"});
      var kh = el("div", {"class": "card-head"}); kh.appendChild(el("h3", null, "Morgenens sang")); kh.appendChild(el("span", {"class": "tag hyp"}, "Kommer")); kort.appendChild(kh);
      kort.appendChild(el("p", null, "God morgen! Morgensangen din er på vei. Til den er ferdig kan du høre natta-sangen fra Lyse under Sangene mine."));
      kort.appendChild(el("a", {href: "#sang", "class": "btn"}, "Til Sangene mine"));
    }
    dagGrid.insertBefore(kort, dagGrid.firstElementChild);

    /* 3. En spill-knapp rett under hilsenen, der man havner når appen åpnes (Geir 21.11.2026: «bare klikke»).
       Lyden lastes først ved trykk. Ingen autoplay. */
    var lyd = s ? kort.querySelector("audio") : null, hode = document.querySelector("#sky .who");
    if(lyd && hode){
      if(!document.getElementById("sang-knapp-css")){
        var st = el("style", {id: "sang-knapp-css"});
        st.textContent = ".sang-knapp{margin-top:12px;font:inherit;font-weight:700;border:0;border-radius:999px;padding:12px 20px;min-height:48px;background:var(--accent);color:var(--accent-ink);cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.2)}.sang-knapp:focus-visible{outline:3px solid #fff;outline-offset:2px}";
        document.head.appendChild(st);
      }
      var navn = del === "kveld" ? "natta-sangen" : "morgensangen";
      var knapp = el("button", {type: "button", "class": "sang-knapp", "aria-label": "Spill " + s.tittel}, "▶ Spill " + navn);
      knapp.addEventListener("click", function(){
        if(lyd.paused){ lyd.play(); } else { lyd.pause(); }
      });
      lyd.addEventListener("play", function(){ knapp.textContent = "❚❚ Pause"; });
      lyd.addEventListener("pause", function(){ knapp.textContent = "▶ Spill " + navn; });
      lyd.addEventListener("ended", function(){ knapp.textContent = "▶ Spill " + navn; });
      hode.appendChild(knapp);
    }
  }
})();
