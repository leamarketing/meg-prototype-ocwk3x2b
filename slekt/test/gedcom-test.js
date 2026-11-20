// Kjør: node slekt/test/gedcom-test.js
// Tester GEDCOM inn/ut rundtur, levende-regelen, kildemerker og Digitalarkivet-lenken.
"use strict";
var fs = require("fs"), path = require("path"), assert = require("assert");
var K = require("../kjerne.js");
var iDag = new Date("2026-11-20T12:00:00Z");
var ok = 0;
function t(navn, fn) { fn(); ok++; console.log("ok  " + navn); }

var eks = fs.readFileSync(path.join(__dirname, "..", "eksempel.ged"), "utf8");
var a = K.fraGedcom(eks);

t("eksempelfila leses uten feil", function () {
  assert.deepStrictEqual(a.feil, []);
  assert.strictEqual(Object.keys(a.personer).length, 14);
  assert.strictEqual(Object.keys(a.familier).length, 6);
  assert.strictEqual(a.personer["@I5@"].fodt.dato, "3 MAR 1921");
  assert.strictEqual(a.personer["@I1@"].fodt.sted, "Tromsø");
  assert.strictEqual(a.personer["@I4@"].etternavn, "Moen");
  assert.ok(a.personer["@I7@"].sensitiv.length > 0);
});

t("rundtur: ut og inn igjen gir samme data", function () {
  var ut = K.tilGedcom(a, { medSensitiv: true, iDag: iDag });
  var b = K.fraGedcom(ut);
  assert.deepStrictEqual(b.feil, []);
  assert.deepStrictEqual(b.personer, a.personer);
  assert.deepStrictEqual(b.familier, a.familier);
  // og en andre runde gir identisk tekst
  assert.strictEqual(K.tilGedcom(b, { medSensitiv: true, iDag: iDag }), ut);
  assert.ok(/^0 HEAD\n1 GEDC\n2 VERS 7\.0\n/.test(ut));
  assert.ok(/\n0 TRLR\n$/.test(ut));
});

t("sensitive felt er ikke med i eksport som standard", function () {
  var ut = K.tilGedcom(a, { iDag: iDag });
  assert.ok(ut.indexOf("1 _SENSITIV ") < 0);
  assert.ok(K.tilGedcom(a, { medSensitiv: true }).indexOf("1 _SENSITIV ") > 0);
});

t("eksport uten levende personer fjerner dem og koblingene deres", function () {
  var ut = K.tilGedcom(a, { utenLevende: true, iDag: iDag });
  var b = K.fraGedcom(ut);
  assert.deepStrictEqual(b.feil, []);
  ["@I1@", "@I2@", "@I3@", "@I4@", "@I8@", "@I12@", "@I13@"].forEach(function (id) { assert.ok(!b.personer[id], id + " skulle vært utelatt"); });
  ["@I5@", "@I14@"].forEach(function (id) { assert.ok(b.personer[id], id + " mangler"); });
  assert.ok(!b.familier["@F1@"], "F1 har bare levende og skal bort");
});

t("GEDCOM 5.5.1 leses (GIVN/SURN, DEAT Y, CONT, CHAR)", function () {
  var c = K.fraGedcom(fs.readFileSync(path.join(__dirname, "liten-551.ged"), "utf8"));
  assert.deepStrictEqual(c.feil, []);
  assert.strictEqual(c.personer["@P1@"].fornavn, "Test");
  assert.strictEqual(c.personer["@P1@"].etternavn, "Eksempelsen");
  assert.strictEqual(c.personer["@P1@"].fodt.sted, "Testvik, Troms");
  assert.strictEqual(K.erLevende(c.personer["@P1@"], iDag), false);
  assert.deepStrictEqual(c.familier["@FA@"].chil.map(function (x) { return x.id; }), ["@P3@"]);
  assert.strictEqual(K.merkeFor(c.familier["@FA@"].chil[0]), "importert");
});

t("levende-regelen: 110 år og dødsdato", function () {
  var P = a.personer;
  assert.strictEqual(K.erLevende(P["@I1@"], iDag), true, "født 1985, ingen død");
  assert.strictEqual(K.erLevende(P["@I8@"], iDag), true, "født 1922 (104 år), ingen død = antatt levende");
  assert.strictEqual(K.erLevende(P["@I14@"], iDag), false, "født ca. 1855, over 110 år");
  assert.strictEqual(K.erLevende(P["@I5@"], iDag), false, "har dødsdato");
  assert.strictEqual(K.erLevende({ fodt: { dato: "" }, dod: null }, iDag), true, "ukjent fødsel = levende");
  assert.strictEqual(K.erLevende({ fodt: { dato: "1917" }, dod: null }, iDag), true, "109 år: fortsatt antatt levende");
  assert.strictEqual(K.erLevende({ fodt: { dato: "1916" }, dod: null }, iDag), false, "110 år: grensen");
  assert.strictEqual(K.erLevende({ fodt: { dato: "1990" }, dod: { dato: "", sted: "", merket: true } }, iDag), false, "DEAT Y = død");
  assert.strictEqual(K.erBarn(P["@I12@"], iDag), true, "født 2015 = barn under 16");
  assert.strictEqual(K.erBarn(P["@I1@"], iDag), false);
  assert.strictEqual(K.sensitivSkjultForAndre(P["@I7@"], iDag), true, "død 1980, under 100 år siden");
});

t("kildemerker: DNA blir aldri Bekreftet, omstridt vises først", function () {
  assert.strictEqual(K.merkeFor({ kilder: [{ type: "dna" }] }), "dna");
  assert.ok(/^Støttet/.test(K.MERKER.dna.tekst));
  assert.strictEqual(K.merkeFor({ kilder: [{ type: "dna" }, { type: "muntlig" }] }), "dna");
  assert.strictEqual(K.merkeFor({ kilder: [{ type: "muntlig" }, { type: "kirkebok" }] }), "kirkebok");
  assert.strictEqual(K.merkeFor({ omstridt: true, kilder: [{ type: "kirkebok" }] }), "omstridt");
  assert.strictEqual(K.merkeFor({ kilder: [] }), "ingen");
  assert.strictEqual(K.merkeFor({ kilder: [{ type: "bekreftet" }] }), "ingen", "ukjent type gir ikke Bekreftet");
  var f2 = a.familier["@F2@"];
  assert.strictEqual(K.merkeFor(f2.chil[1]), "dna");
  assert.strictEqual(K.merkeFor(a.familier["@F5@"].chil[0]), "omstridt");
  assert.strictEqual(K.merkeFor(a.familier["@F4@"].chil[0]), "importert");
});

t("datoer: norsk inn, GEDCOM lagret, norsk ut", function () {
  assert.strictEqual(K.tilGedDato("12.03.1921"), "12 MAR 1921");
  assert.strictEqual(K.tilGedDato("1921"), "1921");
  assert.strictEqual(K.tilGedDato("ca 1890"), "ABT 1890");
  assert.strictEqual(K.visDato("12 MAR 1921"), "12. mars 1921");
  assert.strictEqual(K.visDato("ABT 1888"), "ca. 1888");
  assert.strictEqual(K.aarFra("3 MAR 1921"), 1921);
  ["3 MAR 1921", "MAY 1985", "ABT 1888", "1956", "BEF 1900"].forEach(function (d) {
    assert.strictEqual(K.tilGedDato(K.tilSkjemaDato(d)), d, "skjema-rundtur for " + d);
  });
});

t("Digitalarkivet-lenke har riktige feltnavn", function () {
  var u = K.digitalarkivetLenke(a.personer["@I5@"]);
  assert.strictEqual(u, "https://www.digitalarkivet.no/search/persons/advanced?firstname=Johan&lastname=Strandli&birth_year_from=1919&birth_year_to=1923&birth_place=Skjerv%C3%B8y");
});

t("verdier som starter med @ dobles og tolkes tilbake", function () {
  var d = { personer: { "@X1@": { id: "@X1@", fornavn: "A", etternavn: "B", kjonn: "U", fodt: { dato: "", sted: "@hjemme", merket: false }, dod: null, sensitiv: "", eksempel: false } }, familier: {} };
  var ut = K.tilGedcom(d);
  assert.ok(ut.indexOf("2 PLAC @@hjemme") > 0);
  assert.strictEqual(K.fraGedcom(ut).personer["@X1@"].fodt.sted, "@hjemme");
});

console.log(ok + " tester bestått");
