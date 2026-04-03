import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import LandingPage from "./pages/LandingPage";
import UiComponentsDemo from "./pages/UiComponentsDemo";
import { SpiralAnimation } from "./components/ui/spiral-animation";

export default function App() {
  return (
    <Router>
      <div className="relative min-h-screen">
        {/* Spiral animation background — fixed behind everything */}
        <div className="fixed inset-0 z-0 opacity-50">
          <SpiralAnimation />
        </div>

        {/* Main content on top */}
        <div className="relative z-10">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/ui-showcase" element={<UiComponentsDemo />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
