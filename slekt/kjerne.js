/* Slekt (prototype): kjernelogikk uten DOM.
   GEDCOM inn/ut, levende-regelen, kildemerker og Digitalarkivet-lenke.
   Virker både i nettleseren (window.SlektKjerne) og i Node (require). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SlektKjerne = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- Kildemerker ---------- */
  // Rangert fra sterkest til svakest. DNA kan aldri bli "Bekreftet".
  var MERKER = {
    kirkebok:    { tekst: "Bekreftet: kirkebok",    rang: 1, klasse: "m-bekreftet" },
    folketelling:{ tekst: "Bekreftet: folketelling", rang: 2, klasse: "m-bekreftet" },
    annen:       { tekst: "Støttet: annen kilde",   rang: 3, klasse: "m-stottet" },
    dna:         { tekst: "Støttet: DNA",           rang: 4, klasse: "m-dna" },
    muntlig:     { tekst: "Muntlig",                rang: 5, klasse: "m-muntlig" },
    importert:   { tekst: "Importert, ikke kildekontrollert", rang: 6, klasse: "m-importert" },
    ingen:       { tekst: "Ingen kilde ennå",       rang: 7, klasse: "m-ingen" },
    omstridt:    { tekst: "Omstridt",               rang: 0, klasse: "m-omstridt" }
  };
  var KILDETYPER = ["kirkebok", "folketelling", "annen", "dna", "muntlig"];

  // Merket som vises for en kobling: omstridt først, ellers sterkeste kilde.
  function merkeFor(kobling) {
    if (!kobling) return "ingen";
    if (kobling.omstridt) return "omstridt";
    var kilder = kobling.kilder || [];
    var best = null;
    for (var i = 0; i < kilder.length; i++) {
      var t = kilder[i].type;
      if (!MERKER[t] || t === "omstridt") continue;
      if (best === null || MERKER[t].rang < MERKER[best].rang) best = t;
    }
    if (best) return best;
    return kobling.importert ? "importert" : "ingen";
  }

  /* ---------- Datoer ---------- */
  var MND = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  var MND_NO = ["januar","februar","mars","april","mai","juni","juli","august","september","oktober","november","desember"];

  // "12.03.1921", "1921", "ca 1890" eller allerede GEDCOM ("12 MAR 1921") -> GEDCOM-dato.
  function tilGedDato(inn) {
    var s = String(inn || "").trim();
    if (!s) return "";
    var m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{3,4})$/);
    if (m) {
      var mi = parseInt(m[2], 10) - 1;
      if (mi >= 0 && mi < 12) return parseInt(m[1], 10) + " " + MND[mi] + " " + m[3];
    }
    m = s.match(/^(\d{1,2})\.(\d{3,4})$/);
    if (m) { var mj = parseInt(m[1], 10) - 1; if (mj >= 0 && mj < 12) return MND[mj] + " " + m[2]; }
    m = s.match(/^(ca\.?|omkring|abt\.?)\s*(\d{3,4})$/i);
    if (m) return "ABT " + m[2];
    return s.toUpperCase();
  }

  // GEDCOM-dato -> det brukeren skriver i skjemaet ("12.03.1921", "ca 1888").
  function tilSkjemaDato(dato) {
    var s = String(dato || "").trim(), m;
    if (!s) return "";
    m = s.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{3,4})$/);
    if (m && MND.indexOf(m[2]) >= 0) return ("0" + m[1]).slice(-2) + "." + ("0" + (MND.indexOf(m[2]) + 1)).slice(-2) + "." + m[3];
    m = s.match(/^([A-Z]{3})\s+(\d{3,4})$/);
    if (m && MND.indexOf(m[1]) >= 0) return ("0" + (MND.indexOf(m[1]) + 1)).slice(-2) + "." + m[2];
    m = s.match(/^(ABT|EST|CAL)\s+(\d{3,4})$/);
    if (m) return "ca " + m[2];
    return s;
  }

  function aarFra(dato) {
    var m = String(dato || "").match(/(\d{3,4})(?!.*\d{3,4})/);
    return m ? parseInt(m[1], 10) : null;
  }

  // GEDCOM-dato -> norsk visning.
  function visDato(dato) {
    var s = String(dato || "").trim();
    if (!s) return "";
    var pre = "";
    var m = s.match(/^(ABT|EST|CAL|BEF|AFT)\s+(.*)$/);
    if (m) { pre = { ABT: "ca. ", EST: "ca. ", CAL: "ca. ", BEF: "før ", AFT: "etter " }[m[1]]; s = m[2]; }
    m = s.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{3,4})$/);
    if (m && MND.indexOf(m[2]) >= 0) return pre + parseInt(m[1], 10) + ". " + MND_NO[MND.indexOf(m[2])] + " " + m[3];
    m = s.match(/^([A-Z]{3})\s+(\d{3,4})$/);
    if (m && MND.indexOf(m[1]) >= 0) return pre + MND_NO[MND.indexOf(m[1])] + " " + m[2];
    return pre + s.toLowerCase();
  }

  /* ---------- Levende-regelen ---------- */
  // Uten dødsdato (og uten dødsmarkering) og født for under 110 år siden = levende.
  // Ukjent fødselsår og ingen død = levende (trygt valg).
  var GRENSE_AAR = 110;
  function erLevende(p, iDag) {
    if (!p) return false;
    if (p.dod && (p.dod.dato || p.dod.sted || p.dod.merket)) return false;
    var aar = aarFra(p.fodt && p.fodt.dato);
    if (aar === null) return true;
    var naa = (iDag || new Date()).getFullYear();
    return naa - aar < GRENSE_AAR;
  }
  function alder(p, iDag) {
    var aar = aarFra(p && p.fodt && p.fodt.dato);
    if (aar === null) return null;
    return (iDag || new Date()).getFullYear() - aar;
  }
  // Barn under 16: aldri synlige utenfor nærmeste familie.
  function erBarn(p, iDag) {
    var a = alder(p, iDag);
    return erLevende(p, iDag) && a !== null && a < 16;
  }
  // Sensitive felt skjules som standard, også for avdøde nyere enn 100 år.
  function sensitivSkjultForAndre(p, iDag) {
    if (erLevende(p, iDag)) return true;
    var dAar = aarFra(p.dod && p.dod.dato);
    if (dAar === null) return true;
    return (iDag || new Date()).getFullYear() - dAar < 100;
  }

  /* ---------- Digitalarkivet ---------- */
  // Bare en lenke til Digitalarkivets eget detaljerte personsøk (GET-skjema). Ingen henting.
  // Feltnavn sjekket mot skjemaet på digitalarkivet.no/search/persons/advanced 20.11.2026.
  function digitalarkivetLenke(p) {
    var q = [];
    var fornavn = String(p.fornavn || "").trim().split(/\s+/)[0] || "";
    if (fornavn) q.push("firstname=" + encodeURIComponent(fornavn));
    if (p.etternavn) q.push("lastname=" + encodeURIComponent(String(p.etternavn).trim()));
    var aar = aarFra(p.fodt && p.fodt.dato);
    if (aar !== null) {
      q.push("birth_year_from=" + (aar - 2));
      q.push("birth_year_to=" + (aar + 2));
    }
    var sted = String((p.fodt && p.fodt.sted) || "").split(",")[0].trim();
    if (sted) q.push("birth_place=" + encodeURIComponent(sted));
    return "https://www.digitalarkivet.no/search/persons/advanced?" + q.join("&");
  }

  /* ---------- GEDCOM: lesing ---------- */
  // Leser GEDCOM 7 og 5.5.1 til en enkel trestruktur av linjer.
  function lesLinjer(tekst) {
    var s = String(tekst || "").replace(/^﻿/, "");
    var rader = s.split(/\r\n|\r|\n/);
    var rot = { barn: [] }, stabel = [rot], feil = [];
    for (var i = 0; i < rader.length; i++) {
      var r = rader[i].replace(/^\s+/, "");
      if (!r) continue;
      var m = r.match(/^(\d+)\s+(?:(@[^@\s]+@)\s+)?([A-Za-z0-9_]+)(?:\s(.*))?$/);
      if (!m) { feil.push("Linje " + (i + 1) + " ble ikke forstått"); continue; }
      var niva = parseInt(m[1], 10);
      var verdi = m[4] === undefined ? "" : m[4];
      if (verdi.indexOf("@@") === 0) verdi = verdi.slice(1);
      var node = { niva: niva, xref: m[2] || null, tag: m[3].toUpperCase(), verdi: verdi, barn: [] };
      if (node.tag === "CONT" || node.tag === "CONC") {
        var forelder = stabel[niva];
        if (forelder && forelder !== rot) forelder.verdi += (node.tag === "CONT" ? "\n" : "") + verdi;
        continue;
      }
      while (stabel.length > niva + 1) stabel.pop();
      var mor = stabel[niva];
      if (!mor) { feil.push("Linje " + (i + 1) + " har feil nivå"); continue; }
      mor.barn.push(node);
      stabel[niva + 1] = node;
      stabel.length = niva + 2;
    }
    return { noder: rot.barn, feil: feil };
  }
  function finn(node, tag) { for (var i = 0; i < node.barn.length; i++) if (node.barn[i].tag === tag) return node.barn[i]; return null; }
  function alle(node, tag) { return node.barn.filter(function (b) { return b.tag === tag; }); }
  function hendelse(node) {
    if (!node) return null;
    var d = finn(node, "DATE"), p = finn(node, "PLAC");
    return { dato: d ? d.verdi.trim() : "", sted: p ? p.verdi.trim() : "", merket: node.verdi.trim().toUpperCase() === "Y" };
  }
  function lesKilder(node) {
    return alle(node, "_KILDE").map(function (k) {
      var u = finn(k, "_URL"), t = finn(k, "_TYPE"), a = finn(k, "_AV"), d = finn(k, "_DATO");
      var type = t ? t.verdi.trim() : "annen";
      if (KILDETYPER.indexOf(type) < 0) type = "annen";
      return { type: type, tekst: k.verdi, url: u ? u.verdi.trim() : "", av: a ? a.verdi : "", dato: d ? d.verdi : "" };
    });
  }

  // Returnerer { personer: {id: person}, familier: {id: familie}, feil: [] }
  // Alle koblinger fra en import får "importert" til noen legger på kilde,
  // unntatt der fila allerede har kildemerker fra denne modulen (_KILDE).
  function fraGedcom(tekst) {
    var lest = lesLinjer(tekst);
    var personer = {}, familier = {}, feil = lest.feil.slice();
    var harHead = lest.noder.length && lest.noder[0].tag === "HEAD";
    if (!harHead) feil.push("Fila mangler HEAD-linje. Leser likevel det som går.");
    lest.noder.forEach(function (n) {
      if (n.tag === "INDI") {
        if (!n.xref) { feil.push("Person uten ID hoppet over"); return; }
        var navn = finn(n, "NAME"), fornavn = "", etternavn = "";
        if (navn) {
          var gv = finn(navn, "GIVN"), sv = finn(navn, "SURN");
          var mm = navn.verdi.match(/^([^\/]*)\/([^\/]*)\/?(.*)$/);
          if (mm) { fornavn = (mm[1] + " " + mm[3]).trim(); etternavn = mm[2].trim(); }
          else fornavn = navn.verdi.trim();
          if (gv && !fornavn) fornavn = gv.verdi.trim();
          if (sv && !etternavn) etternavn = sv.verdi.trim();
        }
        var sex = finn(n, "SEX"), sens = finn(n, "_SENSITIV"), eks = finn(n, "_EKSEMPEL");
        personer[n.xref] = {
          id: n.xref, fornavn: fornavn, etternavn: etternavn,
          kjonn: sex ? sex.verdi.trim().toUpperCase().charAt(0) : "U",
          fodt: hendelse(finn(n, "BIRT")) || { dato: "", sted: "" },
          dod: hendelse(finn(n, "DEAT")),
          sensitiv: sens ? sens.verdi : "",
          eksempel: !!eks
        };
      }
    });
    lest.noder.forEach(function (n) {
      if (n.tag !== "FAM") return;
      if (!n.xref) { feil.push("Familie uten ID hoppet over"); return; }
      var h = finn(n, "HUSB"), w = finn(n, "WIFE");
      var f = { id: n.xref, husb: h ? h.verdi.trim() : null, wife: w ? w.verdi.trim() : null, chil: [] };
      var parMerke = lesKilder(n), parOm = finn(n, "_OMSTRIDT");
      f.par = { kilder: parMerke, importert: true, omstridt: !!parOm };
      alle(n, "CHIL").forEach(function (c) {
        var kilder = lesKilder(c), om = finn(c, "_OMSTRIDT");
        f.chil.push({ id: c.verdi.trim(), kilder: kilder, importert: true, omstridt: !!om });
      });
      [f.husb, f.wife].concat(f.chil.map(function (c) { return c.id; })).forEach(function (id) {
        if (id && !personer[id]) feil.push("Familie " + n.xref + " peker på ukjent person " + id);
      });
      familier[n.xref] = f;
    });
    return { personer: personer, familier: familier, feil: feil };
  }

  /* ---------- GEDCOM: skriving (7.0) ---------- */
  function trygg(v) {
    var s = String(v == null ? "" : v);
    return s.indexOf("@") === 0 ? "@" + s : s;
  }
  function tekstLinjer(niva, tag, verdi, ut) {
    var deler = String(verdi).split(/\r\n|\r|\n/);
    ut.push(niva + " " + tag + (deler[0] !== "" ? " " + trygg(deler[0]) : ""));
    for (var i = 1; i < deler.length; i++) ut.push((niva + 1) + " CONT" + (deler[i] !== "" ? " " + trygg(deler[i]) : ""));
  }
  function skrivHendelse(tag, h, ut) {
    if (!h || !(h.dato || h.sted || h.merket)) return;
    ut.push("1 " + tag + (!h.dato && !h.sted ? " Y" : ""));
    if (h.dato) ut.push("2 DATE " + trygg(h.dato));
    if (h.sted) tekstLinjer(2, "PLAC", h.sted, ut);
  }
  function skrivKilder(niva, kobling, ut) {
    if (!kobling) return;
    if (kobling.omstridt) ut.push(niva + " _OMSTRIDT Y");
    (kobling.kilder || []).forEach(function (k) {
      tekstLinjer(niva, "_KILDE", k.tekst || "", ut);
      ut.push((niva + 1) + " _TYPE " + k.type);
      if (k.url) ut.push((niva + 1) + " _URL " + trygg(k.url));
      if (k.av) tekstLinjer(niva + 1, "_AV", k.av, ut);
      if (k.dato) ut.push((niva + 1) + " _DATO " + trygg(k.dato));
    });
  }

  // valg: { utenLevende: bool, medSensitiv: bool, iDag: Date }
  function tilGedcom(data, valg) {
    valg = valg || {};
    var ut = [
      "0 HEAD", "1 GEDC", "2 VERS 7.0",
      "1 SCHMA",
      "2 TAG _KILDE https://test.voteapp.eu/slekt/#kildemerke",
      "2 TAG _TYPE https://test.voteapp.eu/slekt/#kildemerke",
      "2 TAG _URL https://test.voteapp.eu/slekt/#kildemerke",
      "2 TAG _AV https://test.voteapp.eu/slekt/#kildemerke",
      "2 TAG _DATO https://test.voteapp.eu/slekt/#kildemerke",
      "2 TAG _OMSTRIDT https://test.voteapp.eu/slekt/#kildemerke",
      "2 TAG _SENSITIV https://test.voteapp.eu/slekt/#sensitiv",
      "2 TAG _EKSEMPEL https://test.voteapp.eu/slekt/#eksempel",
      "1 SOUR VOTEAPP-SLEKT", "2 NAME VoteApp slekt (prototype)"
    ];
    var personer = data.personer || {}, familier = data.familier || {};
    var med = {};
    Object.keys(personer).forEach(function (id) {
      if (valg.utenLevende && erLevende(personer[id], valg.iDag)) return;
      med[id] = true;
    });
    var famc = {}, fams = {};
    Object.keys(familier).forEach(function (fid) {
      var f = familier[fid];
      [f.husb, f.wife].forEach(function (id) { if (id) (fams[id] = fams[id] || []).push(fid); });
      f.chil.forEach(function (c) { (famc[c.id] = famc[c.id] || []).push(fid); });
    });
    Object.keys(personer).forEach(function (id) {
      if (!med[id]) return;
      var p = personer[id];
      ut.push("0 " + id + " INDI");
      ut.push("1 NAME " + trygg((p.fornavn || "") + " /" + (p.etternavn || "") + "/").replace(/^ /, ""));
      if (p.kjonn && /^[MFX]$/.test(p.kjonn)) ut.push("1 SEX " + p.kjonn);
      skrivHendelse("BIRT", p.fodt, ut);
      skrivHendelse("DEAT", p.dod, ut);
      if (valg.medSensitiv && p.sensitiv) tekstLinjer(1, "_SENSITIV", p.sensitiv, ut);
      if (p.eksempel) ut.push("1 _EKSEMPEL Y");
      (famc[id] || []).forEach(function (f) { ut.push("1 FAMC " + f); });
      (fams[id] || []).forEach(function (f) { ut.push("1 FAMS " + f); });
    });
    Object.keys(familier).forEach(function (fid) {
      var f = familier[fid];
      var husb = f.husb && med[f.husb] ? f.husb : null, wife = f.wife && med[f.wife] ? f.wife : null;
      var barn = f.chil.filter(function (c) { return med[c.id]; });
      if (!husb && !wife && !barn.length) return;
      ut.push("0 " + fid + " FAM");
      if (husb) ut.push("1 HUSB " + husb);
      if (wife) ut.push("1 WIFE " + wife);
      skrivKilder(1, f.par, ut);
      barn.forEach(function (c) { ut.push("1 CHIL " + c.id); skrivKilder(2, c, ut); });
    });
    ut.push("0 TRLR");
    return ut.join("\n") + "\n";
  }

  return {
    MERKER: MERKER, KILDETYPER: KILDETYPER, GRENSE_AAR: GRENSE_AAR,
    merkeFor: merkeFor, tilGedDato: tilGedDato, tilSkjemaDato: tilSkjemaDato, visDato: visDato, aarFra: aarFra,
    erLevende: erLevende, erBarn: erBarn, alder: alder, sensitivSkjultForAndre: sensitivSkjultForAndre,
    digitalarkivetLenke: digitalarkivetLenke,
    lesLinjer: lesLinjer, fraGedcom: fraGedcom, tilGedcom: tilGedcom
  };
});
