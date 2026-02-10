import React from "react";

type Props = {
  label: string;
  value: string;
};

export default function Metric({ label, value }: Props) {
  return (
    <div style={{ background: "#111", padding: 16, borderRadius: 8 }}>
      <div>{label}</div>
      <div>{value}</div>
    </div>
  );
}
