import { Link, useLocation, useNavigate } from "react-router-dom";
import { TrendingUp, Menu, X, LogOut, User } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { label: "Home", path: "/" },
  { label: "Strategies", path: "/strategies" },
  { label: "Portfolio", path: "/portfolio" },
  { label: "Spectral", path: "/spectral" },
  { label: "Add Funds", path: "/add-funds" },
];

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLoggedIn, user, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <nav className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            AlgoTrader
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`rounded-md px-3.5 py-2 text-[13px] font-medium transition-colors duration-200 ${location.pathname === item.path
                ? "text-foreground bg-muted/50"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {item.label}
            </Link>
          ))}

          {isLoggedIn ? (
            <div className="ml-3 flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-lg bg-muted/30 px-3 py-2 text-[13px] font-medium text-foreground">
                <User className="h-3.5 w-3.5 text-primary" />
                {user?.name ?? "User"}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg bg-danger/10 px-3 py-2 text-[13px] font-medium text-danger transition-all duration-200 hover:bg-danger/20"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="ml-3 rounded-lg bg-primary/10 px-4 py-2 text-[13px] font-medium text-primary transition-all duration-200 hover:bg-primary/20"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="text-muted-foreground md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="glass-strong border-t border-border/50 px-6 py-4 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`block rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${location.pathname === item.path
                ? "text-foreground"
                : "text-muted-foreground"
                }`}
            >
              {item.label}
            </Link>
          ))}

          {isLoggedIn ? (
            <>
              <div className="mt-2 flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-foreground">
                <User className="h-3.5 w-3.5 text-primary" />
                {user?.name ?? "User"}
              </div>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  handleLogout();
                }}
                className="mt-1 block w-full rounded-lg bg-danger/10 px-3 py-2.5 text-center text-sm font-medium text-danger"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="mt-2 block rounded-lg bg-primary/10 px-3 py-2.5 text-center text-sm font-medium text-primary"
            >
              Login
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
