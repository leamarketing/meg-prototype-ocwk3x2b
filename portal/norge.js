/* Norges dag i tradisjonen: 17. mai 1814 og pytagoreisk numerologi (Geir godkjente valget 18.11.2026).
   Kilde og forbehold: moduler/horoskop-numerologi-norge_2026-11-18.md. Alt merkes som tradisjon, aldri som fakta om Norge. */
(function(){
  "use strict";
  var $ = function(id){ return document.getElementById(id); };
  function reduce(n){ while(n > 9 && n !== 11 && n !== 22){ n = String(n).split("").reduce(function(a, b){ return a + Number(b); }, 0); } return n; }
  function fill(){
    var t = new Date(), today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    var next = new Date(t.getFullYear(), 4, 17);
    if(next < today){ next = new Date(t.getFullYear() + 1, 4, 17); }
    var left = Math.round((next - today) / 86400000);
    $("n-days").innerHTML = "<span>Dager til 17. mai</span><b>" + (left === 0 ? "I dag!" : left) + "</b>";
    var digits = "" + t.getDate() + (t.getMonth() + 1) + t.getFullYear();
    var raw = digits.split("").reduce(function(a, b){ return a + Number(b); }, 0);
    $("n-today").innerHTML = "<b>Dagens datotall:</b> " + digits.split("").join("+") + " = " + raw + (raw > 9 ? ", som blir " + reduce(raw) : "") + ". Norges datotall er 9.";
  }
  function openIfHash(){ if(location.hash === "#norge"){ $("norge").hidden = false; fill(); } }
  window.addEventListener("hashchange", openIfHash);
  openIfHash();
})();
