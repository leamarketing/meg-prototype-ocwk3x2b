/* Lyskalenderen 2026. Ingen løkker i bakgrunnen: alt skjer bare når noen trykker. */
(function(){
  var AAR = 2026;
  var REKKEFOLGE = [7,15,2,21,11,4,18,24,9,13,1,20,6,16,23,3,12,19,8,22,14,5,17,10];
  var dorer = window.JUL_DORER || [];
  var forhand = /[?&]forhand=1/.test(location.search);

  function les(k, std){ try{ var v = localStorage.getItem(k); return v ? JSON.parse(v) : std; }catch(e){ return std; } }
  function skriv(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }

  /* Dagens dato i norsk tid */
  function idag(){
    var d = new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Oslo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
    var p = d.split("-"); return {y:+p[0], m:+p[1], d:+p[2]};
  }
  function apenDag(){
    if (forhand) return 24;
    var t = idag();
    if (t.y > AAR || (t.y === AAR && t.m === 12)) return t.y > AAR ? 24 : Math.min(t.d, 24);
    return 0;
  }

  /* Databasen: les tilkoblingen først når den trengs */
  function rpc(navn, data){
    var s = window.ME_SUPABASE;
    if (!s) return Promise.reject(new Error("ingen tilkobling"));
    return fetch(s.url + "/rest/v1/rpc/" + navn, {
      method:"POST",
      headers:{"apikey":s.publishable,"Authorization":"Bearer "+s.publishable,"Content-Type":"application/json"},
      body: JSON.stringify(data || {})
    }).then(function(r){ if(!r.ok) throw new Error("svar "+r.status); return r.json(); });
  }

  /* Nordlyset og stjernene */
  function tegnHimmel(antall){
    var el = document.getElementById("antall");
    el.textContent = new Intl.NumberFormat("no").format(antall);
    var andel = Math.min(antall / 500, 1);
    var lys = document.getElementById("nordlys");
    lys.style.setProperty("--lys", (35 + andel * 85) + "%");
    lys.style.setProperty("--styrke", (0.35 + andel * 0.5).toFixed(2));
    var boks = document.getElementById("stjerner");
    var vis = Math.min(antall, 300), html = "";
    var x = 12345;
    for (var i = 0; i < vis; i++){
      x = (x * 1103515245 + 12345) % 2147483648; var a = x / 2147483648;
      x = (x * 1103515245 + 12345) % 2147483648; var b = x / 2147483648;
      html += '<i style="left:' + (a*100).toFixed(2) + '%;top:' + (b*70).toFixed(2) + '%"></i>';
    }
    boks.innerHTML = html;
  }
  function hentAntall(){
    rpc("jul_nordlys").then(tegnHimmel).catch(function(){
      document.getElementById("antall").textContent = "?";
    });
  }

  /* Dørene */
  var apnet = les("lyskal-apnet", {});
  var gjort = les("lyskal-gjort", {});
  var aktiv = 0;

  function tegnDorer(){
    var apen = apenDag(), t = idag(), html = "";
    REKKEFOLGE.forEach(function(n){
      var klasser = ["dor"];
      var laast = n > apen;
      if (!forhand && t.y === AAR && t.m === 12 && t.d === n) klasser.push("idag");
      if (apnet[n]) klasser.push("apnet");
      if (gjort[n]) klasser.push("gjort");
      var tekst = laast ? "Åpnes " + n + ". des." : (gjort[n] ? "Stjerne tent" : (apnet[n] ? "Åpnet" : "Åpne"));
      html += '<button type="button" class="' + klasser.join(" ") + '" data-dag="' + n + '"' +
        (laast ? ' aria-disabled="true"' : '') +
        ' aria-label="Dør ' + n + ', ' + tekst + '">' + n + '<small>' + tekst + '</small></button>';
    });
    document.getElementById("dorer").innerHTML = html;
  }

  function apneDor(n){
    var d = dorer[n-1]; if (!d) return;
    aktiv = n;
    apnet[n] = true; skriv("lyskal-apnet", apnet);
    document.getElementById("dorDato").textContent = n + ". desember";
    document.getElementById("dorTittel").textContent = d.t;
    document.getElementById("dorFortelling").textContent = d.s;
    document.getElementById("dorLiten").textContent = d.l;
    document.getElementById("dorMiddels").textContent = d.m;
    var takk = document.getElementById("dorTakk");
    var valg = document.getElementById("dorValg");
    if (gjort[n]){ valg.hidden = true; takk.hidden = false; takk.textContent = "Du har tent stjernen for denne dagen. Takk for at du gjør noe for andre."; }
    else { valg.hidden = false; takk.hidden = true; }
    var vindu = document.getElementById("dorvindu");
    if (vindu.showModal) vindu.showModal(); else vindu.setAttribute("open","");
    tegnDorer();
  }

  document.getElementById("dorer").addEventListener("click", function(e){
    var b = e.target.closest(".dor"); if (!b) return;
    if (b.getAttribute("aria-disabled") === "true") return;
    apneDor(+b.dataset.dag);
  });

  document.getElementById("dorValg").addEventListener("click", function(e){
    var b = e.target.closest("button[data-storrelse]"); if (!b || !aktiv || gjort[aktiv]) return;
    var n = aktiv, storrelse = b.dataset.storrelse;
    var knapper = document.querySelectorAll("#dorValg button"); knapper.forEach(function(k){ k.disabled = true; });
    var takk = document.getElementById("dorTakk");
    rpc("jul_tenn_stjerne", {p_dag:n, p_storrelse:storrelse}).then(function(antall){
      gjort[n] = storrelse; skriv("lyskal-gjort", gjort);
      document.getElementById("dorValg").hidden = true;
      takk.hidden = false;
      takk.textContent = storrelse === "tanke"
        ? "Stjernen er tent. Å tenke på noen er også kjærlighet."
        : "Stjernen er tent. Takk for at du gjorde noe for en annen i dag.";
      tegnHimmel(antall); tegnDorer();
    }).catch(function(){
      takk.hidden = false; takk.textContent = "Stjernen kom ikke fram akkurat nå. Prøv igjen om litt.";
    }).then(function(){ knapper.forEach(function(k){ k.disabled = false; }); });
  });

  document.getElementById("dorLukk").addEventListener("click", function(){
    var v = document.getElementById("dorvindu"); if (v.close) v.close(); else v.removeAttribute("open");
  });

  /* Ønskeskjemaet */
  document.getElementById("alder").addEventListener("change", function(){
    document.getElementById("barnTekst").hidden = !(this.value === "1-6" || this.value === "7-14");
  });
  document.getElementById("onskeskjema").addEventListener("submit", function(e){
    e.preventDefault();
    var feil = document.getElementById("onskeFeil"), takk = document.getElementById("onskeTakk");
    var alder = document.getElementById("alder").value;
    var forMeg = document.getElementById("forMeg").value.trim();
    var forAndre = document.getElementById("forAndre").value.trim();
    var ok = document.getElementById("samtykke").checked;
    feil.hidden = true; takk.hidden = true;
    if (!alder){ feil.textContent = "Velg alderen din først."; feil.hidden = false; return; }
    if (!forMeg && !forAndre){ feil.textContent = "Skriv minst ett ønske."; feil.hidden = false; return; }
    if (!ok){ feil.textContent = "Kryss av for samtykke for å sende."; feil.hidden = false; return; }
    var knapp = this.querySelector("button[type=submit]"); knapp.disabled = true;
    rpc("jul_send_onske", {p_alder:alder, p_for_meg:forMeg, p_for_andre:forAndre, p_samtykke:true}).then(function(){
      takk.hidden = false; document.getElementById("onskeskjema").reset();
    }).catch(function(){
      feil.textContent = "Ønsket kom ikke fram akkurat nå. Prøv igjen om litt."; feil.hidden = false;
    }).then(function(){ knapp.disabled = false; });
  });

  /* Start */
  if (forhand) document.getElementById("forhandTekst").hidden = false;
  if (apenDag() === 0){
    var n = document.getElementById("nedtelling");
    var t = idag();
    var igjen = Math.round((Date.UTC(AAR,11,1) - Date.UTC(t.y,t.m-1,t.d)) / 86400000);
    n.textContent = "Første dør åpnes 1. desember. " + (igjen === 1 ? "Én dag igjen." : igjen + " dager igjen.");
    n.hidden = false;
  }
  tegnDorer();
  hentAntall();
})();
