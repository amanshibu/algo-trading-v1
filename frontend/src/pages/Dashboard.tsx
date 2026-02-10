import Metric from "../components/Metric";
import StatusBar from "../components/StatusBar";
import TradeTable from "../components/TradeTable";
import React from "react";

export default function Dashboard() {
  const trades = [
    { time: "10:30", side: "BUY", price: 42100, qty: 1 },
    { time: "11:10", side: "SELL", price: 42350, qty: 1 },
  ];

  return (
    <div style={styles.page}>
      <h1>Algo Trading Dashboard</h1>

      <div style={styles.metrics}>
        <Metric label="Balance" value="₹1,20,000" />
        <Metric label="PnL" value="+₹4,200" />
        <Metric label="Win Rate" value="63%" />
        <Metric label="Trades" value="128" />
      </div>

      <StatusBar signal="BUY" />
      <TradeTable trades={trades} />
    </div>
  );
}

const styles = {
  page: {
    padding: "30px",
  },
  metrics: {
    display: "flex",
    gap: "16px",
  },
};
