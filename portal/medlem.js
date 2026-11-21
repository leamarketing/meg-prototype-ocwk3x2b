/* Medlemskap for me.voteapp: innlogging med e-post og passord eller e-postlenke, lagring av navn og fødselsdata (bare med samtykke),
   prøvetid på 7 dager og spørsmål om å fortsette etterpå. Etter "Ja" går man til kassen i Scale.gg (ScalePay).
   Webhooken scale-webhook kjenner igjen kjøperen på e-posten, så den må være den samme som innloggingen. */
(function(){
  var CFG = window.ME_SUPABASE || {};
  var TRIAL_DAYS = 7, PRICE = "9 dollar i måneden";
  var CHECKOUT = "https://scalepay.gg/checkout/4d6ceb71-f488-4599-a227-71a2c6ce50e8?flowId=f5724901-f2b3-4e6e-a1df-05099d638953&cardId=3cb184f1-2bee-4471-ba37-6398d51659e1";
  var $ = function(id){ return document.getElementById(id); };
  var msg = $("acct-msg"), out = $("acct-out");
  /* Takkesiden: Scale.gg sender kjøperen hit med ?betalt=1. Innloggingen ligger lagret i nettleseren,
     så den som betalte fra portalen er fortsatt innlogget. Vi venter til webhooken har gjort medlemmet aktivt. */
  var PAID_RETURN = /[?&]betalt=1\b/.test(location.search), polls = 0;
  var thanks = null;
  if(PAID_RETURN){
    thanks = document.createElement("div");
    thanks.className = "thanks"; thanks.setAttribute("role", "status"); thanks.setAttribute("aria-live", "polite");
    $("konto").insertBefore(thanks, out);
    thanks.innerHTML = "<h3>Takk for betalingen!</h3><p>Velkommen som medlem i me.voteapp.</p>";
    try { var saved = localStorage.getItem("me_checkout_email"); if(saved){ $("lemail").value = saved; } } catch(e){}
  }
  /* Hvilken side kom den nye besøkende fra? Lagres i nettleseren ved første besøk, og på kontoen når de logger inn.
     Egne tall, ingen sporing fra andre. ?k=kode i lenken gir kampanjekoden. */
  var CONSENT_VERSION = "v1-2026-11-19";
  (function firstTouch(){
    try {
      if(localStorage.getItem("me_source")){ return; }
      var k = (location.search.match(/[?&]k=([A-Za-z0-9_-]{1,40})/) || [])[1], src;
      if(k){ src = "kode:" + k; }
      else if(document.referrer){
        var ref = new URL(document.referrer);
        src = ref.host === location.host ? "side:" + ref.pathname : "ekstern:" + ref.hostname;
      } else { src = "direkte"; }
      src += " > " + location.pathname + (location.hash || "");
      localStorage.setItem("me_source", src.slice(0, 80));
    } catch(e){}
  })();
  function rememberEmail(){ try { localStorage.setItem("me_checkout_email", me.email); } catch(e){} }
  function say(t, err){ msg.textContent = t || ""; msg.className = "acct-msg" + (err ? " err" : ""); }
  function esc(s){ return String(s || "").replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
  function lock(on){
    $("navn").hidden = on;
    if(on){ $("fodt").hidden = true; $("horo").hidden = true; }
  }
  lock(true);
  if(!window.supabase || !CFG.url){ say("Innloggingen kunne ikke lastes. Prøv å laste siden på nytt.", true); return; }
  var sb = window.supabase.createClient(CFG.url, CFG.publishable, {auth:{flowType:"implicit", detectSessionInUrl:true, persistSession:true}});
  var me = null, row = null, restoring = false;

  function daysLeft(r){
    var used = Math.floor((Date.now() - new Date(r.trial_started_at).getTime()) / 86400000);
    return Math.max(0, TRIAL_DAYS - used);
  }
  function isOpen(r){ return r.status !== "ended" && !(r.status === "trial" && daysLeft(r) === 0); }

  function renderLoggedIn(){
    var left = daysLeft(row), st = row.status, html = "";
    html += "<p>Logget inn som <b>" + esc(me.email) + "</b></p>";
    if(st === "trial" && left > 0){
      html += "<div class=\"trial\"><b>Gratis prøvetid:</b> " + left + (left === 1 ? " dag" : " dager") + " igjen.</div>";
    } else if(st === "trial"){
      html += "<div class=\"ask\" role=\"region\" aria-labelledby=\"ask-h\"><h3 id=\"ask-h\">Prøvetiden din er over</h3>";
      html += "<p>Takk for at du har prøvd me.voteapp en uke. Vil du fortsette? Prisen er " + PRICE + ". Du velger selv, og du kan slutte når du vil.</p>";
      html += "<p class=\"muted\">Svarer du ja, kommer du til betalingssiden. Bruk samme e-post som du logger inn med her.</p>";
      html += "<div class=\"row\"><button type=\"button\" id=\"ans-yes\">Ja, jeg vil fortsette</button><button type=\"button\" class=\"no\" id=\"ans-no\">Nei takk</button></div></div>";
    } else if(st === "wants_to_continue"){
      html += "<div class=\"trial\"><b>Takk!</b> Du har sagt at du vil fortsette. Det siste steget er betalingen (" + PRICE + "). Du kan slutte når du vil.";
      html += "<p>Bruk denne e-posten i kassen, så kjenner vi deg igjen: <b>" + esc(me.email) + "</b></p>";
      html += "<a class=\"btn paylink\" href=\"" + esc(CHECKOUT) + "\">Gå til betaling</a>";
      html += "<p class=\"muted\">Når betalingen er registrert, står det «Medlem» her. Det kan ta et lite øyeblikk.</p></div>";
    } else if(st === "active"){
      html += "<div class=\"trial\"><b>Medlem.</b> Takk for at du er med.</div>";
    } else if(st === "ended"){
      html += "<div class=\"trial\">Du har valgt å ikke fortsette. Har du ombestemt deg? <button type=\"button\" class=\"linkbtn\" id=\"ans-yes\">Jeg vil likevel fortsette</button></div>";
    }
    html += "<div class=\"pw-box\"><h3>Passord</h3><p class=\"muted\">Med passord logger du inn med e-post og passord, også på mobilen, uten å åpne e-posten. Minst 8 tegn.</p>";
    html += "<form id=\"pw-form\" autocomplete=\"on\"><input type=\"email\" name=\"email\" autocomplete=\"username\" value=\"" + esc(me.email) + "\" hidden>";
    html += "<label>Nytt passord<input id=\"pw1\" type=\"password\" autocomplete=\"new-password\" minlength=\"8\" required></label>";
    html += "<label>Skriv det en gang til<input id=\"pw2\" type=\"password\" autocomplete=\"new-password\" minlength=\"8\" required></label>";
    html += "<button type=\"submit\">Lagre passord</button></form></div>";
    html += "<label class=\"consent\"><input type=\"checkbox\" id=\"consent\"" + (row.consent_at ? " checked" : "") + "> <span>Lagre navn og fødselsdata på kontoen min, så jeg slipper å skrive dem inn igjen. Dataene ligger i EU, deles ikke med andre og holdes adskilt fra stemmesvar.</span></label>";
    html += "<div class=\"acct-actions\"><button type=\"button\" class=\"linkbtn\" id=\"logout\">Logg ut</button><button type=\"button\" class=\"linkbtn\" id=\"delete-me\">Slett kontoen min og alle data</button></div>";
    var optin = "<fieldset class=\"optin\"><legend>Meldinger fra Min dag</legend>";
    optin += "<p class=\"muted\">Frivillig. Du kan slutte når du vil, med én lenke nederst i hver e-post.</p>";
    optin += "<label class=\"consent\"><input type=\"checkbox\" id=\"optin-email\"" + (row.email_opt_in_at ? " checked" : "") + "> <span>Send meg tips og nytt fra Min dag på e-post, høyst noen ganger i måneden.</span></label>";
    optin += "<label class=\"consent\"><input type=\"checkbox\" id=\"optin-sms\"" + (row.sms_opt_in_at ? " checked" : "") + "> <span>Send meg korte meldinger på SMS. SMS er ikke startet ennå, vi sender først når det er klart.</span></label>";
    optin += "<div id=\"phone-row\" class=\"phone-row\" hidden><label for=\"optin-phone\">Mobilnummer</label> <input type=\"tel\" id=\"optin-phone\" autocomplete=\"tel\" inputmode=\"tel\" placeholder=\"+47 ...\" value=\"" + esc(row.phone) + "\"> <button type=\"button\" id=\"optin-phone-save\">Lagre nummer</button></div>";
    optin += "<p class=\"muted\">E-postadressen og nummeret brukes bare av Min dag, deles ikke med andre og kobles aldri til stemmesvar på voteapp.eu.</p></fieldset>";
    html = html.replace("<div class=\"acct-actions\">", optin + "<div class=\"acct-actions\">");
    out.innerHTML = html;
    if(row.sms_opt_in_at){ $("phone-row").hidden = false; }
    $("optin-email").addEventListener("change", function(e){
      var on = e.target.checked;
      sb.rpc("set_marketing_consent", {p_kind:"email", p_on:on, p_page:location.pathname, p_version:CONSENT_VERSION}).then(function(r){
        if(r.error || (r.data && r.data.ok === false)){ say("Kunne ikke lagre valget. Prøv igjen.", true); e.target.checked = !on; return; }
        row.email_opt_in_at = on ? new Date().toISOString() : null;
        say(on ? "Takk! Du får e-post fra Min dag. Du kan melde deg av når du vil." : "Du får ikke lenger e-post med tips og nytt.");
      });
    });
    function saveSms(on){
      var cb = $("optin-sms");
      sb.rpc("set_marketing_consent", {p_kind:"sms", p_on:on, p_page:location.pathname, p_version:CONSENT_VERSION, p_phone:$("optin-phone").value}).then(function(r){
        if(r.error){ say("Kunne ikke lagre valget. Prøv igjen.", true); cb.checked = !on; return; }
        if(r.data && r.data.ok === false){ say("Skriv et gyldig mobilnummer, 8 til 15 sifre.", true); cb.checked = !!row.sms_opt_in_at; return; }
        row.sms_opt_in_at = on ? new Date().toISOString() : null;
        say(on ? "Nummeret er lagret. Vi sender først når SMS er startet." : "Nummeret er slettet. Du får ingen SMS.");
      });
    }
    $("optin-sms").addEventListener("change", function(e){
      if(e.target.checked){
        $("phone-row").hidden = false;
        if($("optin-phone").value.trim()){ saveSms(true); } else { e.target.checked = false; say("Skriv mobilnummeret og trykk Lagre nummer."); $("optin-phone").focus(); }
      } else { $("phone-row").hidden = true; saveSms(false); }
    });
    $("optin-phone-save").addEventListener("click", function(){ $("optin-sms").checked = true; saveSms(true); });

    if(thanks){
      if(st === "active"){
        thanks.innerHTML = "<h3>Takk for betalingen!</h3><p>Betalingen er registrert, og du er medlem. Du er logget inn og kan bruke modulene under.</p>";
      } else if(polls < 24){
        thanks.innerHTML = "<h3>Takk for betalingen!</h3><p>Vi venter på beskjed fra betalingen. Det tar vanligvis noen sekunder. Du er logget inn og kan bruke portalen imens.</p>";
        polls++; setTimeout(load, 5000);
      } else {
        thanks.innerHTML = "<h3>Takk for betalingen!</h3><p>Betalingen er ikke registrert hos oss ennå. Har du brukt en annen e-post i kassen enn <b>" + esc(me.email) + "</b>, ta kontakt, så ordner vi det.</p>";
      }
    }
    lock(!isOpen(row));
    if(st === "trial" && left === 0){ say("Svar på spørsmålet over for å fortsette."); }

    $("logout").addEventListener("click", function(){ sb.auth.signOut().then(function(){ location.reload(); }); });
    $("pw-form").addEventListener("submit", function(e){
      e.preventDefault();
      var p1 = $("pw1").value, p2 = $("pw2").value;
      if(p1.length < 8){ say("Passordet må ha minst 8 tegn.", true); return; }
      if(p1 !== p2){ say("De to passordene er ikke like. Skriv dem på nytt.", true); return; }
      say("Lagrer passordet...");
      sb.auth.updateUser({password: p1}).then(function(r){
        if(r.error){
          var m = r.error.message || "";
          if(/reauth|recent|nonce/i.test(m)){ say("Av sikkerhetshensyn må du logge inn med en ny e-postlenke før du kan lage passord. Logg ut og send deg en ny lenke.", true); return; }
          if(/same|different/i.test(m)){ say("Dette er allerede passordet ditt.", true); return; }
          if(/weak|short|characters/i.test(m)){ say("Passordet er for svakt. Bruk minst 8 tegn, gjerne med tall og bokstaver.", true); return; }
          say("Passordet ble ikke lagret: " + m, true); return;
        }
        $("pw1").value = ""; $("pw2").value = "";
        say("Passordet er lagret. Neste gang kan du logge inn med " + me.email + " og passordet.");
      });
    });
    $("delete-me").addEventListener("click", function(){
      if(!confirm("Slette kontoen din og alle lagrede data? Dette kan ikke angres.")){ return; }
      sb.rpc("delete_me").then(function(r){
        if(r.error){ say("Kunne ikke slette: " + r.error.message, true); return; }
        sb.auth.signOut().then(function(){ location.reload(); });
      });
    });
    $("consent").addEventListener("change", function(e){
      var on = e.target.checked, now = new Date().toISOString();
      var patch = on ? {consent_at: now, updated_at: now}
                     : {consent_at: null, full_name: null, birth_date: null, birth_time: null, birth_place: null, lat: null, lon: null, updated_at: now};
      sb.from("members").update(patch).eq("id", me.id).then(function(r){
        if(r.error){ say("Kunne ikke lagre valget: " + r.error.message, true); e.target.checked = !on; return; }
        row.consent_at = patch.consent_at;
        say(on ? "Lagret. Navn og fødselsdata lagres når du trykker på knappene." : "Lagrede navn og fødselsdata er slettet.");
        if(on){ saveName(); saveBirth(); }
      });
    });
    var yes = $("ans-yes"), no = $("ans-no");
    if(yes){ yes.addEventListener("click", function(){ answer("wants_to_continue"); }); }
    if(no){ no.addEventListener("click", function(){ answer("ended"); }); }
    var pay = out.querySelector(".paylink");
    if(pay){ pay.addEventListener("click", rememberEmail); }
  }

  function answer(choice){
    sb.rpc("answer_trial", {choice: choice}).then(function(r){
      if(r.error){ say("Kunne ikke lagre svaret: " + r.error.message, true); return; }
      if(choice === "wants_to_continue"){
        rememberEmail();
        say("Svaret er lagret. Nå går du til betalingen. Bruk " + me.email + " i kassen.");
        setTimeout(function(){ location.href = CHECKOUT; }, 1500);
        return;
      }
      say("Svaret er lagret. Takk for at du prøvde.");
      load();
    });
  }

  function saveName(){
    if(!me || !row || !row.consent_at || restoring){ return; }
    var full = [$("fn").value, $("mn").value, $("ln").value].map(function(s){ return s.trim(); }).join(" | ");
    if(!$("fn").value.trim()){ return; }
    sb.from("members").update({full_name: full, updated_at: new Date().toISOString()}).eq("id", me.id).then(function(r){
      say(r.error ? "Navnet ble ikke lagret: " + r.error.message : "Navnet er lagret på kontoen din.", !!r.error);
    });
  }
  function saveBirth(){
    if(!me || !row || !row.consent_at || restoring){ return; }
    if($("birth-err").textContent){ return; }
    var d = parseInt($("bd").value, 10), m = parseInt($("bm").value, 10), y = parseInt($("by").value, 10);
    if(!d || !m || !y){ return; }
    var lat = parseFloat(String($("blat").value).replace(",", ".")), lon = parseFloat(String($("blon").value).replace(",", "."));
    /* Sted valgt fra Kartverket-listen: lagre plasseringen på kontoen, så den følger med til andre enheter. */
    if((isNaN(lat) || isNaN(lon)) && window.Stedsok){ var ks = window.Stedsok.known($("bp").value); if(ks){ lat = ks.lat; lon = ks.lon; } }
    var patch = {
      birth_date: y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0"),
      birth_time: $("bt").value || null,
      birth_place: $("bp").value.trim() || null,
      lat: isNaN(lat) ? null : lat, lon: isNaN(lon) ? null : lon,
      updated_at: new Date().toISOString()
    };
    sb.from("members").update(patch).eq("id", me.id).then(function(r){
      say(r.error ? "Fødselsdata ble ikke lagret: " + r.error.message : "Fødselsdata er lagret. Neste gang kommer dagsguiden din rett opp.", !!r.error);
    });
  }
  $("name-form").addEventListener("submit", function(){ setTimeout(saveName, 0); });
  $("birth-form").addEventListener("submit", function(){ setTimeout(saveBirth, 0); });

  /* Fyll inn det som er lagret og vis dagsguiden med en gang */
  function restore(){
    if(!row || !row.full_name){ return; }
    restoring = true;
    var parts = row.full_name.split(" | ");
    $("fn").value = parts[0] || ""; $("mn").value = parts[1] || ""; $("ln").value = parts[2] || "";
    $("name-form").requestSubmit();
    if(row.birth_date){
      var p = row.birth_date.split("-");
      $("bd").value = String(parseInt(p[2], 10)); $("bm").value = String(parseInt(p[1], 10)); $("by").value = p[0];
      $("bt").value = row.birth_time ? row.birth_time.slice(0, 5) : "";
      $("bp").value = row.birth_place || "";
      var hasLL = row.lat != null && row.lon != null;
      if(hasLL && row.birth_place && window.Stedsok){
        /* Stedsnavn med lagret plassering: husk stedet, så teksten viser navnet og ikke tall. */
        window.Stedsok.remember({label:row.birth_place, lat:row.lat, lon:row.lon});
        $("blat").value = ""; $("blon").value = "";
      } else {
        $("blat").value = hasLL ? row.lat : ""; $("blon").value = hasLL ? row.lon : "";
      }
      var tb = $("to-birth"); if(tb){ tb.click(); }
      $("birth-form").requestSubmit();
      say("Velkommen tilbake! Her er dagsguiden din for i dag.");
      setTimeout(function(){ var h = $("horo"); if(h && !h.hidden){ h.scrollIntoView({behavior:"smooth", block:"start"}); } }, 300);
    }
    setTimeout(function(){ restoring = false; }, 50); /* ikke lagre på nytt det vi nettopp hentet */
  }

  function load(){
    sb.from("members").select("*").eq("id", me.id).maybeSingle().then(function(r){
      if(r.error){ say("Kunne ikke hente kontoen: " + r.error.message, true); return; }
      if(!r.data){ say("Kontoen er ikke klar ennå. Last siden på nytt om litt.", true); return; }
      var first = !row; row = r.data;
      if(first && !row.signup_source){
        try { var src = localStorage.getItem("me_source"); if(src){ sb.rpc("set_signup_source", {p_source: src}).then(function(){}); } } catch(e){}
      }
      renderLoggedIn();
      if(first && isOpen(row)){ restore(); }
    });
  }

  /* Logg inn med e-post og passord */
  $("login-form").addEventListener("submit", function(e){
    e.preventDefault();
    var email = $("lemail").value.trim(), pass = $("lpass").value;
    if(!email){ return; }
    if(!pass){ say("Skriv passordet ditt, eller trykk «Send meg en innloggingslenke» hvis du ikke har laget passord ennå.", true); $("lpass").focus(); return; }
    say("Logger inn...");
    sb.auth.signInWithPassword({email: email, password: pass}).then(function(r){
      if(r.error){
        if(/invalid/i.test(r.error.message || "")){ say("Feil e-post eller passord. Har du ikke laget passord ennå, trykk «Send meg en innloggingslenke», og lag passordet inne på kontoen.", true); return; }
        if(/confirm/i.test(r.error.message || "")){ say("E-posten er ikke bekreftet ennå. Trykk «Send meg en innloggingslenke» først.", true); return; }
        say("Kunne ikke logge inn: " + r.error.message, true); return;
      }
      $("lpass").value = "";
      say("");
    });
  });

  /* Logg inn med lenke på e-post (første gang, eller glemt passord) */
  $("login-link").addEventListener("click", function(){
    var email = $("lemail").value.trim();
    if(!email || !$("lemail").checkValidity()){ say("Skriv e-postadressen din først.", true); $("lemail").focus(); return; }
    var btn = $("login-link");
    if(btn.disabled){ return; }
    btn.disabled = true;
    say("Sender lenke...");
    sb.auth.signInWithOtp({email: email, options: {emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true}}).then(function(r){
      /* Supabase tillater én lenke i minuttet per e-post. Knappen holdes av i 60 sekunder, så den ikke trykkes flere ganger. */
      setTimeout(function(){ btn.disabled = false; }, r.error ? 5000 : 60000);
      if(r.error){
        if(r.status === 429 || /rate|seconds|security purposes/i.test(r.error.message || "")){
          say("En lenke er nettopp sendt til " + email + ". Sjekk innboksen og søppelposten. Vil du ha en ny, vent ett minutt.", true); return;
        }
        say("Kunne ikke sende lenken: " + r.error.message, true); return;
      }
      say("Lenken er sendt til " + email + ". Sjekk innboksen, og søppelposten hvis den ikke kommer. Du kan be om en ny om ett minutt.");
    });
  });

  sb.auth.getSession().then(function(r){
    var s = r.data && r.data.session;
    if(s && !me){ me = s.user; load(); }
    else if(!s && thanks){
      thanks.innerHTML = "<h3>Takk for betalingen!</h3><p>Logg inn under med samme e-post som du brukte i kassen, så finner vi medlemskapet ditt. Du får en innloggingslenke på e-post.</p>";
    }
  });
  sb.auth.onAuthStateChange(function(ev, s){
    if(ev === "SIGNED_IN" && s && (!me || me.id !== s.user.id)){
      me = s.user; row = null;
      if(location.hash){ history.replaceState(null, "", location.pathname); }
      load();
    }
  });
})();
