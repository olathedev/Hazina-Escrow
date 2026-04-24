import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "./components/layout/Navbar";
import OnboardingTour from "./components/OnboardingTour";
import LandingPage from "./pages/LandingPage";
import MarketplacePage from "./pages/MarketplacePage";
import SellPage from "./pages/SellPage";
import DashboardPage from "./pages/DashboardPage";
import AgentPage from "./pages/AgentPage";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-gold focus:text-void focus:rounded-lg focus:font-semibold focus:outline-none focus:ring-2 focus:ring-gold-light"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <Navbar />
      <OnboardingTour />
      <main id="main-content" tabIndex={-1}>
        <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/sell" element={<SellPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/agent" element={<AgentPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </main>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen pt-28 flex items-center justify-center text-center px-4">
      <div>
        <p className="font-display text-8xl font-bold text-gold/20 mb-4">404</p>
        <h1 className="font-display text-3xl font-bold text-foreground mb-3">
          Page not found
        </h1>
        <p className="text-foreground-muted font-body mb-8">
          This page doesn't exist in the vault.
        </p>
        <a href="/" className="btn-gold px-8 py-3 text-sm inline-block">
          Return Home
        </a>
      </div>
    </div>
  );
}
