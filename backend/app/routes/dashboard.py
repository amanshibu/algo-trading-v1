from fastapi import APIRouter
from fastapi.responses import HTMLResponse


router = APIRouter(
    prefix="/admin",
    tags=["admin"],
)


@router.get("/dashboard", response_class=HTMLResponse)
def admin_dashboard():
    """
    Lightweight HTML dashboard for project reviewers / admins.

    - Shows latest ML signal from /strategy/signal
    - Shows latest backtest summary from /strategy/backtest
    """

    # Inline HTML so we don't need a template engine.
    # Uses simple CSS + vanilla JS fetch to render the JSON nicely.
    html = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <title>Algo Strategy Terminal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
            :root {
                --bg: #0B0E14;
                --surface: #121826;
                --border: #1E2636;
                --text-primary: #E6EAF2;
                --text-secondary: #9AA4B2;
                --text-muted: #6B7280;
                --accent: #8FA2FF;
                --positive: #3FB950;
                --negative: #F85149;
                --warning: #D29922;
            }

            * {
                box-sizing: border-box;
            }

            body {
                margin: 0;
                font-family:
                    "Inter",
                    "SF Pro Text",
                    system-ui,
                    -apple-system,
                    sans-serif;
                font-feature-settings: "tnum" 1, "liga" 1;
                background:
                    radial-gradient(circle at top, #161b2a 0, #050711 45%, #050711 100%),
                    var(--bg);
                background-attachment: fixed;
                color: var(--text-primary);
                min-height: 100vh;
                display: flex;
                flex-direction: column;
            }

            .page {
                max-width: 1120px;
                margin: 32px auto 40px;
                padding: 0 16px;
            }

            header {
                margin-bottom: 20px;
            }

            .top-bar-row {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                margin-bottom: 10px;
            }

            .product-name {
                font-size: 0.85rem;
                text-transform: uppercase;
                letter-spacing: 0.16em;
                color: var(--text-secondary);
            }

            .env-row {
                display: inline-flex;
                align-items: center;
                gap: 12px;
                font-size: 0.8rem;
                color: var(--text-secondary);
            }

            .env-dot {
                width: 7px;
                height: 7px;
                border-radius: 999px;
                background: var(--positive);
                box-shadow: 0 0 0 4px rgba(63, 185, 80, 0.28);
            }

            .env-divider {
                width: 1px;
                height: 14px;
                background: var(--border);
            }

            .top-bar-metrics {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 12px;
            }

            .top-metric {
                padding: 10px 12px;
                border-radius: 12px;
                background: rgba(7, 11, 20, 0.72);
                border: 1px solid rgba(255, 255, 255, 0.04);
                box-shadow: 0 22px 45px rgba(0, 0, 0, 0.75);
                backdrop-filter: blur(22px);
                -webkit-backdrop-filter: blur(22px);
            }

            .label {
                text-transform: uppercase;
                letter-spacing: 0.08em;
                font-size: 11px;
                color: var(--text-secondary);
                margin-bottom: 4px;
            }

            .top-metric-value {
                font-size: 0.95rem;
                font-weight: 500;
            }

            .grid {
                display: grid;
                grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
                gap: 18px;
            }

            @media (max-width: 900px) {
                .grid {
                    grid-template-columns: minmax(0, 1fr);
                }
            }

            .card {
                background: rgba(7, 11, 20, 0.82);
                border-radius: 16px;
                border: 1px solid rgba(255, 255, 255, 0.05);
                box-shadow: 0 26px 70px rgba(0, 0, 0, 0.85);
                padding: 18px 20px 20px;
                position: relative;
                overflow: hidden;
                backdrop-filter: blur(26px);
                -webkit-backdrop-filter: blur(26px);
            }

            .card::before {
                content: "";
                position: absolute;
                inset: 0;
                background: radial-gradient(circle at top left, rgba(143, 162, 255, 0.12), transparent 55%);
                opacity: 1;
                pointer-events: none;
            }

            .card-header {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                margin-bottom: 8px;
                position: relative;
                z-index: 1;
            }

            .card-title {
                font-size: 0.95rem;
                font-weight: 600;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                color: var(--text-secondary);
            }

            .pill {
                border-radius: 999px;
                padding: 3px 10px;
                font-size: 0.75rem;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                border: 1px solid rgba(148, 163, 184, 0.45);
                color: var(--text-secondary);
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: #0B0E14;
            }

            .pill-dot-bull {
                width: 8px;
                height: 8px;
                border-radius: 999px;
                background: var(--accent);
            }

            .pill-dot-bear {
                width: 8px;
                height: 8px;
                border-radius: 999px;
                background: var(--negative);
            }

            .card-main {
                position: relative;
                z-index: 1;
            }

            .pair {
                font-size: 1.1rem;
                font-weight: 600;
                margin-bottom: 2px;
            }

            .subtitle {
                font-size: 0.8rem;
                color: var(--text-secondary);
                margin-bottom: 12px;
            }

            .metrics-row {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 10px;
            }

            .metric {
                flex: 1 1 90px;
                min-width: 0;
            }

            .metric-label {
                font-size: 0.72rem;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                color: var(--text-secondary);
                margin-bottom: 3px;
            }

            .metric-value {
                font-size: 0.95rem;
                font-weight: 500;
            }

            .metric-value.bad {
                color: var(--negative);
            }

            .metric-value.good {
                color: var(--positive);
            }

            .metric-value.neutral {
                color: var(--warning);
            }

            .reason {
                font-size: 0.8rem;
                color: var(--text-secondary);
                background: #0B0E14;
                border-radius: 10px;
                padding: 7px 8px;
                border: 1px solid var(--border);
                margin-bottom: 4px;
            }

            .hint {
                font-size: 0.75rem;
                color: var(--text-muted);
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .hint-dot {
                width: 6px;
                height: 6px;
                border-radius: 999px;
                background: rgba(148, 163, 184, 0.7);
            }

            .section-title {
                font-size: 0.8rem;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                color: var(--text-secondary);
                margin: 0 0 8px;
            }

            .summary-row {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                margin-bottom: 10px;
            }

            .summary-item {
                flex: 1 1 120px;
                min-width: 0;
            }

            .summary-label {
                font-size: 0.74rem;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                color: var(--text-secondary);
                margin-bottom: 3px;
            }

            .summary-value {
                font-size: 0.95rem;
                font-weight: 500;
            }

            .summary-value.pnl-positive {
                color: var(--positive);
            }

            .summary-value.pnl-negative {
                color: var(--negative);
            }

            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 4px;
                font-size: 0.78rem;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
            }

            thead {
                background: #0B0E14;
            }

            th, td {
                padding: 6px 8px;
                text-align: left;
            }

            th {
                font-weight: 500;
                color: var(--text-secondary);
                border-bottom: 1px solid var(--border);
                text-transform: uppercase;
                letter-spacing: 0.08em;
                font-size: 0.7rem;
            }

            tbody tr:nth-child(even) {
                background: var(--surface);
            }

            tbody tr:nth-child(odd) {
                background: var(--surface);
            }

            tbody td {
                border-bottom: 1px solid var(--border);
            }

            .pnl-pos {
                color: var(--positive);
                font-weight: 500;
            }

            .pnl-neg {
                color: var(--negative);
                font-weight: 500;
            }

            .status {
                font-size: 0.8rem;
                color: var(--text-secondary);
                margin-top: 8px;
            }

            .status strong {
                color: var(--text-primary);
            }

            .empty-state {
                padding: 10px 10px;
                border-radius: 10px;
                border: 1px dashed var(--border);
                color: var(--text-secondary);
                font-size: 0.8rem;
                background: #0B0E14;
            }

            .footer {
                margin-top: 24px;
                font-size: 0.75rem;
                color: var(--text-muted);
                text-align: right;
                opacity: 0.7;
            }

            .tag {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2px 8px;
                border-radius: 999px;
                border: 1px solid rgba(148, 163, 184, 0.4);
                font-size: 0.7rem;
                text-transform: uppercase;
                letter-spacing: 0.08em;
            }

            .tag-indicator {
                width: 6px;
                height: 6px;
                border-radius: 999px;
                background: var(--accent);
            }
        </style>
    </head>
    <body>
        <div class="page">
            <header>
                <div class="top-bar-row">
                    <div class="product-name">Algo Strategy Terminal</div>
                    <div class="env-row">
                        <span class="env-dot" id="env-dot"></span>
                        <span id="env-label">LIVE</span>
                        <span class="env-divider"></span>
                        <span id="backend-health">Backend OK</span>
                        <span class="env-divider"></span>
                        <span id="utc-timestamp">— UTC</span>
                    </div>
                </div>
                <div class="top-bar-metrics">
                    <div class="top-metric">
                        <div class="label">Market Regime</div>
                        <div class="top-metric-value" id="top-regime">—</div>
                    </div>
                    <div class="top-metric">
                        <div class="label">Active Signal</div>
                        <div class="top-metric-value" id="top-active-signal">None</div>
                    </div>
                    <div class="top-metric">
                        <div class="label">Confidence</div>
                        <div class="top-metric-value" id="top-confidence">—</div>
                    </div>
                </div>
            </header>

            <div class="grid">
                <section class="card" id="signal-card">
                    <div class="card-header">
                        <div class="card-title">Current Signal</div>
                        <div id="regime-pill" class="pill">
                            <span class="pill-dot-bull"></span>
                            <span id="regime-label">Regime: —</span>
                        </div>
                    </div>
                    <div class="card-main" id="signal-content">
                        <div class="empty-state">
                            Waiting for signal from backend...
                        </div>
                    </div>
                    <div class="status" id="signal-status"></div>
                </section>

                <section class="card" id="backtest-card">
                    <div class="card-header">
                        <div class="card-title">Backtest Snapshot</div>
                        <div class="tag">
                            <span class="tag-indicator"></span>
                            <span>Last 6 months</span>
                        </div>
                    </div>
                    <div class="card-main" id="backtest-content">
                        <div class="empty-state">
                            Loading backtest results...
                        </div>
                    </div>
                    <div class="status" id="backtest-status"></div>
                </section>
            </div>

            <div class="footer">
                View generated for project review &bull; Data is read-only and comes directly from the ML backend.
            </div>
        </div>

        <script>
            async function fetchJSON(path) {
                const res = await fetch(path);
                if (!res.ok) {
                    throw new Error("HTTP " + res.status);
                }
                return res.json();
            }

            function renderSignal(data) {
                const container = document.getElementById("signal-content");
                const status = document.getElementById("signal-status");
                const regimePill = document.getElementById("regime-pill");
                const regimeLabel = document.getElementById("regime-label");

                container.innerHTML = "";

                if (!data || !data.signal) {
                    container.innerHTML = `
                        <div class="empty-state">
                            No qualifying signal detected.<br/>
                            Z-score threshold not met.
                        </div>
                    `;
                    status.textContent = "Signal source: /strategy/signal (no qualifying signal).";
                    const regimeText = data && data.regime ? data.regime : "—";
                    regimeLabel.textContent = "Regime: " + regimeText;
                    regimePill.querySelector("span").className =
                        data && data.regime === "BEARISH" ? "pill-dot-bear" : "pill-dot-bull";

                    const topRegime = document.getElementById("top-regime");
                    const topSignal = document.getElementById("top-active-signal");
                    const topConfidence = document.getElementById("top-confidence");
                    if (topRegime) topRegime.textContent = regimeText;
                    if (topSignal) topSignal.textContent = "None";
                    if (topConfidence) topConfidence.textContent = "0.00";
                    return;
                }

                const s = data.signal;

                const actionClass =
                    s.action && s.action.toUpperCase().includes("BUY A")
                        ? "good"
                        : s.action && s.action.toUpperCase().includes("SELL A")
                        ? "bad"
                        : "neutral";

                const z = typeof s.z_score === "number" ? s.z_score : parseFloat(s.z_score || "0");
                const zClass = Math.abs(z) >= (data.entry_threshold || s.entry_threshold || 1.2) ? "good" : "neutral";

                const confidencePct = s.confidence != null
                    ? (s.confidence * 100).toFixed(1) + "%"
                    : "—";

                const html = `
                    <div class="pair">${s.pair || "—"}</div>
                    <div class="subtitle">Action: <strong class="metric-value ${actionClass}">${s.action || "—"}</strong></div>
                    <div class="metrics-row">
                        <div class="metric">
                            <div class="metric-label">Z-Score</div>
                            <div class="metric-value ${zClass}">${z.toFixed ? z.toFixed(2) : z}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Entry Threshold (|z|)</div>
                            <div class="metric-value">${s.entry_threshold ?? data.entry_threshold ?? "1.2"}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Mean Reversion Speed θ</div>
                            <div class="metric-value">${s.mean_reversion_speed ?? "—"}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Confidence</div>
                            <div class="metric-value">${confidencePct}</div>
                        </div>
                    </div>
                    <div class="reason">Reasoning: ${s.reason || "—"}</div>
                    <div class="hint">
                        <span class="hint-dot"></span>
                        <span>This view is read-only. Actual execution should be done on your trading platform using this signal.</span>
                    </div>
                `;

                container.innerHTML = html;
                status.innerHTML = "<strong>Source:</strong> /strategy/signal";

                const regime = data.regime || "—";
                regimeLabel.textContent = "Regime: " + regime;
                regimePill.querySelector("span").className =
                    regime === "BEARISH" ? "pill-dot-bear" : "pill-dot-bull";

                const topRegime = document.getElementById("top-regime");
                const topSignal = document.getElementById("top-active-signal");
                const topConfidence = document.getElementById("top-confidence");
                if (topRegime) topRegime.textContent = regime;
                if (topSignal) topSignal.textContent = s.action || "None";
                if (topConfidence) topConfidence.textContent = s.confidence != null ? s.confidence.toFixed(2) : "—";
            }

            function renderBacktest(data) {
                const container = document.getElementById("backtest-content");
                const status = document.getElementById("backtest-status");

                if (!data) {
                    container.innerHTML = `
                        <div class="empty-state">
                            Backtest endpoint returned no data payload.
                        </div>
                    `;
                    status.textContent = "Backtest source: /strategy/backtest (no data).";
                    return;
                }

                const net = data.net_pnl || 0;
                const pnlClass = net >= 0 ? "pnl-positive" : "pnl-negative";

                const summaryHtml = `
                    <div class="summary-row">
                        <div class="summary-item">
                            <div class="summary-label">Initial Capital</div>
                            <div class="summary-value">₹${Number(data.initial_capital || 0).toLocaleString()}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">Final Capital</div>
                            <div class="summary-value">₹${Number(data.final_capital || 0).toLocaleString()}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">Net P&L</div>
                            <div class="summary-value ${pnlClass}">₹${Number(net).toLocaleString()}</div>
                        </div>
                    </div>
                    <p class="summary-label" style="margin-top: 8px; margin-bottom: 2px;">Backtest Summary (6M)</p>
                `;

                let tableHtml = "";
                if (Array.isArray(data.trades) && data.trades.length) {
                    tableHtml = `
                        <div style="max-height: 220px; overflow: auto; border-radius: 12px; border: 1px solid rgba(255,255,255,0.04); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); background: rgba(7,11,20,0.75);">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Entry</th>
                                        <th>Exit</th>
                                        <th>P&L</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${data.trades
                                        .map((t) => {
                                            const pnlClass = t.pnl >= 0 ? "pnl-pos" : "pnl-neg";
                                            return `
                                                <tr>
                                                    <td>${t.entry_date || ""}</td>
                                                    <td>${t.entry_price ?? ""}</td>
                                                    <td>${t.exit_price ?? ""}</td>
                                                    <td class="${pnlClass}">${t.pnl ?? ""}</td>
                                                </tr>
                                            `;
                                        })
                                        .join("")}
                                </tbody>
                            </table>
                        </div>
                    `;
                } else {
                    tableHtml = `
                        <div class="empty-state" style="margin-top: 2px;">
                            No completed trades recorded for this backtest window.
                        </div>
                    `;
                }

                container.innerHTML = summaryHtml + tableHtml;
                status.innerHTML = "<strong>Source:</strong> /strategy/backtest";
            }

            async function init() {
                try {
                    const [signal, backtest] = await Promise.all([
                        fetchJSON("/strategy/signal"),
                        fetchJSON("/strategy/backtest"),
                    ]);
                    renderSignal(signal);
                    renderBacktest(backtest);

                    const backendHealth = document.getElementById("backend-health");
                    if (backendHealth) {
                        backendHealth.textContent = "Backend OK";
                    }

                    const ts = document.getElementById("utc-timestamp");
                    if (ts) {
                        const now = new Date();
                        const iso = now.toISOString().slice(0, 16).replace("T", " ");
                        ts.textContent = iso + " UTC";
                    }
                } catch (err) {
                    const signalContainer = document.getElementById("signal-content");
                    const backtestContainer = document.getElementById("backtest-content");
                    const signalStatus = document.getElementById("signal-status");
                    const backtestStatus = document.getElementById("backtest-status");

                    signalContainer.innerHTML = `
                        <div class="empty-state">
                            Error fetching signal from backend.<br/>
                            Please make sure the FastAPI server is running.
                        </div>
                    `;
                    backtestContainer.innerHTML = `
                        <div class="empty-state">
                            Error fetching backtest from backend.<br/>
                            Please make sure the FastAPI server is running.
                        </div>
                    `;

                    signalStatus.textContent = "Failed to reach /strategy/signal (" + err.message + ").";
                    backtestStatus.textContent = "Failed to reach /strategy/backtest (" + err.message + ").";

                    const backendHealth = document.getElementById("backend-health");
                    const envDot = document.getElementById("env-dot");
                    if (backendHealth) {
                        backendHealth.textContent = "Backend error";
                    }
                    if (envDot) {
                        envDot.style.background = "var(--negative)";
                        envDot.style.boxShadow = "0 0 0 4px rgba(248, 81, 73, 0.28)";
                    }
                }
            }

            init();
        </script>
    </body>
    </html>
    """

    return HTMLResponse(content=html)

