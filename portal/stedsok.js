/* Stedssøk i hele Norge med Kartverkets åpne stedsnavn (ws.geonorge.no/stedsnavn, gratis, åpen CORS).
   Brukes av været (søkefelt) og av fødestedet (forslag i listen). Bare bebodde steder og gårder vises,
   ikke elver, fjell og fjorder.
   Steder i resten av verden (fødestedet): Open-Meteo sitt stedssøk (geocoding-api.open-meteo.com, bygget på GeoNames,
   gratis uten nøkkel, åpen CORS). Det gir også tidssonen, så klokkeslettet regnes i lokal tid der man ble født.
   NB: Open-Meteo er gratis for ikke-kommersiell bruk. Før me.voteapp.eu tar betalt, må det kjøpes en plan eller byttes kilde. */
(function(){
  "use strict";
  var API = "https://ws.geonorge.no/stedsnavn/v1/sted";
  var VERDEN = "https://geocoding-api.open-meteo.com/v1/search";
  var RANK = {"By":1, "Tettsted":2, "Kommune":3, "Bydel":4, "Tettbebyggelse":5, "Bygdelag (bygd)":6, "Grend":7, "Boligfelt":8, "Gard":9, "Bruk (gardsbruk)":10, "Øy":11};
  var memo = {}, KEY = "me_steder";
  try { memo = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch(e){ memo = {}; }
  function remember(p){
    var x = {lat:p.lat, lon:p.lon}; if(p.tz && p.tz !== "Europe/Oslo"){ x.tz = p.tz; }
    memo[p.label.toLowerCase()] = x;
    try { localStorage.setItem(KEY, JSON.stringify(memo)); } catch(e){}
  }
  /* Steder utenfor Norge. Gir {navn, land, lat, lon, tz, label}, de største stedene først. */
  function verden(q){
    q = cleanQ(q);
    if(q.length < 3){ return Promise.resolve([]); }
    return fetch(VERDEN + "?name=" + encodeURIComponent(q) + "&count=10&language=nb&format=json").then(function(r){
      if(!r.ok){ throw new Error("Stedssøket svarte " + r.status); }
      return r.json();
    }).then(function(d){
      var seen = {}, out = [];
      (d.results || []).forEach(function(n){
        if(!n || n.country_code === "NO" || typeof n.latitude !== "number" || !n.timezone){ return; }
        var deler = [n.name]; if(n.admin1 && n.admin1 !== n.name){ deler.push(n.admin1); } if(n.country){ deler.push(n.country); }
        var label = deler.join(", ");
        if(seen[label]){ return; } seen[label] = 1;
        out.push({navn:n.name, land:n.country || "", lat:Math.round(n.latitude * 1e4) / 1e4, lon:Math.round(n.longitude * 1e4) / 1e4, tz:n.timezone, label:label});
      });
      return out.slice(0, 6);
    });
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
  window.Stedsok = {search:search, verden:verden, remember:remember, known:known};

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
            .concat(r[1].map(function(p){ return {label:p.label, info:p.land, lat:p.lat, lon:p.lon, tz:p.tz}; }));
          alle.slice().reverse().forEach(function(p){
            var o = document.createElement("option"); o.value = p.label; o.label = p.info;
            o.dataset.lat = p.lat; o.dataset.lon = p.lon; o.dataset.tz = p.tz; dl.insertBefore(o, dl.firstChild); extra.push(o);
          });
        });
      }, 400);
    });
    bp.addEventListener("change", function(){
      var v = bp.value.trim().toLowerCase();
      extra.forEach(function(o){ if(o.value.toLowerCase() === v){ remember({label:o.value, lat:+o.dataset.lat, lon:+o.dataset.lon, tz:o.dataset.tz || ""}); } });
    });
  }
})();
