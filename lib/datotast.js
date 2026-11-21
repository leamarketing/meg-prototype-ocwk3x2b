/* Datofelt man skriver i, i stedet for kalendervelgeren (Geir 21.11.2026: «det må være tasting»).
   Gjør alle <input type="date"> på siden om til et vanlig felt med talltastatur: skriv 02071965,
   så blir det 02.07.1965 av seg selv. Punktum kan også skrives selv (2.7.1965).
   Koden på sidene trenger ingen endring: feltets .value gir og tar fortsatt formen åååå-mm-dd. */
(function(){
  var D = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  function pad(n){ n = String(n); return n.length < 2 ? "0" + n : n; }
  function tilIso(tekst){
    var m = /^\s*(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})\s*$/.exec(tekst || "");
    if(!m){ var s = String(tekst || "").replace(/\D/g, ""); if(s.length === 8){ m = [null, s.slice(0, 2), s.slice(2, 4), s.slice(4)]; } }
    if(!m){ return ""; }
    var d = +m[1], mo = +m[2], y = +m[3], t = new Date(y, mo - 1, d);
    if(t.getFullYear() !== y || t.getMonth() !== mo - 1 || t.getDate() !== d){ return ""; }
    return y + "-" + pad(mo) + "-" + pad(d);
  }
  function tilVisning(iso){
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    return m ? m[3] + "." + m[2] + "." + m[1] : (iso || "");
  }
  function koble(el){
    if(el.getAttribute("data-datotast")){ return; }
    el.setAttribute("data-datotast", "1");
    var forrige = D.get.call(el);
    el.type = "text";
    el.setAttribute("inputmode", "numeric");
    el.setAttribute("placeholder", "dd.mm.åååå");
    el.setAttribute("maxlength", "10");
    el.setAttribute("autocomplete", el.id === "hday" || el.id === "day-date" ? "off" : "bday");
    el.removeAttribute("min"); el.removeAttribute("max");
    Object.defineProperty(el, "value", {
      configurable: true,
      get: function(){ return tilIso(D.get.call(el)); },
      set: function(v){ D.set.call(el, tilVisning(v)); }
    });
    if(forrige){ el.value = forrige; }
    /* Punktum kommer av seg selv mens man skriver tall */
    el.addEventListener("input", function(e){
      var r = D.get.call(el);
      if(e.inputType && e.inputType.indexOf("delete") === 0){ return; }
      /* Har man skrevet punktum selv (2.7.1965), får det stå. Bare ren talltasting formateres. */
      if(!/^(\d{1,8}|\d{2}\.\d{0,2}|\d{2}\.\d{2}\.\d{0,4})$/.test(r)){ return; }
      var s = r.replace(/\D/g, "").slice(0, 8), ut = s;
      if(s.length > 4){ ut = s.slice(0, 2) + "." + s.slice(2, 4) + "." + s.slice(4); }
      else if(s.length > 2){ ut = s.slice(0, 2) + "." + s.slice(2); }
      if(ut !== r){ D.set.call(el, ut); }
    });
    /* Feilmelding fra nettleseren når datoen ikke finnes */
    el.addEventListener("blur", function(){
      var r = D.get.call(el).trim();
      el.setCustomValidity(r && !tilIso(r) ? "Skriv datoen som dd.mm.åååå, for eksempel 02.07.1965." : "");
    });
  }
  function alle(){ Array.prototype.forEach.call(document.querySelectorAll('input[type="date"]'), koble); }
  window.Datotast = { koble: koble, alle: alle, tilIso: tilIso };
  alle();
})();
