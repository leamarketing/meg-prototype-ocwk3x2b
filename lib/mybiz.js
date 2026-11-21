/* MyBiz-kortet i Min dag: viser fremdriften og dagens steg fra MinBiz (my.bizplanpilot.com).
   - Data hentes fra den felles databasen (me-voteapp) med samme klient og innlogging som lib/meg-konto.js.
   - Radsikkerheten i databasen gjør at bare personen selv ser sine egne MinBiz-rader.
   - MinBiz-data kobles aldri til stemmesvar, og ingenting sporer hva personen gjør.
   - Ikke innlogget: kortet viser tydelig merket eksempeldata.
   - Sparer strøm: én henting når siden åpnes, og én skriving bare når personen trykker «Merk som gjort». */
(function(){
  "use strict";
  var APP = "https://my.bizplanpilot.com/app.html";
  var FASER = { brainstorm: "Brainstorming", analyse: "Skrivebordsanalyse", verktoy: "Verktøy", plan: "Plan" };
  var EKSEMPEL = {
    idea: { title: "Kajakkutleie i Nordreisa", phase: "plan" },
    steps: (function(){
      var s = [], i;
      for(i = 0; i < 12; i++){ s.push({ id: "eks" + i, sort: i, title: "Steg " + (i + 1), status: i < 3 ? "gjort" : "neste", due_date: null }); }
      s[3].title = "Snakk med tre mulige kunder"; s[3].status = "i_dag";
      return s;
    })(),
    last: null
  };

  var card = document.getElementById("mybiz-card");
  if(!card){ return; }
  var body = document.getElementById("mybiz-body"), tag = document.getElementById("mybiz-tag");

  function el(t, attrs, kids){
    var e = document.createElement(t);
    if(attrs){ for(var a in attrs){ e.setAttribute(a, attrs[a]); } }
    (kids || []).forEach(function(k){ if(k != null){ e.appendChild(typeof k === "string" ? document.createTextNode(k) : k); } });
    return e;
  }
  function p2(n){ return (n < 10 ? "0" : "") + n; }
  function idag(){ var d = new Date(); return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function dato(iso){
    if(!iso){ return ""; }
    var d = String(iso).slice(0, 10).split("-");
    var x = new Date(+d[0], +d[1] - 1, +d[2]);
    return x.toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long" });
  }
  function settTag(tekst, klasse){ tag.textContent = tekst; tag.className = "tag " + klasse; }
  function lenke(href, tekst, primar){ return el("a", { "class": "btn" + (primar ? " primary" : ""), href: href }, [tekst]); }

  /* Dagens steg følger MinBiz: «I dag» først, så et steg som har nådd datoen sin, ellers neste steg med dato. */
  function velgSteg(steps){
    var t = idag(), apne = steps.filter(function(s){ return s.status !== "gjort"; });
    var iDag = apne.filter(function(s){ return s.status === "i_dag"; })[0]
      || apne.filter(function(s){ return s.status === "neste" && s.due_date && s.due_date <= t; })[0];
    if(iDag){ return { steg: iDag, idag: true }; }
    var neste = apne.filter(function(s){ return s.status === "neste"; })[0];
    return neste ? { steg: neste, idag: false } : null;
  }

  function fremdrift(steps){
    var gjort = steps.filter(function(s){ return s.status === "gjort"; }).length, tot = steps.length;
    var pst = tot ? Math.round(gjort / tot * 100) : 0;
    var wrap = el("div", { "class": "mb-prog" });
    var id = "mybiz-prog-" + Math.random().toString(36).slice(2, 7);
    wrap.appendChild(el("label", { "for": id }, [gjort + " av " + tot + " steg gjort"]));
    var pr = el("progress", { id: id, max: "100", value: String(pst) }, [pst + " %"]);
    wrap.appendChild(pr);
    return wrap;
  }

  function visData(d, opts){
    body.textContent = "";
    var idea = d.idea, steps = d.steps || [];
    if(idea){
      body.appendChild(el("p", { "class": "mb-title" }, [idea.title || "Idé uten navn"]));
      body.appendChild(el("p", { "class": "muted" }, ["Fase: ", el("b", null, [FASER[idea.phase] || FASER.brainstorm])]));
    }
    if(!steps.length){
      body.appendChild(el("p", null, ["Du har ingen plan med steg ennå. Når du lager en plan i MinBiz, ser du dagens steg her."]));
    } else {
      body.appendChild(fremdrift(steps));
      var valg = velgSteg(steps), boks = el("div", { "class": "mb-step" });
      if(valg){
        boks.appendChild(el("p", { "class": "muted" }, [valg.idag ? "Dagens steg" : "Neste steg" + (valg.steg.due_date ? ", " + dato(valg.steg.due_date) : "")]));
        boks.appendChild(el("p", null, [el("b", null, [valg.steg.title])]));
        if(valg.idag && opts.kanMerke){
          var knapp = el("button", { type: "button", "class": "primary" }, ["Merk som gjort"]);
          knapp.addEventListener("click", function(){ merkGjort(valg.steg, knapp, d); });
          boks.appendChild(el("div", { "class": "row" }, [knapp]));
        }
      } else {
        boks.appendChild(el("p", null, [el("b", null, ["Alle stegene i planen er gjort."])]));
      }
      body.appendChild(boks);
    }
    if(d.last){ body.appendChild(el("p", { "class": "muted" }, ["Siste merke: ", el("b", null, [d.last.title])])); }
    var st = el("p", { "class": "muted", id: "mybiz-status", role: "status" }, [opts.melding || ""]);
    body.appendChild(st);
    body.appendChild(el("div", { "class": "row" }, [lenke(opts.lenke || APP, opts.lenkeTekst || "Åpne MinBiz", false)]));
    body.appendChild(el("p", { "class": "muted" }, [opts.note]));
  }

  function visEksempel(){
    settTag("Eksempel", "hyp");
    visData(EKSEMPEL, {
      kanMerke: false, lenke: APP + "?demo=1", lenkeTekst: "Prøv MinBiz-demoen",
      note: "Eksempeldata, ikke din egen plan. Logg inn i Medlemsportalen med samme e-post som i MinBiz for å se dine egne steg her."
    });
  }
  function visTom(){
    settTag("Bare for deg", "fact");
    body.textContent = "";
    body.appendChild(el("p", null, ["MinBiz hjelper deg fra idé til plan: brainstorming, skrivebordsanalyse, verktøy og en plan med ett steg om gangen."]));
    body.appendChild(el("div", { "class": "row" }, [lenke(APP, "Start din første plan", false)]));
    body.appendChild(el("p", { "class": "muted" }, ["Når du har en plan, ser du fremdriften og dagens steg her. Bare du ser det."]));
  }
  function visFeil(){
    settTag("Bare for deg", "fact");
    body.textContent = "";
    body.appendChild(el("p", null, ["MinBiz kunne ikke hentes akkurat nå. Prøv igjen senere, eller åpne MinBiz direkte."]));
    body.appendChild(el("div", { "class": "row" }, [lenke(APP, "Åpne MinBiz", false)]));
  }
  var NOTE_EGEN = "Hentet fra MinBiz-kontoen din. Bare du ser dette, og det kobles aldri til stemmene dine.";

  function merkGjort(steg, knapp, d){
    var sb = window.MegKonto && window.MegKonto.sb;
    if(!sb){ return; }
    knapp.disabled = true;
    var naa = new Date().toISOString();
    sb.from("minbiz_steps").update({ status: "gjort", done_at: naa }).eq("id", steg.id).select("id").then(function(r){
      if(r.error || !r.data || !r.data.length){
        knapp.disabled = false;
        var st = document.getElementById("mybiz-status");
        if(st){ st.textContent = "Steget kunne ikke lagres. Prøv igjen, eller merk det i MinBiz."; }
        return;
      }
      steg.status = "gjort"; steg.done_at = naa;
      visData(d, { kanMerke: true, note: NOTE_EGEN, melding: "«" + steg.title + "» er merket som gjort." });
      var ny = document.getElementById("mybiz-status");
      if(ny){ ny.setAttribute("tabindex", "-1"); ny.focus(); }
    });
  }

  function hent(){
    var MK = window.MegKonto || {}, sb = MK.sb, bruker = MK.bruker;
    if(!sb || !bruker){ visEksempel(); return; }
    var uid = bruker.id;
    Promise.all([
      sb.from("minbiz_ideas").select("id,title,phase,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(1),
      sb.from("minbiz_plans").select("id,idea_id,plan_type,start_date,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(1),
      sb.from("minbiz_achievements").select("title,earned_at").eq("user_id", uid).order("earned_at", { ascending: false }).limit(1)
    ]).then(function(r){
      if(r[0].error || r[1].error || r[2].error){ visFeil(); return; }
      var idea = (r[0].data || [])[0] || null, plan = (r[1].data || [])[0] || null, last = (r[2].data || [])[0] || null;
      if(!idea && !plan){ visTom(); return; }
      var vis = function(steps){
        settTag("Bare for deg", "fact");
        visData({ idea: idea, steps: steps, last: last }, { kanMerke: true, note: NOTE_EGEN });
      };
      if(!plan){ vis([]); return; }
      sb.from("minbiz_steps").select("id,plan_id,sort,title,due_date,status").eq("plan_id", plan.id).order("sort", { ascending: true }).then(function(q){
        if(q.error){ visFeil(); return; }
        vis(q.data || []);
      });
    }).catch(visFeil);
  }

  /* Er det en lagret innlogging på enheten, vises «Henter» i stedet for eksempelet, så det ikke blinker. */
  var harInnlogging = false;
  try{ for(var i = 0; i < localStorage.length; i++){ if(/^sb-.*-auth-token$/.test(localStorage.key(i))){ harInnlogging = true; break; } } }catch(e){}
  if(window.MegKonto && window.MegKonto.klar){ hent(); }
  else {
    if(!harInnlogging){ visEksempel(); }
    document.addEventListener("megkonto-klar", hent, { once: true });
  }
})();
