import React from "react";
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
});

export const getSignal = () => api.get("/strategy/signal");
export const getBacktest = () => api.get("/strategy/backtest");
export const getTrades = () => api.get("/strategy/trades");

export default api;
