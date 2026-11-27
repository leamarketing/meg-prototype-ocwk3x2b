/* Taleoversetter norsk <-> engelsk i Min dag.
   - Lytter med nettleserens talegjenkjenning (Chrome og Edge). Firefox har den ikke: da brukes mikrofonen på tastaturet.
   - Oversetter og leser opp med Lyses stemme gjennom serverfunksjonen "oversett" (krever innlogging i Min dag).
   - Faller tilbake til telefonens egen stemme hvis Lyses stemme ikke svarer.
   - Sparer strøm: ingen løkker, lytter bare mens knappen er aktiv. Historikken ligger bare på enheten. */
(function () {
  var FUNKSJON = "https://xprcbxubejpazmdbpsmy.supabase.co/functions/v1/oversett";
  var $ = function (id) { return document.getElementById(id); };
  var btnNo = $("btnNo"), btnEn = $("btnEn"), statusEl = $("status"), heardEl = $("heard"), resultEl = $("result");
  var replayBtn = $("btnReplay"), stopBtn = $("btnStop"), typed = $("typed"), histEl = $("history"), emptyEl = $("empty"), clearBtn = $("btnClear");
  var SPEAK = { no: "nb-NO", en: "en-GB" };
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  var rec = null, active = null, heardFinal = "", heardPartial = "", ctl = null;
  var last = null, lastAudio = null, audio = new Audio(), history = [];

  function setStatus(t, cls) { statusEl.textContent = t; statusEl.className = cls || ""; }

  /* ---------- innlogging ---------- */
  function token() {
    var MK = window.MegKonto;
    if (!MK || !MK.sb) return Promise.resolve(null);
    return MK.sb.auth.getSession().then(function (r) { return r.data && r.data.session ? r.data.session.access_token : null; }).catch(function () { return null; });
  }
  function sjekkInnlogging() {
    token().then(function (t) { $("login").hidden = !!t; if (!t) setStatus("Logg inn i Min dag først.", "err"); });
  }
  if (window.MegKonto && window.MegKonto.klar) sjekkInnlogging(); else document.addEventListener("megkonto-klar", sjekkInnlogging);

  /* ---------- historikk (bare på denne enheten) ---------- */
  try { history = JSON.parse(localStorage.getItem("oversetter-historikk") || "[]"); } catch (e) { history = []; }
  function lagre() { try { localStorage.setItem("oversetter-historikk", JSON.stringify(history.slice(0, 15))); } catch (e) {} }
  function visHistorikk() {
    histEl.textContent = "";
    emptyEl.hidden = history.length > 0; clearBtn.hidden = history.length === 0;
    history.slice(0, 15).forEach(function (h) {
      var li = document.createElement("li"), t = document.createElement("div"), s = document.createElement("div"), d = document.createElement("div");
      t.className = "txt"; s.className = "src"; d.className = "dst";
      var tag = document.createElement("span"); tag.className = "tag " + h.from; tag.textContent = h.from === "no" ? "NO→EN" : "EN→NO";
      s.append(tag, document.createTextNode(h.src)); d.textContent = h.dst; d.lang = h.to === "no" ? "nb" : "en";
      t.append(s, d);
      var b = document.createElement("button"); b.className = "again"; b.type = "button"; b.setAttribute("aria-label", "Les høyt: " + h.dst);
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 10v4a1 1 0 0 0 1 1h3l4 4V5L7 9H4a1 1 0 0 0-1 1Zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4Zm-2.5-9v2.1a7 7 0 0 1 0 13.8V21a9 9 0 0 0 0-18Z"/></svg>';
      b.onclick = function () { lesOpp(h.dst, h.to, null); };
      li.append(t, b); histEl.append(li);
    });
  }
  clearBtn.onclick = function () { history = []; lagre(); visHistorikk(); };
  visHistorikk();

  /* ---------- opplesing ---------- */
  function visStopp(on) { stopBtn.hidden = !on; }
  audio.onended = audio.onpause = function () { visStopp(false); };
  function stopp() { try { audio.pause(); } catch (e) {} try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} visStopp(false); }
  stopBtn.onclick = stopp;
  function spillAv(src) {
    stopp(); audio.src = src; visStopp(true);
    return audio.play().catch(function () { visStopp(false); setStatus("Trykk «Les høyt igjen» for å høre oversettelsen.", ""); });
  }
  function telefonStemme(text, lang) {
    if (!window.speechSynthesis) { setStatus("Fikk ikke lest høyt her. Teksten står på skjermen.", "err"); return; }
    var u = new SpeechSynthesisUtterance(text); u.lang = SPEAK[lang]; u.rate = 0.95;
    var v = (speechSynthesis.getVoices() || []).find(function (x) { return x.lang && x.lang.toLowerCase().indexOf(lang === "no" ? "nb" : "en") === 0; });
    if (v) u.voice = v;
    u.onend = u.onerror = function () { visStopp(false); };
    visStopp(true); speechSynthesis.speak(u);
  }
  /* Henter Lyses stemme for en tekst (brukes ved «Les høyt» fra historikken). */
  function lesOpp(text, lang, ferdigLyd) {
    if (ferdigLyd) { spillAv(ferdigLyd); return; }
    token().then(function (t) {
      if (!t) { telefonStemme(text, lang); return; }
      setStatus("Henter Lyses stemme …");
      fetch(FUNKSJON, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + t }, body: JSON.stringify({ op: "say", text: text, lang: lang }) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
        .then(function (b) { setStatus(""); spillAv(URL.createObjectURL(b)); })
        .catch(function () { setStatus("Lyses stemme svarte ikke. Bruker telefonens stemme.", "err"); telefonStemme(text, lang); });
    });
  }
  replayBtn.onclick = function () { if (last) lesOpp(last.dst, last.to, lastAudio); };

  /* ---------- oversetting ---------- */
  function oversett(src, fra) {
    src = (src || "").trim();
    if (!src) { setStatus(fra === "no" ? "Hørte ingenting. Prøv igjen." : "Heard nothing. Please try again.", "err"); return; }
    if (src.length > 500) src = src.slice(0, 500);
    var til = fra === "no" ? "en" : "no";
    heardEl.textContent = src; heardEl.className = "";
    $("heardLabel").textContent = fra === "no" ? "Hørt (norsk)" : "Heard (English)";
    $("resultLabel").textContent = til === "en" ? "In English" : "På norsk";
    resultEl.className = "thinking"; resultEl.lang = til === "no" ? "nb" : "en";
    resultEl.textContent = til === "en" ? "Oversetter …" : "Translating …";
    setStatus(til === "en" ? "Oversetter til engelsk …" : "Translating to Norwegian …");
    if (ctl) ctl.abort();
    ctl = new AbortController();
    var mitt = ctl;
    token().then(function (t) {
      if (!t) { $("login").hidden = false; resultEl.className = ""; resultEl.textContent = ""; setStatus("Logg inn i Min dag først.", "err"); return; }
      return fetch(FUNKSJON, { method: "POST", signal: mitt.signal, headers: { "Content-Type": "application/json", Authorization: "Bearer " + t }, body: JSON.stringify({ op: "translate", text: src, from: fra }) })
        .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d && d.error || ("Feil " + r.status)); return d; }); })
        .then(function (d) {
          var dst = d.translation;
          resultEl.className = ""; resultEl.textContent = dst;
          last = { from: fra, to: til, src: src, dst: dst };
          lastAudio = d.audio ? "data:audio/mpeg;base64," + d.audio : null;
          replayBtn.disabled = false;
          history.unshift(last); history = history.slice(0, 15); lagre(); visHistorikk();
          if (lastAudio) { setStatus(til === "en" ? "Ferdig. Lyse leser opp på engelsk." : "Done. Lyse reads it in Norwegian."); spillAv(lastAudio); }
          else { setStatus("Lyses stemme svarte ikke. Bruker telefonens stemme.", "err"); telefonStemme(dst, til); }
        });
    }).catch(function (e) {
      if (e && e.name === "AbortError") return;
      resultEl.className = ""; resultEl.textContent = "";
      setStatus((e && e.message) || "Noe gikk galt. Prøv igjen.", "err");
    });
  }
  $("goEn").onclick = function () { oversett(typed.value, "no"); };
  $("goNo").onclick = function () { oversett(typed.value, "en"); };

  /* ---------- lytting ---------- */
  function settLytting(lang) {
    active = lang;
    btnNo.classList.toggle("listening", lang === "no"); btnEn.classList.toggle("listening", lang === "en");
    btnNo.setAttribute("aria-pressed", String(lang === "no")); btnEn.setAttribute("aria-pressed", String(lang === "en"));
    $("lblNo").textContent = lang === "no" ? "Ferdig, oversett" : "Jeg snakker norsk";
    $("subNo").textContent = lang === "no" ? "trykk når du har snakket" : "blir til engelsk";
    $("lblEn").textContent = lang === "en" ? "Done, translate" : "They speak English";
    $("subEn").textContent = lang === "en" ? "tap when finished" : "becomes Norwegian";
  }
  function startLytting(lang) {
    stopp();
    if (!Rec) {
      typed.focus();
      setStatus(lang === "no" ? "Trykk på mikrofonen på tastaturet, snakk norsk, og trykk «Norsk → English»."
                              : "Tap the microphone on the keyboard, speak English, then tap «English → Norsk».", "");
      return;
    }
    if (active) { rec && rec.stop(); return; } /* andre trykk: ferdig */
    heardFinal = ""; heardPartial = "";
    heardEl.textContent = ""; heardEl.className = "partial";
    rec = new Rec();
    rec.lang = SPEAK[lang]; rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 1;
    var minLang = lang, feil = null;
    rec.onstart = function () {
      settLytting(minLang);
      setStatus(minLang === "en" ? "Listening … speak English now. Tap again when done." : "Lytter … snakk norsk nå. Trykk igjen når du er ferdig.", "live");
    };
    rec.onresult = function (ev) {
      heardPartial = "";
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) heardFinal = (heardFinal + " " + t).trim(); else heardPartial += t;
      }
      heardEl.textContent = (heardFinal + " " + heardPartial).trim();
    };
    rec.onerror = function (ev) { feil = ev.error; };
    rec.onend = function () {
      var lang2 = active; settLytting(null); rec = null;
      var tekst = (heardFinal + " " + heardPartial).trim();
      if (feil === "not-allowed" || feil === "service-not-allowed") {
        setStatus("Mikrofonen er ikke tillatt. Tillat mikrofon for siden, eller bruk mikrofonen på tastaturet i feltet under.", "err"); return;
      }
      if (tekst) { oversett(tekst, lang2 || minLang); return; }
      setStatus(feil === "no-speech" ? "Hørte ingenting. Prøv igjen." : "Mikrofonen stoppet. Prøv igjen.", "err");
    };
    try { rec.start(); } catch (e) { setStatus("Mikrofonen startet ikke. Prøv igjen.", "err"); rec = null; }
  }
  btnNo.onclick = function () { if (active && active !== "no") { rec && rec.stop(); return; } startLytting("no"); };
  btnEn.onclick = function () { if (active && active !== "en") { rec && rec.stop(); return; } startLytting("en"); };
  if (!Rec) $("typeHint").textContent = "Denne nettleseren kan ikke lytte selv. Trykk i feltet, så på mikrofonen på tastaturet, og snakk.";
})();
