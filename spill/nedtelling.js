/* Nedtelling til Lotto-fristen lørdag kl. 18.00 norsk tid.
   Sparer strøm: oppdateres hvert halve minutt, og stopper når siden ikke vises. */
(function(){
  var FRIST_TIME = 18; // kl. 18.00 på lørdager, ifølge Geir 21.11.2026. Sjekk hos Norsk Tipping.
  var dager = {Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6};
  function oslo(){
    var f = new Intl.DateTimeFormat("en-GB", {timeZone:"Europe/Oslo", weekday:"short", hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:false});
    var p = {}; f.formatToParts(new Date()).forEach(function(x){ p[x.type] = x.value; });
    return {dag: dager[p.weekday], sek: (+p.hour % 24) * 3600 + (+p.minute) * 60 + (+p.second)};
  }
  function igjen(){
    var n = oslo(), frist = FRIST_TIME * 3600;
    var fram = (6 - n.dag + 7) % 7;
    if(fram === 0 && n.sek >= frist){ fram = 7; }
    return fram * 86400 + frist - n.sek;
  }
  function tekst(s){
    var d = Math.floor(s / 86400), t = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
    if(d === 0){
      if(t === 0 && m === 0){ return "Lotto-frist i dag kl. 18.00: under ett minutt igjen."; }
      return "Lotto-frist i dag kl. 18.00: " + (t ? t + (t === 1 ? " time" : " timer") + " og " : "") + m + (m === 1 ? " minutt" : " minutter") + " igjen.";
    }
    return "Neste Lotto-frist: lørdag kl. 18.00, om " + d + (d === 1 ? " dag" : " dager") + " og " + t + (t === 1 ? " time" : " timer") + ".";
  }
  var id = null;
  function vis(){
    var s = tekst(igjen());
    var el = document.querySelectorAll(".nedtelling");
    for(var i = 0; i < el.length; i++){ el[i].textContent = s; }
  }
  function start(){ vis(); if(!id){ id = setInterval(vis, 30000); } }
  function stopp(){ if(id){ clearInterval(id); id = null; } }
  document.addEventListener("visibilitychange", function(){ document.hidden ? stopp() : start(); });
  if(document.readyState === "loading"){ document.addEventListener("DOMContentLoaded", start); } else { start(); }
  window.LottoFrist = {igjen: igjen, tekst: tekst};
})();
