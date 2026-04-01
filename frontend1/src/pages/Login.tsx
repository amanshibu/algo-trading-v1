import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/GlassCard";
import { TrendingUp, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login, loading } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    const result = await login(email, password);
    if (result.ok) {
      navigate("/portfolio");
    } else {
      setError(result.error ?? "Login failed");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-6">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full bg-primary/4 blur-[140px] pointer-events-none" />

      <div className="w-full max-w-sm fade-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">AlgoTrader</span>
        </div>

        <GlassCard variant="strong" className="p-7">
          <h2 className="text-lg font-semibold text-foreground text-center">Welcome back</h2>
          <p className="mt-1 text-xs text-muted-foreground text-center mb-6">
            Sign in to your trading account
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-danger/10 border border-danger/20 px-4 py-2.5 text-xs font-medium text-danger text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trader@example.com"
                className="mt-1.5 w-full rounded-lg bg-input/50 border border-border/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-input/50 border border-border/50 px-4 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Signing in…" : "Login"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline">
              Get started
            </Link>
          </p>
        </GlassCard>
      </div>
    </div>
  );
};

export default Login;