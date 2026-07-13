// lib/ml.js
// Small, from-scratch ML utilities — no external dependencies. Kept
// intentionally simple and auditable rather than pulling in a heavy ML
// library for a personal site running on Node serverless functions.
//
// Only the Race Time Predictor's math lives here now — the workout-type
// clustering model (k-means) was removed after several rounds of tuning
// still weren't classifying real training sessions well enough.

// ---------- Power-law regression: time = a * distance^b ----------
// This is a log-log linear regression (least squares), used to fit a
// PERSONALIZED version of the Riegel race-prediction formula
// (generic Riegel uses a fixed exponent b≈1.06 for everyone; here b is
// fitted from the athlete's own PR curve).
function powerLawFit(points) {
  const n = points.length;
  const xs = points.map(p => Math.log(p.x));
  const ys = points.map(p => Math.log(p.y));
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - xMean) * (ys[i] - yMean); den += (xs[i] - xMean) ** 2; }
  const b = den ? num / den : 1.06;
  const logA = yMean - b * xMean;
  const a = Math.exp(logA);
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const yPred = logA + b * xs[i];
    ssRes += (ys[i] - yPred) ** 2;
    ssTot += (ys[i] - yMean) ** 2;
  }
  const r2 = ssTot ? 1 - ssRes / ssTot : 1;
  return { a, b, r2 };
}
function predictTime(model, distanceKm) { return model.a * Math.pow(distanceKm, model.b); }

function mean(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }

// ---------- Leave-one-out cross-validation for the power-law fit ----------
// Refits the curve n times (once per training point held out) to get an
// honest estimate of prediction error — not just how well the curve fits
// the same points it was trained on.
function loocvPowerLaw(points) {
  const n = points.length;
  if (n < 4) return null; // need at least 3 points left over each fold to fit
  let sumAbsErrS = 0, sumAbsPct = 0;
  for (let i = 0; i < n; i++) {
    const rest = points.filter((_, j) => j !== i);
    const curve = powerLawFit(rest);
    const predicted = predictTime(curve, points[i].x);
    const actual = points[i].y;
    sumAbsErrS += Math.abs(predicted - actual);
    sumAbsPct += Math.abs(predicted - actual) / actual;
  }
  return {
    maeSeconds: Math.round(sumAbsErrS / n),
    mapePct: Math.round((sumAbsPct / n) * 1000) / 10 // Mean Absolute Percentage Error
  };
}

module.exports = { powerLawFit, predictTime, mean, loocvPowerLaw };
