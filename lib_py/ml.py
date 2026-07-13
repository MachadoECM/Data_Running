# lib_py/ml.py
# Python port of lib/ml.js's race-prediction math — same algorithm
# (log-log linear regression / personalized Riegel formula), but using
# numpy + scikit-learn instead of hand-rolled least squares, so the two
# implementations can be compared side by side.

import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import LeaveOneOut


def power_law_fit(points):
    """Fit time = a * distance^b via log-log linear regression.

    points: list of (distance_km, time_seconds) tuples.
    Returns (a, b, r2).
    """
    x = np.array([[np.log(p[0])] for p in points])
    y = np.array([np.log(p[1]) for p in points])

    model = LinearRegression().fit(x, y)
    b = float(model.coef_[0])
    log_a = float(model.intercept_)
    a = float(np.exp(log_a))
    r2 = float(model.score(x, y))
    return a, b, r2


def predict_time(a, b, distance_km):
    return a * (distance_km ** b)


def loocv_power_law(points):
    """Leave-one-out cross-validation: refit the curve once per held-out
    point to get an honest error estimate, not just goodness-of-fit on the
    same data the curve was trained on.
    """
    n = len(points)
    if n < 4:
        return None

    x_all = np.array([[np.log(p[0])] for p in points])
    y_all = np.array([np.log(p[1]) for p in points])
    distances = np.array([p[0] for p in points])
    times = np.array([p[1] for p in points])

    loo = LeaveOneOut()
    abs_errors = []
    abs_pct_errors = []

    for train_idx, test_idx in loo.split(x_all):
        model = LinearRegression().fit(x_all[train_idx], y_all[train_idx])
        b = model.coef_[0]
        a = np.exp(model.intercept_)
        i = test_idx[0]
        predicted = a * (distances[i] ** b)
        actual = times[i]
        abs_errors.append(abs(predicted - actual))
        abs_pct_errors.append(abs(predicted - actual) / actual)

    mae_seconds = round(float(np.mean(abs_errors)))
    mape_pct = round(float(np.mean(abs_pct_errors)) * 1000) / 10
    return {"maeSeconds": mae_seconds, "mapePct": mape_pct}


def mean(values):
    return sum(values) / len(values) if values else 0
