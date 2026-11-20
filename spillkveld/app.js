/* Familiens spillkveld: klikkbar prototype (KONSEPT, 20.11.2026).
   All data er oppdiktet eksempeldata og lagres bare i denne nettleseren (localStorage).
   Ingen nettverkskall, ingen tidtakere, ingen animasjon i løkke. */
(function () {
  "use strict";
  var L = window.SpillkveldLogikk;
  var NOKKEL = "spillkveld-prototype-v1";

  var GRUPPER = {
    barn47: "Barn (ca. 4-7)", barn812: "Barn (8-12)", ungdom: "Ungdom",
    voksne: "Voksne", besteforeldre: "Besteforeldre"
  };

  /* Spillbiblioteket fra forslaget (del 4 og 5, lest 18.11.2026). null = DATA MANGLER i forslaget. */
  var BIBLIOTEK = [
    { id: "ttr", navn: "Ticket to Ride", alderFra: 8, min: 2, maks: 5, modus: "hjemme", varighet: "30-60 min", merknad: "Lett å lære, lite konflikt.", kilde: "TechRadar Norge", grupper: ["barn812", "besteforeldre"] },
    { id: "sushi", navn: "Sushi Go!", alderFra: 8, min: 2, maks: 5, modus: "hjemme", varighet: null, merknad: "Kjapt kortspill.", kilde: "TechRadar Norge", grupper: ["barn812"] },
    { id: "azul", navn: "Azul", alderFra: 8, min: null, maks: null, modus: "hjemme", varighet: null, merknad: "", kilde: "collegetransitions.com", grupper: ["barn812"] },
    { id: "outfoxed", navn: "Outfoxed!", alderFra: 5, min: null, maks: null, modus: "hjemme", varighet: null, merknad: "Samarbeidsspill for de minste.", kilde: "collegetransitions.com", grupper: ["barn47"] },
    { id: "mummi", navn: "Mummi: Trollmannens hatt", alderFra: null, min: null, maks: null, modus: "hjemme", varighet: null, merknad: "Minnespill. Kåret til Årets barnespill 2025.", kilde: "TechRadar Norge", grupper: ["barn47"] },
    { id: "herd", navn: "Herd Mentality", alderFra: null, min: null, maks: null, modus: "hjemme", varighet: null, merknad: "Kåret til Family Game of the Year 2025.", kilde: "TechRadar Norge", grupper: ["helefamilien"] },
    { id: "pandemic", navn: "Pandemic", alderFra: 10, min: 2, maks: 4, modus: "hjemme", varighet: null, merknad: "Samarbeid, for eldre barn og voksne.", kilde: "TechRadar Norge", grupper: ["voksne"] },
    { id: "jackbox", navn: "Jackbox Games", alderFra: null, min: 1, maks: 8, modus: "begge", varighet: null, merknad: "Én skjerm, resten blir med fra mobilen på jackbox.tv. Bare én trenger å eie spillet. Kildene er uenige om alder. Betalt, pris ikke sjekket.", kilde: "Which?, gamebrief.net, outcyders.net", grupper: ["ungdom", "voksne"] },
    { id: "kahoot", navn: "Kahoot! familiequiz", alderFra: null, min: null, maks: 10, modus: "begge", varighet: null, merknad: "Alle som kan lese. Gratis opptil 10 spillere.", kilde: "Kahoot sin hjelpeside", grupper: ["barn812", "besteforeldre"] },
    { id: "bga", navn: "Board Game Arena", alderFra: null, min: null, maks: null, modus: "begge", varighet: null, merknad: "Brettspill i nettleseren. Gratis grunnplan, noen spill krever betalende medlem for å startes.", kilde: "boardgamearena.com, BGA sitt forum", grupper: ["ungdom", "voksne"] },
    { id: "justone", navn: "Just One", alderFra: null, min: null, maks: null, modus: "begge", varighet: null, merknad: "Samarbeid. Kan spilles over video hvis én har spillet hjemme.", kilde: "zatu.com", grupper: ["helefamilien"] },
    { id: "mime", navn: "Mime", alderFra: 0, min: 4, maks: null, modus: "hjemme", varighet: null, merknad: "Alle aldre, ingen utstyr, ingen kostnad.", kilde: "allment kjent lek", grupper: ["barn47", "helefamilien"] },
    { id: "hvemerjeg", navn: "Hvem er jeg?", alderFra: null, min: null, maks: null, modus: "hjemme", varighet: null, merknad: "Lapper i panna. Barn fra lesealder og opp.", kilde: "allment kjent lek", grupper: [] },
    { id: "20sp", navn: "20 spørsmål", alderFra: 0, min: null, maks: null, modus: "begge", varighet: null, merknad: "Alle aldre, fungerer også over telefon.", kilde: "allment kjent lek", grupper: ["besteforeldre"] },
    { id: "historie", navn: "Historiekjede", alderFra: null, min: null, maks: null, modus: "begge", varighet: null, merknad: "Hver person legger til én setning. Fungerer også på avstand.", kilde: "allment kjent lek", grupper: [] },
    { id: "gjemsel", navn: "Gjemsel", alderFra: null, min: null, maks: null, modus: "hjemme", varighet: null, merknad: "For de minste.", kilde: "allment kjent lek", grupper: ["barn47"] },
    { id: "codenames", navn: "Codenames", alderFra: null, min: null, maks: null, modus: "hjemme", varighet: null, merknad: "Ikke kildesjekket. Sjekk alder og antall på esken.", kilde: "ikke kildesjekket", grupper: ["ungdom"] },
    { id: "uno", navn: "Uno", alderFra: null, min: null, maks: null, modus: "hjemme", varighet: null, merknad: "Ikke kildesjekket. Sjekk alder og antall på esken.", kilde: "ikke kildesjekket", grupper: [] }
  ];

  function nyId(prefiks) {
    var r = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    return prefiks + "-" + r;
  }

  function isoDato(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // Eksempelkvelder: neste fredag, lørdag og søndag minst tre dager fram.
  function eksempelDatoer() {
    var d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + 3);
    while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
    var ut = [];
    for (var i = 0; i < 3; i++) {
      ut.push({ id: "d" + (i + 1), dato: isoDato(d), tid: i === 2 ? "17:00" : "19:00" });
      d.setDate(d.getDate() + 1);
    }
    return ut;
  }

  function eksempel() {
    return {
      versjon: 1,
      familie: [
        { id: "ingrid", navn: "Ingrid (mamma)", alder: 44, gruppe: "voksne", avstand: false, med: true },
        { id: "pal", navn: "Pål (pappa)", alder: 46, gruppe: "voksne", avstand: false, med: true },
        { id: "sofie", navn: "Sofie", alder: 15, gruppe: "ungdom", avstand: false, med: true },
        { id: "jonas", navn: "Jonas", alder: 9, gruppe: "barn812", avstand: false, med: true },
        { id: "emma", navn: "Emma", alder: 6, gruppe: "barn47", avstand: false, med: true },
        { id: "ragnhild", navn: "Ragnhild (mormor)", alder: 74, gruppe: "besteforeldre", avstand: true, med: true },
        { id: "einar", navn: "Einar (morfar)", alder: 77, gruppe: "besteforeldre", avstand: true, med: true }
      ],
      datoer: eksempelDatoer(),
      svar: {
        ingrid: { d1: "ja", d2: "ja", d3: "kanskje" },
        pal: { d1: "kanskje", d2: "ja", d3: "nei" },
        ragnhild: { d1: "ja", d2: "kanskje", d3: "ja" },
        sofie: { d1: "nei", d2: "ja" }
      },
      egneSpill: [],
      stemmer: { jonas: "kahoot", einar: "20sp" },
      svarerSom: "ingrid",
      valgtDato: null,
      valgtSpill: null,
      varighetMin: 120,
      sted: "Hjemme hos Ingrid og Pål. Besteforeldrene er med på videosamtale."
    };
  }

  var tilstand;
  function last() {
    try {
      var t = JSON.parse(localStorage.getItem(NOKKEL));
      if (t && t.versjon === 1) return t;
    } catch (e) {}
    return eksempel();
  }
  function lagre() {
    try { localStorage.setItem(NOKKEL, JSON.stringify(tilstand)); } catch (e) {}
  }

  /* ---------- hjelpere ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function datoTekst(iso) {
    var p = iso.split("-").map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2], 12)).toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  }
  function deltakere() { return tilstand.familie.filter(function (p) { return p.med; }); }
  function person(id) { return tilstand.familie.filter(function (p) { return p.id === id; })[0]; }
  function alleSpill() { return BIBLIOTEK.concat(tilstand.egneSpill); }
  function spill(id) { return alleSpill().filter(function (s) { return s.id === id; })[0]; }
  function dato(id) { return tilstand.datoer.filter(function (d) { return d.id === id; })[0]; }
  var SVARTEKST = { ja: "Ja", kanskje: "Kanskje", nei: "Nei" };
  var SVARMERKE = { ja: "✓", kanskje: "?", nei: "✕" };

  function si(tekst) {
    var el = document.getElementById("melding");
    el.textContent = "";
    // Ny tekst i neste bilde, så skjermlesere leser den selv om den er lik forrige.
    requestAnimationFrame(function () { el.textContent = tekst; });
  }

  function personValg(id, label) {
    var ds = deltakere();
    if (ds.length && !ds.some(function (p) { return p.id === tilstand.svarerSom; })) tilstand.svarerSom = ds[0].id;
    return '<div class="felt"><label for="' + id + '">' + label + '</label><select id="' + id + '" data-handling="svarer-som" data-nokkel="' + id + '">' +
      ds.map(function (p) {
        return '<option value="' + esc(p.id) + '"' + (p.id === tilstand.svarerSom ? " selected" : "") + ">" + esc(p.navn) + "</option>";
      }).join("") + "</select></div>";
  }

  /* ---------- 1. Hvem kommer ---------- */
  function visHvem() {
    var rader = tilstand.familie.map(function (p) {
      var k = "med-" + p.id;
      return '<li class="medlem">' +
        '<label class="hake"><input type="checkbox" data-handling="med" data-id="' + esc(p.id) + '" data-nokkel="' + k + '"' + (p.med ? " checked" : "") + "> " +
        "<span><b>" + esc(p.navn) + "</b> <span class=\"muted\">" + p.alder + " år, " + esc(GRUPPER[p.gruppe]) + "</span></span></label>" +
        '<div class="felt kort"><label for="hvor-' + esc(p.id) + '" class="skjult">Hvor er ' + esc(p.navn) + "?</label>" +
        '<select id="hvor-' + esc(p.id) + '" data-handling="hvor" data-id="' + esc(p.id) + '" data-nokkel="hvor-' + esc(p.id) + '"' + (p.med ? "" : " disabled") + ">" +
        '<option value="hjemme"' + (p.avstand ? "" : " selected") + ">Hjemme</option>" +
        '<option value="avstand"' + (p.avstand ? " selected" : "") + ">På avstand</option></select></div></li>";
    }).join("");
    return '<p class="muted">Kryss av for hvem som er med, og om de er hjemme eller på avstand. Dette styrer spillforslagene.</p>' +
      '<ul class="liste">' + rader + "</ul>" +
      '<p class="planlagt"><b>Planlagt i ekte versjon:</b> invitasjonslenke til gjester uten konto, og samtykke fra foresatte for barn under 13.</p>';
  }

  /* ---------- 2. Finn kvelden ---------- */
  function visKvelden() {
    var ds = deltakere();
    var telling = L.tellDatoer(tilstand.datoer, tilstand.svar, ds);
    var meg = tilstand.svar[tilstand.svarerSom] || {};
    var kort = telling.rader.map(function (r) {
      var d = dato(r.id), beste = r.id === telling.besteId, valgt = r.id === tilstand.valgtDato;
      var knapper = ["ja", "kanskje", "nei"].map(function (s) {
        var trykket = meg[r.id] === s;
        return '<button type="button" class="svar svar-' + s + '" aria-pressed="' + trykket + '" data-handling="svar" data-dato="' + r.id + '" data-svar="' + s + '" data-nokkel="svar-' + r.id + "-" + s + '">' +
          '<span aria-hidden="true">' + SVARMERKE[s] + "</span> " + SVARTEKST[s] + "</button>";
      }).join("");
      function navn(liste) { return liste.length ? esc(liste.join(", ")) : "ingen"; }
      return '<li class="kort' + (valgt ? " valgt" : "") + '">' +
        '<div class="kort-topp"><h3>' + esc(datoTekst(d.dato)) + " kl. " + esc(d.tid) + "</h3>" +
        (valgt ? '<span class="merke valgt-merke">Valgt kveld</span>' : beste ? '<span class="merke">Flest kan' + (telling.likt ? " (likt)" : "") + "</span>" : "") + "</div>" +
        '<div class="rad" role="group" aria-label="Svaret til ' + esc((person(tilstand.svarerSom) || {}).navn || "") + " for " + esc(datoTekst(d.dato)) + '">' + knapper + "</div>" +
        '<p class="telling"><b>' + r.ja.length + " ja</b>, " + r.kanskje.length + " kanskje, " + r.nei.length + " nei, " + r.ubesvart.length + " har ikke svart</p>" +
        '<details><summary>Hvem har svart hva</summary><p>Ja: ' + navn(r.ja) + "<br>Kanskje: " + navn(r.kanskje) + "<br>Nei: " + navn(r.nei) + "<br>Ikke svart: " + navn(r.ubesvart) + "</p></details>" +
        '<div class="rad">' +
        '<button type="button" data-handling="velg-dato" data-dato="' + r.id + '" data-nokkel="velg-' + r.id + '"' + (valgt ? ' aria-pressed="true"' : ' aria-pressed="false"') + ">" + (valgt ? "Valgt av arrangøren" : "Arrangøren velger denne") + "</button>" +
        '<details class="endre"><summary>Endre</summary><div class="rad">' +
        '<div class="felt kort"><label for="dato-' + r.id + '">Dato</label><input type="date" id="dato-' + r.id + '" value="' + esc(d.dato) + '" data-handling="dato-felt" data-dato="' + r.id + '"></div>' +
        '<div class="felt kort"><label for="tid-' + r.id + '">Klokka</label><input type="time" id="tid-' + r.id + '" value="' + esc(d.tid) + '" data-handling="tid-felt" data-dato="' + r.id + '"></div>' +
        (tilstand.datoer.length > 2 ? '<button type="button" data-handling="fjern-dato" data-dato="' + r.id + '">Fjern kvelden</button>' : "") +
        "</div></details></div></li>";
    }).join("");
    return personValg("svarer-dato", "Hvem svarer nå? (eksempeldata: du kan svare for alle)") +
      '<ul class="liste kortliste">' + kort + "</ul>" +
      (tilstand.datoer.length < 4 ? '<button type="button" data-handling="ny-dato" data-nokkel="ny-dato">Foreslå en kveld til</button>' : '<p class="muted">Maks fire forslag, slik forslaget beskriver.</p>') +
      '<p class="muted">Hver person teller én gang per kveld. "Flest kan" er kvelden med flest ja, så flest kanskje.</p>';
  }

  /* ---------- 3. Spillforslag ---------- */
  function spillDetaljer(s) {
    var biter = [];
    biter.push(s.alderFra == null ? '<span class="mangler">Alder: DATA MANGLER</span>' : s.alderFra === 0 ? "Alle aldre" : "Fra " + s.alderFra + " år");
    biter.push(s.min == null && s.maks == null ? '<span class="mangler">Antall: DATA MANGLER</span>' :
      (s.min != null ? s.min : "?") + "-" + (s.maks != null ? s.maks : "?") + " spillere");
    biter.push(s.modus === "begge" ? "Hjemme og på avstand" : s.modus === "avstand" ? "På avstand" : "Rundt bordet");
    if (s.varighet) biter.push(esc(s.varighet));
    return '<p class="detaljer">' + biter.join(" &middot; ") + "</p>" +
      (s.merknad ? "<p>" + esc(s.merknad) + "</p>" : "") +
      '<p class="muted">Kilde: ' + esc(s.kilde || "eget forslag") + "</p>";
  }

  function visForslag() {
    var r = L.foreslaSpill(BIBLIOTEK, deltakere(), 5);
    if (!r.antall) return '<p>Ingen er med ennå. Kryss av i steg 1.</p>';
    var grunnlag = "<p><b>Grunnlag:</b> " + r.antall + " med, yngste " + r.yngste + " år, eldste " + r.eldste + " år, " +
      (r.avstand ? "noen er på avstand." : "alle er hjemme.") + "</p>";
    var kort = r.forslag.map(function (f) {
      var s = spill(f.id);
      return '<li class="kort"><h3>' + esc(s.navn) + "</h3>" + spillDetaljer(s) + "</li>";
    }).join("");
    var flere = r.flerePassende.length ? '<details><summary>Flere som passer (' + r.flerePassende.length + ")</summary><ul>" +
      r.flerePassende.map(function (f) { return "<li>" + esc(spill(f.id).navn) + "</li>"; }).join("") + "</ul></details>" : "";
    var ute = r.utelatt.length ? '<details><summary>Passer ikke denne gangen (' + r.utelatt.length + ")</summary><ul>" +
      r.utelatt.map(function (u) { return "<li><b>" + esc(spill(u.id).navn) + ":</b> " + esc(u.grunner.join(", ")) + "</li>"; }).join("") + "</ul></details>" : "";
    var egne = tilstand.egneSpill.length ? "<h3>Egne forslag fra familien</h3><ul>" +
      tilstand.egneSpill.map(function (s) { return "<li>" + esc(s.navn) + ' <button type="button" class="liten" data-handling="fjern-spill" data-id="' + esc(s.id) + '">Fjern</button></li>'; }).join("") + "</ul>" : "";
    return grunnlag +
      '<p class="muted">Spill med kjente tall kommer først. Der forslaget mangler tall, står det DATA MANGLER: sjekk spillets egen side eller esken.</p>' +
      '<ul class="liste kortliste">' + kort + "</ul>" + flere + ute + egne +
      '<form id="eget-spill" class="rad" novalidate><div class="felt"><label for="eget-navn">Legg til eget forslag</label>' +
      '<input id="eget-navn" type="text" maxlength="60" autocomplete="off" placeholder="For eksempel Yatzy"></div>' +
      '<button type="submit">Legg til</button></form>';
  }

  /* ---------- 4. Stem på spill ---------- */
  function kandidater() {
    var r = L.foreslaSpill(BIBLIOTEK, deltakere(), 5);
    return r.forslag.map(function (f) { return f.id; }).concat(tilstand.egneSpill.map(function (s) { return s.id; }));
  }

  function visStemming() {
    var ider = kandidater();
    if (!ider.length) return "<p>Ingen spill å stemme på ennå.</p>";
    var ds = deltakere();
    var meg = tilstand.stemmer[tilstand.svarerSom];
    var t = L.tellSpill(tilstand.stemmer, ds, ider);
    var valg = ider.map(function (id) {
      var s = spill(id);
      return '<label class="valg"><input type="radio" name="stemme" value="' + esc(id) + '" data-handling="stem" data-nokkel="stem-' + esc(id) + '"' + (meg === id ? " checked" : "") + "> " + esc(s.navn) + "</label>";
    }).join("");
    var maks = Math.max(1, t.mulige);
    var resultat = t.liste.map(function (x) {
      var s = spill(x.id), pst = Math.round(x.stemmer / maks * 100);
      var leder = t.ledere.indexOf(x.id) !== -1;
      return '<li><div class="res-topp"><span>' + esc(s.navn) + (leder ? ' <span class="merke">' + (t.uavgjort ? "Likt i ledelsen" : "Flest stemmer") + "</span>" : "") +
        '</span><b>' + x.stemmer + (x.stemmer === 1 ? " stemme" : " stemmer") + "</b></div>" +
        '<div class="stolpe" aria-hidden="true"><span style="width:' + pst + '%"></span></div></li>';
    }).join("");
    var velg = '<div class="felt"><label for="arr-spill">Arrangøren bestemmer til slutt</label><select id="arr-spill" data-handling="velg-spill">' +
      '<option value="">Ikke bestemt ennå</option>' +
      ider.map(function (id) { return '<option value="' + esc(id) + '"' + (tilstand.valgtSpill === id ? " selected" : "") + ">" + esc(spill(id).navn) + "</option>"; }).join("") +
      "</select></div>";
    return '<p>Rådgivende avstemning: én stemme per person, også for barna. Alle stemmer teller like mye. Resultatet er synlig for alle.</p>' +
      personValg("svarer-spill", "Hvem stemmer nå?") +
      '<fieldset><legend>Stemmen til ' + esc((person(tilstand.svarerSom) || {}).navn || "") + "</legend>" + valg + "</fieldset>" +
      (meg ? '<button type="button" class="liten" data-handling="trekk-stemme">Trekk tilbake stemmen</button>' : "") +
      "<h3>Resultat så langt</h3><p class=\"muted\">" + t.avgitt + " av " + t.mulige + " har stemt.</p>" +
      '<ul class="liste resultat">' + resultat + "</ul>" + velg;
  }

  /* ---------- 5. Bekreft og kalender ---------- */
  function visBekreft() {
    var d = tilstand.valgtDato && dato(tilstand.valgtDato);
    var s = tilstand.valgtSpill && spill(tilstand.valgtSpill);
    var varighet = '<div class="rad"><div class="felt kort"><label for="varighet">Hvor lenge</label><select id="varighet" data-handling="varighet">' +
      [60, 90, 120, 150, 180].map(function (m) { return '<option value="' + m + '"' + (tilstand.varighetMin === m ? " selected" : "") + ">" + (m / 60).toString().replace(".", ",") + " timer</option>"; }).join("") +
      '</select></div><div class="felt"><label for="sted">Sted</label><input id="sted" type="text" maxlength="120" value="' + esc(tilstand.sted) + '" data-handling="sted"></div></div>';
    var oppsummering = "<dl class=\"oppsummering\"><dt>Kveld</dt><dd>" + (d ? esc(datoTekst(d.dato)) + " kl. " + esc(d.tid) : "Ikke valgt ennå (steg 2)") + "</dd>" +
      "<dt>Spill</dt><dd>" + (s ? esc(s.navn) : "Ikke bestemt ennå (steg 4)") + "</dd>" +
      "<dt>Med</dt><dd>" + esc(deltakere().map(function (p) { return p.navn + (p.avstand ? " (på avstand)" : ""); }).join(", ") || "ingen") + "</dd></dl>";
    return oppsummering + varighet +
      '<button type="button" class="hoved" data-handling="ics" data-nokkel="ics"' + (d ? "" : " disabled") + ">Last ned kalenderfil (.ics)</button>" +
      (d ? "" : '<p class="muted">Velg en kveld i steg 2 først.</p>') +
      '<p class="muted">Kalenderfilen lages her i nettleseren og kan åpnes i Google Kalender, Outlook og Apple Kalender. Den har to varsler som din egen kalender viser: dagen før og en time før.</p>' +
      '<p class="planlagt"><b>Planlagt i ekte versjon:</b> kvelden havner også rett i hver deltakers Min dag-kalender.</p>';
  }

  /* ---------- tegn opp ---------- */
  var SEKSJONER = { hvem: visHvem, kvelden: visKvelden, forslag: visForslag, stemming: visStemming, bekreft: visBekreft };

  function tegn() {
    var aktiv = document.activeElement, nokkel = aktiv && aktiv.getAttribute && aktiv.getAttribute("data-nokkel");
    Object.keys(SEKSJONER).forEach(function (k) { document.getElementById("innhold-" + k).innerHTML = SEKSJONER[k](); });
    if (nokkel) {
      var nytt = document.querySelector('[data-nokkel="' + nokkel + '"]');
      if (nytt) nytt.focus();
    }
    lagre();
  }

  function lastNedIcs() {
    var d = dato(tilstand.valgtDato); if (!d) return;
    var s = tilstand.valgtSpill && spill(tilstand.valgtSpill);
    var tittel = "Familiens spillkveld" + (s ? ": " + s.navn : "");
    var tekst = L.lagIcs({
      uid: nyId("spillkveld") + "@test.voteapp.eu",
      dato: d.dato, tid: d.tid, varighetMin: tilstand.varighetMin,
      tittel: tittel, sted: tilstand.sted,
      beskrivelse: "Med: " + deltakere().map(function (p) { return p.navn; }).join(", ") +
        ".\nLaget i prototypen Familiens spillkveld (Min dag, VoteApp). Eksempeldata. Spillvalget var rådgivende.",
      naa: new Date()
    });
    var blob = new Blob([tekst], { type: "text/calendar;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "spillkveld-" + d.dato + ".ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
    si("Kalenderfilen er lastet ned.");
  }

  /* ---------- hendelser (én lytter per type) ---------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-handling]"); if (!el) return;
    var h = el.getAttribute("data-handling"), id = el.getAttribute("data-dato");
    if (h === "svar") {
      var p = tilstand.svarerSom, s = el.getAttribute("data-svar");
      tilstand.svar[p] = tilstand.svar[p] || {};
      if (tilstand.svar[p][id] === s) delete tilstand.svar[p][id]; else tilstand.svar[p][id] = s;
      tegn();
      si(person(p).navn + ": " + (tilstand.svar[p][id] ? SVARTEKST[s].toLowerCase() : "svar fjernet") + " for " + datoTekst(dato(id).dato) + ".");
    } else if (h === "velg-dato") {
      tilstand.valgtDato = tilstand.valgtDato === id ? null : id; tegn();
      si(tilstand.valgtDato ? "Arrangøren valgte " + datoTekst(dato(id).dato) + "." : "Valget av kveld er fjernet.");
    } else if (h === "ny-dato") {
      var siste = tilstand.datoer[tilstand.datoer.length - 1].dato.split("-").map(Number);
      var nd = new Date(siste[0], siste[1] - 1, siste[2] + 7, 12);
      tilstand.datoer.push({ id: nyId("d"), dato: isoDato(nd), tid: "19:00" }); tegn(); si("Ny kveld lagt til.");
    } else if (h === "fjern-dato") {
      tilstand.datoer = tilstand.datoer.filter(function (d) { return d.id !== id; });
      if (tilstand.valgtDato === id) tilstand.valgtDato = null;
      tegn(); si("Kvelden er fjernet.");
      document.getElementById("t-kvelden").focus();
    } else if (h === "fjern-spill") {
      var sid = el.getAttribute("data-id");
      tilstand.egneSpill = tilstand.egneSpill.filter(function (s) { return s.id !== sid; });
      Object.keys(tilstand.stemmer).forEach(function (k) { if (tilstand.stemmer[k] === sid) delete tilstand.stemmer[k]; });
      if (tilstand.valgtSpill === sid) tilstand.valgtSpill = null;
      tegn(); si("Forslaget er fjernet.");
    } else if (h === "trekk-stemme") {
      delete tilstand.stemmer[tilstand.svarerSom]; tegn(); si("Stemmen er trukket tilbake.");
      document.getElementById("t-stemming").focus();
    } else if (h === "ics") {
      lastNedIcs();
    } else if (h === "slett") {
      if (window.confirm("Slette alt du har lagt inn i denne nettleseren og starte på nytt med eksempeldata?")) {
        try { localStorage.removeItem(NOKKEL); } catch (x) {}
        tilstand = eksempel(); tegn(); si("Alt er slettet. Eksempeldata er lagt inn på nytt.");
      }
    } else if (h === "tema") {
      var mork = document.documentElement.getAttribute("data-theme") === "dark" ||
        (!document.documentElement.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
      settTema(mork ? "light" : "dark");
    }
  });

  document.addEventListener("change", function (e) {
    var el = e.target, h = el.getAttribute("data-handling"); if (!h) return;
    var p;
    if (h === "med") { p = person(el.getAttribute("data-id")); p.med = el.checked; tegn(); si(p.navn + (p.med ? " er med." : " er ikke med.")); }
    else if (h === "hvor") { p = person(el.getAttribute("data-id")); p.avstand = el.value === "avstand"; tegn(); si(p.navn + (p.avstand ? " er på avstand." : " er hjemme.")); }
    else if (h === "svarer-som") { tilstand.svarerSom = el.value; tegn(); si("Nå svarer " + person(el.value).navn + "."); }
    else if (h === "stem") { tilstand.stemmer[tilstand.svarerSom] = el.value; tegn(); si(person(tilstand.svarerSom).navn + " stemte på " + spill(el.value).navn + "."); }
    else if (h === "velg-spill") { tilstand.valgtSpill = el.value || null; tegn(); si(el.value ? "Arrangøren valgte " + spill(el.value).navn + "." : "Spillvalget er fjernet."); }
    else if (h === "varighet") { tilstand.varighetMin = Number(el.value); lagre(); }
    else if (h === "sted") { tilstand.sted = el.value; lagre(); }
    else if (h === "dato-felt" || h === "tid-felt") {
      var d = dato(el.getAttribute("data-dato"));
      if (el.value) { if (h === "dato-felt") d.dato = el.value; else d.tid = el.value; }
      tegn(); si("Kvelden er endret.");
    }
  });

  document.addEventListener("submit", function (e) {
    if (e.target.id !== "eget-spill") return;
    e.preventDefault();
    var inp = document.getElementById("eget-navn"), navn = inp.value.trim();
    if (!navn) { si("Skriv navnet på spillet først."); inp.focus(); return; }
    tilstand.egneSpill.push({ id: nyId("eget"), navn: navn, alderFra: null, min: null, maks: null, modus: "begge", kilde: "eget forslag fra familien", merknad: "", grupper: [], egen: true });
    tegn(); si(navn + " er lagt til og kan stemmes på i steg 4.");
    document.getElementById("eget-navn").focus();
  });

  function settTema(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("spillkveld-tema", t); } catch (e) {}
    var b = document.getElementById("tema");
    b.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
    b.textContent = t === "dark" ? "Lys modus" : "Mørk modus";
  }

  tilstand = last();
  var tm = null;
  try { tm = localStorage.getItem("spillkveld-tema"); } catch (e) {}
  if (tm) settTema(tm);
  else {
    // Uten lagret valg følger siden enheten. Knappen viser det motsatte av det som vises nå.
    var morkNa = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var b0 = document.getElementById("tema");
    b0.setAttribute("aria-pressed", morkNa ? "true" : "false");
    b0.textContent = morkNa ? "Lys modus" : "Mørk modus";
  }
  tegn();
})();
