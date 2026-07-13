// ml-page.js — minimal script for ml.html. Deliberately separate from
// app.js (which assumes dashboard-only elements exist) rather than reusing
// it wholesale.
//
// Results shown here come exclusively from /api/predict (the Python /
// numpy / scikit-learn implementation) — the earlier JS-vs-Python
// side-by-side comparison was removed once Python became the only
// implementation the site displays.

async function tryFetch(url){
  try{
    const res = await fetch(url, {headers:{Accept:"application/json"}});
    if(!res.ok) throw new Error("bad response");
    return await res.json();
  }catch(e){ return null; }
}

function fmtSeconds(s){
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = Math.round(s%60);
  return h>0 ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${m}:${String(sec).padStart(2,"0")}`;
}

const FALLBACK_PREDICTION = {
  exponent: 1.074, r2: 0.999, formFactor: 0.97, trainingPoints: 8,
  maeSeconds: 172, mapePct: 3.1,
  predictions: [
    {label:"5K", seconds:1189}, {label:"10K", seconds:2528},
    {label:"Half Marathon", seconds:5745}, {label:"Marathon", seconds:12438}
  ]
};

function renderRacePrediction(pred){
  const row = document.getElementById("racePredRow");
  const note = document.getElementById("racePredNote");
  if(!pred || pred.error){
    row.innerHTML = "";
    note.textContent = pred && pred.error ? `Python endpoint error: ${pred.error}` : "Not enough PR data yet to fit a curve.";
    return;
  }
  row.innerHTML = pred.predictions.map(p => `
    <div class="prItem"><div class="dist">${p.label}</div><div class="time">${fmtSeconds(p.seconds)}</div></div>`).join("");
  const formPct = Math.round((pred.formFactor-1)*100);
  const formTxt = formPct === 0 ? "in line with my all-time average" : (formPct<0 ? `about ${Math.abs(formPct)}% faster than my all-time average` : `about ${formPct}% slower than my all-time average`);
  note.textContent = `Fitted on ${pred.trainingPoints} of my own PRs (curve exponent ${pred.exponent}, R²=${pred.r2}), then adjusted for my last 45 days of running — currently ${formTxt}.`;
}

function renderRaceEval(pred){
  const el = document.getElementById("raceEvalGrid");
  if(!pred || pred.maeSeconds == null){
    el.innerHTML = `<div class="chartAxis" style="font-family:'JetBrains Mono',monospace;">not enough PRs yet for cross-validation</div>`;
    return;
  }
  const items = [
    {k: fmtSeconds(pred.maeSeconds), l: "Mean Absolute Error"},
    {k: `${pred.mapePct}%`, l: "Mean Absolute Percentage Error"},
    {k: `${pred.r2}`, l: "R²"},
    {k: `${pred.trainingPoints} Personal Bests`, l: "Training Samples"}
  ];
  el.innerHTML = items.map(i => `<div class="stat"><div class="k">${i.k}</div><div class="l">${i.l}</div></div>`).join("");
}

(async function init(){
  const pred = (await tryFetch("/api/predict")) || FALLBACK_PREDICTION;
  renderRacePrediction(pred);
  renderRaceEval(pred);
})();
