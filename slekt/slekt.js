/* Slekt (prototype): skjermen. Alt lagres i localStorage i denne nettleseren.
   Strøm: ingen gjentakende tidtakere (bare én engangs-opprydding etter nedlasting), ingen løkker i bakgrunnen, ingen animasjon, ingen autoplay.
   Eksempeldata hentes først når man trykker på knappen. */
(function () {
  "use strict";
  var K = window.SlektKjerne;
  var NOKKEL = "voteapp-slekt-prototype-v1";
  var MEDLEMMER = ["Kari", "Erik", "Per", "Ingrid"]; // oppdiktet familiegruppe for demo
  var SYMBOL = { kirkebok: "✓", folketelling: "✓", annen: "+", dna: "◆", muntlig: "“", importert: "↓", ingen: "○", omstridt: "!" };
  var KREVER = {
    kirkebok: ["Dåp, vielse eller begravelse viser koblingen", "Lenke til bildeside i Digitalarkivet og avskrift"],
    folketelling: ["Personene bor sammen med oppgitt slektsrolle", "Lenke til folketellingsside"],
    annen: ["Bygdebok, gravminne, skifte, attest, Histreg", "Lenke eller eget dokument, og sidetall"],
    dna: ["DNA-treff som passer koblingen", "Samtykke fra begge, tjeneste og cM"],
    muntlig: ["Familiefortelling, ingen kilde ennå", "Hvem som har fortalt, og når"],
    omstridt: ["Kilder eller familiemedlemmer er uenige", "Åpen diskusjon i familiesakene"],
    importert: ["Kom fra en GEDCOM-fil", "Noen må legge på en kilde"],
    ingen: ["Lagt inn uten kilde", "Legg på en kilde når du finner en"]
  };

  var $ = function (id) { return document.getElementById(id); };
  var data = tom();
  var angre = []; // øyeblikksbilder i minnet, ikke lagret
  var visning = "eier";
  var sistFokus = null;

  function tom() { return { versjon: 1, rot: null, personer: {}, familier: {}, saker: {}, logg: [], neste: 1 }; }

  /* ---------- Lagring ---------- */
  function last() {
    try {
      var s = localStorage.getItem(NOKKEL);
      if (s) { var d = JSON.parse(s); if (d && d.personer) data = Object.assign(tom(), d); }
    } catch (e) { melding("Kunne ikke lese lagret tre i nettleseren."); }
  }
  function lagre() {
    try { localStorage.setItem(NOKKEL, JSON.stringify(data)); }
    catch (e) { melding("Nettleseren lar ikke prototypen lagre (privat modus eller fullt lager). Endringen gjelder til du lukker siden."); }
  }
  // Alle endringer går gjennom denne: øyeblikksbilde for angre, logg, lagre, tegn på nytt.
  function endre(tekst, fn) {
    angre.push(JSON.stringify(data));
    if (angre.length > 20) angre.shift();
    fn();
    data.logg.unshift({ tid: new Date().toISOString(), tekst: tekst });
    if (data.logg.length > 200) data.logg.length = 200;
    lagre();
    tegn();
  }
  function nyId(prefiks) {
    var id;
    do { id = "@" + prefiks + (data.neste++) + "@"; } while (data.personer[id] || data.familier[id]);
    return id;
  }

  /* ---------- Hjelpere ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function melding(t) { var el = $("status"); el.textContent = ""; el.textContent = t; }
  function P(id) { return data.personer[id]; }
  function fulltNavn(p) { return ((p.fornavn || "") + " " + (p.etternavn || "")).trim() || "(uten navn)"; }
  function levende(p) { return K.erLevende(p); }
  function skjult(p) {
    if (visning === "eier" || !p) return false;
    if (K.erBarn(p)) return "barn";
    if (levende(p) && !p.samtykke) return "levende";
    return false;
  }
  function visNavn(p) {
    var s = skjult(p);
    if (s === "barn") return "Barn (vises bare for eieren)";
    if (s === "levende") return "Levende person · " + (p.etternavn || "ukjent etternavn");
    return fulltNavn(p);
  }
  function aarTekst(p) {
    if (skjult(p)) return "";
    var f = K.aarFra(p.fodt && p.fodt.dato), d = K.aarFra(p.dod && p.dod.dato);
    if (f === null && d === null) return p.dod ? "død, år ukjent" : "";
    return (f !== null ? f : "?") + (p.dod ? " til " + (d !== null ? d : "?") : "");
  }
  function merkeHtml(kobling) {
    var m = K.merkeFor(kobling), info = K.MERKER[m];
    return '<span class="merke ' + info.klasse + '"><span class="sym" aria-hidden="true">' + SYMBOL[m] + "</span>" + esc(info.tekst) + "</span>";
  }
  function statusTag(p) {
    if (levende(p)) {
      var a = K.alder(p);
      return a === null ? "Antatt levende (fødselsår ukjent)" : (a >= 90 ? "Antatt levende (ingen dødsdato)" : "Levende");
    }
    return "Avdød";
  }

  /* ---------- Familieoppslag ---------- */
  function foreldreFam(id) {
    for (var fid in data.familier) {
      var f = data.familier[fid];
      for (var i = 0; i < f.chil.length; i++) if (f.chil[i].id === id) return { fam: f, kobling: f.chil[i] };
    }
    return null;
  }
  function egneFam(id) {
    return Object.keys(data.familier).map(function (k) { return data.familier[k]; }).filter(function (f) { return f.husb === id || f.wife === id; });
  }
  function foreldre(id) {
    var ff = foreldreFam(id);
    if (!ff) return [];
    return [ff.fam.husb, ff.fam.wife].filter(Boolean);
  }
  function sosken(id) {
    var ff = foreldreFam(id);
    if (!ff) return [];
    return ff.fam.chil.map(function (c) { return c.id; }).filter(function (x) { return x !== id; });
  }
  function partnere(id) {
    var ut = [];
    egneFam(id).forEach(function (f) { var o = f.husb === id ? f.wife : f.husb; if (o) ut.push({ id: o, fam: f }); });
    return ut;
  }
  function barn(id) {
    var ut = [];
    egneFam(id).forEach(function (f) { f.chil.forEach(function (c) { ut.push({ id: c.id, fam: f, kobling: c }); }); });
    return ut;
  }

  /* ---------- Tegning ---------- */
  function tegn() {
    var har = Object.keys(data.personer).length > 0;
    $("start").hidden = har;
    $("tre").hidden = !har;
    $("angre-knapp").disabled = angre.length === 0;
    if (data.rot && !data.personer[data.rot]) data.rot = Object.keys(data.personer)[0] || null;
    if (!data.rot && har) data.rot = Object.keys(data.personer)[0];
    tegnMerketabell();
    tegnLogg();
    if (!har) { $("saker").hidden = true; return; }
    $("visning-forklaring").textContent = visning === "eier"
      ? "Du ser alt du selv har lagt inn. Sensitive felt er likevel skjult til du åpner dem."
      : "Slik ser en slektning treet: levende personer uten samtykke vises bare med etternavn, barn under 16 år vises ikke, og sensitive felt er skjult.";
    tegnGenerasjoner();
    tegnAlle();
    tegnSaker();
  }

  function personKort(id, ekstra) {
    var p = P(id);
    if (!p) return "";
    var s = skjult(p);
    var h = '<li class="person' + (id === data.rot ? " rot" : "") + '">';
    h += '<span class="pname">' + esc(visNavn(p)) + (id === data.rot ? ' <span class="tag">deg</span>' : "") + "</span>";
    var aar = aarTekst(p);
    if (aar) h += '<span class="muted small">' + esc(aar) + "</span>";
    if (!s) h += '<span><span class="tag">' + esc(statusTag(p)) + "</span>" + (p.eksempel ? ' <span class="tag">eksempeldata</span>' : "") + "</span>";
    if (ekstra && !s) h += ekstra;
    if (!s) h += '<span><button type="button" class="ghost" data-act="aapne" data-id="' + esc(id) + '">Åpne<span class="skip"> ' + esc(fulltNavn(p)) + "</span></button></span>";
    return h + "</li>";
  }
  function koblingTilBarn(id, barnId) {
    var ff = foreldreFam(barnId);
    if (!ff) return "";
    return '<span class="small">Forelder til ' + esc(visNavn(P(barnId))) + ": " + merkeHtml(ff.kobling) + "</span>";
  }

  function tegnGenerasjoner() {
    var rot = data.rot, rader = [];
    // Forfedre: opptil tre generasjoner over deg
    var navn = ["Foreldre", "Besteforeldre", "Oldeforeldre"];
    var lag = [rot];
    for (var g = 0; g < 3; g++) {
      var neste = [], kort = "";
      lag.forEach(function (bid) {
        foreldre(bid).forEach(function (fid) { neste.push(fid); kort += personKort(fid, koblingTilBarn(fid, bid)); });
      });
      if (!neste.length) break;
      rader.unshift({ tittel: navn[g], html: kort });
      lag = neste;
    }
    var midt = personKort(rot, foreldreFam(rot) ? '<span class="small">Kobling til foreldre: ' + merkeHtml(foreldreFam(rot).kobling) + "</span>" : "");
    partnere(rot).forEach(function (pt) { midt += personKort(pt.id, '<span class="small">Partner: ' + merkeHtml(pt.fam.par) + "</span>"); });
    sosken(rot).forEach(function (sid) { midt += personKort(sid, '<span class="small">Søsken, kobling til foreldre: ' + merkeHtml(foreldreFam(sid).kobling) + "</span>"); });
    rader.push({ tittel: "Du, partner og søsken", html: midt });
    var b = barn(rot), bk = "";
    b.forEach(function (x) { bk += personKort(x.id, '<span class="small">Kobling: ' + merkeHtml(x.kobling) + "</span>"); });
    if (b.length) rader.push({ tittel: "Barn", html: bk });

    var h = "";
    rader.forEach(function (r) { h += '<div class="gen"><h3>' + esc(r.tittel) + '</h3><ul class="gen-list">' + r.html + "</ul></div>"; });
    var rp = P(rot);
    if (visning === "eier") h += '<div class="row"><span class="muted small">Legg til hos ' + esc(fulltNavn(rp)) + ":</span>" +
      knappRel(rot, "far", "Far") + knappRel(rot, "mor", "Mor") + knappRel(rot, "sosken", "Søsken") +
      knappRel(rot, "barn", "Barn") + knappRel(rot, "partner", "Partner") + "</div>";
    if (visning === "eier") h += '<p class="muted small">Besteforeldre og oldeforeldre legger du til ved å åpne en av foreldrene og trykke «Far» eller «Mor» der.</p>';
    $("generasjoner").innerHTML = h;
  }
  function knappRel(id, rel, tekst) {
    return '<button type="button" class="ghost" data-act="ny-rel" data-id="' + esc(id) + '" data-rel="' + rel + '">+ ' + tekst + "</button>";
  }

  function tegnAlle() {
    var ids = Object.keys(data.personer);
    $("antall").textContent = ids.length;
    var h = "";
    ids.sort(function (a, b) { return (K.aarFra(P(a).fodt && P(a).fodt.dato) || 9999) - (K.aarFra(P(b).fodt && P(b).fodt.dato) || 9999); });
    ids.forEach(function (id) {
      var p = P(id), s = skjult(p);
      h += "<tr><td>" + (s ? esc(visNavn(p)) : '<button type="button" class="link" data-act="aapne" data-id="' + esc(id) + '">' + esc(fulltNavn(p)) + "</button>") +
        "</td><td>" + (s ? "" : esc(K.visDato(p.fodt && p.fodt.dato))) + "</td><td>" + (s ? "" : esc(p.dod ? (K.visDato(p.dod.dato) || "dato ukjent") : "")) +
        "</td><td>" + (s ? "Skjult" : esc(statusTag(p))) + "</td></tr>";
    });
    $("alle").innerHTML = h;
  }

  function tegnMerketabell() {
    var h = "";
    ["kirkebok", "folketelling", "annen", "dna", "muntlig", "omstridt", "importert", "ingen"].forEach(function (m) {
      h += "<tr><td>" + merkeHtml(m === "omstridt" ? { omstridt: true } : m === "importert" ? { importert: true, kilder: [] } : m === "ingen" ? { kilder: [] } : { kilder: [{ type: m }] }) +
        "</td><td>" + esc(KREVER[m][0]) + "</td><td>" + esc(KREVER[m][1]) + "</td></tr>";
    });
    $("merketabell").innerHTML = h;
  }
  function tegnLogg() {
    $("logg").innerHTML = data.logg.slice(0, 50).map(function (l) {
      var d = new Date(l.tid);
      return "<li>" + esc(d.toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" })) + ": " + esc(l.tekst) + "</li>";
    }).join("") || "<li>Ingen endringer ennå.</li>";
  }

  /* ---------- Familiesaker (demo) ---------- */
  function sakNokkel(famId, barnId) { return famId + "|" + barnId; }
  function sikreSak(famId, barnId) {
    var k = sakNokkel(famId, barnId);
    if (!data.saker[k]) {
      var f = data.familier[famId], b = P(barnId);
      var forel = [f.husb, f.wife].filter(Boolean).map(function (x) { return fulltNavn(P(x)); }).join(" og ") || "foreldrene";
      data.saker[k] = {
        sporsmal: "Er " + fulltNavn(b) + " barn av " + forel + "?",
        alternativer: [{ id: "a1", tekst: "Ja, koblingen stemmer slik treet viser nå" }, { id: "a2", tekst: "Nei, koblingen må endres" }],
        innlegg: [], stemmer: {}
      };
    }
    return data.saker[k];
  }
  function tegnSaker() {
    var nok = Object.keys(data.saker).filter(function (k) {
      var d = k.split("|"), f = data.familier[d[0]];
      if (!f || !P(d[1])) return false;
      var c = f.chil.filter(function (x) { return x.id === d[1]; })[0];
      return c && c.omstridt;
    });
    $("saker").hidden = nok.length === 0;
    var h = "";
    nok.forEach(function (k, i) {
      var s = data.saker[k], tall = {}, totalt = 0;
      s.alternativer.forEach(function (a) { tall[a.id] = 0; });
      Object.keys(s.stemmer).forEach(function (m) { if (tall[s.stemmer[m]] !== undefined) { tall[s.stemmer[m]]++; totalt++; } });
      var forst = s.alternativer.slice().sort(function (a, b) { return tall[b.id] - tall[a.id]; })[0];
      var likt = s.alternativer.filter(function (a) { return tall[a.id] === tall[forst.id]; }).length > 1;
      h += '<article class="kobling" aria-labelledby="sak-' + i + '"><h3 id="sak-' + i + '">' + esc(s.sporsmal) + "</h3>";
      h += '<ul class="plain">';
      s.alternativer.forEach(function (a) {
        var pst = totalt ? Math.round(100 * tall[a.id] / totalt) : 0;
        h += "<li><span>" + esc(a.tekst) + ": <strong>" + tall[a.id] + " av " + totalt + "</strong> stemmer</span>" +
          '<div class="bar" aria-hidden="true"><span style="width:' + pst + '%"></span></div></li>';
      });
      h += "</ul>";
      h += '<p class="small">' + (totalt === 0 ? "Ingen har stemt ennå." : likt ? "Likt antall stemmer. Treet viser begge versjoner." :
        "Vises først etter rådgivende stemme: <strong>" + esc(forst.tekst) + "</strong>. Kildemerket er fortsatt «Omstridt».") + "</p>";
      h += '<form class="grid" data-form="stem" data-sak="' + esc(k) + '"><fieldset><legend>Gi rådgivende stemme (demo)</legend>' +
        '<div class="field"><label for="stem-m-' + i + '">Stem som</label><select id="stem-m-' + i + '" name="medlem">' +
        MEDLEMMER.map(function (m) { return "<option>" + esc(m) + "</option>"; }).join("") + "</select></div>" +
        s.alternativer.map(function (a, j) { return '<label class="check"><input type="radio" name="alt" value="' + esc(a.id) + '"' + (j === 0 ? " required" : "") + "> " + esc(a.tekst) + "</label>"; }).join("") +
        '<p class="small muted">Én stemme per person. Du kan endre stemmen din.</p><div class="row"><button type="submit">Stem</button></div></fieldset></form>';
      var inn = s.innlegg.slice().sort(function (a, b) { return (b.kilde ? 1 : 0) - (a.kilde ? 1 : 0); });
      h += "<h4 class='skip'>Diskusjon</h4><ul class='plain'>";
      inn.forEach(function (x) {
        h += '<li class="innlegg' + (x.kilde ? " medkilde" : "") + '"><strong>' + esc(x.av) + "</strong>" + (x.kilde ? ' <span class="tag">med kilde</span>' : ' <span class="tag">uten kilde</span>') +
          "<p>" + esc(x.tekst) + "</p>" + (x.kilde ? '<p class="small muted">Kilde: ' + esc(x.kilde) + "</p>" : "") + "</li>";
      });
      h += "</ul>";
      h += '<form class="grid" data-form="innlegg" data-sak="' + esc(k) + '"><fieldset><legend>Skriv et innlegg (demo)</legend>' +
        '<div class="field"><label for="inn-m-' + i + '">Skrevet av</label><select id="inn-m-' + i + '" name="av">' + MEDLEMMER.map(function (m) { return "<option>" + esc(m) + "</option>"; }).join("") + "</select></div>" +
        '<div class="field"><label for="inn-t-' + i + '">Innlegg</label><textarea id="inn-t-' + i + '" name="tekst" required></textarea></div>' +
        '<div class="field"><label for="inn-k-' + i + '">Kilde (valgfritt, lenke eller beskrivelse)</label><input id="inn-k-' + i + '" name="kilde"></div>' +
        '<div class="row"><button type="submit">Legg til innlegg</button></div></fieldset></form>';
      h += '<form class="row" data-form="alternativ" data-sak="' + esc(k) + '"><div class="field" style="flex:1 1 220px"><label for="alt-' + i + '">Ny versjon å stemme over</label><input id="alt-' + i + '" name="tekst" required placeholder="F.eks. Nils er faren"></div><button type="submit" class="ghost">Legg til versjon</button></form>';
      h += "</article>";
    });
    $("sakliste").innerHTML = h;
  }

  /* ---------- Persondialog ---------- */
  // Husk knappen på selve siden som åpnet dialogen, så fokus kan gå tilbake dit.
  function apneDialog(d) {
    var a = document.activeElement;
    if (a && !a.closest("dialog")) sistFokus = a;
    if (!d.open) d.showModal();
  }
  function lukkDialog(d) {
    if (d.open) d.close();
  }
  ["dlg-person", "dlg-skjema", "dlg-bekreft"].forEach(function (id) {
    var d = $(id);
    d.addEventListener("close", function () {
      if (document.querySelector("dialog[open]")) return;
      if (sistFokus && document.body.contains(sistFokus)) sistFokus.focus();
      else { var h = $(Object.keys(data.personer).length ? "tre-h" : "start-h"); h.setAttribute("tabindex", "-1"); h.focus(); }
    });
  });

  function visPerson(id) {
    var p = P(id);
    if (!p) return;
    var vis = !skjult(p);
    var h = '<div class="dlg-head"><h2 id="dp-h">' + esc(visNavn(p)) + '</h2><button type="button" class="ghost" data-act="lukk">Lukk</button></div>';
    if (!vis) { $("dp-innhold").innerHTML = h + "<p>Denne personen er privat.</p>"; apneDialog($("dlg-person")); return; }
    h += '<p class="row"><span class="tag">' + esc(statusTag(p)) + "</span>" + (p.eksempel ? '<span class="tag">eksempeldata</span>' : "") + (id === data.rot ? '<span class="tag">deg</span>' : "") + "</p>";
    h += "<dl class='grid'>" +
      "<div><dt class='muted small'>Født</dt><dd>" + esc(K.visDato(p.fodt && p.fodt.dato) || "ukjent") + (p.fodt && p.fodt.sted ? ", " + esc(p.fodt.sted) : "") + "</dd></div>" +
      "<div><dt class='muted small'>Død</dt><dd>" + (p.dod ? esc(K.visDato(p.dod.dato) || "dato ukjent") + (p.dod.sted ? ", " + esc(p.dod.sted) : "") : "ingen dødsdato") + "</dd></div></dl>";
    if (levende(p) && K.alder(p) !== null && K.alder(p) >= 90) h += '<p class="small muted">Ingen dødsdato og født for under ' + K.GRENSE_AAR + " år siden, så prototypen regner personen som levende og privat.</p>";
    if (p.sensitiv) {
      h += visning === "eier"
        ? '<div><button type="button" class="ghost" data-act="vis-sensitiv" aria-expanded="false" aria-controls="sens-felt">Vis sensitivt felt</button><p class="sens" id="sens-felt" hidden></p></div>'
        : '<p class="small muted">Har et sensitivt felt som er skjult.</p>';
    }
    if (visning === "eier" && levende(p) && id !== data.rot) {
      h += '<label class="check"><input type="checkbox" data-act="samtykke" data-id="' + esc(id) + '"' + (p.samtykke ? " checked" : "") + "> Personen har selv sagt ja til å bli vist for familiegruppen (demo, ingen invitasjon sendes)</label>";
    }
    var da = K.digitalarkivetLenke(p);
    h += '<div class="row"><a class="btn ghost" href="' + esc(da) + '" target="_blank" rel="noopener noreferrer">Søk i Digitalarkivet<span class="skip"> (åpnes i ny fane, digitalarkivet.no)</span></a></div>';
    h += '<p class="small muted">Åpner Digitalarkivets eget søk med fornavn, etternavn, fødeår (pluss minus 2) og fødested fylt ut. Prototypen henter ingenting derfra. Finner du personen, lim inn lenken som kilde på koblingen.' +
      (levende(p) ? " Kirkebøker og folketellinger fra de siste 60 til 100 årene er som regel sperret, så nyere personer gir sjelden treff." : "") + "</p>";

    // Koblinger
    h += "<h3>Koblinger</h3><ul class='plain'>";
    var ff = foreldreFam(id);
    if (ff) h += koblingBoks("Barn av " + ([ff.fam.husb, ff.fam.wife].filter(Boolean).map(function (x) { return visNavn(P(x)); }).join(" og ") || "ukjente foreldre"), ff.fam.id, id, ff.kobling);
    partnere(id).forEach(function (pt) { h += koblingBoks("Partner med " + visNavn(P(pt.id)), pt.fam.id, "par", pt.fam.par); });
    barn(id).forEach(function (b) { h += koblingBoks("Forelder til " + visNavn(P(b.id)), b.fam.id, b.id, b.kobling); });
    h += "</ul>";
    if (!ff && !partnere(id).length && !barn(id).length) h += "<p class='muted'>Ingen koblinger ennå.</p>";

    if (visning === "eier") {
      h += '<h3>Legg til</h3><div class="row">' + knappRel(id, "far", "Far") + knappRel(id, "mor", "Mor") + knappRel(id, "sosken", "Søsken") + knappRel(id, "barn", "Barn") + knappRel(id, "partner", "Partner") + "</div>";
      h += '<div class="row"><button type="button" class="ghost" data-act="rediger" data-id="' + esc(id) + '">Rediger</button>' +
        (id !== data.rot ? '<button type="button" class="ghost" data-act="sett-rot" data-id="' + esc(id) + '">Vis treet fra denne personen</button>' : "") +
        '<button type="button" class="danger" data-act="slett-person" data-id="' + esc(id) + '">Slett personen</button></div>';
    }
    $("dp-innhold").innerHTML = h;
    $("dp-innhold").dataset.id = id;
    apneDialog($("dlg-person"));
  }

  function koblingBoks(tittel, famId, barnId, kobling) {
    var h = '<li class="kobling"><span><strong>' + esc(tittel) + "</strong></span><span>" + merkeHtml(kobling) + "</span>";
    var kilder = (kobling && kobling.kilder) || [];
    if (!kilder.length) h += '<span class="small muted">' + (kobling && kobling.importert ? "Importert fra fil, ingen kilde lagt på ennå." : "Ingen kilde ennå.") + "</span>";
    kilder.forEach(function (k) {
      h += '<div class="kilde"><span class="merke ' + K.MERKER[k.type].klasse + '"><span class="sym" aria-hidden="true">' + SYMBOL[k.type] + "</span>" + esc(K.MERKER[k.type].tekst) + "</span> " +
        esc(k.tekst || "") + (k.url ? ' <a href="' + esc(k.url) + '" target="_blank" rel="noopener noreferrer">Åpne kilden</a>' : "") +
        '<br><span class="muted small">Lagt inn av ' + esc(k.av || "ukjent") + (k.dato ? ", " + esc(new Date(k.dato).toLocaleDateString("nb-NO")) : "") + "</span></div>";
    });
    if (visning === "eier") {
      h += '<div class="row"><button type="button" class="ghost" data-act="ny-kilde" data-fam="' + esc(famId) + '" data-barn="' + esc(barnId) + '">Legg til kilde</button>';
      if (barnId !== "par") h += '<button type="button" class="ghost" data-act="omstridt" data-fam="' + esc(famId) + '" data-barn="' + esc(barnId) + '">' + (kobling && kobling.omstridt ? "Fjern «omstridt»" : "Merk som omstridt") + "</button>";
      h += "</div>";
    }
    return h + "</li>";
  }
  function finnKobling(famId, barnId) {
    var f = data.familier[famId];
    if (!f) return null;
    if (barnId === "par") return f.par || (f.par = { kilder: [] });
    return f.chil.filter(function (c) { return c.id === barnId; })[0] || null;
  }

  /* ---------- Skjema: person og kilde ---------- */
  var KJONN = { far: "M", mor: "F" };
  var RELNAVN = { far: "far", mor: "mor", sosken: "søsken", barn: "barn", partner: "partner" };
  function kildeFelt(standard) {
    return '<fieldset><legend>Kilde for koblingen</legend>' +
      '<div class="field"><label for="f-ktype">Hva bygger koblingen på?</label><select id="f-ktype" name="ktype">' +
      K.KILDETYPER.map(function (t) { return '<option value="' + t + '"' + (t === standard ? " selected" : "") + ">" + esc(K.MERKER[t].tekst) + "</option>"; }).join("") + "</select></div>" +
      '<p class="small muted" id="f-ktype-hjelp">DNA kan bare gi «Støttet», aldri «Bekreftet». Et DNA-treff krever samtykke fra begge.</p>' +
      '<div class="field"><label for="f-ktekst">Beskriv kilden</label><input id="f-ktekst" name="ktekst" placeholder="F.eks. Dåp i Skjervøy kirkebok 1921, eller: bestemor fortalte i 2019"></div>' +
      '<div class="field"><label for="f-kurl">Lenke til kilden (valgfritt)</label><input id="f-kurl" name="kurl" type="url" inputmode="url" placeholder="https://www.digitalarkivet.no/..."></div>' +
      '<div class="field"><label for="f-kav">Lagt inn av</label><input id="f-kav" name="kav" value="' + esc(data.rot && P(data.rot) ? P(data.rot).fornavn : "") + '"></div></fieldset>';
  }
  function visPersonSkjema(modus, id, rel) {
    var p = modus === "rediger" ? P(id) : { fornavn: "", etternavn: rel === "far" || rel === "barn" || rel === "sosken" ? (P(id).etternavn || "") : "", kjonn: KJONN[rel] || "U", fodt: { dato: "", sted: "" }, dod: null, sensitiv: "" };
    var tittel = modus === "rediger" ? "Rediger " + fulltNavn(p) : "Legg til " + RELNAVN[rel] + " til " + fulltNavn(P(id));
    var h = '<div class="dlg-head"><h2 id="ds-h">' + esc(tittel) + '</h2><button type="button" class="ghost" data-act="lukk">Avbryt</button></div>';
    h += '<p class="small muted" id="ds-feil" role="alert"></p><div class="grid">' +
      '<div class="field"><label for="f-fornavn">Fornavn</label><input id="f-fornavn" name="fornavn" required value="' + esc(p.fornavn) + '"></div>' +
      '<div class="field"><label for="f-etternavn">Etternavn</label><input id="f-etternavn" name="etternavn" value="' + esc(p.etternavn) + '"></div>' +
      '<div class="field"><label for="f-kjonn">Kjønn</label><select id="f-kjonn" name="kjonn">' +
      [["U", "Ikke oppgitt"], ["F", "Kvinne"], ["M", "Mann"], ["X", "Annet"]].map(function (o) { return '<option value="' + o[0] + '"' + (p.kjonn === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label for="f-fodt">Født (dag.måned.år, bare år, eller ca år)</label><input id="f-fodt" name="fodt" value="' + esc(K.tilSkjemaDato(p.fodt && p.fodt.dato)) + '"></div>' +
      '<div class="field"><label for="f-fsted">Fødested</label><input id="f-fsted" name="fsted" value="' + esc(p.fodt && p.fodt.sted) + '"></div>' +
      '<div class="field"><label for="f-dod">Død (la stå tomt hvis personen lever)</label><input id="f-dod" name="dod" value="' + esc(K.tilSkjemaDato(p.dod && p.dod.dato)) + '"></div>' +
      '<div class="field"><label for="f-dsted">Dødssted</label><input id="f-dsted" name="dsted" value="' + esc(p.dod && p.dod.sted) + '"></div>' +
      '<label class="check"><input type="checkbox" name="dodukjent"' + (p.dod && !p.dod.dato && !p.dod.sted ? " checked" : "") + "> Personen er død, men dato er ukjent</label></div>" +
      '<div class="field"><label for="f-sens">Sensitivt felt (valgfritt)</label><textarea id="f-sens" name="sensitiv" aria-describedby="f-sens-h">' + esc(p.sensitiv) + "</textarea>" +
      '<p class="small muted" id="f-sens-h">For adopsjon, dødsårsak, sykdom og lignende. Skjult som standard, og tas ikke med i GEDCOM-fila uten at du krysser av for det.</p></div>';
    if (modus === "ny") h += kildeFelt("muntlig");
    h += '<div class="row"><button type="submit">Lagre</button></div>';
    var f = $("ds-form");
    f.innerHTML = h;
    f.dataset.modus = modus; f.dataset.id = id; f.dataset.rel = rel || "";
    apneDialog($("dlg-skjema"));
    $("f-fornavn").focus();
  }
  function visKildeSkjema(famId, barnId) {
    var f = $("ds-form");
    f.innerHTML = '<div class="dlg-head"><h2 id="ds-h">Legg til kilde</h2><button type="button" class="ghost" data-act="lukk">Avbryt</button></div>' +
      '<p class="small muted" id="ds-feil" role="alert"></p>' + kildeFelt("kirkebok") + '<div class="row"><button type="submit">Lagre kilden</button></div>';
    f.dataset.modus = "kilde"; f.dataset.fam = famId; f.dataset.barn = barnId;
    apneDialog($("dlg-skjema"));
    $("f-ktype").focus();
  }
  function lesKilde(fd) {
    var tekst = (fd.get("ktekst") || "").trim(), url = (fd.get("kurl") || "").trim();
    if (url && !/^https?:\/\//i.test(url)) return { feil: "Lenken må starte med https:// eller http://" };
    var type = fd.get("ktype");
    if (K.KILDETYPER.indexOf(type) < 0) type = "muntlig";
    if (!tekst && !url && type !== "muntlig") return { feil: "Beskriv kilden eller lim inn en lenke." };
    return { type: type, tekst: tekst, url: url, av: (fd.get("kav") || "").trim(), dato: new Date().toISOString() };
  }
  function lesPerson(fd, p) {
    var fornavn = (fd.get("fornavn") || "").trim();
    if (!fornavn) return "Fornavn må fylles ut.";
    p.fornavn = fornavn;
    p.etternavn = (fd.get("etternavn") || "").trim();
    p.kjonn = fd.get("kjonn") || "U";
    p.fodt = { dato: K.tilGedDato(fd.get("fodt")), sted: (fd.get("fsted") || "").trim() };
    var dd = K.tilGedDato(fd.get("dod")), ds = (fd.get("dsted") || "").trim();
    p.dod = dd || ds || fd.get("dodukjent") ? { dato: dd, sted: ds, merket: !dd && !ds } : null;
    p.sensitiv = (fd.get("sensitiv") || "").trim();
    return null;
  }

  function nyRelasjon(id, rel, ny, kilde) {
    var kobling = { kilder: kilde ? [kilde] : [], importert: false, omstridt: false };
    if (rel === "far" || rel === "mor") {
      var slot = rel === "far" ? "husb" : "wife";
      var ff = foreldreFam(id);
      if (ff) {
        if (ff.fam[slot]) return "Personen har allerede en " + rel + " i treet. Er det uenighet, merk koblingen som omstridt.";
        ff.fam[slot] = ny.id;
        if (kilde) ff.kobling.kilder.push(kilde);
      } else {
        var fid = nyId("F");
        var fam = { id: fid, husb: null, wife: null, chil: [Object.assign({ id: id }, kobling)], par: { kilder: [] } };
        fam[slot] = ny.id;
        data.familier[fid] = fam;
      }
    } else if (rel === "sosken") {
      var f2 = foreldreFam(id);
      if (!f2) {
        var fid2 = nyId("F");
        data.familier[fid2] = { id: fid2, husb: null, wife: null, chil: [{ id: id, kilder: [], importert: false, omstridt: false }], par: { kilder: [] } };
        f2 = { fam: data.familier[fid2] };
      }
      f2.fam.chil.push(Object.assign({ id: ny.id }, kobling));
    } else if (rel === "barn") {
      var eg = egneFam(id)[0];
      if (!eg) {
        var fid3 = nyId("F"), me = P(id);
        eg = { id: fid3, husb: null, wife: null, chil: [], par: { kilder: [] } };
        if (me.kjonn === "F") eg.wife = id; else eg.husb = id;
        data.familier[fid3] = eg;
      }
      eg.chil.push(Object.assign({ id: ny.id }, kobling));
    } else if (rel === "partner") {
      var fid4 = nyId("F"), a = P(id);
      var husb = a.kjonn === "F" ? ny.id : id, wife = a.kjonn === "F" ? id : ny.id;
      data.familier[fid4] = { id: fid4, husb: husb, wife: wife, chil: [], par: kobling };
    }
    return null;
  }

  function slettPerson(id) {
    Object.keys(data.familier).forEach(function (fid) {
      var f = data.familier[fid];
      if (f.husb === id) f.husb = null;
      if (f.wife === id) f.wife = null;
      f.chil = f.chil.filter(function (c) { return c.id !== id; });
      if (!f.husb && !f.wife && f.chil.length < 2) delete data.familier[fid];
    });
    Object.keys(data.saker).forEach(function (k) { if (k.split("|")[1] === id) delete data.saker[k]; });
    delete data.personer[id];
    if (data.rot === id) data.rot = Object.keys(data.personer)[0] || null;
  }

  /* ---------- GEDCOM inn og ut ---------- */
  function importer(tekst, filnavn, erEksempel) {
    var r = K.fraGedcom(tekst);
    var n = Object.keys(r.personer).length;
    if (!n) { melding("Fant ingen personer i fila" + (r.feil.length ? ": " + r.feil[0] : ".")); return; }
    var erstatt = Object.keys(data.personer).length === 0 || erEksempel;
    if (!erstatt && !window.confirm("Fila erstatter treet du har nå i nettleseren. Last ned GEDCOM først hvis du vil beholde det. Fortsette?")) return;
    endre((erEksempel ? "Lastet inn eksempeldata" : "Leste inn " + filnavn) + " (" + n + " personer)", function () {
      var gammelLogg = data.logg;
      data = tom();
      data.logg = gammelLogg;
      data.personer = r.personer;
      Object.keys(r.familier).forEach(function (k) {
        var f = r.familier[k];
        if (!f.par) f.par = { kilder: [] };
        if (erEksempel) { f.par.importert = false; f.chil.forEach(function (c) { if (c.kilder.length) c.importert = false; }); }
        data.familier[k] = f;
      });
      data.neste = n + Object.keys(r.familier).length + 1;
      data.rot = r.personer["@I1@"] ? "@I1@" : Object.keys(r.personer)[0];
      Object.keys(data.familier).forEach(function (fid) {
        data.familier[fid].chil.forEach(function (c) { if (c.omstridt) sikreSak(fid, c.id); });
      });
      if (erEksempel && data.saker["@F5@|@I5@"]) {
        data.saker["@F5@|@I5@"] = {
          sporsmal: "Hvem er far til Johan Strandli (født 1921)?",
          alternativer: [{ id: "a1", tekst: "Lars Strandli, slik dåpen oppgir" }, { id: "a2", tekst: "Nils Strandli, slik familien forteller" }],
          innlegg: [
            { av: "Erik", tekst: "Bestemor sa alltid at det var Nils som var den egentlige faren. (Eksempel, oppdiktet.)", kilde: "" },
            { av: "Kari", tekst: "Dåpsinnførselen oppgir Lars som far. (Eksempel, oppdiktet.)", kilde: "Kirkebok, dåp 1921 (eksempel, ingen ekte lenke)" }
          ],
          stemmer: { Kari: "a1", Erik: "a2" }
        };
      }
    });
    melding((erEksempel ? "Eksempeldata lastet inn: " : "Leste inn ") + n + " personer." + (r.feil.length ? " Merknader: " + r.feil.slice(0, 3).join("; ") : ""));
  }
  function lastNed() {
    if (!Object.keys(data.personer).length) { melding("Treet er tomt. Ingenting å laste ned."); return; }
    var tekst = K.tilGedcom(data, { medSensitiv: $("ut-sensitiv").checked, utenLevende: $("ut-levende").checked });
    var blob = new Blob([tekst], { type: "text/plain;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "slekt-" + new Date().toISOString().slice(0, 10) + ".ged";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    melding("GEDCOM-fila er laget og lastes ned av nettleseren.");
  }

  /* ---------- Hendelser (én lytter for hele siden) ---------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (!b || b.tagName === "INPUT") return;
    var act = b.dataset.act, id = b.dataset.id;
    if (act === "aapne") visPerson(id);
    else if (act === "lukk") lukkDialog(b.closest("dialog"));
    else if (act === "eksempel") {
      b.disabled = true;
      fetch("eksempel.ged?v=2026-11-20").then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
        .then(function (t) { importer(t, "eksempel.ged", true); })
        .catch(function (err) { melding("Kunne ikke hente eksempeldata: " + err.message); })
        .then(function () { b.disabled = false; });
    }
    else if (act === "velg-fil") $(b.dataset.for).click();
    else if (act === "ny-rel") { lukkDialog($("dlg-person")); visPersonSkjema("ny", id, b.dataset.rel); }
    else if (act === "rediger") { lukkDialog($("dlg-person")); visPersonSkjema("rediger", id); }
    else if (act === "sett-rot") { endre("Viser treet fra " + fulltNavn(P(id)), function () { data.rot = id; }); lukkDialog($("dlg-person")); melding("Treet vises nå fra " + fulltNavn(P(id)) + "."); }
    else if (act === "slett-person") {
      var navn = fulltNavn(P(id));
      if (window.confirm("Slette " + navn + " og koblingene til personen?")) {
        endre("Slettet " + navn, function () { slettPerson(id); });
        lukkDialog($("dlg-person"));
        melding(navn + " er slettet. Du kan angre.");
      }
    }
    else if (act === "vis-sensitiv") {
      var pid = $("dp-innhold").dataset.id, el = $("sens-felt"), aapen = b.getAttribute("aria-expanded") === "true";
      el.textContent = aapen ? "" : P(pid).sensitiv;
      el.hidden = aapen;
      b.setAttribute("aria-expanded", aapen ? "false" : "true");
      b.textContent = aapen ? "Vis sensitivt felt" : "Skjul sensitivt felt";
    }
    else if (act === "ny-kilde") { lukkDialog($("dlg-person")); visKildeSkjema(b.dataset.fam, b.dataset.barn); }
    else if (act === "omstridt") {
      var k = finnKobling(b.dataset.fam, b.dataset.barn), pid2 = $("dp-innhold").dataset.id;
      endre((k.omstridt ? "Fjernet «omstridt» på " : "Merket som omstridt: ") + "kobling for " + fulltNavn(P(b.dataset.barn)), function () {
        var kk = finnKobling(b.dataset.fam, b.dataset.barn);
        kk.omstridt = !kk.omstridt;
        if (kk.omstridt) sikreSak(b.dataset.fam, b.dataset.barn);
      });
      visPerson(pid2);
      melding(finnKobling(b.dataset.fam, b.dataset.barn).omstridt ? "Koblingen er merket omstridt og er nå en familiesak." : "Merket «omstridt» er fjernet. Saken og stemmene er tatt vare på.");
    }
    else if (act === "last-ned") lastNed();
    else if (act === "angre") {
      if (!angre.length) return;
      data = JSON.parse(angre.pop());
      lagre(); tegn(); melding("Siste endring er angret.");
    }
    else if (act === "slett-alt") apneDialog($("dlg-bekreft"));
    else if (act === "slett-ja") {
      try { localStorage.removeItem(NOKKEL); } catch (er) { /* ingenting lagret */ }
      data = tom(); angre = [];
      lukkDialog($("dlg-bekreft"));
      tegn();
      melding("Alt er slettet fra denne nettleseren.");
      $("s-fornavn").focus();
    }
  });

  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.name === "visning") { visning = t.value; tegn(); melding(visning === "eier" ? "Viser treet slik du ser det." : "Viser treet slik en slektning i familiegruppen ser det."); }
    else if (t.dataset && t.dataset.act === "samtykke") {
      var id = t.dataset.id, ja = t.checked;
      endre((ja ? "Samtykke registrert (demo) for " : "Samtykke trukket (demo) for ") + fulltNavn(P(id)), function () { P(id).samtykke = ja; });
    }
    else if (t.hasAttribute && t.hasAttribute("data-fil") && t.files && t.files[0]) {
      var fil = t.files[0];
      if (fil.size > 5 * 1024 * 1024) { melding("Fila er større enn 5 MB. Prototypen leser bare mindre filer."); t.value = ""; return; }
      fil.text().then(function (tekst) { importer(tekst, fil.name, false); t.value = ""; });
    }
  });

  document.addEventListener("submit", function (e) {
    var f = e.target, fd = new FormData(f);
    e.preventDefault();
    if (f.id === "start-form") {
      var p = { id: nyId("I"), eksempel: false };
      var feil = lesPerson(fd, p);
      if (feil) { melding(feil); $("s-fornavn").focus(); return; }
      endre("La inn " + fulltNavn(p) + " som start på treet", function () { data.personer[p.id] = p; data.rot = p.id; });
      melding("Treet er startet. Legg til foreldre, søsken eller barn.");
      return;
    }
    if (f.id === "ds-form") {
      var feilEl = $("ds-feil"), modus = f.dataset.modus;
      if (modus === "kilde") {
        var kilde = lesKilde(fd);
        if (kilde.feil) { feilEl.textContent = kilde.feil; return; }
        endre("La til kilde (" + K.MERKER[kilde.type].tekst + ")", function () { finnKobling(f.dataset.fam, f.dataset.barn).kilder.push(kilde); });
        lukkDialog($("dlg-skjema"));
        melding("Kilden er lagt til. Merket viser nå " + K.MERKER[K.merkeFor(finnKobling(f.dataset.fam, f.dataset.barn))].tekst + ".");
        return;
      }
      if (modus === "rediger") {
        var kopi = JSON.parse(JSON.stringify(P(f.dataset.id)));
        var fe = lesPerson(fd, kopi);
        if (fe) { feilEl.textContent = fe; return; }
        endre("Endret " + fulltNavn(kopi), function () { data.personer[kopi.id] = kopi; });
        lukkDialog($("dlg-skjema"));
        melding(fulltNavn(kopi) + " er lagret.");
        return;
      }
      var ny = { id: null, eksempel: false };
      var fe2 = lesPerson(fd, ny);
      if (fe2) { feilEl.textContent = fe2; return; }
      var kd = lesKilde(fd);
      if (kd.feil) { feilEl.textContent = kd.feil; return; }
      var test = foreldreFam(f.dataset.id), rel = f.dataset.rel;
      if ((rel === "far" || rel === "mor") && test && test.fam[rel === "far" ? "husb" : "wife"]) {
        feilEl.textContent = "Personen har allerede en " + rel + " i treet. Er det uenighet, merk koblingen som omstridt.";
        return;
      }
      var resultat = null;
      endre("La til " + fulltNavn(ny) + " som " + RELNAVN[rel] + " til " + fulltNavn(P(f.dataset.id)), function () {
        ny.id = nyId("I");
        data.personer[ny.id] = ny;
        resultat = nyRelasjon(f.dataset.id, rel, ny, kd);
      });
      lukkDialog($("dlg-skjema"));
      melding(resultat || fulltNavn(ny) + " er lagt til.");
      return;
    }
    var sak = data.saker[f.dataset.sak];
    if (!sak) return;
    if (f.dataset.form === "stem") {
      var alt = fd.get("alt"), m = fd.get("medlem");
      if (!alt) { melding("Velg en versjon før du stemmer."); return; }
      endre(m + " ga rådgivende stemme (demo)", function () { data.saker[f.dataset.sak].stemmer[m] = alt; });
      melding("Stemmen til " + m + " er registrert i denne nettleseren. Den er rådgivende og endrer ikke kildemerket.");
    } else if (f.dataset.form === "innlegg") {
      var tekst = (fd.get("tekst") || "").trim();
      if (!tekst) { melding("Skriv noe i innlegget først."); return; }
      endre("Nytt innlegg i familiesak (demo)", function () { data.saker[f.dataset.sak].innlegg.push({ av: fd.get("av"), tekst: tekst, kilde: (fd.get("kilde") || "").trim() }); });
      melding("Innlegget er lagt til. Ingenting er sendt.");
    } else if (f.dataset.form === "alternativ") {
      var at = (fd.get("tekst") || "").trim();
      if (!at) return;
      endre("Ny versjon i familiesak (demo)", function () { var s = data.saker[f.dataset.sak]; s.alternativer.push({ id: "a" + (s.alternativer.length + 1) + "-" + Date.now().toString(36), tekst: at }); });
      melding("Ny versjon lagt til.");
    }
  });

  last();
  tegn();
})();
