/* Stedssøk i hele Norge med Kartverkets åpne stedsnavn (ws.geonorge.no/stedsnavn, gratis, åpen CORS).
   Brukes av været (søkefelt) og av fødestedet (forslag i listen). Bare bebodde steder og gårder vises,
   ikke elver, fjell og fjorder. Steder utenfor Norge finnes ikke her: der gjelder den faste listen og koordinatene. */
(function(){
  "use strict";
  var API = "https://ws.geonorge.no/stedsnavn/v1/sted";
  var RANK = {"By":1, "Tettsted":2, "Kommune":3, "Bydel":4, "Tettbebyggelse":5, "Bygdelag (bygd)":6, "Grend":7, "Boligfelt":8, "Gard":9, "Bruk (gardsbruk)":10, "Øy":11};
  var memo = {}, KEY = "me_steder";
  try { memo = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch(e){ memo = {}; }
  function remember(p){
    memo[p.label.toLowerCase()] = {lat:p.lat, lon:p.lon};
    try { localStorage.setItem(KEY, JSON.stringify(memo)); } catch(e){}
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
    return p ? {n:String(txt).trim(), lat:p.lat, lon:p.lon, tz:"Europe/Oslo"} : null;
  }
  window.Stedsok = {search:search, remember:remember, known:known};

  /* Fødested: forslag fra hele Norge i listen under feltet mens man skriver. */
  var bp = document.getElementById("bp"), dl = document.getElementById("places"), timer = null, extra = [];
  if(bp && dl){
    bp.setAttribute("placeholder", "Skriv stedet, f.eks. Rotsundelv eller Tromsø");
    bp.addEventListener("input", function(){
      clearTimeout(timer);
      var q = bp.value;
      if(known(q)){ return; }
      timer = setTimeout(function(){
        search(q).then(function(list){
          extra.forEach(function(o){ o.remove(); }); extra = [];
          list.slice().reverse().forEach(function(p){
            var o = document.createElement("option"); o.value = p.label; o.label = p.type + (p.kommune ? ", " + p.kommune : "");
            o.dataset.lat = p.lat; o.dataset.lon = p.lon; dl.insertBefore(o, dl.firstChild); extra.push(o);
          });
        }).catch(function(){ /* listen med faste steder virker fortsatt */ });
      }, 300);
    });
    bp.addEventListener("change", function(){
      var v = bp.value.trim().toLowerCase();
      extra.forEach(function(o){ if(o.value.toLowerCase() === v){ remember({label:o.value, lat:+o.dataset.lat, lon:+o.dataset.lon}); } });
    });
  }
})();
