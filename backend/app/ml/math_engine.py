import numpy as np


def kalman_filter(data):
    n = len(data)
    xhat = np.zeros(n)
    P = np.zeros(n)
    Q = 1e-5
    R = 0.01

    xhat[0] = data[0]
    P[0] = 1.0

    for k in range(1, n):
        xhatminus = xhat[k - 1]
        Pminus = P[k - 1] + Q
        K = Pminus / (Pminus + R)
        xhat[k] = xhatminus + K * (data[k] - xhatminus)
        P[k] = (1 - K) * Pminus

    return xhat


def get_ou_params(spread):
    x = spread[:-1]
    y = spread[1:]
    A = np.vstack([x, np.ones(len(x))]).T

    try:
        m, c = np.linalg.lstsq(A, y, rcond=None)[0]
        theta = -np.log(m)
        mu = c / (1 - m)
        sigma = np.std(spread)
        return theta, mu, sigma
    except:
        return 0, 0, 0
