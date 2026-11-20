/* Været i Min dag: kart (Leaflet + OpenStreetMap) og varsel fra MET Norway (api.met.no, Locationforecast 2.0).
   MET-data er gratis også kommersielt (CC BY 4.0, krever kreditering). Nettleseren kan ikke sette egen User-Agent,
   så varselet hentes via mellomtjenesten met-vaer (supabase/functions/met-vaer), som setter User-Agent og buffrer.
   Direkte kall til MET brukes bare som reserve hvis mellomtjenesten ikke svarer. */
(function(){
  "use strict";
  var API = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
  var PROXY = ((window.ME_SUPABASE && window.ME_SUPABASE.url) || "https://xprcbxubejpazmdbpsmy.supabase.co") + "/functions/v1/met-vaer";
  var SS = "me_vaer_v1:", KEEP = 30 * 60000;
  var HOME = {lat:69.77, lon:21.03, name:"Storslett, Nordreisa"};
  var PLACES = [
    {name:"Storslett", lat:69.77, lon:21.03}, {name:"Skjervøy", lat:70.03, lon:20.98},
    {name:"Burfjord", lat:69.94, lon:22.05}, {name:"Olderdalen", lat:69.60, lon:20.53},
    {name:"Skibotn", lat:69.39, lon:20.27}, {name:"Tromsø", lat:69.65, lon:18.96},
    {name:"Alta", lat:69.97, lon:23.27}, {name:"Kautokeino", lat:69.01, lon:23.04}
  ];
  var SYM = {
    clearsky:"Klart", fair:"Lettskyet", partlycloudy:"Delvis skyet", cloudy:"Skyet", fog:"Tåke",
    lightrain:"Lett regn", rain:"Regn", heavyrain:"Kraftig regn",
    lightrainshowers:"Lette regnbyger", rainshowers:"Regnbyger", heavyrainshowers:"Kraftige regnbyger",
    lightsleet:"Lett sludd", sleet:"Sludd", heavysleet:"Kraftig sludd",
    lightsleetshowers:"Lette sluddbyger", sleetshowers:"Sluddbyger", heavysleetshowers:"Kraftige sluddbyger",
    lightsnow:"Lett snø", snow:"Snø", heavysnow:"Kraftig snø",
    lightsnowshowers:"Lette snøbyger", snowshowers:"Snøbyger", heavysnowshowers:"Kraftige snøbyger"
  };
  var DAYS = ["søndag","mandag","tirsdag","onsdag","torsdag","fredag","lørdag"];
  var $ = function(id){ return document.getElementById(id); };
  var cache = {}, map = null, pin = null, reqId = 0;

  function r4(x){ return Math.round(x * 10000) / 10000; }
  /* 3 desimaler (ca. 100 m): innenfor MET sitt krav (maks 4) og gir flere treff i bufferen. */
  function r3(x){ return Math.round(x * 1000) / 1000; }
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
  function symText(code){
    if(!code){ return "Ukjent"; }
    var base = code.replace(/_(day|night|polartwilight)$/, ""), thunder = /andthunder$/.test(base);
    base = base.replace(/andthunder$/, "");
    var t = SYM[base] || "Ukjent (" + code + ")";
    return thunder ? t + " og torden" : t;
  }
  function fmtT(t){ if(t == null){ return "–"; } var r = Math.round(t); return (r > 0 ? "+" : r < 0 ? "−" : "") + Math.abs(r) + "°"; }
  function fmtN(x){ return x == null ? "–" : (Math.round(x * 10) / 10).toString().replace(".", ",") ; }
  function status(t, err){ var s = $("w-status"); s.textContent = t || ""; s.className = "muted" + (err ? " berr" : ""); }

  /* Henter varsel via mellomtjenesten vår (Supabase-funksjonen met-vaer), som sender riktig User-Agent til MET og
     buffrer svaret. Virker den ikke, spør vi MET direkte som før. Svaret huskes i minnet og i sessionStorage
     i minst 30 minutter (lenger hvis MET sin Expires sier det), så samme sted hentes bare én gang per visning. */
  function fetchJson(url){
    return fetch(url).then(function(r){
      if(!r.ok){ throw new Error("MET svarte " + r.status); }
      var exp = Date.parse(r.headers.get("Expires") || "") || 0;
      return r.json().then(function(d){
        if(!d || !d.properties || !d.properties.timeseries){ throw new Error("uventet svar"); }
        return {exp:exp, data:d};
      });
    });
  }
  function getForecast(lat, lon){
    var la = r3(lat), lo = r3(lon), key = la + "," + lo, hit = cache[key];
    if(!hit){ try { hit = JSON.parse(sessionStorage.getItem(SS + key) || "null"); } catch(e){ hit = null; } }
    if(hit && hit.until > Date.now()){ cache[key] = hit; return Promise.resolve(hit.data); }
    var q = "?lat=" + la + "&lon=" + lo;
    return fetchJson(PROXY + q).catch(function(){ return fetchJson(API + q); }).then(function(res){
      var rec = {until:Math.max(res.exp, Date.now() + KEEP), data:res.data};
      cache[key] = rec;
      try { sessionStorage.setItem(SS + key, JSON.stringify(rec)); } catch(e){ /* full eller avslått: minnet holder */ }
      return res.data;
    });
  }

  function dayKey(dt){ return dt.getFullYear() + "-" + (dt.getMonth() + 1) + "-" + dt.getDate(); }
  function summarize(d){
    var ts = d.properties.timeseries, days = [], byKey = {};
    ts.forEach(function(e){
      var dt = new Date(e.time), k = dayKey(dt), det = e.data.instant.details;
      var g = byKey[k];
      if(!g){ g = byKey[k] = {date:dt, min:Infinity, max:-Infinity, rain:0, wind:0, sym:null, symHour:99}; days.push(g); }
      if(det.air_temperature != null){ g.min = Math.min(g.min, det.air_temperature); g.max = Math.max(g.max, det.air_temperature); }
      if(det.wind_speed != null){ g.wind = Math.max(g.wind, det.wind_speed); }
      var p1 = e.data.next_1_hours, p6 = e.data.next_6_hours;
      /* Nedbør: timeverdier der de finnes, ellers 6-timersverdier på 00, 06, 12 og 18 (ikke dobbelttelling). */
      if(p1 && p1.details && p1.details.precipitation_amount != null){ g.rain += p1.details.precipitation_amount; }
      else if(p6 && p6.details && p6.details.precipitation_amount != null && dt.getUTCHours() % 6 === 0){ g.rain += p6.details.precipitation_amount; }
      var s = (p6 && p6.summary && p6.summary.symbol_code) || (p1 && p1.summary && p1.summary.symbol_code);
      var dist = Math.abs(dt.getHours() - 12);
      if(s && dist < g.symHour){ g.sym = s; g.symHour = dist; }
    });
    return days.slice(0, 7);
  }

  function render(d, name, lat, lon){
    var now = d.properties.timeseries[0], det = now.data.instant.details;
    var nx = now.data.next_1_hours || now.data.next_6_hours || {};
    var sym = nx.summary ? nx.summary.symbol_code : null;
    var rainNext = nx.details && nx.details.precipitation_amount != null ? nx.details.precipitation_amount : null;
    var html = "<h3>" + esc(name) + "</h3><p class=\"muted\">" + r4(lat).toFixed(2) + "° N, " + r4(lon).toFixed(2) + "° Ø</p>";
    html += "<div class=\"w-now\"><span class=\"big\">" + fmtT(det.air_temperature) + "</span><span class=\"w-desc\">" + esc(symText(sym)) + "</span></div>";
    html += "<div class=\"facts\">";
    html += "<div><span>Vind</span><b>" + fmtN(det.wind_speed) + " m/s</b></div>";
    html += "<div><span>Nedbør neste time</span><b>" + fmtN(rainNext) + " mm</b></div>";
    html += "<div><span>Luftfuktighet</span><b>" + (det.relative_humidity == null ? "–" : Math.round(det.relative_humidity)) + " %</b></div>";
    html += "<div><span>Skydekke</span><b>" + (det.cloud_area_fraction == null ? "–" : Math.round(det.cloud_area_fraction)) + " %</b></div>";
    html += "</div>";
    html += "<div class=\"tablebox\" style=\"margin-top:12px\"><table class=\"ptable\"><caption class=\"muted\" style=\"text-align:left;padding-bottom:4px\">Neste dager</caption><thead><tr><th scope=\"col\">Dag</th><th scope=\"col\">Vær midt på dagen</th><th scope=\"col\">Min / maks</th><th scope=\"col\">Nedbør</th><th scope=\"col\">Vind maks</th></tr></thead><tbody>";
    summarize(d).forEach(function(g, i){
      var label = i === 0 ? "I dag" : i === 1 ? "I morgen" : DAYS[g.date.getDay()].replace(/^./, function(c){ return c.toUpperCase(); }) + " " + g.date.getDate() + ".";
      html += "<tr><td>" + label + "</td><td>" + esc(symText(g.sym)) + "</td><td>" + fmtT(g.min) + " / " + fmtT(g.max) + "</td><td>" + fmtN(g.rain) + " mm</td><td>" + fmtN(g.wind) + " m/s</td></tr>";
    });
    html += "</tbody></table></div>";
    var upd = new Date(d.properties.meta.updated_at);
    html += "<p class=\"muted\">Varselet ble laget av MET kl. " + upd.toLocaleTimeString("nb-NO", {hour:"2-digit", minute:"2-digit"}) + ". Det er alltid usikkert, mest etter de første par døgnene.</p>";
    $("w-out").innerHTML = html;
  }

  /* Sist valgte sted huskes i denne nettleseren, så været åpner der neste gang. */
  var LAST = "me_vaer_sted";
  function lastPlace(){ try { var p = JSON.parse(localStorage.getItem(LAST) || "null"); return p && isFinite(p.lat) && isFinite(p.lon) ? p : null; } catch(e){ return null; } }
  function loadPoint(lat, lon, name){
    var my = ++reqId;
    try { localStorage.setItem(LAST, JSON.stringify({lat:lat, lon:lon, name:name})); } catch(e){}
    status("Henter varsel ...");
    if(pin){ pin.setLatLng([lat, lon]); }
    getForecast(lat, lon).then(function(d){
      if(my !== reqId){ return; }
      render(d, name, lat, lon); status("");
    }).catch(function(e){
      if(my !== reqId){ return; }
      status("Fikk ikke hentet varsel: " + e.message + ". Prøv igjen om litt.", true);
    });
  }

  function loadLabels(layer){
    PLACES.forEach(function(p, i){
      setTimeout(function(){
        getForecast(p.lat, p.lon).then(function(d){
          var t = d.properties.timeseries[0].data.instant.details.air_temperature;
          var cls = Math.round(t) > 0 ? "warm" : Math.round(t) < 0 ? "cold" : "zero";
          L.marker([p.lat, p.lon], {
            keyboard:true, title:p.name + " " + fmtT(t),
            icon:L.divIcon({className:"w-lbl " + cls, html:esc(p.name) + " <b>" + fmtT(t) + "</b>", iconSize:null})
          }).on("click", function(){ loadPoint(p.lat, p.lon, p.name); }).addTo(layer);
        }).catch(function(){ /* etikettene er bare oversikt; hovedvarselet viser egen feil */ });
      }, i * 150);
    });
  }

  function start(){
    if(map){ map.invalidateSize(); return; }
    if(!window.L){ var l0 = lastPlace() || HOME; status("Kartet kunne ikke lastes. Varselet vises likevel.", true); loadPoint(l0.lat, l0.lon, l0.name); return; }
    map = L.map("w-map", {zoomControl:true, scrollWheelZoom:false}).setView([HOME.lat, HOME.lon], 7);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom:18, attribution:"&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> | Vær: <a href=\"https://www.met.no/\">MET Norway</a>"
    }).addTo(map);
    pin = L.marker([HOME.lat, HOME.lon], {keyboard:true, title:"Valgt sted"}).addTo(map);
    var labels = L.layerGroup().addTo(map);
    map.on("click", function(e){ loadPoint(e.latlng.lat, e.latlng.lng, "Valgt punkt"); });
    var lp = lastPlace();
    if(lp){ map.setView([lp.lat, lp.lon], 9); loadPoint(lp.lat, lp.lon, lp.name || "Valgt punkt"); }
    else { loadPoint(HOME.lat, HOME.lon, HOME.name); }
    loadLabels(labels);
  }

  $("w-home").addEventListener("click", function(){ if(map){ map.setView([HOME.lat, HOME.lon], 7); } loadPoint(HOME.lat, HOME.lon, HOME.name); });
  $("w-locate").addEventListener("click", function(){
    if(!navigator.geolocation){ status("Nettleseren din kan ikke gi posisjon.", true); return; }
    status("Spør nettleseren om posisjonen din ...");
    navigator.geolocation.getCurrentPosition(function(pos){
      var la = pos.coords.latitude, lo = pos.coords.longitude;
      if(map){ map.setView([la, lo], 9); }
      loadPoint(la, lo, "Der du er nå");
    }, function(){ status("Fikk ikke posisjonen (avslått eller ikke tilgjengelig).", true); }, {timeout:10000});
  });

  /* Søk etter sted i Norge (Kartverket, se stedsok.js). */
  $("w-search").addEventListener("submit", function(ev){
    ev.preventDefault();
    var q = $("w-q").value, hits = $("w-hits");
    hits.innerHTML = "";
    if(!window.Stedsok || q.trim().length < 2){ status("Skriv minst to bokstaver.", true); return; }
    status("Søker ...");
    window.Stedsok.search(q).then(function(list){
      if(!list.length){ status("Fant ikke noe bebodd sted som heter «" + q.trim() + "». Sjekk stavemåten, eller trykk på kartet.", true); return; }
      status(list.length === 1 ? "" : "Velg stedet du mener:");
      list.forEach(function(p){
        var li = document.createElement("li"), b = document.createElement("button");
        b.type = "button"; b.innerHTML = esc(p.navn) + "<small>" + esc(p.type + (p.kommune && p.kommune !== p.navn ? ", " + p.kommune : "")) + "</small>";
        b.addEventListener("click", function(){
          hits.innerHTML = "";
          if(!map){ start(); }
          if(map){ map.setView([p.lat, p.lon], 10); }
          loadPoint(p.lat, p.lon, p.label);
        });
        li.appendChild(b); hits.appendChild(li);
      });
      if(list.length === 1){ hits.querySelector("button").click(); }
    }).catch(function(e){ status("Søket virket ikke akkurat nå: " + e.message + ".", true); });
  });

  /* Seksjonen åpnes fra flisen eller med #vaer i adressen. Kartet lages først når det synes, ellers får Leaflet feil størrelse. */
  function openIfHash(){
    if(location.hash === "#vaer"){ $("vaer").hidden = false; start(); }
  }
  window.addEventListener("hashchange", openIfHash);
  openIfHash();
})();
