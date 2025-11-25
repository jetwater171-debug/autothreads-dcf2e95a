import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AccountsOAuth from "./pages/AccountsOAuth";
import ThreadsCallback from "./pages/ThreadsCallback";
import Phrases from "./pages/Phrases";
import PeriodicPosts from "./pages/PeriodicPosts";
import ManualPost from "./pages/ManualPost";
import Images from "./pages/Images";
import Analytics from "./pages/Analytics";
import Campaigns from "./pages/Campaigns";
import CampaignDetails from "./pages/CampaignDetails";
import PostHistory from "./pages/PostHistory";
import WarmingPipeline from "./pages/WarmingPipeline";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/threads/callback" element={<ThreadsCallback />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/accounts" element={<AccountsOAuth />} />
          <Route path="/phrases" element={<Phrases />} />
          <Route path="/images" element={<Images />} />
          <Route path="/periodic-posts" element={<PeriodicPosts />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignDetails />} />
          <Route path="/manual-post" element={<ManualPost />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/post-history" element={<PostHistory />} />
          <Route path="/warming-pipeline" element={<WarmingPipeline />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
