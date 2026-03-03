import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Index from "./pages/Index";
import Procurement from "./pages/Procurement";
import Sales from "./pages/Sales";
import Marketing from "./pages/Marketing";
import HR from "./pages/HR";
import Disk from "./pages/Disk";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/finance" element={<Index />} />
          <Route path="/procurement" element={<Procurement />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/marketing" element={<Marketing />} />
          <Route path="/hr" element={<HR />} />
          <Route path="/disk" element={<Disk />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
