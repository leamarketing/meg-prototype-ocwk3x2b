/* Påmelding til e-postlisten for Min dag, med samtykke.
   Bruk: <div data-liste-skjema data-side="spill"></div> og <script src="/liste/liste.js?v=2026-11-21" defer></script>
   - To egne avkrysninger, aldri krysset av på forhånd.
   - Kildekoden i lenken (?fra=facebook) sendes med, ingenting annet om besøket.
   - Ingen informasjonskapsler, ingen sporing fra Google, Meta eller andre. */
(function () {
  "use strict";
  var FUNKSJON = "https://xprcbxubejpazmdbpsmy.supabase.co/functions/v1/liste";
  var TEKST_VERSJON = "2026-11-21";
  var NYHETER = "Send meg nytt fra Min dag på e-post (høyst to ganger i måneden).";
  var TESTPILOT = "Jeg vil være testpilot og få én måned gratis tilgang når betalingen er på plass.";

  var css = ".ls-skjema{display:grid;gap:12px;margin-top:8px}" +
    ".ls-felt{display:grid;gap:4px}" +
    ".ls-felt label{font-weight:600;margin:0;display:block}" +
    ".ls-felt input{font:inherit;padding:10px 12px;border:1px solid var(--line,#ccc);border-radius:8px;background:var(--bg,#fff);color:var(--ink,#111);width:100%;max-width:420px}" +
    ".ls-valg{display:flex !important;gap:10px;align-items:flex-start !important;margin:0 !important;line-height:1.45;cursor:pointer}" +
    ".ls-valg input{width:22px;height:22px;margin:1px 0 0;flex:0 0 auto;accent-color:var(--accent,#1f5f8b)}" +
    ".ls-skjult{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}" +
    ".ls-melding{border-radius:8px;padding:10px 12px;margin:0}" +
    ".ls-melding.ok{background:var(--chip,#eef3f7);border-left:4px solid var(--fakta,#2e7d4f)}" +
    ".ls-melding.feil{background:var(--chip,#eef3f7);border-left:4px solid var(--warn,#a33a3a)}" +
    ".ls-liten{font-size:.88rem;color:var(--muted,#555);margin:0}";
  var stil = document.createElement("style");
  stil.textContent = css;
  document.head.appendChild(stil);

  function kilde() {
    try {
      var p = new URLSearchParams(location.search);
      var f = (p.get("fra") || p.get("k") || "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
      if (f) { try { sessionStorage.setItem("ls-fra", f); } catch (e) {} return f; }
      try { return sessionStorage.getItem("ls-fra") || ""; } catch (e) { return ""; }
    } catch (e) { return ""; }
  }

  function lag(boks, nr) {
    var side = boks.getAttribute("data-side") || location.pathname.replace(/[^a-z0-9/_-]/gi, "").slice(0, 80);
    var id = "ls" + nr;
    boks.innerHTML =
      '<form class="ls-skjema" novalidate>' +
      '<div class="ls-felt"><label for="' + id + 'n">Fornavn</label><input id="' + id + 'n" name="navn" type="text" autocomplete="given-name" maxlength="120"></div>' +
      '<div class="ls-felt"><label for="' + id + 'e">E-post</label><input id="' + id + 'e" name="epost" type="email" autocomplete="email" required maxlength="160" inputmode="email"></div>' +
      '<label class="ls-valg"><input type="checkbox" name="nyheter"><span>' + NYHETER + '</span></label>' +
      '<label class="ls-valg"><input type="checkbox" name="testpilot"><span>' + TESTPILOT + '</span></label>' +
      '<div class="ls-skjult" aria-hidden="true"><label>La dette feltet stå tomt <input type="text" name="hp" tabindex="-1" autocomplete="off"></label></div>' +
      '<p class="ls-liten">Du velger selv, og du kan krysse av for én eller begge. Vi sender deg en e-post med en lenke du må trykke på før du kommer på listen.</p>' +
      '<div><button type="submit">Meld meg på</button></div>' +
      '<p class="ls-melding" role="status" aria-live="polite" hidden></p>' +
      '<p class="ls-liten">Vi lagrer fornavn, e-post, hva du krysset av for, når du gjorde det og hvilken lenke du kom fra. Det brukes bare til å sende deg det du ba om, og deles ikke med noen. Vi sporer ikke om du åpner e-postene. Du kan melde deg av med ett klikk nederst i hver e-post. <a href="/liste/personvern.html">Slik behandler vi opplysningene</a>.</p>' +
      "</form>";
    var form = boks.querySelector("form");
    var melding = form.querySelector(".ls-melding");
    var knapp = form.querySelector("button");
    function vis(tekst, ok) {
      melding.textContent = tekst;
      melding.className = "ls-melding " + (ok ? "ok" : "feil");
      melding.hidden = false;
    }
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var epost = form.epost.value.trim();
      var nyheter = form.nyheter.checked, testpilot = form.testpilot.checked;
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(epost)) { vis("Sjekk e-postadressen, den ser ikke helt riktig ut.", false); form.epost.focus(); return; }
      if (!nyheter && !testpilot) { vis("Kryss av for minst ett av valgene, så vet vi hva du vil ha.", false); return; }
      knapp.disabled = true;
      knapp.textContent = "Sender...";
      fetch(FUNKSJON, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handling: "meld_pa", navn: form.navn.value.trim(), epost: epost, nyheter: nyheter, testpilot: testpilot,
          fra: kilde(), side: side, tekst: TEKST_VERSJON, hp: form.hp.value
        })
      }).then(function (r) { return r.json(); }).then(function (s) {
        if (s && s.ok) {
          form.querySelectorAll("input,button").forEach(function (el) { el.disabled = true; });
          vis("Takk! Sjekk e-posten din og trykk på lenken for å bekrefte. Finner du den ikke, se i søppelpost eller kampanjer.", true);
        } else {
          var g = s && s.grunn;
          vis(g === "epost" ? "Sjekk e-postadressen, den ser ikke helt riktig ut." :
              g === "ingen_valg" ? "Kryss av for minst ett av valgene." :
              g === "travelt" ? "Mange melder seg på akkurat nå. Prøv igjen om en liten stund." :
              "Noe gikk galt, så påmeldingen ble ikke sendt. Prøv igjen om litt.", false);
          knapp.disabled = false;
          knapp.textContent = "Meld meg på";
        }
      }).catch(function () {
        vis("Fikk ikke kontakt. Sjekk nettet og prøv igjen.", false);
        knapp.disabled = false;
        knapp.textContent = "Meld meg på";
      });
    });
  }

  function start() {
    var bokser = document.querySelectorAll("[data-liste-skjema]");
    for (var i = 0; i < bokser.length; i++) lag(bokser[i], i);
    kilde();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
