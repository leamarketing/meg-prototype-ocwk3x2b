/* Uka og måneden din: beregninger for kortet «Dagens himmel» (I dag, Uka, Måneden), stedet ditt og tallene dine.
   Alt regnes ut på enheten med Astronomy Engine (MIT, lib/astronomy.browser.min.js). Ingenting sendes ut.
   Fakta: månefaser, månens tegnskifter, når planeter begynner og slutter å gå baklengs, måneopp og månened,
   sola, høyde over horisonten, og hvor planetene står i forhold til sola ved fødselen (vinkelen).
   Tradisjon: tolkningstekstene for vinklene (transitter) og tallene (pytagoreisk numerologi). Ingen råd om helse.
   Strøm: bare rene funksjoner. Ingen tidtakere og ingen løkker i bakgrunnen; siden kaller dem når noe vises. */
(function(root, make){
  if(typeof module === "object" && module.exports){ module.exports = make(require("./astronomy.browser.min.js")); }
  else { root.Uka = make(root.Astronomy); }
})(typeof self !== "undefined" ? self : this, function(A){
  "use strict";

  /* ---------------- Tallene dine (trenger ikke Astronomy Engine) ----------------
     Regel (samme som Medlemsportalen, portal/norge.js): legg sammen alle sifrene, og regn ned til ett siffer.
     11 og 22 beholdes som mestertall. 33 regnes ned (3+3 = 6). */
  function siffer(n){ return String(n).split("").map(Number); }
  function tverrsum(n){ return siffer(n).reduce(function(a, b){ return a + b; }, 0); }
  function regnNed(n){
    var steg = [];
    while(n > 9 && n !== 11 && n !== 22){ var s = siffer(n); n = tverrsum(n); steg.push(s.join("+") + " = " + n); }
    return { tall: n, steg: steg };
  }
  var MND = ["januar","februar","mars","april","mai","juni","juli","august","september","oktober","november","desember"];
  function del(navn, n){ return { navn: navn, siffer: siffer(n) }; }
  function regn(deler){
    var alle = [], tekst = [];
    deler.forEach(function(d){ alle = alle.concat(d.siffer); tekst.push(d.siffer.join("+") + " (" + d.navn + ")"); });
    var sum = alle.reduce(function(a, b){ return a + b; }, 0);
    var r = regnNed(sum);
    var linje = tekst.join(" + ") + " = " + sum;
    if(r.steg.length){ linje += ", " + r.steg.join(", "); }
    if(r.tall === 11 || r.tall === 22){ linje += ". " + r.tall + " er mestertall og beholdes"; }
    return { tall: r.tall, sum: sum, utregning: linje };
  }
  /* fd, fm: fødselsdag og fødselsmåned. aar, mnd, dag: datoen vi regner for. */
  function tallene(fd, fm, aar, mnd, dag){
    var pa = regn([del("fødselsdag", fd), del("fødselsmåned", fm), del("året " + aar, aar)]);
    var pm = regn([del("personlig år", pa.tall), del(MND[mnd - 1], mnd)]);
    var pd = regn([del("personlig måned", pm.tall), del("den " + dag + ".", dag)]);
    return { aar: pa, maaned: pm, dag: pd,
      regel: "Regel: vi legger sammen alle sifrene og regner ned til ett siffer. 11 og 22 er mestertall og beholdes, 33 regnes ned til 6. Personlig år = fødselsdag + fødselsmåned + året. Personlig måned = personlig år + måneden. Personlig dag = personlig måned + datoen. Samme regel som i Medlemsportalen." };
  }

  var ut = { tallene: tallene, regnNed: regnNed, tverrsum: tverrsum };
  if(!A){ return ut; }

  /* ---------------- Tid: norsk tid (Europe/Oslo), også ved sommertid ---------------- */
  var TZ = "Europe/Oslo";
  var fmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" });
  function deler(date){ var o = {}; fmt.formatToParts(date).forEach(function(p){ if(p.type !== "literal"){ o[p.type] = Number(p.value); } }); if(o.hour === 24){ o.hour = 0; } return o; }
  function avvikMin(date){ var p = deler(date); return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000) / 60000); }
  function midnatt(aar, mnd, dag){
    var g = Date.UTC(aar, mnd - 1, dag), o1 = avvikMin(new Date(g)), t = g - o1 * 60000, o2 = avvikMin(new Date(t));
    return new Date(o2 === o1 ? t : g - o2 * 60000);
  }
  function dagStart(date){ var p = deler(date); return midnatt(p.year, p.month, p.day); }
  function plussDager(date, n){ var p = deler(date), u = new Date(Date.UTC(p.year, p.month - 1, p.day + n)); return midnatt(u.getUTCFullYear(), u.getUTCMonth() + 1, u.getUTCDate()); }
  function maanedStart(date){ var p = deler(date); return midnatt(p.year, p.month, 1); }
  function nesteMaaned(date){ var p = deler(date); return p.month === 12 ? midnatt(p.year + 1, 1, 1) : midnatt(p.year, p.month + 1, 1); }
  function pad(n){ return (n < 10 ? "0" : "") + n; }
  function kl(date){ var p = deler(new Date(date.getTime() + 30000)); return pad(p.hour) + ":" + pad(p.minute); }
  var UKEDAG = ["søndag","mandag","tirsdag","onsdag","torsdag","fredag","lørdag"];
  function ukedagNr(date){ var p = deler(date); return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay(); }
  function datoTekst(date){ var p = deler(date); return UKEDAG[ukedagNr(date)] + " " + p.day + "." + p.month + "."; }
  function datoKort(date){ var p = deler(date); return UKEDAG[ukedagNr(date)].slice(0, 3) + " " + p.day + "." + p.month + "."; }
  function nokkel(date){ var p = deler(date); return p.year + "-" + pad(p.month) + "-" + pad(p.day); }

  /* ---------------- Grunnberegninger ---------------- */
  var TEGN = ["Vær","Tyr","Tvilling","Kreps","Løve","Jomfru","Vekt","Skorpion","Skytte","Steinbukk","Vannmann","Fisk"];
  var PLANETER = [["Mercury","Merkur"],["Venus","Venus"],["Mars","Mars"],["Jupiter","Jupiter"],["Saturn","Saturn"],["Uranus","Uranus"],["Neptune","Neptun"],["Pluto","Pluto"]];
  var TRANSITT = [["Sun","Sola"],["Mercury","Merkur"],["Venus","Venus"],["Mars","Mars"],["Jupiter","Jupiter"],["Saturn","Saturn"]];
  var DAG = 86400000;
  function lengde(body, date){ return A.Ecliptic(A.GeoVector(body, date, true)).elon; }
  function tegnNr(lon){ return Math.floor((((lon % 360) + 360) % 360) / 30); }
  function vinkel180(x){ x = ((x % 360) + 360) % 360; return x > 180 ? x - 360 : x; }
  function grader(lon){ var l = ((lon % 360) + 360) % 360; return Math.floor(l % 30) + "°"; }
  /* Finn tidspunktet der f skifter fortegn mellom a og b (f(a) og f(b) har ulikt fortegn), til under ett minutt. */
  function halver(f, a, b){
    var fa = f(a);
    for(var i = 0; i < 40 && b - a > 30000; i++){ var m = a + (b - a) / 2, fm = f(m); if((fm < 0) === (fa < 0)){ a = m; fa = fm; } else { b = m; } }
    return new Date(a + (b - a) / 2);
  }

  /* Månefaser i perioden [fra, til). */
  var FASE = ["Nymåne","Første kvarter (halvmåne)","Fullmåne","Siste kvarter (halvmåne)"];
  function faser(fra, til){
    var ut = [], q = A.SearchMoonQuarter(fra);
    while(q.time.date < til){ ut.push({ type: "fase", dato: q.time.date, nr: q.quarter, tekst: FASE[q.quarter] + " kl. " + kl(q.time.date) }); q = A.NextMoonQuarter(q); }
    return ut;
  }

  /* Når månen går inn i et nytt tegn (tropisk dyrekrets, 30 grader per tegn). Steg på to timer, så halvering. */
  function tegnskifter(fra, til){
    var ut = [], t = fra.getTime(), slutt = til.getTime(), steg = 2 * 3600000;
    var forrige = tegnNr(lengde("Moon", fra));
    while(t < slutt){
      var t2 = Math.min(t + steg, slutt), nr = tegnNr(lengde("Moon", new Date(t2)));
      if(nr !== forrige){
        var grense = (forrige + 1) % 12 * 30;
        var naar = halver(function(x){ return vinkel180(lengde("Moon", new Date(x)) - grense); }, t, t2);
        ut.push({ type: "tegn", dato: naar, tegn: TEGN[nr], tekst: "Månen går inn i " + TEGN[nr] + " kl. " + kl(naar) });
        forrige = nr;
      }
      t = t2;
    }
    return ut;
  }

  /* Fart: endring i ekliptisk lengde over ett døgn rundt tidspunktet. Negativ = går baklengs (retrograd). */
  function fart(body, ms){ return vinkel180(lengde(body, new Date(ms + DAG / 2)) - lengde(body, new Date(ms - DAG / 2))); }
  function baklengsSkifter(fra, til){
    var ut = [];
    PLANETER.forEach(function(p){
      var t = fra.getTime() - DAG, slutt = til.getTime() + DAG, f0 = fart(p[0], t);
      while(t < slutt){
        var t2 = t + DAG, f1 = fart(p[0], t2);
        if((f0 < 0) !== (f1 < 0)){
          var naar = halver(function(x){ return fart(p[0], x); }, t, t2);
          if(naar >= fra && naar < til){
            var starter = f1 < 0;
            ut.push({ type: "baklengs", dato: naar, planet: p[1], starter: starter,
              tekst: p[1] + (starter ? " begynner å gå baklengs" : " slutter å gå baklengs") + " (står nesten stille sett fra jorda rundt denne datoen)" });
          }
        }
        t = t2; f0 = f1;
      }
    });
    return ut;
  }

  /* Transitter: når en planet i dag står i en hovedvinkel til der sola sto da du ble født.
     Bare sola ved fødselen, så det blir få linjer. Uten fødselstid regnes sola kl. 12 (flytter seg om lag 1 grad per døgn). */
  var ASPEKT = [[0,"sammen med"],[60,"60° fra"],[90,"90° fra"],[120,"120° fra"],[180,"180° fra"]];
  var ASPEKT_NAVN = {0:"konjunksjon",60:"sekstil",90:"kvadrat",120:"trigon",180:"opposisjon"};
  var ASPEKT_TRAD = {0:"regnes dette som en tid der temaet får ekstra oppmerksomhet",60:"regnes dette som en liten åpning",90:"regnes dette som friksjon som kan gi driv",120:"regnes dette som en tid der ting går lettere",180:"regnes dette som en tid for å finne balanse"};
  var PLANET_TEMA = {"Sola":"deg selv og det du vil","Merkur":"samtaler og planer","Venus":"relasjoner og det du verdsetter","Mars":"tempo og handlekraft","Jupiter":"vekst og nye muligheter","Saturn":"ansvar og struktur"};
  function fodselsSol(aar, mnd, dag, timer, utcOffset){
    var off = typeof utcOffset === "number" ? utcOffset : 1, h = typeof timer === "number" ? timer : 12;
    var d = new Date(Date.UTC(aar, mnd - 1, dag, 0, 0) + (h - off) * 3600000);
    return lengde("Sun", d);
  }
  function transitter(fra, til, natalSol){
    var ut = [];
    TRANSITT.forEach(function(p){
      ASPEKT.forEach(function(a){
        [a[0], -a[0]].filter(function(v, i, arr){ return arr.indexOf(v) === i; }).forEach(function(vink){
          function f(x){ return vinkel180(lengde(p[0], new Date(x)) - natalSol - vink); }
          var t = fra.getTime() - DAG, slutt = til.getTime() + DAG, f0 = f(t);
          while(t < slutt){
            var t2 = t + DAG, f1 = f(t2);
            if((f0 < 0) !== (f1 < 0) && Math.abs(f0) < 30 && Math.abs(f1) < 30){
              var naar = halver(f, t, t2);
              if(naar >= fra && naar < til){
                var lon = lengde(p[0], naar);
                ut.push({ type: "transitt", dato: naar, planet: p[1], vinkel: a[0],
                  tekst: p[1] + " står " + a[1] + " der sola di sto da du ble født (" + ASPEKT_NAVN[a[0]] + "), " + (p[1] === "Sola" ? "sola" : p[1]) + " i " + TEGN[tegnNr(lon)] + " " + grader(lon),
                  tradisjon: "I tradisjonen " + ASPEKT_TRAD[a[0]] + ", knyttet til " + PLANET_TEMA[p[1]] + "." });
              }
            }
            t = t2; f0 = f1;
          }
        });
      });
    });
    return ut;
  }

  function hendelser(fra, til, natalSol){
    var alle = faser(fra, til).concat(tegnskifter(fra, til), baklengsSkifter(fra, til));
    if(typeof natalSol === "number"){ alle = alle.concat(transitter(fra, til, natalSol)); }
    return alle.sort(function(a, b){ return a.dato - b.dato; });
  }

  /* ---------------- Sett fra der du bor ---------------- */
  function hoyde(body, obs, date){ var eq = A.Equator(body, date, obs, true, true); return A.Horizon(date, obs, eq.ra, eq.dec, "normal").altitude; }
  function grad(x){ return (Math.round(x * 10) / 10).toFixed(1).replace(".", ",").replace("-", "minus ") + "°"; }
  /* Én kropp (Sun eller Moon) gjennom ett norsk døgn: opp, ned, høyest, og polare tilfeller. */
  function kroppDogn(body, obs, s, e){
    var opp = A.SearchRiseSet(body, obs, +1, s, 1.2), ned = A.SearchRiseSet(body, obs, -1, s, 1.2);
    opp = opp && opp.date < e ? opp.date : null; ned = ned && ned.date < e ? ned.date : null;
    var maks = -91, maksT = null, n = Math.round((e - s) / 600000);
    for(var i = 0; i < n; i++){ var t = new Date(s.getTime() + i * 600000), h = hoyde(body, obs, t); if(h > maks){ maks = h; maksT = t; } }
    var k = A.SearchHourAngle(body, obs, 0, s);
    if(k.time.date < e && k.hor.altitude >= maks - 0.5){ maks = k.hor.altitude; maksT = k.time.date; }
    var tilstand = "normal";
    if(!opp && !ned){ tilstand = hoyde(body, obs, new Date((s.getTime() + e.getTime()) / 2)) > -0.27 ? "oppe" : "nede"; }
    return { opp: opp, ned: ned, maks: maks, maksT: maksT, tilstand: tilstand };
  }
  function stedsdag(lat, lon, date, naa){
    var obs = new A.Observer(lat, lon, 0), s = dagStart(date), e = plussDager(s, 1);
    var m = kroppDogn("Moon", obs, s, e), sol = kroppDogn("Sun", obs, s, e);
    var mt, st;
    if(m.tilstand === "oppe"){ mt = "Månen er oppe hele døgnet"; }
    else if(m.tilstand === "nede"){ mt = "Månen kommer ikke over horisonten i dag"; }
    else {
      var deler2 = [[m.opp, m.opp ? "måneopp " + kl(m.opp) : "ingen måneopp i dag"], [m.ned, m.ned ? "månened " + kl(m.ned) : "ingen månened i dag"]];
      deler2.sort(function(a, b){ return (a[0] ? a[0].getTime() : 9e15) - (b[0] ? b[0].getTime() : 9e15); });
      mt = deler2.map(function(x){ return x[1]; }).join(", "); mt = mt.charAt(0).toUpperCase() + mt.slice(1);
    }
    if(m.maks > 0){ mt += ". Høyest " + grad(m.maks) + " over horisonten kl. " + kl(m.maksT); }
    if(sol.tilstand === "nede"){ st = "Mørketid, sola kommer ikke opp"; if(sol.maks > -6){ st += ". Midt på dagen står den " + grad(-sol.maks) + " under horisonten, nok til et blått dagslys"; } }
    else if(sol.tilstand === "oppe"){ st = "Midnattssol"; }
    else { st = [sol.opp ? "Sola opp " + kl(sol.opp) : "sola står ikke opp i dag", sol.ned ? "ned " + kl(sol.ned) : "går ikke ned i dag"].join(", ") + ". Høyest " + grad(sol.maks) + " kl. " + kl(sol.maksT); }
    var res = { maane: m, sol: sol, maaneTekst: mt, solTekst: st };
    if(naa){ res.maaneNaa = hoyde("Moon", obs, naa); res.solNaa = hoyde("Sun", obs, naa); }
    return res;
  }
  /* Bare måneopp og månened, for ukelisten. */
  function maaneKort(lat, lon, date){
    var obs = new A.Observer(lat, lon, 0), s = dagStart(date), e = plussDager(s, 1);
    var opp = A.SearchRiseSet("Moon", obs, +1, s, 1.2), ned = A.SearchRiseSet("Moon", obs, -1, s, 1.2);
    opp = opp && opp.date < e ? opp.date : null; ned = ned && ned.date < e ? ned.date : null;
    if(!opp && !ned){ return hoyde("Moon", obs, new Date((s.getTime() + e.getTime()) / 2)) > -0.27 ? "Månen oppe hele døgnet" : "Månen under horisonten hele døgnet"; }
    var d = [[opp, opp ? "opp " + kl(opp) : "ingen måneopp"], [ned, ned ? "ned " + kl(ned) : "ingen månened"]];
    d.sort(function(a, b){ return (a[0] ? a[0].getTime() : 9e15) - (b[0] ? b[0].getTime() : 9e15); });
    return "Månen " + d[0][1] + ", " + d[1][1];
  }
  function maaneDag(date){
    var mid = new Date(dagStart(date).getTime() + 12 * 3600000);
    var pst = A.Illumination("Moon", mid).phase_fraction * 100, v = A.MoonPhase(mid) < 180;
    return { prosent: Math.round(pst), voksende: v, tegn: TEGN[tegnNr(lengde("Moon", mid))] };
  }

  ut.dagStart = dagStart; ut.plussDager = plussDager; ut.maanedStart = maanedStart; ut.nesteMaaned = nesteMaaned; ut.kl = kl; ut.datoTekst = datoTekst; ut.datoKort = datoKort;
  ut.nokkel = nokkel; ut.ukedagNr = ukedagNr; ut.deler = deler; ut.MND = MND;
  ut.faser = faser; ut.tegnskifter = tegnskifter; ut.baklengsSkifter = baklengsSkifter; ut.transitter = transitter; ut.hendelser = hendelser;
  ut.fodselsSol = fodselsSol; ut.stedsdag = stedsdag; ut.maaneKort = maaneKort; ut.maaneDag = maaneDag; ut.grad = grad;
  /* Byer: standard er Storslett. Koordinater er sentrum, avrundet. */
  ut.BYER = [
    ["Storslett", 69.768, 21.030], ["Tromsø", 69.649, 18.955], ["Alta", 69.969, 23.272], ["Hammerfest", 70.663, 23.682],
    ["Vadsø", 70.074, 29.750], ["Kirkenes", 69.727, 30.045], ["Narvik", 68.438, 17.427], ["Bodø", 67.280, 14.405],
    ["Trondheim", 63.430, 10.395], ["Bergen", 60.392, 5.324], ["Oslo", 59.913, 10.739], ["Stavanger", 58.970, 5.733],
    ["Kristiansand", 58.146, 7.996], ["Longyearbyen", 78.223, 15.647]
  ];
  return ut;
});
