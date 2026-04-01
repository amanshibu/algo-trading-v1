import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/AuthContext";
import Index from "./pages/Index";
import Strategies from "./pages/Strategies";
import Portfolio from "./pages/Portfolio";
import AddFunds from "./pages/AddFunds";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SpectralAnalysis from "./pages/SpectralAnalysis";
import BacktestLogs from "./pages/BacktestLogs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/strategies" element={<Strategies />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/add-funds" element={<AddFunds />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/spectral" element={<SpectralAnalysis />} />
            <Route path="/strategies/backtest" element={<BacktestLogs />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
