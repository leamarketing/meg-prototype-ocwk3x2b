/* Medlemskap for me.voteapp: innlogging med e-postlenke, lagring av navn og fødselsdata (bare med samtykke),
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
    html += "<label class=\"consent\"><input type=\"checkbox\" id=\"consent\"" + (row.consent_at ? " checked" : "") + "> <span>Lagre navn og fødselsdata på kontoen min, så jeg slipper å skrive dem inn igjen. Dataene ligger i EU, deles ikke med andre og holdes adskilt fra stemmesvar.</span></label>";
    html += "<div class=\"acct-actions\"><button type=\"button\" class=\"linkbtn\" id=\"logout\">Logg ut</button><button type=\"button\" class=\"linkbtn\" id=\"delete-me\">Slett kontoen min og alle data</button></div>";
    out.innerHTML = html;

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
      renderLoggedIn();
      if(first && isOpen(row)){ restore(); }
    });
  }

  $("login-form").addEventListener("submit", function(e){
    e.preventDefault();
    var email = $("lemail").value.trim();
    if(!email){ return; }
    say("Sender lenke...");
    sb.auth.signInWithOtp({email: email, options: {emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true}}).then(function(r){
      if(r.error){ say("Kunne ikke sende lenken: " + r.error.message, true); return; }
      say("Lenken er sendt til " + email + ". Sjekk innboksen, og søppelposten hvis den ikke kommer.");
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
