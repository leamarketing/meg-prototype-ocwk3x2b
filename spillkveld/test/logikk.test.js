// Kjør: node --test spillkveld/test/logikk.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../logikk.js");

const folk = [
  { id: "a", navn: "A", alder: 44, gruppe: "voksne", avstand: false },
  { id: "b", navn: "B", alder: 9, gruppe: "barn812", avstand: false },
  { id: "c", navn: "C", alder: 74, gruppe: "besteforeldre", avstand: true }
];
const datoer = [{ id: "d1" }, { id: "d2" }, { id: "d3" }];

test("datoer: flest ja vinner, lik vekt per person", () => {
  const t = L.tellDatoer(datoer, { a: { d1: "ja", d2: "ja" }, b: { d2: "ja" }, c: { d1: "kanskje", d2: "nei" } }, folk);
  assert.equal(t.besteId, "d2");
  const d2 = t.rader.find(r => r.id === "d2");
  assert.deepEqual([d2.ja.length, d2.kanskje.length, d2.nei.length, d2.ubesvart.length], [2, 0, 1, 0]);
  assert.equal(t.rader.find(r => r.id === "d3").ubesvart.length, 3);
  assert.equal(t.likt, false);
});

test("datoer: likt ja avgjøres av kanskje, så rekkefølge", () => {
  let t = L.tellDatoer(datoer, { a: { d1: "ja", d2: "ja" }, b: { d2: "kanskje" } }, folk);
  assert.equal(t.besteId, "d2");
  t = L.tellDatoer(datoer, { a: { d1: "ja", d2: "ja" } }, folk);
  assert.equal(t.besteId, "d1");
  assert.equal(t.likt, true);
});

test("datoer: ingen svar gir ingen beste kveld", () => {
  assert.equal(L.tellDatoer(datoer, {}, folk).besteId, null);
});

test("datoer: ugyldig svar og svar fra ikke-deltaker telles ikke", () => {
  const t = L.tellDatoer(datoer, { a: { d1: "kanskje-ja" }, x: { d1: "ja" } }, folk);
  assert.equal(t.rader[0].ja.length, 0);
  assert.equal(t.rader[0].ubesvart.length, 3);
});

test("spill: én stemme per person, bare deltakere teller", () => {
  const t = L.tellSpill({ a: "s1", b: "s2", c: "s2", x: "s1", y: "finnes-ikke" }, folk, ["s1", "s2", "s3"]);
  assert.equal(t.avgitt, 3);
  assert.equal(t.mulige, 3);
  assert.deepEqual(t.liste.map(x => [x.id, x.stemmer]), [["s2", 2], ["s1", 1], ["s3", 0]]);
  assert.deepEqual(t.ledere, ["s2"]);
  assert.equal(t.uavgjort, false);
});

test("spill: likt i ledelsen meldes som uavgjort", () => {
  const t = L.tellSpill({ a: "s1", b: "s2" }, folk, ["s1", "s2"]);
  assert.equal(t.uavgjort, true);
  assert.deepEqual(t.ledere, ["s1", "s2"]);
});

test("spill: ingen stemmer gir ingen leder", () => {
  const t = L.tellSpill({}, folk, ["s1"]);
  assert.deepEqual(t.ledere, []);
  assert.equal(t.uavgjort, false);
});

test("forslag: alder, antall og avstand styrer, ukjent stenger ikke ute", () => {
  const bib = [
    { id: "bord8", alderFra: 8, min: 2, maks: 5, modus: "hjemme", grupper: [] },
    { id: "nett", alderFra: 0, min: 1, maks: 8, modus: "begge", grupper: ["besteforeldre"] },
    { id: "ung", alderFra: 12, min: 1, maks: 8, modus: "begge", grupper: [] },
    { id: "liten", alderFra: 0, min: 1, maks: 2, modus: "begge", grupper: [] },
    { id: "ukjent", alderFra: null, min: null, maks: null, modus: "begge", grupper: [] }
  ];
  const r = L.foreslaSpill(bib, folk, 5);
  assert.deepEqual(r.forslag.map(f => f.id), ["nett", "ukjent"]);
  assert.deepEqual(r.forslag[1].mangler, ["alder", "antall spillere"]);
  const ute = Object.fromEntries(r.utelatt.map(u => [u.id, u.grunner.join("; ")]));
  assert.match(ute.bord8, /avstand/);
  assert.match(ute.ung, /fra 12 år, yngste er 9/);
  assert.match(ute.liten, /maks 2 spillere/);
  assert.equal(r.yngste, 9);
  assert.equal(r.eldste, 74);
});

test("forslag: alle hjemme gir bordspill", () => {
  const hjemme = folk.map(p => ({ ...p, avstand: false }));
  const r = L.foreslaSpill([{ id: "bord8", alderFra: 8, min: 2, maks: 5, modus: "hjemme", grupper: [] }], hjemme, 5);
  assert.deepEqual(r.forslag.map(f => f.id), ["bord8"]);
});

// ---------- Kalenderfil ----------
function lagEksempel(over) {
  return L.lagIcs(Object.assign({
    uid: "spillkveld-test-123@test.voteapp.eu", dato: "2026-11-27", tid: "19:00", varighetMin: 150,
    tittel: "Familiens spillkveld: Kahoot! familiequiz", sted: "Hjemme hos Ingrid og Pål, Bergen; video for besteforeldre",
    beskrivelse: "Med: Ingrid (mamma), Pål (pappa), Ragnhild (mormor), Einar (morfar), Sofie, Jonas, Emma.\nEksempeldata. Spillvalget var rådgivende.",
    naa: new Date(Date.UTC(2026, 10, 20, 8, 30, 5))
  }, over || {}));
}

function avbrett(ics) { return ics.replace(/\r\n[ \t]/g, ""); }

test("ics: CRLF overalt, ingen nakne LF, slutter med CRLF", () => {
  const ics = lagEksempel();
  assert.ok(ics.endsWith("\r\n"));
  assert.equal(/[^\r]\n/.test(ics), false);
  assert.equal(/\r(?!\n)/.test(ics), false);
});

test("ics: ingen linje over 75 byte, og bretting gir original tilbake", () => {
  const ics = lagEksempel();
  for (const linje of ics.split("\r\n")) assert.ok(Buffer.byteLength(linje, "utf8") <= 75, linje);
  assert.match(avbrett(ics), /DESCRIPTION:Med: Ingrid \(mamma\)\\, Pål \(pappa\)\\, .*\\nEksempeldata\. Spillvalget var rådgivende\./);
});

test("ics: struktur, påkrevde felt og tider", () => {
  const linjer = avbrett(lagEksempel()).split("\r\n").filter(Boolean);
  assert.equal(linjer[0], "BEGIN:VCALENDAR");
  assert.equal(linjer[linjer.length - 1], "END:VCALENDAR");
  // BEGIN/END i riktig rekkefølge
  const stabel = [];
  for (const l of linjer) {
    if (l.startsWith("BEGIN:")) stabel.push(l.slice(6));
    if (l.startsWith("END:")) assert.equal(stabel.pop(), l.slice(4));
  }
  assert.equal(stabel.length, 0);
  assert.ok(linjer.includes("VERSION:2.0"));
  assert.ok(linjer.some(l => l.startsWith("PRODID:")));
  const ev = linjer.slice(linjer.indexOf("BEGIN:VEVENT"), linjer.indexOf("END:VEVENT"));
  const felt = n => ev.filter(l => l.split(/[:;]/)[0] === n);
  for (const n of ["UID", "DTSTAMP", "DTSTART", "DTEND", "SUMMARY"]) assert.equal(felt(n).length, 1, n);
  assert.equal(felt("UID")[0], "UID:spillkveld-test-123@test.voteapp.eu");
  assert.equal(felt("DTSTAMP")[0], "DTSTAMP:20261120T083005Z");
  assert.equal(felt("DTSTART")[0], "DTSTART;TZID=Europe/Oslo:20261127T190000");
  assert.equal(felt("DTEND")[0], "DTEND;TZID=Europe/Oslo:20261127T213000");
  assert.ok(linjer.includes("TZID:Europe/Oslo"));
  assert.equal(linjer.filter(l => l === "BEGIN:VALARM").length, 2);
  assert.match(felt("LOCATION")[0], /Bergen\\; video/);
});

test("ics: kveld over midnatt går til neste dag og neste måned", () => {
  const ics = avbrett(lagEksempel({ dato: "2026-11-30", tid: "23:00", varighetMin: 120 }));
  assert.match(ics, /DTSTART;TZID=Europe\/Oslo:20261130T230000/);
  assert.match(ics, /DTEND;TZID=Europe\/Oslo:20261201T010000/);
});

test("ics: escaping av spesialtegn", () => {
  assert.equal(L.escapeTekst("a,b;c\\d\ne"), "a\\,b\\;c\\\\d\\ne");
});

test("bretting deler aldri et tegn med flere byte", () => {
  const lang = "SUMMARY:" + "æøå".repeat(40);
  const brettet = L.brett(lang);
  for (const l of brettet.split("\r\n")) assert.ok(Buffer.byteLength(l) <= 75);
  assert.equal(brettet.replace(/\r\n /g, ""), lang);
});
