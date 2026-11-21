/* Liten språkmeny øverst på sider som ikke har sin egen (Medlemsportalen, spillsidene, e-postlisten).
   Valget lagres i "meg-lang" og gjelder alle sidene på test.voteapp.eu / me.voteapp.eu.
   Legges inn med <script src="/lib/sprakmeny.js" defer></script>. Ingen løkker, bare en lytter på menyen. */
(function(){
  "use strict";
  if(document.getElementById("lang-select") || document.getElementById("sprakmeny")){ return; }
  var SPRAK = [["nb", "Norsk"], ["en", "English"], ["pt", "Português"], ["es", "Español"], ["zh", "中文"]];
  var na = (window.MegSprak && window.MegSprak.lang) || "nb";
  var boks = document.createElement("div");
  boks.id = "sprakmeny";
  boks.setAttribute("style", "display:flex;justify-content:flex-end;align-items:center;gap:8px;max-width:1100px;margin:8px auto 0;padding:0 16px;font-size:14px;box-sizing:border-box");
  var lab = document.createElement("label"); lab.setAttribute("for", "sprakmeny-valg"); lab.setAttribute("data-ikke-oversett", "");
  lab.textContent = "🌐"; lab.title = "Språk / Language";
  var sel = document.createElement("select"); sel.id = "sprakmeny-valg"; sel.setAttribute("aria-label", "Språk / Language"); sel.setAttribute("data-ikke-oversett", "");
  sel.setAttribute("style", "font:inherit;font-weight:600;padding:6px 10px;border-radius:10px;border:1px solid rgba(127,127,127,.45);background:transparent;color:inherit;max-width:100%");
  SPRAK.forEach(function(s){ var o = document.createElement("option"); o.value = s[0]; o.textContent = s[1]; if(s[0] === na){ o.selected = true; } sel.appendChild(o); });
  sel.addEventListener("change", function(){
    try{ localStorage.setItem("meg-lang", sel.value); }catch(e){}
    if(location.search && /[?&]lang=/.test(location.search)){ location.href = location.pathname + location.search.replace(/([?&])lang=[^&]*&?/, "$1").replace(/[?&]$/, "") + location.hash; }
    else { location.reload(); }
  });
  boks.appendChild(lab); boks.appendChild(sel);
  document.body.insertBefore(boks, document.body.firstChild);
})();
