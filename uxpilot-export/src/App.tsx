import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import AgencyBrain from "./pages/AgencyBrain";
import Campaigns from "./pages/Campaigns";
import NewCampaign from "./pages/NewCampaign";
import Reports from "./pages/Reports";
import Clients from "./pages/Clients";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import Audiences from "./pages/Audiences";
import Creatives from "./pages/Creatives";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/agency-brain" element={<AgencyBrain />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/new" element={<NewCampaign />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/audiences" element={<Audiences />} />
          <Route path="/creatives" element={<Creatives />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;