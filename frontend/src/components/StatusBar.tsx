import React from "react";

type Props = {
  signal: "BUY" | "SELL" | "HOLD";
};

export default function StatusBar({ signal }: Props) {
  return (
    <div style={{ marginTop: 20 }}>
      Status: <strong>{signal}</strong>
    </div>
  );
}
