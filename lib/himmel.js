/* Dagens himmel: felles beregninger for Min dag, Livet mitt og Oss to.
   Alt regnes ut i nettleseren med Astronomy Engine (MIT, lib/astronomy.browser.min.js). Ingenting sendes ut.
   Fakta: månefase, opplyst andel, hvilket tegn månen og sola står i (tropisk dyrekrets, 30 grader per tegn),
   og planeter som går baklengs (retrograd: tilsynelatende bevegelse sett fra jorda).
   Tradisjon: tolkningstekstene nederst. De er astrologisk tradisjon, ikke fakta, og gir ingen råd om helse. */
(function(root, make){
  if(typeof module === "object" && module.exports){ module.exports = make(require("astronomy-engine")); }
  else { root.Himmel = make(root.Astronomy); }
})(typeof self !== "undefined" ? self : this, function(A){
  "use strict";
  if(!A){ return null; }
  var SYN = 29.530588853;
  var TEGN = ["Vær","Tyr","Tvilling","Kreps","Løve","Jomfru","Vekt","Skorpion","Skytte","Steinbukk","Vannmann","Fisk"];
  var SYMBOL = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
  var PLANETER = [["Mercury","Merkur"],["Venus","Venus"],["Mars","Mars"],["Jupiter","Jupiter"],["Saturn","Saturn"],["Uranus","Uranus"],["Neptune","Neptun"],["Pluto","Pluto"]];

  /* Geosentrisk ekliptisk lengde (sann ekliptikk for datoen), 0 til 360 grader. */
  function lengde(body, date){ return A.Ecliptic(A.GeoVector(body, date, true)).elon; }
  function tegnFra(lon){ return Math.floor((((lon % 360) + 360) % 360) / 30); }

  /* Fasenavnet følger den opplyste andelen, slik at teksten aldri sier «Første kvarter» ved 32 %. */
  function fasenavn(pst, voksende){
    if(pst < 3){ return "Nymåne"; }
    if(pst > 97){ return "Fullmåne"; }
    if(pst >= 45 && pst <= 55){ return voksende ? "Første kvarter" : "Siste kvarter"; }
    if(pst < 45){ return voksende ? "Voksende månesigd" : "Minkende månesigd"; }
    return voksende ? "Voksende måne" : "Minkende måne";
  }

  function maane(date){
    var vinkel = A.MoonPhase(date);                       /* 0 = ny, 90 = første kvarter, 180 = full, 270 = siste kvarter */
    var pst = A.Illumination("Moon", date).phase_fraction * 100;
    var voksende = vinkel < 180;
    var t = tegnFra(lengde("Moon", date));
    return { vinkel: vinkel, pst: pst, prosent: Math.round(pst), voksende: voksende, navn: fasenavn(pst, voksende),
             alder: vinkel / 360 * SYN, tegn: TEGN[t], tegnNr: t, symbol: SYMBOL[t] };
  }

  /* Retrograd når den ekliptiske lengden minker fra et halvt døgn før til et halvt døgn etter. */
  function baklengs(date){
    var ms = date.getTime(), a = new Date(ms - 43200000), b = new Date(ms + 43200000), ut = [];
    PLANETER.forEach(function(p){
      var d = lengde(p[0], b) - lengde(p[0], a);
      if(d > 180){ d -= 360; } if(d < -180){ d += 360; }
      if(d < 0){ ut.push(p[1]); }
    });
    return ut;
  }

  function sol(date){ var t = tegnFra(lengde("Sun", date)); return { tegn: TEGN[t], tegnNr: t, symbol: SYMBOL[t] }; }

  function himmel(date){ date = date || new Date(); return { dato: date, maane: maane(date), sol: sol(date), baklengs: baklengs(date) }; }

  /* Sol- og månetegn for en fødselsdato uten klokkeslett. Vi sjekker hele døgnet (norsk tid, UTC+1 som standard):
     står tegnet likt fra 00:00 til 23:59, er det sikkert. Ellers vises begge, og at det avhenger av fødselstiden. */
  function fodsel(aar, mnd, dag, timer, utcOffset){
    var off = typeof utcOffset === "number" ? utcOffset : 1;
    function at(h, mi){ return new Date(Date.UTC(aar, mnd - 1, dag, h, mi) - off * 3600000); }
    function par(body){
      if(typeof timer === "number"){ var t = tegnFra(lengde(body, at(Math.floor(timer), Math.round((timer % 1) * 60)))); return { sikker: true, tegn: TEGN[t], tegnNr: t, symbol: SYMBOL[t], tekst: TEGN[t] }; }
      var a = tegnFra(lengde(body, at(0, 0))), b = tegnFra(lengde(body, at(23, 59)));
      if(a === b){ return { sikker: true, tegn: TEGN[a], tegnNr: a, symbol: SYMBOL[a], tekst: TEGN[a] }; }
      return { sikker: false, tegn: TEGN[a], tegnNr: a, symbol: SYMBOL[a], tegn2: TEGN[b], tekst: TEGN[a] + " eller " + TEGN[b] + " (avhenger av fødselstiden)" };
    }
    return { sol: par("Sun"), maane: par("Moon") };
  }

  /* ---- Tradisjon: egne korte tekster. Astrologisk tradisjon og inspirasjon, ikke fakta. Ingen helseråd. ---- */
  var TEGN_TRAD = ["mot og nye initiativ","ro, det trygge og gode måltider","samtaler og nysgjerrighet","hjem og familie","lek og skaperglede","orden og små detaljer","samarbeid og rettferdige avtaler","dybde og ærlige samtaler","reiser og store tanker","plikter og langsiktige mål","fellesskap og nye ideer","drømmer og innlevelse"];
  var PLANET_TRAD = { "Merkur":"dobbeltsjekke avtaler, beskjeder og reiser", "Venus":"tenke over relasjoner og hva du verdsetter", "Mars":"gå gjennom planer før du setter i gang", "Jupiter":"se innover før du utvider", "Saturn":"gå over ansvar og rutiner", "Uranus":"la nye ideer modne", "Neptun":"skille drøm fra virkelighet", "Pluto":"rydde i det gamle" };
  function tolkning(h){
    var m = h.maane;
    var linjer = [];
    linjer.push((m.voksende ? "Voksende måne regnes som en tid for å starte og bygge opp." : "Minkende måne regnes som en tid for å rydde og avslutte.") +
      " Månen i " + m.tegn + " forbindes med " + TEGN_TRAD[m.tegnNr] + ".");
    if(h.baklengs.indexOf("Merkur") > -1){ linjer.push("Når Merkur går baklengs, er tradisjonen å " + PLANET_TRAD["Merkur"] + "."); }
    else if(h.baklengs.length){ var p = h.baklengs[0]; linjer.push("Når " + p + " går baklengs, er tradisjonen å " + PLANET_TRAD[p] + "."); }
    return linjer.join(" ");
  }
  function kortLinje(h){
    var m = h.maane;
    return m.navn + " " + m.prosent + " %, månen i " + m.tegn + ", " + (h.baklengs.length ? liste(h.baklengs) + " går baklengs" : "ingen planeter går baklengs");
  }
  function liste(arr){ return arr.length < 2 ? arr.join("") : arr.slice(0, -1).join(", ") + " og " + arr[arr.length - 1]; }

  return { himmel: himmel, maane: maane, sol: sol, baklengs: baklengs, fodsel: fodsel, tolkning: tolkning, kortLinje: kortLinje,
           liste: liste, fasenavn: fasenavn, TEGN: TEGN, SYMBOL: SYMBOL, TEGN_TRAD: TEGN_TRAD, SYN: SYN };
});
