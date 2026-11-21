/* Stedssøk i hele Norge med Kartverkets åpne stedsnavn (ws.geonorge.no/stedsnavn, gratis, åpen CORS).
   Brukes av været (søkefelt) og av fødestedet (forslag i listen). Bare bebodde steder og gårder vises,
   ikke elver, fjell og fjorder.
   Steder i resten av verden (fødestedet): Photon (photon.komoot.io, bygget på OpenStreetMap, gratis uten nøkkel,
   åpen CORS). Photon kjenner stedene på sitt eget språk (Göteborg, Lisboa, Roma). Data © OpenStreetMap-bidragsytere.
   Tidssonen hentes med ett oppslag hos Open-Meteo (timezone=auto) når et sted velges, så klokkeslettet regnes
   i lokal tid der man ble født.
   NB: Photon skal brukes med måte (vi søker først etter en pause i skrivingen), og Open-Meteo er gratis for
   ikke-kommersiell bruk. Før me.voteapp.eu tar betalt, må dette avklares (egen plan eller egen tjener). */
(function(){
  "use strict";
  var API = "https://ws.geonorge.no/stedsnavn/v1/sted";
  var VERDEN = "https://photon.komoot.io/api/";
  var TZ = "https://api.open-meteo.com/v1/forecast";
  var BEBODD = {city:1, town:1, village:1, hamlet:1, municipality:1, suburb:1, borough:1, quarter:1, neighbourhood:1, locality:1, administrative:1};
  var RANK = {"By":1, "Tettsted":2, "Kommune":3, "Bydel":4, "Tettbebyggelse":5, "Bygdelag (bygd)":6, "Grend":7, "Boligfelt":8, "Gard":9, "Bruk (gardsbruk)":10, "Øy":11};
  var memo = {}, KEY = "me_steder";
  try { memo = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch(e){ memo = {}; }
  function remember(p){
    var x = {lat:p.lat, lon:p.lon}; if(p.tz && p.tz !== "Europe/Oslo"){ x.tz = p.tz; }
    memo[p.label.toLowerCase()] = x;
    try { localStorage.setItem(KEY, JSON.stringify(memo)); } catch(e){}
  }
  /* Steder utenfor Norge. Gir {navn, land, lat, lon, label}, de mest kjente stedene først. Tidssonen hentes med tidssone(). */
  function verden(q){
    q = cleanQ(q);
    if(q.length < 3){ return Promise.resolve([]); }
    return fetch(VERDEN + "?q=" + encodeURIComponent(q) + "&limit=12&layer=city&layer=district&layer=locality").then(function(r){
      if(!r.ok){ throw new Error("Stedssøket svarte " + r.status); }
      return r.json();
    }).then(function(d){
      var seen = {}, out = [];
      (d.features || []).forEach(function(f){
        var p = f && f.properties, c = f && f.geometry && f.geometry.coordinates;
        if(!p || !c || !p.name || p.countrycode === "NO" || !BEBODD[p.osm_value]){ return; }
        var deler = [p.name]; if(p.state && p.state !== p.name){ deler.push(p.state); } if(p.country){ deler.push(p.country); }
        var label = deler.join(", ");
        if(seen[label]){ return; } seen[label] = 1;
        out.push({navn:p.name, land:p.country || "", lat:Math.round(c[1] * 1e4) / 1e4, lon:Math.round(c[0] * 1e4) / 1e4, label:label});
      });
      return out.slice(0, 6);
    });
  }
  /* Tidssonen der stedet ligger, for eksempel "Europe/Stockholm". */
  function tidssone(lat, lon){
    return fetch(TZ + "?latitude=" + lat + "&longitude=" + lon + "&timezone=auto&forecast_days=1").then(function(r){
      if(!r.ok){ throw new Error("Tidssonen svarte " + r.status); }
      return r.json();
    }).then(function(d){ return d && typeof d.timezone === "string" && d.timezone !== "GMT" ? d.timezone : null; });
  }
  function kommune(n){ var k = n.kommuner && n.kommuner[0] ? n.kommuner[0].kommunenavn : ""; return k.split(" - ")[0]; }
  function cleanQ(q){ return q.replace(/[*?&#%]/g, " ").replace(/\s+/g, " ").trim(); }

  /* Gir en liste med {navn, type, kommune, lat, lon, label}, de mest bebodde stedstypene først. */
  /* Først vanlig søk på starten av navnet. Gir det ingenting, prøver vi igjen med Kartverkets skrivefeil-søk. */
  function search(q){
    q = cleanQ(q);
    if(q.length < 2){ return Promise.resolve([]); }
    return lookup(q, false).then(function(list){ return list.length || q.length < 4 ? list : lookup(q, true); });
  }
  function lookup(q, fuzzy){
    var url = API + "?sok=" + encodeURIComponent(fuzzy ? q : q + "*") + (fuzzy ? "&fuzzy=true" : "") + "&treffPerSide=60&utkoordsys=4258";
    return fetch(url).then(function(r){
      if(!r.ok){ throw new Error("Kartverket svarte " + r.status); }
      return r.json();
    }).then(function(d){
      var seen = {}, out = [];
      (d.navn || []).forEach(function(n){
        var rank = RANK[n.navneobjekttype];
        if(!rank || !n.representasjonspunkt || !n.stedsnavn || !n.stedsnavn[0]){ return; }
        var navn = n.stedsnavn[0]["skrivemåte"], kom = kommune(n);
        var label = navn === kom || !kom ? navn : navn + ", " + kom;
        if(seen[label]){ return; } seen[label] = 1;
        var exact = navn.toLowerCase() === q.toLowerCase() ? 0 : 1;
        out.push({navn:navn, type:n.navneobjekttype, kommune:kom, lat:n.representasjonspunkt.nord, lon:n.representasjonspunkt["øst"], label:label, sort:exact * 100 + rank});
      });
      out.sort(function(a, b){ return a.sort - b.sort || a.label.localeCompare(b.label, "nb"); });
      return out.slice(0, 12);
    });
  }
  function known(txt){
    var p = memo[String(txt || "").trim().toLowerCase()];
    return p ? {n:String(txt).trim(), lat:p.lat, lon:p.lon, tz:p.tz || "Europe/Oslo"} : null;
  }
  window.Stedsok = {search:search, verden:verden, tidssone:tidssone, remember:remember, known:known};

  /* Fødested: forslag fra hele Norge og resten av verden i listen under feltet mens man skriver.
     Norske steder først. Søket går først når man har sluttet å skrive i 0,4 sekunder, så det blir få oppslag. */
  var bp = document.getElementById("bp"), dl = document.getElementById("places"), timer = null, extra = [], nr = 0;
  if(bp && dl){
    bp.setAttribute("placeholder", "Skriv stedet, f.eks. Rotsundelv, Tromsø eller Maceió");
    bp.addEventListener("input", function(){
      clearTimeout(timer);
      var q = bp.value;
      if(known(q)){ return; }
      timer = setTimeout(function(){
        var mitt = ++nr;
        Promise.all([
          search(q).catch(function(){ return []; }),
          verden(q).catch(function(){ return []; })
        ]).then(function(r){
          if(mitt !== nr){ return; } /* et nyere søk er på vei */
          extra.forEach(function(o){ o.remove(); }); extra = [];
          var alle = r[0].slice(0, 8).map(function(p){ return {label:p.label, info:p.type + (p.kommune ? ", " + p.kommune : ""), lat:p.lat, lon:p.lon, tz:""}; })
            .concat(r[1].map(function(p){ return {label:p.label, info:p.land, lat:p.lat, lon:p.lon, tz:"", verden:true}; }));
          alle.slice().reverse().forEach(function(p){
            var o = document.createElement("option"); o.value = p.label; o.label = p.info;
            o.dataset.lat = p.lat; o.dataset.lon = p.lon; if(p.verden){ o.dataset.verden = "1"; } dl.insertBefore(o, dl.firstChild); extra.push(o);
          });
        });
      }, 400);
    });
    bp.addEventListener("change", function(){
      var v = bp.value.trim().toLowerCase();
      extra.forEach(function(o){
        if(o.value.toLowerCase() !== v){ return; }
        var sted = {label:o.value, lat:+o.dataset.lat, lon:+o.dataset.lon, tz:""};
        remember(sted);
        if(!o.dataset.verden){ return; }
        /* Utenfor Norge: hent tidssonen. Er horoskopet allerede vist, regnes det ut på nytt med riktig lokal tid. */
        tidssone(sted.lat, sted.lon).then(function(tz){
          if(!tz || bp.value.trim().toLowerCase() !== v){ return; }
          sted.tz = tz; remember(sted);
          var ut = document.getElementById("birth-out"), f = document.getElementById("birth-form");
          if(ut && f && ut.textContent.trim() && f.requestSubmit){ f.requestSubmit(); }
        }).catch(function(){ /* uten svar regnes klokkeslettet som norsk tid */ });
      });
    });
  }
})();
