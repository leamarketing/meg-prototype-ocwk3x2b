/* Familiens spillkveld: ren logikk uten skjerm (KONSEPT, prototype 20.11.2026).
   Brukes av app.js i nettleseren og av test/logikk.test.js i node.
   Ingen nettverk, ingen tidtakere. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SpillkveldLogikk = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var SVAR = ["ja", "kanskje", "nei"];

  /* Datoavstemning. datoer: [{id, dato, tid}], svar: {personId: {datoId: "ja"|"kanskje"|"nei"}},
     deltakere: [{id, navn}]. Lik vekt: hver person teller én gang per dato.
     Beste kveld: flest ja, så flest kanskje, så den som står først i lista. */
  function tellDatoer(datoer, svar, deltakere) {
    var rader = datoer.map(function (d, i) {
      var r = { id: d.id, rekkefolge: i, ja: [], kanskje: [], nei: [], ubesvart: [] };
      deltakere.forEach(function (p) {
        var s = svar[p.id] && svar[p.id][d.id];
        if (SVAR.indexOf(s) === -1) r.ubesvart.push(p.navn);
        else r[s].push(p.navn);
      });
      return r;
    });
    var kandidater = rader.filter(function (r) { return r.ja.length + r.kanskje.length > 0; });
    kandidater.sort(function (a, b) {
      return b.ja.length - a.ja.length || b.kanskje.length - a.kanskje.length || a.rekkefolge - b.rekkefolge;
    });
    var beste = kandidater[0] || null;
    var likt = false;
    if (beste && kandidater[1]) {
      likt = kandidater[1].ja.length === beste.ja.length && kandidater[1].kanskje.length === beste.kanskje.length;
    }
    return { rader: rader, besteId: beste ? beste.id : null, likt: likt };
  }

  /* Rådgivende spillstemming. stemmer: {personId: spillId}. Bare deltakere teller, én stemme hver.
     Gir antall per spill (synkende), hvem som leder, og om det står likt. Arrangøren bestemmer til slutt. */
  function tellSpill(stemmer, deltakere, spillIder) {
    var antall = {};
    spillIder.forEach(function (id) { antall[id] = 0; });
    var avgitt = 0;
    deltakere.forEach(function (p) {
      var v = stemmer[p.id];
      if (v && Object.prototype.hasOwnProperty.call(antall, v)) { antall[v] += 1; avgitt += 1; }
    });
    var liste = spillIder.map(function (id, i) { return { id: id, stemmer: antall[id], rekkefolge: i }; });
    liste.sort(function (a, b) { return b.stemmer - a.stemmer || a.rekkefolge - b.rekkefolge; });
    var topp = liste.length ? liste[0].stemmer : 0;
    var ledere = topp > 0 ? liste.filter(function (x) { return x.stemmer === topp; }).map(function (x) { return x.id; }) : [];
    return { liste: liste, avgitt: avgitt, mulige: deltakere.length, ledere: ledere, uavgjort: ledere.length > 1 };
  }

  /* Spillforslag. deltakere: [{alder, gruppe, avstand}]. Spill: {alderFra|null, min|null, maks|null,
     modus: "hjemme"|"avstand"|"begge", grupper: [...]}. Ukjente verdier (DATA MANGLER) stenger ikke ute,
     men merkes og sorteres bak spill med kjente tall. */
  function foreslaSpill(bibliotek, deltakere, maksForslag) {
    maksForslag = maksForslag || 5;
    var antall = deltakere.length;
    var aldre = deltakere.map(function (p) { return p.alder; });
    var yngste = aldre.length ? Math.min.apply(null, aldre) : null;
    var eldste = aldre.length ? Math.max.apply(null, aldre) : null;
    var avstand = deltakere.some(function (p) { return p.avstand; });
    var hjemme = deltakere.some(function (p) { return !p.avstand; });
    var grupper = {};
    deltakere.forEach(function (p) { grupper[p.gruppe] = true; });

    var passer = [], utelatt = [];
    bibliotek.forEach(function (s, i) {
      var grunner = [];
      if (avstand && s.modus === "hjemme") grunner.push("bare rundt bordet, og noen er med på avstand");
      if (!hjemme && s.modus === "hjemme") grunner.push("bare rundt bordet, og alle er på avstand");
      if (s.alderFra != null && yngste != null && yngste < s.alderFra) grunner.push("anbefalt fra " + s.alderFra + " år, yngste er " + yngste);
      if (s.maks != null && antall > s.maks) grunner.push("maks " + s.maks + " spillere, dere er " + antall);
      if (s.min != null && antall < s.min) grunner.push("trenger minst " + s.min + " spillere, dere er " + antall);
      if (grunner.length) { utelatt.push({ id: s.id, grunner: grunner }); return; }
      var mangler = [];
      if (s.alderFra == null) mangler.push("alder");
      if (s.min == null && s.maks == null) mangler.push("antall spillere");
      var treff = (s.grupper || []).filter(function (g) { return g === "helefamilien" || grupper[g]; }).length;
      passer.push({ id: s.id, mangler: mangler, treff: treff, rekkefolge: i });
    });
    passer.sort(function (a, b) {
      return a.mangler.length - b.mangler.length || b.treff - a.treff || a.rekkefolge - b.rekkefolge;
    });
    return {
      forslag: passer.slice(0, maksForslag),
      flerePassende: passer.slice(maksForslag),
      utelatt: utelatt,
      yngste: yngste, eldste: eldste, antall: antall, avstand: avstand
    };
  }

  /* ---------- Kalenderfil (.ics, RFC 5545) ---------- */

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  // Lokal veggklokketid i Europe/Oslo som tekst, uten å gå via nettleserens tidssone.
  function lokalTid(datoStr, tidStr, ekstraMin) {
    var d = datoStr.split("-").map(Number), t = tidStr.split(":").map(Number);
    var ms = Date.UTC(d[0], d[1] - 1, d[2], t[0], t[1]) + (ekstraMin || 0) * 60000;
    var x = new Date(ms);
    return "" + x.getUTCFullYear() + pad(x.getUTCMonth() + 1) + pad(x.getUTCDate()) + "T" +
      pad(x.getUTCHours()) + pad(x.getUTCMinutes()) + "00";
  }

  function utcStempel(dato) {
    return "" + dato.getUTCFullYear() + pad(dato.getUTCMonth() + 1) + pad(dato.getUTCDate()) + "T" +
      pad(dato.getUTCHours()) + pad(dato.getUTCMinutes()) + pad(dato.getUTCSeconds()) + "Z";
  }

  function escapeTekst(s) {
    return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }

  function utf8Lengde(tegn) {
    var c = tegn.codePointAt(0);
    return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }

  // Bretter linjer over 75 byte (RFC 5545 3.1), uten å dele et tegn.
  function brett(linje) {
    var ut = [], biter = "", bytes = 0, grense = 75;
    Array.from(linje).forEach(function (tegn) {
      var l = utf8Lengde(tegn);
      if (bytes + l > grense) { ut.push(biter); biter = " "; bytes = 1; grense = 75; }
      biter += tegn; bytes += l;
    });
    ut.push(biter);
    return ut.join("\r\n");
  }

  var OSLO = [
    "BEGIN:VTIMEZONE", "TZID:Europe/Oslo",
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0100", "TZOFFSETTO:+0200", "TZNAME:CEST",
    "DTSTART:19700329T020000", "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0100", "TZNAME:CET",
    "DTSTART:19701025T030000", "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
    "END:VTIMEZONE"
  ];

  /* hendelse: {uid, dato "YYYY-MM-DD", tid "HH:MM", varighetMin, tittel, sted, beskrivelse, naa (Date)} */
  function lagIcs(h) {
    var linjer = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VoteApp//Min dag spillkveld prototype//NO",
      "CALSCALE:GREGORIAN", "METHOD:PUBLISH"
    ].concat(OSLO, [
      "BEGIN:VEVENT",
      "UID:" + h.uid,
      "DTSTAMP:" + utcStempel(h.naa || new Date()),
      "DTSTART;TZID=Europe/Oslo:" + lokalTid(h.dato, h.tid, 0),
      "DTEND;TZID=Europe/Oslo:" + lokalTid(h.dato, h.tid, h.varighetMin),
      "SUMMARY:" + escapeTekst(h.tittel),
      "LOCATION:" + escapeTekst(h.sted || ""),
      "DESCRIPTION:" + escapeTekst(h.beskrivelse || ""),
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE",
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + escapeTekst("I morgen: " + h.tittel), "TRIGGER:-P1D", "END:VALARM",
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + escapeTekst("Om en time: " + h.tittel), "TRIGGER:-PT1H", "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"
    ]);
    return linjer.map(brett).join("\r\n") + "\r\n";
  }

  return {
    tellDatoer: tellDatoer, tellSpill: tellSpill, foreslaSpill: foreslaSpill,
    lagIcs: lagIcs, escapeTekst: escapeTekst, brett: brett, lokalTid: lokalTid
  };
});
