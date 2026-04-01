import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { GlassCard } from "@/components/GlassCard";
import { Wallet, ShieldCheck, Loader2 } from "lucide-react";
import { addPaperFunds, getPaperPortfolio } from "@/lib/api";
import { useNavigate } from "react-router-dom";

const AddFunds = () => {
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const presets = [1000, 5000, 10000, 25000];

  useEffect(() => {
    async function loadPortfolio() {
      try {
        const p = await getPaperPortfolio();
        if (p?.balance != null) {
          setBalance(p.balance);
        }
      } catch (err) {
        console.error("Failed to fetch portfolio", err);
      }
    }
    loadPortfolio();
  }, []);

  const handleInvest = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setLoading(true);
    try {
      await addPaperFunds(amt);
      const p = await getPaperPortfolio();
      if (p?.balance != null) {
        setBalance(p.balance);
      }
      setAmount("");
      navigate("/portfolio"); // Redirect to portfolio after success
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto max-w-lg px-6 pt-32 pb-16">
        <div className="text-center fade-up">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Add Virtual Money</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Top up your paper trading balance. This is not real money.
          </p>
        </div>

        <GlassCard className="mt-8 p-6 fade-up fade-up-delay-1">
          {/* Balance */}
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-border/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5">
              <Wallet className="h-5 w-5 text-primary/70" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Virtual Balance</p>
              <p className="text-lg font-semibold text-foreground">
                {balance !== null ? `₹${balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "..."}
              </p>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Amount to Add
            </label>
            <div className="mt-2 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">₹</span>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                className="w-full rounded-xl bg-input/50 border border-border/50 py-3.5 pl-9 pr-4 text-xl font-semibold text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Presets */}
          <div className="mt-4 flex gap-2">
            {presets.map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(preset.toString())}
                className="flex-1 rounded-lg bg-muted/30 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
              >
                ₹{preset.toLocaleString("en-IN")}
              </button>
            ))}
          </div>

          {/* New balance preview */}
          {amount && parseFloat(amount) > 0 && balance !== null && (
            <div className="mt-5 rounded-xl bg-muted/20 p-4">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">New Balance</span>
                <span className="font-semibold text-foreground">
                  ₹{(balance + parseFloat(amount || "0")).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleInvest}
            disabled={loading || !amount}
            className="mt-6 w-full flex items-center justify-center rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Add Virtual Money
          </button>

          {/* Trust signal */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="text-[11px]">Paper trading balance is stored safely in the database</span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default AddFunds;