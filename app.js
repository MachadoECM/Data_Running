// theme toggle logic now lives in theme.js (shared with ml.html)

// --- Fallback snapshot (used only if the backend/API isn't reachable, e.g. local preview) ---
const FALLBACK = {
  racePrediction: {
    exponent: 1.076, r2: 0.999, formFactor: 0.97, trainingPoints: 7,
    predictions: [
      {label:"5K", seconds:1192},
      {label:"10K", seconds:2537},
      {label:"Half Marathon", seconds:5774},
      {label:"Marathon", seconds:12518}
    ]
  },
  stats: {
    lifetimeKm: 1240, lifetimeCount: 210, lifetimeHours: 105, ytdKm: 610
  },
  weeks: [
    {label:"May 18-24", km:30.0}, {label:"May 25-31", km:45.0}, {label:"Jun 1-7", km:45.9},
    {label:"Jun 8-14", km:53.7}, {label:"Jun 15-21", km:42.0}, {label:"Jun 22-28", km:42.2},
    {label:"Jun 29 - Jul 5", km:27.0}, {label:"Jul 6-12", km:23.6, current:true}
  ],
  activities: [
    {date:"02/07", name:"3km WU + 16x300m + 3km CD", type:"Corrida", km:"11.57 km", time:"1:11:45", pace:"6:12/km"},
    {date:"30/06", name:"Morning Run", type:"Corrida", km:"12.03 km", time:"57:37", pace:"4:47/km"},
    {date:"29/06", name:"Morning Weight Training", type:"Strength Training", km:"—", time:"1:04:02", pace:"—"},
    {date:"28/06", name:"Morning Run", type:"Corrida", km:"15.01 km", time:"1:13:49", pace:"4:55/km"},
    {date:"23/06", name:"Morning Run", type:"Corrida", km:"12.01 km", time:"1:00:45", pace:"5:03/km"},
    {date:"21/06", name:"16km Fartlek (5:15 & 4:00)", type:"Corrida", km:"16.01 km", time:"1:13:39", pace:"4:36/km"}
  ],
  prs: [
    {dist:"5 km", time:"19:43", stats:{eventName:"Teste 5km", date:"2026-05-28", locationName:"São Paulo", distanceKm:5.01, movingTime:"19:45", avgPace:"3:57/km", elevationM:12, calories:303, avgHr:180}},
    {dist:"10 km", time:"41:41", stats:{eventName:"Meia de Sampa", date:"2025-11-16", locationName:"São Paulo", distanceKm:21.15, movingTime:"1:28:21", avgPace:"4:11/km", elevationM:26, calories:1292, avgHr:178}},
    {dist:"15 km", time:"1:02:37", stats:{eventName:"Meia de Sampa", date:"2025-11-16", locationName:"São Paulo", distanceKm:21.15, movingTime:"1:28:21", avgPace:"4:11/km", elevationM:26, calories:1292, avgHr:178}},
    {dist:"10 milhas", time:"1:07:13", stats:{eventName:"Meia de Sampa", date:"2025-11-16", locationName:"São Paulo", distanceKm:21.15, movingTime:"1:28:21", avgPace:"4:11/km", elevationM:26, calories:1292, avgHr:178}},
    {dist:"Meia maratona", time:"1:28:05", stats:{eventName:"Meia de Sampa", date:"2025-11-16", locationName:"São Paulo", distanceKm:21.15, movingTime:"1:28:21", avgPace:"4:11/km", elevationM:26, calories:1292, avgHr:178}},
    {dist:"30 km", time:"2:18:16", stats:{eventName:"MDR - 2025 (Maratona do Rio)", date:"2025-06-22", locationName:"Rio de Janeiro", distanceKm:42.68, movingTime:"3:18:18", avgPace:"4:39/km", elevationM:87, calories:2693, avgHr:174}},
    {dist:"Maratona", time:"3:15:29", stats:{eventName:"MDR - 2025 (Maratona do Rio)", date:"2025-06-22", locationName:"Rio de Janeiro", distanceKm:42.68, movingTime:"3:18:18", avgPace:"4:39/km", elevationM:87, calories:2693, avgHr:174}}
  ],
  shoes: [
    {name:"Adizero Adios Pro 3", km:731, retired:false},
    {name:"Boston 12 Preto", km:446, retired:false},
    {name:"Neo Zen", km:438, retired:false},
    {name:"Evo SL Jamaica", km:239, retired:false},
    {name:"Adizero Pro 4", km:136, retired:false},
    {name:"Evo SL Branco", km:78, retired:false},
    {name:"Pegasus 39 (aposentado)", km:812, retired:true},
    {name:"Vaporfly 2 (aposentado)", km:520, retired:true}
  ],
  topCities: [
    {city:"São Paulo", country:"Brasil", countryCode:"br", km:5800, count:680, lat:-23.5615, lng:-46.6558},
    {city:"Passos", country:"Brasil", countryCode:"br", km:474, count:14, lat:-20.7183, lng:-46.6094},
    {city:"Toronto", country:"Canada", countryCode:"ca", km:308, count:9, lat:43.6532, lng:-79.3832},
    {city:"Rio de Janeiro", country:"Brasil", countryCode:"br", km:180, count:12, lat:-22.9068, lng:-43.1729},
    {city:"Willemstad", country:"Curaçao", countryCode:"cw", km:41, count:2, lat:12.1091, lng:-68.9316}
  ],
  progression: (function(){
    function genYear(year, pctTarget){
      const isLeap = (year%4===0 && year%100!==0)||year%400===0;
      const totalDays = isLeap?366:365;
      const cells = [];
      let activeDays = 0;
      for(let i=0;i<totalDays;i++){
        const active = Math.random() < pctTarget;
        const level = active ? (1+Math.floor(Math.random()*4)) : 0;
        if(level>0) activeDays++;
        cells.push({date:`${year}`, level});
      }
      return {year, cells, activeDays, totalDays, pct:Math.round((activeDays/totalDays)*100), restDays:totalDays-activeDays};
    }
    return [genYear(2026,0.95), genYear(2025,0.9), genYear(2024,0.85)];
  })(),
  insights: {
    totalRunsScanned: 723,
    busiestWeekday: "Saturday",
    avgPace: "5:12/km",
    avgDistanceKm: 12.4,
    totalElevationM: 26343,
    longestRun: {km: 21.1},
    weekday: [
      {label:"Sunday", count:60, avgKm:11.2}, {label:"Monday", count:45, avgKm:10.1}, {label:"Tuesday", count:70, avgKm:12.0},
      {label:"Wednesday", count:110, avgKm:13.5}, {label:"Thursday", count:80, avgKm:12.8}, {label:"Friday", count:55, avgKm:11.0},
      {label:"Saturday", count:140, avgKm:16.4}
    ],
    bySport: [
      {type:"Running", count:723, km:6731.7, hours:590.6},
      {type:"Strength Training", count:410, km:0, hours:410.2},
      {type:"Cycling", count:159, km:1425.7, hours:96.0}
    ],
    byHour: [0,0,0,0,0,2,18,45,60,30,10,5,8,12,10,6,15,40,55,30,10,4,2,1],
    annualDistance: [{year:"2021",km:1200},{year:"2022",km:1800},{year:"2023",km:2100},{year:"2024",km:1600},{year:"2025",km:1500},{year:"2026",km:1011}],
    distanceDistribution: [{label:"0-2km",count:20},{label:"2-5km",count:60},{label:"5-10km",count:180},{label:"10-15km",count:250},{label:"15-21km",count:150},{label:"21-30km",count:50},{label:"30-42km",count:10},{label:"42km+",count:3}],
    paceZoneTimePct: [
      {zone:"Z1", label:"Recovery", pct:2, range:"slower than 5:15/km"},
      {zone:"Z2", label:"Easy", pct:18, range:"4:31-5:15/km"},
      {zone:"Z3", label:"Moderate", pct:34, range:"4:04-4:31/km"},
      {zone:"Z4", label:"Tempo", pct:28, range:"3:48-4:04/km"},
      {zone:"Z5", label:"Threshold", pct:14, range:"3:34-3:48/km"},
      {zone:"Z6", label:"Max", pct:4, range:"faster than 3:34/km"}
    ],
    paceDistribution: {meanPace:"4:46/km", bins:Array.from({length:18},(_,i)=>({from:150+i*15, count:Math.round(60*Math.exp(-Math.pow(i-9,2)/18))}))},
    hrZones: [
      {from:0, to:124, count:18, zoneIndex:0},
      {from:125, to:155, count:210, zoneIndex:1},
      {from:156, to:170, count:340, zoneIndex:2},
      {from:171, to:185, count:140, zoneIndex:3},
      {from:186, to:null, count:15, zoneIndex:4}
    ],
    hrObservedMax: 196,
    hrZoneDefs: [{min:0,max:124},{min:125,max:155},{min:156,max:170},{min:171,max:185},{min:186,max:null}],
    zoneTimePct: [
      {zone:"Z1", label:"Recovery", color:"#F7CFC9", pct:3, range:"0-124 bpm"},
      {zone:"Z2", label:"Easy", color:"#EDA79B", pct:27, range:"125-155 bpm"},
      {zone:"Z3", label:"Steady", color:"#DE7A67", pct:50, range:"156-170 bpm"},
      {zone:"Z4", label:"Threshold", color:"#C94531", pct:20, range:"171-185 bpm"},
      {zone:"Z5", label:"Max", color:"#7A1610", pct:0, range:"186+ bpm"}
    ],
    annualRunVsStrength: [
      {year:"2021", runHours:170, strengthHours:55, workoutHours:15, runPct:71, strengthPct:23, workoutPct:6},
      {year:"2022", runHours:205, strengthHours:82, workoutHours:23, runPct:66, strengthPct:26, workoutPct:8},
      {year:"2023", runHours:240, strengthHours:110, workoutHours:30, runPct:63, strengthPct:29, workoutPct:8},
      {year:"2024", runHours:185, strengthHours:128, workoutHours:27, runPct:54, strengthPct:38, workoutPct:8},
      {year:"2025", runHours:175, strengthHours:138, workoutHours:27, runPct:51, strengthPct:40, workoutPct:9},
      {year:"2026", runHours:92, strengthHours:55, workoutHours:13, runPct:57, strengthPct:34, workoutPct:9}
    ]
  }
};

async function tryFetch(url){
  try{
    const res = await fetch(url, {headers:{Accept:"application/json"}});
    if(!res.ok) throw new Error("bad response");
    return await res.json();
  }catch(e){
    return null;
  }
}

function fmtKm(m){ return (m/1000).toFixed(1); }
function fmtPace(distM, movingS){
  if(!distM) return "—";
  const s = movingS / (distM/1000);
  const mm = Math.floor(s/60), ss = Math.round(s%60);
  return `${mm}:${String(ss).padStart(2,"0")}/km`;
}
function fmtTime(s){
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = Math.round(s%60);
  return h>0 ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${m}:${String(sec).padStart(2,"0")}`;
}

// ---------- chart helpers (pure SVG, no libraries) ----------
const ACCENT = "var(--accent)", LINE = "var(--line)", INK_SOFT = "var(--ink-soft)";
const fmtPaceLabel = s => `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,"0")}`;

function svgWrap(w,h,inner){ return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">${inner}</svg>`; }

function ensureTooltip(){
  let t = document.getElementById("chartTooltip");
  if(!t){ t = document.createElement("div"); t.id="chartTooltip"; t.className="chartTooltip"; document.body.appendChild(t); }
  return t;
}
function positionTooltip(tip, clientX, clientY){
  const pad = 8;
  let left = clientX + 14;
  let top = clientY - 8;
  const w = tip.offsetWidth, h = tip.offsetHeight;
  if(left + w + pad > window.innerWidth) left = clientX - w - 14;
  if(left < pad) left = pad;
  if(top + h + pad > window.innerHeight) top = window.innerHeight - h - pad;
  if(top < pad) top = pad;
  tip.style.left = left+"px";
  tip.style.top = top+"px";
}
function renderChart(id, svgHtml){
  const el = document.getElementById(id);
  el.innerHTML = svgHtml;
  const tip = ensureTooltip();
  el.querySelectorAll("[data-tip]").forEach(node=>{
    node.addEventListener("mouseenter", ()=>{ tip.textContent = node.getAttribute("data-tip"); tip.style.opacity = 1; node.style.opacity = "0.65"; });
    node.addEventListener("mousemove", e=>{ positionTooltip(tip, e.clientX, e.clientY); });
    node.addEventListener("mouseleave", ()=>{ tip.style.opacity = 0; node.style.opacity = ""; });
    node.addEventListener("touchstart", e=>{
      e.stopPropagation();
      const touch = e.touches[0];
      tip.textContent = node.getAttribute("data-tip");
      tip.style.opacity = 1;
      positionTooltip(tip, touch.clientX, touch.clientY);
    }, {passive:true});
  });
}
document.addEventListener("touchstart", ()=>{ const t=document.getElementById("chartTooltip"); if(t) t.style.opacity = 0; });


function barChartV(data, {w=280,h=160,key="km",labelKey="label"}={}){
  const max = Math.max(...data.map(d=>d[key]), 1);
  const padB=20, padT=6;
  const bw = (w-16)/data.length;
  let bars="";
  data.forEach((d,i)=>{
    const bh = (d[key]/max)*(h-padB-padT);
    const x = 8 + i*bw;
    bars += `<rect data-tip="${d[labelKey]}: ${d[key].toLocaleString("en-US")} km" x="${x+bw*0.22}" y="${h-padB-bh}" width="${bw*0.56}" height="${Math.max(bh,1)}" fill="${ACCENT}" opacity="0.8" rx="1"/>`;
    bars += `<text class="chartAxis" x="${x+bw/2}" y="${h-6}" text-anchor="middle">${String(d[labelKey]).slice(-2)}</text>`;
  });
  return svgWrap(w,h,`<line x1="8" y1="${h-padB}" x2="${w-8}" y2="${h-padB}" stroke="${LINE}"/>${bars}`);
}

function histogramH(data,{w=280,h=190}={}){
  const max = Math.max(...data.map(d=>d.count),1);
  const rh = (h-6)/data.length;
  const leftPad = 54;
  let rows="";
  data.forEach((d,i)=>{
    const y = 3 + i*rh;
    const bw = (d.count/max)*(w-leftPad-14);
    rows += `<text class="chartAxis" x="0" y="${y+rh*0.62}" text-anchor="start">${d.label}</text>`;
    const tip = d.pct!=null ? `${d.label}: ${d.count} (${d.pct}%)` : `${d.label}: ${d.count} runs`;
    rows += `<rect data-tip="${tip}" x="${leftPad}" y="${y+rh*0.2}" width="${Math.max(2,bw)}" height="${rh*0.55}" fill="${ACCENT}" opacity="0.8" rx="1"/>`;
  });
  return svgWrap(w,h,rows);
}

function radarChart(labels, values, tipFmt, {w=260,h=230}={}){
  const cx=w/2, cy=h/2-4, r=Math.min(w,h)/2-46;
  const max = Math.max(...values,1);
  const n = labels.length;
  const pt = (i,val)=>{ const ang=-Math.PI/2+i*(2*Math.PI/n); const rad=(val/max)*r; return [cx+rad*Math.cos(ang), cy+rad*Math.sin(ang)]; };
  let rings="";
  [0.5,1].forEach(f=>{ rings += `<polygon points="${labels.map((_,i)=>pt(i,max*f).join(",")).join(" ")}" fill="none" stroke="${LINE}" stroke-width="1"/>`; });
  const dataPts = labels.map((_,i)=>pt(i,values[i]).join(",")).join(" ");
  let dots="", tickLabels="";
  labels.forEach((l,i)=>{
    const [x,y] = pt(i,values[i]);
    dots += `<circle data-tip="${tipFmt(l,values[i])}" cx="${x}" cy="${y}" r="9" fill="transparent"/><circle cx="${x}" cy="${y}" r="2.5" fill="${ACCENT}"/>`;
    const [lx,ly] = pt(i,max*1.28);
    tickLabels += `<text class="chartLabel" x="${lx}" y="${ly}" text-anchor="middle">${l.slice(0,3)}</text>`;
  });
  return svgWrap(w,h,`${rings}<polygon points="${dataPts}" fill="${ACCENT}" fill-opacity="0.18" stroke="${ACCENT}" stroke-width="1.4"/>${tickLabels}${dots}`);
}

function polarHour(byHour,{w=260,h=230}={}){
  const cx=w/2, cy=h/2-4, r=Math.min(w,h)/2-40;
  const max = Math.max(...byHour,1);
  const n=24;
  const pt=(i,val)=>{ const ang=-Math.PI/2+i*(2*Math.PI/n); const rad=(val/max)*r; return [cx+rad*Math.cos(ang), cy+rad*Math.sin(ang)]; };
  let rings=""; [0.5,1].forEach(f=>{ rings+=`<circle cx="${cx}" cy="${cy}" r="${r*f}" fill="none" stroke="${LINE}"/>`; });
  const pts = byHour.map((v,i)=>pt(i,v).join(",")).join(" ");
  let dots="", labels="";
  byHour.forEach((v,i)=>{ const [x,y]=pt(i,v); dots += `<circle data-tip="${i}h: ${v} runs" cx="${x}" cy="${y}" r="7" fill="transparent"/>`; });
  [0,6,12,18].forEach(hr=>{ const [lx,ly]=pt(hr,max*1.3); labels+=`<text class="chartLabel" x="${lx}" y="${ly}" text-anchor="middle">${hr}h</text>`; });
  return svgWrap(w,h,`${rings}<polygon points="${pts}" fill="${ACCENT}" fill-opacity="0.22" stroke="${ACCENT}" stroke-width="1.4"/>${labels}${dots}`);
}

const PACE_ZONE_COLORS = ["#F9D6D0","#F0B0A2","#E68878","#DC5F4C","#C43127","#7A1610"];

function paceZoneBars(zones,{w=260,h=190}={}){
  const max = Math.max(...zones.map(z=>z.pct),1);
  const padB=30;
  const bw = (w-16)/zones.length;
  let bars="";
  zones.forEach((z,i)=>{
    const bh = (z.pct/max)*(h-padB-10);
    const x = 8+i*bw;
    bars += `<rect data-tip="${z.zone} · ${z.label}: ${z.pct}% (${z.range})" x="${x+bw*0.14}" y="${h-padB-bh}" width="${bw*0.72}" height="${Math.max(bh,1)}" fill="${PACE_ZONE_COLORS[i]}" rx="1"/>`;
    bars += `<text class="chartAxis" x="${x+bw/2}" y="${h-padB+13}" text-anchor="middle">${z.zone}</text>`;
  });
  return svgWrap(w,h,`<line x1="8" y1="${h-padB}" x2="${w-8}" y2="${h-padB}" stroke="${LINE}"/>${bars}`);
}

const PALETTE_STRENGTH = "var(--navy)";
const PALETTE_WORKOUT = "#C97C3D";

function runVsStrengthBars(data, {w=280,h=170}={}){
  if(!data.length) return `<div class="chartAxis" style="font-family:'JetBrains Mono',monospace;">not enough data yet</div>`;
  const padB=20;
  const bw = (w-16)/data.length;
  let bars="";
  data.forEach((d,i)=>{
    const x=8+i*bw;
    const totalH = h-padB-6;
    const runH = (d.runPct/100)*totalH;
    const strH = (d.strengthPct/100)*totalH;
    const workH = ((d.workoutPct||0)/100)*totalH;
    bars += `<rect data-tip="Running ${d.year}: ${d.runPct}% · ${d.runHours}h accumulated" x="${x+bw*0.22}" y="${h-padB-runH}" width="${bw*0.56}" height="${Math.max(runH,1)}" fill="${ACCENT}" rx="1"/>`;
    bars += `<rect data-tip="Strength ${d.year}: ${d.strengthPct}% · ${d.strengthHours}h accumulated" x="${x+bw*0.22}" y="${h-padB-runH-strH}" width="${bw*0.56}" height="${Math.max(strH,1)}" fill="${PALETTE_STRENGTH}" rx="1"/>`;
    if(d.workoutHours != null) bars += `<rect data-tip="Workout ${d.year}: ${d.workoutPct}% · ${d.workoutHours}h accumulated" x="${x+bw*0.22}" y="${h-padB-runH-strH-workH}" width="${bw*0.56}" height="${Math.max(workH,1)}" fill="${PALETTE_WORKOUT}" rx="1"/>`;
    bars += `<text class="chartAxis" x="${x+bw/2}" y="${h-6}" text-anchor="middle">${String(d.year).slice(-2)}</text>`;
  });
  return svgWrap(w,h,`<line x1="8" y1="${h-padB}" x2="${w-8}" y2="${h-padB}" stroke="${LINE}"/>${bars}`);
}

function smoothPath(points){
  if(points.length<3) return `M ${points.map(p=>p.join(",")).join(" L ")}`;
  let d = `M ${points[0][0]},${points[0][1]}`;
  for(let i=0;i<points.length-1;i++){
    const p0 = points[i-1] || points[i];
    const p1 = points[i];
    const p2 = points[i+1];
    const p3 = points[i+2] || p2;
    const cp1x = p1[0] + (p2[0]-p0[0])/6, cp1y = p1[1] + (p2[1]-p0[1])/6;
    const cp2x = p2[0] - (p3[0]-p1[0])/6, cp2y = p2[1] - (p3[1]-p1[1])/6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function bellCurve(bins, meanLabel, {w=280,h=160}={}){
  if(!bins.length) return svgWrap(w,h,"");
  const max = Math.max(...bins.map(b=>b.count),1);
  const padB=8;
  const stepX = (w-16)/bins.length;
  const pts = bins.map((b,i)=>[8+i*stepX+stepX/2, h-padB-(b.count/max)*(h-40)]);
  const topPath = smoothPath(pts);
  const areaPath = `${topPath} L ${pts[pts.length-1][0]},${h-padB} L ${pts[0][0]},${h-padB} Z`;
  const dots = pts.map((p,i)=>`<circle data-tip="${fmtPaceLabel(bins[i].from)}-${fmtPaceLabel(bins[i].from+10)}/km: ${bins[i].count}" cx="${p[0]}" cy="${p[1]}" r="9" fill="transparent"/>`).join("");
  return svgWrap(w,h,`
    <text class="chartAxis" x="${w/2}" y="14" text-anchor="middle">mean: ${meanLabel}</text>
    <path d="${areaPath}" fill="${ACCENT}" fill-opacity="0.18" stroke="none"/>
    <path d="${topPath}" fill="none" stroke="${ACCENT}" stroke-width="1.6"/>
    ${dots}
  `);
}

const ZONE_COLORS = ["#F7CFC9","#EDA79B","#DE7A67","#C94531","#7A1610"];

function hrZoneBars(bins, observedMax, {w=280,h=160}={}){
  const max = Math.max(...bins.map(b=>b.count),1);
  const padB=18;
  const bw = (w-16)/bins.length;
  let bars="";
  bins.forEach((b,i)=>{
    const bh=(b.count/max)*(h-padB-8);
    const x=8+i*bw;
    const color = ZONE_COLORS[b.zoneIndex] || ACCENT;
    const isLast = i === bins.length-1;
    const upper = (b.to != null && b.to >= 0) ? b.to : (observedMax != null ? Math.round(observedMax) : null);
    const rangeLabel = upper != null ? `${b.from}-${upper} bpm` : `${b.from}+ bpm`;
    bars += `<rect data-tip="${rangeLabel}: ${b.count} runs" x="${x+bw*0.12}" y="${h-padB-bh}" width="${bw*0.76}" height="${Math.max(bh,1)}" fill="${color}" opacity="0.9" rx="1"/>`;
    const tickLabel = isLast ? (upper!=null ? `${b.from}-${upper}` : `${b.from}+`) : `${b.from}`;
    bars += `<text class="chartAxis" x="${x+bw/2}" y="${h-4}" text-anchor="middle">${tickLabel}</text>`;
  });
  return svgWrap(w,h,`<line x1="8" y1="${h-padB}" x2="${w-8}" y2="${h-padB}" stroke="${LINE}"/>${bars}`);
}

function zoneLegendHtml(zoneDefs){
  const labels = ["Recovery","Easy","Steady","Threshold","Max"];
  const isOpenEnded = m => m == null || m < 0; // Strava sometimes uses -1 (not null) to mean "no upper limit"
  return zoneDefs.map((z,i)=>`<span><i style="background:${ZONE_COLORS[i]}"></i>${labels[i]} ${isOpenEnded(z.max)?`${z.min}+`:`${z.min}-${z.max}`}</span>`).join("");
}

function zoneTimeBars(zones){
  const ordered = [...zones].reverse(); // Z5 on top, like the reference
  const max = Math.max(...ordered.map(z=>z.pct),1);
  return ordered.map(z=>`
    <div class="zoneTimeRow" data-tip="${z.label}: ${z.pct}% of total training time · ${z.range}">
      <div class="zoneTimeName">${z.zone}</div>
      <div class="zoneTimeTrack"><div class="zoneTimeFill" style="width:${Math.max(3,(z.pct/max)*100)}%; background:${z.color}"></div></div>
      <div class="zoneTimePct">${z.pct}%</div>
    </div>`).join("");
}



let ALL_SHOES = [];
let PERIOD_ACTIVITIES = [];

function mondayOfLocal(d){
  const dt = new Date(d);
  const day = dt.getDay() || 7;
  dt.setDate(dt.getDate() - (day - 1));
  dt.setHours(0,0,0,0);
  return dt;
}

function filterByPeriod(period){
  const now = new Date();
  if(period === "7d"){
    const cutoff = new Date(now.getTime() - 7*86400000);
    return PERIOD_ACTIVITIES.filter(a => new Date(a.start_date_local) >= cutoff);
  }
  if(period === "lastWeek"){
    const thisMonday = mondayOfLocal(now);
    const lastMonday = new Date(thisMonday); lastMonday.setDate(lastMonday.getDate()-7);
    const lastSunday = new Date(thisMonday); lastSunday.setDate(lastSunday.getDate()-1); lastSunday.setHours(23,59,59,999);
    return PERIOD_ACTIVITIES.filter(a => { const d=new Date(a.start_date_local); return d>=lastMonday && d<=lastSunday; });
  }
  if(period === "month"){
    return PERIOD_ACTIVITIES.filter(a => { const d=new Date(a.start_date_local); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear(); });
  }
  if(period === "year"){
    return PERIOD_ACTIVITIES.filter(a => new Date(a.start_date_local).getFullYear() === now.getFullYear());
  }
  return PERIOD_ACTIVITIES;
}

function genericPieChart(slices){
  const total = slices.reduce((a,s)=>a+s.seconds,0);
  if(!total) return `<div class="chartAxis" style="font-family:'JetBrains Mono',monospace;">no activities this period</div>`;
  const cx=76, cy=76, r=58, stroke=26, circ=2*Math.PI*r;
  const palette = ["var(--accent)","var(--navy)","#8C7A4B","#3A72B8","#28684F","#AEC9EA"];
  let offset=0, arcs="";
  slices.forEach((s,i)=>{
    const len=(s.seconds/total)*circ;
    const pct = Math.round((s.seconds/total)*100);
    arcs += `<circle data-tip="${s.label}: ${pct}% (${(s.seconds/3600).toFixed(1)}h)" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${palette[i%palette.length]}" stroke-width="${stroke}" stroke-dasharray="${len} ${circ}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += len;
  });
  const legend = slices.map((s,i)=>{
    const pct = Math.round((s.seconds/total)*100);
    return `<div style="display:flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink-soft);margin-bottom:5px;"><span style="width:8px;height:8px;background:${palette[i%palette.length]};border-radius:2px;display:inline-block;flex-shrink:0;"></span>${s.label} · ${pct}%</div>`;
  }).join("");
  return `${svgWrap(152,152,arcs)}<div style="margin-top:10px;">${legend}</div>`;
}

function renderPeriod(period){
  const filtered = filterByPeriod(period).slice().sort((a,b)=> new Date(b.start_date_local)-new Date(a.start_date_local));
  const TYPE_LABELS = window.__TYPE_LABELS || {};

  const rows = document.getElementById("activityRows");
  if(!filtered.length){
    rows.innerHTML = `<tr><td colspan="6" class="loading">no activities this period</td></tr>`;
  } else {
    rows.innerHTML = filtered.map(a => {
      const date = new Date(a.start_date_local).toLocaleDateString("en-US", {day:"2-digit", month:"2-digit"});
      const type = TYPE_LABELS[a.sport_type] || a.sport_type;
      const km = a.distance ? fmtKm(a.distance) + " km" : "—";
      const time = fmtTime(a.moving_time);
      const pace = a.distance ? fmtPace(a.distance, a.moving_time) : "—";
      return `<tr><td class="num">${date}</td><td>${a.name}</td><td class="num">${type}</td><td class="num">${km}</td><td class="num">${time}</td><td class="num">${pace}</td></tr>`;
    }).join("");
  }

  const byType = {};
  for(const a of filtered){
    const key = TYPE_LABELS[a.sport_type] || a.sport_type;
    byType[key] = (byType[key] || 0) + (a.moving_time || 0);
  }
  const slices = Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([label,seconds])=>({label,seconds}));
  renderChart("chartActivityPie", genericPieChart(slices));
}


function fmtSeconds(s){
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = Math.round(s%60);
  return h>0 ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${m}:${String(sec).padStart(2,"0")}`;
}

function renderRacePrediction(pred){
  const row = document.getElementById("racePredRow");
  const note = document.getElementById("racePredNote");
  if(!pred){ row.innerHTML = ""; note.textContent = "Not enough PR data yet to fit a curve."; return; }
  row.innerHTML = pred.predictions.map(p => `
    <div class="prItem"><div class="dist">${p.label}</div><div class="time">${fmtSeconds(p.seconds)}</div></div>`).join("");
  const formPct = Math.round((pred.formFactor-1)*100);
  const formTxt = formPct === 0 ? "in line with my all-time average" : (formPct<0 ? `about ${Math.abs(formPct)}% faster than my all-time average` : `about ${formPct}% slower than my all-time average`);
  note.textContent = `Fitted on ${pred.trainingPoints} of my own PRs (curve exponent ${pred.exponent}, R²=${pred.r2}), then adjusted for my last 45 days of running — currently ${formTxt}.`;
}

function renderShoes(showInactive){
  const list = showInactive ? ALL_SHOES.filter(s=>s.retired) : ALL_SHOES.filter(s=>!s.retired);
  if(!list.length){ document.getElementById("shoeList").innerHTML = `<div class="chartAxis" style="font-family:'JetBrains Mono',monospace;">no shoes in this category</div>`; return; }
  const maxKm = Math.max(...list.map(s=>s.km),1);
  document.getElementById("shoeList").innerHTML = list.map(s => `
    <div class="shoeRow ${s.retired?'inactive':''}">
      <div class="shoeName">${s.name}${s.retired?' <span class="inactiveTag">retired</span>':''}</div>
      <div class="shoeTrack"><div class="shoeFill" style="width:${Math.max(4,(s.km/maxKm)*100)}%"></div></div>
      <div class="shoeKm">${s.km} km</div>
    </div>`).join("");
}

function setLoadProgress(pct){
  const bar = document.getElementById("pageLoadBar");
  if(bar) bar.style.width = pct + "%";
}
function finishLoadProgress(){
  const bar = document.getElementById("pageLoadBar");
  if(!bar) return;
  bar.style.width = "100%";
  setTimeout(() => bar.classList.add("done"), 250);
}

async function init(){
  setLoadProgress(15);
  const [stats, activities, weeklyResp, prs, shoes, insights] = await Promise.all([
    tryFetch("/api/stats"),
    tryFetch("/api/activities"),
    tryFetch("/api/weekly"),
    tryFetch("/api/prs"),
    tryFetch("/api/gear"),
    tryFetch("/api/insights")
  ]);
  setLoadProgress(75);

  const live = !!(stats && activities);
  document.getElementById("liveDot").style.background = live ? "var(--accent)" : "#C7A24A";
  document.getElementById("liveLabel").textContent = live ? "connected to Strava — live data" : "offline preview — sample data";

  // Hero stats
  const s = stats || FALLBACK.stats;
  const heroData = stats ? {
    lifetimeKm: Math.round(stats.all_run_totals.distance/1000).toLocaleString("en-US"),
    lifetimeCount: stats.all_run_totals.count,
    lifetimeHours: Math.round(stats.all_run_totals.moving_time/3600).toLocaleString("en-US"),
    ytdKm: Math.round(stats.ytd_run_totals.distance/1000).toLocaleString("en-US")
  } : FALLBACK.stats;
  document.querySelector('[data-stat="lifetimeKm"]').textContent = heroData.lifetimeKm;
  document.querySelector('[data-stat="lifetimeCount"]').textContent = heroData.lifetimeCount;
  document.querySelector('[data-stat="lifetimeHours"]').textContent = heroData.lifetimeHours + "h";
  document.querySelector('[data-stat="ytdKm"]').textContent = heroData.ytdKm;

  // Weekly volume
  const weeksData = (weeklyResp && weeklyResp.weeks) || FALLBACK.weeks;
  const max = Math.max(...weeksData.map(w=>w.km));
  const volChart = document.getElementById("volChart");
  const VOL_TRACK_PX = 110;
  volChart.innerHTML = weeksData.map(w => {
    const barPx = Math.max(6,(w.km/max)*VOL_TRACK_PX);
    return `
    <div class="volBarCol">
      <div class="volBarTrack">
        <div class="volVal" style="bottom:${barPx+6}px">${w.km.toFixed(1)}</div>
        <div class="volBar ${w.current ? "current":""}" style="height:${barPx}px"></div>
      </div>
      <div class="volLabel">${w.label}</div>
    </div>`;
  }).join("");

  // Recent activities: period tabs drive both the table and the pie chart
  const TYPE_LABELS = {
    Run:"Run", VirtualRun:"Run", Ride:"Ride", VirtualRide:"Virtual Ride", WeightTraining:"Strength Training",
    Canoeing:"Rowing / Canoeing", Rowing:"Rowing / Canoeing",
    Walk:"Walk", Hike:"Hike", Swim:"Swim", Yoga:"Yoga", Workout:"Workout",
    Elliptical:"Elliptical", StairStepper:"Stair Stepper", Crossfit:"Crossfit"
  };
  PERIOD_ACTIVITIES = (activities && activities.length) ? activities : FALLBACK.activities.map(a=>({
    name:a.name, sport_type:"Run", distance:parseFloat(a.km)*1000, moving_time:0, start_date_local:new Date().toISOString()
  }));
  window.__TYPE_LABELS = TYPE_LABELS;
  renderPeriod("7d");
  document.querySelectorAll("#periodTabs button").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll("#periodTabs button").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      renderPeriod(btn.dataset.period);
    });
  });

  // PRs — click a distance to see the full stats from that PR
  const prList = (prs && prs.length) ? prs : FALLBACK.prs;
  document.getElementById("prRow").innerHTML = prList.map((p,i) => `
    <div class="prItem" data-idx="${i}"><div class="dist">${p.dist}</div><div class="time">${p.time}</div></div>`).join("");
  document.querySelectorAll("#prRow .prItem").forEach(el=>{
    el.addEventListener("click", ()=>{
      document.querySelectorAll("#prRow .prItem").forEach(e=>e.classList.remove("activePr"));
      el.classList.add("activePr");
      showPrStats(prList[Number(el.dataset.idx)]);
    });
  });
  const firstWithStats = prList.find(p=>p.stats) || prList[0];
  if(firstWithStats){
    const idx = prList.indexOf(firstWithStats);
    document.querySelector(`#prRow .prItem[data-idx="${idx}"]`)?.classList.add("activePr");
    showPrStats(firstWithStats);
  }

  // Shoes (active by default, checkbox reveals retired ones too)
  ALL_SHOES = (shoes && shoes.length) ? shoes : FALLBACK.shoes;
  renderShoes(false);
  const shoeToggle = document.getElementById("showInactiveShoes");
  shoeToggle.checked = false;
  shoeToggle.onchange = e => renderShoes(e.target.checked);

  // Weekday chart + other stats
  const wk = insights || FALLBACK.insights;
  const wkData = wk.weekday || FALLBACK.insights.weekday;
  const wkTotal = wkData.reduce((a,d)=>a+d.count,0) || 1;
  const wkMaxPct = Math.max(...wkData.map(d => (d.count/wkTotal)*100));
  renderChart("weekdayChart", wkData.map(d => {
    const pct = (d.count/wkTotal)*100;
    const barPx = Math.max(6,(pct/wkMaxPct)*110);
    return `
    <div class="volBarCol">
      <div class="volBarTrack">
        <div class="volVal" style="bottom:${barPx+6}px">${pct.toFixed(0)}%</div>
        <div class="volBar" data-tip="${d.label}: ${d.count} runs (${pct.toFixed(1)}%)" style="height:${barPx}px"></div>
      </div>
      <div class="volLabel">${d.label.slice(0,3)}</div>
    </div>`;
  }).join(""));

  const statPairs = [
    {dist:"Overall avg pace", time: wk.avgPace},
    {dist:"Most frequent day", time: wk.busiestWeekday},
    {dist:"Avg distance/run", time: `${wk.avgDistanceKm} km`},
    {dist:"Longest run", time: `${wk.longestRun.km} km`},
    {dist:"Runs in history", time: `${wk.totalRunsScanned}`}
  ];
  document.getElementById("statsRow").innerHTML = statPairs.map(p => `
    <div class="prItem"><div class="dist">${p.dist}</div><div class="time">${p.time}</div></div>`).join("");

  const sports = wk.bySport || FALLBACK.insights.bySport;
  const sportMaxH = Math.max(...sports.map(s => s.hours));
  document.getElementById("sportList").innerHTML = sports.map(s => `
    <div class="shoeRow">
      <div class="shoeName">${s.type} · ${s.count}x</div>
      <div class="shoeTrack"><div class="shoeFill" style="width:${Math.max(4,(s.hours/sportMaxH)*100)}%"></div></div>
      <div class="shoeKm">${s.hours}h</div>
    </div>`).join("");

  // Statistics Run charts
  const annual = wk.annualDistance || FALLBACK.insights.annualDistance;
  renderChart("chartAnnual", barChartV(annual, {key:"km", labelKey:"year"}));

  const byHour = wk.byHour || FALLBACK.insights.byHour;
  renderChart("chartHour", polarHour(byHour));

  const weekdayData = wk.weekday || FALLBACK.insights.weekday;
  renderChart("chartWeekdayRadar", radarChart(
    weekdayData.map(d=>d.label), weekdayData.map(d=>d.avgKm),
    (label,val)=>`${label}: ${val} km/run`
  ));

  const distDist = wk.distanceDistribution || FALLBACK.insights.distanceDistribution;
  renderChart("chartDistDist", histogramH(distDist));

  const paceZones = wk.paceZoneTimePct || FALLBACK.insights.paceZoneTimePct;
  renderChart("chartPaceZones", paceZoneBars(paceZones));

  const runVsStrength = wk.annualRunVsStrength || FALLBACK.insights.annualRunVsStrength;
  renderChart("chartRunVsStrength", runVsStrengthBars(runVsStrength));

  const pyPrediction = await tryFetch("/api/predict");
  renderRacePrediction((pyPrediction && !pyPrediction.error) ? pyPrediction : (wk.racePrediction || FALLBACK.racePrediction));

  const pd = wk.paceDistribution || FALLBACK.insights.paceDistribution;
  renderChart("chartPace", bellCurve(pd.bins, pd.meanPace));

  const hrZones = wk.hrZones || FALLBACK.insights.hrZones;
  const hrObservedMax = wk.hrObservedMax != null ? wk.hrObservedMax : FALLBACK.insights.hrObservedMax;
  renderChart("chartHr", hrZoneBars(hrZones, hrObservedMax));
  document.getElementById("zoneLegend").innerHTML = zoneLegendHtml(wk.hrZoneDefs || FALLBACK.insights.hrZoneDefs);

  const zoneTimePct = wk.zoneTimePct || FALLBACK.insights.zoneTimePct;
  renderChart("chartZoneTime", zoneTimeBars(zoneTimePct));

  const progression = wk.progression || FALLBACK.progression;
  renderProgression(progression);

  // QR code to Strava profile (needs internet — works on the deployed site, may not render in an offline preview)
  try {
    if (typeof QRCode !== "undefined") {
      new QRCode(document.getElementById("qrCode"), {
        text: "https://strava.app.link/XaJw3ei7u4b",
        width: 160, height: 160,
        colorDark: "#12151A", colorLight: "#ffffff"
      });
    }
  } catch(e) { /* QR lib unavailable offline — link below still works */ }

  // Top city map (this fetch can take up to ~15s on a cache miss, since it
  // reverse-geocodes several locations — creep the bar slowly instead of
  // letting it sit frozen at 75% the whole time)
  const bar = document.getElementById("pageLoadBar");
  if(bar){ bar.style.transition = "width 9s ease-out, opacity .3s ease .2s"; }
  setLoadProgress(92);
  const mapData = await tryFetch("/api/mapdata");
  if(bar){ bar.style.transition = "width .4s ease, opacity .3s ease .2s"; }
  renderTopCity(mapData);
  finishLoadProgress();
}

function showPrStats(pr){
  const wrap = document.getElementById("prStatsWrap");
  const eventEl = document.getElementById("prStatsEvent");
  const metaEl = document.getElementById("prStatsMeta");
  const rowEl = document.getElementById("prStatsRow");

  if(!pr || !pr.stats){
    wrap.style.display = "block";
    eventEl.textContent = `No stats recorded for ${pr ? pr.dist : "this record"}`;
    metaEl.textContent = "this happened before the monitored window — can be filled in manually in data/prs-seed.json";
    rowEl.innerHTML = "";
    return;
  }

  const s = pr.stats;
  wrap.style.display = "block";
  eventEl.textContent = s.eventName || pr.dist;
  const dateLabel = s.date ? new Date(s.date).toLocaleDateString("en-US", {day:"2-digit", month:"2-digit", year:"numeric"}) : "";
  metaEl.textContent = [dateLabel, s.locationName].filter(Boolean).join(" · ");

  const items = [
    {dist:"Distance", time: `${s.distanceKm} km`},
    {dist:"Avg pace", time: s.avgPace},
    {dist:"Moving time", time: s.movingTime},
    {dist:"Elevation gain", time: `${s.elevationM} m`},
  ];
  if(s.calories) items.push({dist:"Calories", time: `${s.calories} cal`});
  if(s.avgHr) items.push({dist:"Avg HR", time: `${s.avgHr} bpm`});

  rowEl.innerHTML = items.map(i => `<div class="prItem" style="cursor:default;"><div class="dist">${i.dist}</div><div class="time">${i.time}</div></div>`).join("");
}

function flagImg(countryCode){
  if(!countryCode || countryCode.length !== 2) return "";
  const cc = countryCode.toLowerCase();
  return `<img src="https://flagcdn.com/24x18/${cc}.png" srcset="https://flagcdn.com/48x36/${cc}.png 2x" width="18" height="13" alt="" style="border-radius:2px; vertical-align:middle;">`;
}

const PROG_COLORS = ["var(--line)","#F7CFC9","#DE7A67","#C94531","#7A1610"];

const STRAVA_START_DATE = "2020-10-15"; // approximate — when you started logging activity on Strava

function renderProgression(years){
  const el = document.getElementById("progressionList");
  if(!years || !years.length){ el.innerHTML = ""; return; }
  el.innerHTML = years.map(y => `
    <div class="progRow">
      <div class="progYear">${y.year}</div>
      <div class="progGrid">
        ${y.cells.map(c => {
          const isMarker = c.date === STRAVA_START_DATE;
          const tip = isMarker ? `${c.date} — started using Strava` : c.date;
          return `<div class="progCell${isMarker?' progMarker':''}" data-tip="${tip}" style="background:${PROG_COLORS[c.level]}"></div>`;
        }).join("")}
      </div>
      <div class="progStats"><span class="progPct">${y.pct}%</span> ${y.activeDays} / ${y.totalDays} · ${y.restDays} rest days</div>
    </div>`).join("");
  document.querySelectorAll("#progressionList [data-tip]").forEach(node=>{
    const tip = ensureTooltip();
    node.addEventListener("mouseenter", ()=>{ tip.textContent = node.getAttribute("data-tip"); tip.style.opacity = 1; });
    node.addEventListener("mousemove", e=>{ positionTooltip(tip, e.clientX, e.clientY); });
    node.addEventListener("mouseleave", ()=>{ tip.style.opacity = 0; });
    node.addEventListener("touchstart", e=>{
      e.stopPropagation();
      const touch = e.touches[0];
      tip.textContent = node.getAttribute("data-tip");
      tip.style.opacity = 1;
      positionTooltip(tip, touch.clientX, touch.clientY);
    }, {passive:true});
  });
}

function renderTopCity(mapData){
  const cities = (mapData && mapData.length) ? mapData : FALLBACK.topCities;

  const maxKm = Math.max(...cities.map(c=>c.km),1);
  document.getElementById("topCitiesList").innerHTML = cities.map((c,i) => `
    <div class="cityRow">
      <div class="shoeName">${i+1}. ${c.city} ${flagImg(c.countryCode)}</div>
      <div class="shoeKm">${c.km} km</div>
    </div>`).join("");

  const mapEl = document.getElementById("topCityMap");
  if(typeof maplibregl === "undefined" || !cities.length){
    mapEl.innerHTML = `<div class="mapNote">Not enough location data yet.</div>`;
    return;
  }
  try {
    const map = new maplibregl.Map({
      container: "topCityMap",
      style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      center: [cities[0].lng, cities[0].lat], zoom: 4
    });
    map.on("load", () => {
      const bounds = new maplibregl.LngLatBounds();
      cities.forEach((c,i) => {
        const el = document.createElement("div");
        el.style.cssText = `width:${10+Math.min(18,(c.km/maxKm)*18)}px; height:${10+Math.min(18,(c.km/maxKm)*18)}px; border-radius:50%; background:#E2231A; border:2px solid #fff; opacity:0.85;`;
        new maplibregl.Marker({element:el})
          .setLngLat([c.lng, c.lat])
          .setPopup(new maplibregl.Popup({offset:14}).setHTML(`${i+1}. ${c.city} ${flagImg(c.countryCode)} — ${c.km} km`))
          .addTo(map);
        bounds.extend([c.lng, c.lat]);
      });
      if(!bounds.isEmpty()) map.fitBounds(bounds, {padding:50, maxZoom:11});
    });
  } catch(e) {
    mapEl.innerHTML = `<div class="mapNote">Couldn't load the map.</div>`;
  }
}

init().catch(() => finishLoadProgress());
