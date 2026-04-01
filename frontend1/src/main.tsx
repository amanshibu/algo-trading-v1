import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
    state = { error: null };
    static getDerivedStateFromError(error: Error) { return { error }; }
    render() {
        if (this.state.error) {
            return (
                <div style={{ padding: 20, color: 'red', background: '#222', minHeight: '100vh', fontFamily: 'monospace' }}>
                    <h2>React Crash</h2>
                    <pre>{this.state.error.message}</pre>
                    <pre>{this.state.error.stack}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);
