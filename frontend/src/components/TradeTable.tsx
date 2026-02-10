import React from "react";

type Trade = {
    time: string;
    side: string;
    price: number;
    qty: number;
  };
  
  export default function TradeTable({ trades }: { trades: Trade[] }) {
    return (
      <table style={styles.table}>
        <thead>
          <tr>
            <th>Time</th>
            <th>Side</th>
            <th>Price</th>
            <th>Qty</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => (
            <tr key={i}>
              <td>{t.time}</td>
              <td style={{ color: t.side === "BUY" ? "var(--green)" : "var(--red)" }}>
                {t.side}
              </td>
              <td>{t.price}</td>
              <td>{t.qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  
  const styles = {
    table: {
      width: "100%",
      marginTop: "20px",
      borderCollapse: "collapse" as const,
      background: "var(--card)",
      borderRadius: "10px",
      overflow: "hidden",
    },
  };
  