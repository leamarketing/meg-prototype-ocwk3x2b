/* Flytende knapper nederst til høyre: «Til toppen» og «Hopp til» en del av siden.
   Vises når man har scrollet et stykke ned. Menyen lister bare delene som er synlige akkurat nå. */
(function(){
  /* Egen stil, så knappene ser like ut på alle sidene (portal, Min dag, Spill). */
  if(!document.getElementById("hopp-css")){
    var st = document.createElement("style"); st.id = "hopp-css";
    st.textContent = ".hopp{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:1000;display:flex;gap:8px;align-items:flex-end}"
      + ".hopp[hidden]{display:none}"
      + ".hopp-btn{font:inherit;font-weight:700;min-height:48px;min-width:48px;padding:10px 16px;border-radius:999px;border:1px solid var(--line,#d3dedd);background:var(--surface,var(--card,#fff));color:var(--ink,#1d2430);box-shadow:0 4px 14px rgba(0,0,0,.18);cursor:pointer}"
      + ".hopp-topp{background:var(--accent,#1f7a5c);color:var(--accent-ink,#fff);border-color:var(--accent,#1f7a5c);font-size:20px;padding:10px 0;width:48px}"
      + ".hopp-btn:focus-visible,.hopp-meny button:focus-visible{outline:3px solid var(--accent,#1f7a5c);outline-offset:2px}"
      + ".hopp-meny{position:absolute;right:0;bottom:58px;min-width:220px;max-width:80vw;max-height:60vh;overflow:auto;background:var(--surface,var(--card,#fff));border:1px solid var(--line,#d3dedd);border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.22);padding:6px}"
      + ".hopp-meny button{display:block;width:100%;text-align:left;font:inherit;font-weight:400;padding:12px 14px;border:0;border-radius:10px;background:none;color:var(--ink,#1d2430);cursor:pointer;min-height:0}"
      + ".hopp-meny button:hover{background:var(--surface-2,var(--chip,#eef3f7))}";
    document.head.appendChild(st);
  }
  var box = document.createElement("div");
  box.className = "hopp"; box.hidden = true;
  box.innerHTML =
    '<div class="hopp-meny" id="hopp-meny" hidden role="menu" aria-label="Hopp til"></div>' +
    '<button type="button" class="hopp-btn" id="hopp-til" aria-haspopup="true" aria-expanded="false" aria-controls="hopp-meny">Hopp til</button>' +
    '<button type="button" class="hopp-btn hopp-topp" id="hopp-topp" aria-label="Til toppen av siden">↑</button>';
  document.body.appendChild(box);
  /* Litt luft nederst, så knappene aldri dekker det siste på siden */
  var plass = document.createElement("div"); plass.setAttribute("aria-hidden", "true"); plass.style.height = "72px";
  document.body.appendChild(plass);
  var meny = box.querySelector("#hopp-meny"), til = box.querySelector("#hopp-til"), topp = box.querySelector("#hopp-topp");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function go(el){ el.scrollIntoView({behavior: reduce ? "auto" : "smooth", block: "start"}); }
  function close(){ meny.hidden = true; til.setAttribute("aria-expanded", "false"); }
  function build(){
    meny.innerHTML = "";
    /* Overskriftene som vises akkurat nå: h2 i seksjoner og kort, og h3 i kort (Min dag). Skjulte og skjermleser-overskrifter hoppes over. */
    var hs = document.querySelectorAll("section h2, .card h2, .card > h3, .card .card-head h3, details > summary");
    var sett = [];
    Array.prototype.forEach.call(hs, function(h){
      if(h.offsetParent === null || h.classList.contains("sr") || h.closest(".hopp")){ return; }
      var s = h.closest("article, section, details, .card") || h;
      if(sett.indexOf(s) >= 0){ return; } sett.push(s);
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "menuitem"); b.textContent = h.textContent.trim();
      b.addEventListener("click", function(){ close(); go(s); var f = h; f.setAttribute("tabindex", "-1"); f.focus({preventScroll:true}); });
      meny.appendChild(b);
    });
  }
  til.addEventListener("click", function(){
    if(meny.hidden){ build(); meny.hidden = false; til.setAttribute("aria-expanded", "true"); var f = meny.querySelector("button"); if(f){ f.focus(); } }
    else { close(); }
  });
  topp.addEventListener("click", function(){ close(); window.scrollTo({top:0, behavior: reduce ? "auto" : "smooth"}); });
  document.addEventListener("keydown", function(e){ if(e.key === "Escape" && !meny.hidden){ close(); til.focus(); } });
  document.addEventListener("click", function(e){ if(!box.contains(e.target)){ close(); } });
  var ticking = false;
  window.addEventListener("scroll", function(){
    if(ticking){ return; } ticking = true;
    requestAnimationFrame(function(){ box.hidden = window.scrollY < 500; if(box.hidden){ close(); } ticking = false; });
  }, {passive:true});
})();
