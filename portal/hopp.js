/* Flytende knapper nederst til høyre: «Til toppen» og «Hopp til» en del av siden.
   Vises når man har scrollet et stykke ned. Menyen lister bare delene som er synlige akkurat nå. */
(function(){
  var box = document.createElement("div");
  box.className = "hopp"; box.hidden = true;
  box.innerHTML =
    '<div class="hopp-meny" id="hopp-meny" hidden role="menu" aria-label="Hopp til"></div>' +
    '<button type="button" class="hopp-btn" id="hopp-til" aria-haspopup="true" aria-expanded="false" aria-controls="hopp-meny">Hopp til</button>' +
    '<button type="button" class="hopp-btn hopp-topp" id="hopp-topp" aria-label="Til toppen av siden">↑</button>';
  document.body.appendChild(box);
  var meny = box.querySelector("#hopp-meny"), til = box.querySelector("#hopp-til"), topp = box.querySelector("#hopp-topp");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function go(el){ el.scrollIntoView({behavior: reduce ? "auto" : "smooth", block: "start"}); }
  function close(){ meny.hidden = true; til.setAttribute("aria-expanded", "false"); }
  function build(){
    meny.innerHTML = "";
    var secs = document.querySelectorAll("main section, .wrap section");
    Array.prototype.forEach.call(secs, function(s){
      if(s.hidden || s.offsetParent === null){ return; }
      var h = s.querySelector("h2"); if(!h){ return; }
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
