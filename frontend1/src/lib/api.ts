// =========================
// Helper: Get Headers
// =========================
function getHeaders(hasBody = true) {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {};
  if (hasBody) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// =========================
// Auth
// =========================

export async function login(email: string, password: string) {
  const res = await fetch("/auth/login", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed");
  return data;
}

export async function register(name: string, email: string, password: string) {
  const res = await fetch("/auth/register", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Registration failed");
  return data;
}

export async function getMe() {
  const res = await fetch("/auth/me", { headers: getHeaders(false) });
  return res.json();
}

export async function addFunds(amount: number) {
  const res = await fetch("/auth/add-funds", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ amount }),
  });
  return res.json();
}

export async function withdrawFunds(amount: number) {
  const res = await fetch("/auth/withdraw", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ amount }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Withdraw failed");
  return data;
}

// =========================
// Strategy
// =========================

export async function getSignal() {
  const res = await fetch("/strategy/signal", { headers: getHeaders(false) });
  return res.json();
}

export async function getBacktest(interval: string = "1d", period: string = "6mo", ma_period: number = 10) {
  const res = await fetch(`/strategy/backtest?interval=${interval}&period=${period}&ma_period=${ma_period}`, { headers: getHeaders(false) });
  return res.json();
}

export async function getCorrelationHeatmap() {
  const res = await fetch("/strategy/correlation-heatmap", { headers: getHeaders(false) });
  return res.json();
}

export async function getSpectralSignal() {
  const res = await fetch("/strategy/spectral-signal", { headers: getHeaders(false) });
  return res.json();
}

export async function getAutoAlerts() {
  const res = await fetch("/strategy/auto-alerts", { headers: getHeaders(false) });
  return res.json();
}

export async function getBacktestLogs() {
  const res = await fetch("/strategy/backtest-logs?lines=100", { headers: getHeaders(false) });
  return res.json();
}

// =========================
// Paper Trading
// =========================

export async function executePaperTrade(ticker: string, action: string, qty: number = 1) {
  const res = await fetch("/strategy/execute-trade", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ ticker, action, qty }),
  });
  if (!res.ok) return { error: "Failed to execute trade. Please login." };
  return res.json();
}

export async function getPaperPortfolio() {
  const res = await fetch("/strategy/paper-portfolio", { headers: getHeaders(false) });
  if (!res.ok) return null;
  return res.json();
}

export async function addPaperFunds(amount: number) {
  const res = await fetch("/strategy/paper-add-funds", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error("Failed to add funds");
  return res.json();
}

export async function resetPaperPortfolio() {
  const res = await fetch("/strategy/paper-reset", {
    method: "POST",
    headers: getHeaders(false),
  });
  if (!res.ok) throw new Error("Failed to reset portfolio");
  return res.json();
}

// =========================
// Portfolio
// =========================

export async function getPortfolioSummary() {
  const res = await fetch("/portfolio/summary", { headers: getHeaders(false) });
  if (!res.ok) return null;
  return res.json();
}

export async function getPortfolioPerformance() {
  const res = await fetch("/portfolio/performance", { headers: getHeaders(false) });
  if (!res.ok) return null;
  return res.json();
}

// =========================
// Ticker
// =========================

export async function getTickerPrices() {
  const res = await fetch("/strategy/ticker", { headers: getHeaders(false) });
  return res.json();
}

export async function getStrategies() {
  const res = await fetch("/strategy/list", { headers: getHeaders(false) });
  return res.json();
}