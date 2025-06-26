import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import CreateIdea from "./pages/CreateIdea";
import IdeaDetail from "./pages/IdeaDetail";
import Teams from "./pages/Teams";
import Communities from "./pages/Communities";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import CreateCommunity from './pages/CreateCommunity';
import { DiscoverCommunities } from './pages/Communities';
import CommunityDetail from "./pages/CommunityDetail";
import TeamDetail from "./pages/TeamDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create" element={<CreateIdea />} />
            <Route path="/idea/:id" element={<IdeaDetail />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/communities" element={<Communities />} />
            <Route path="/communities/create" element={<CreateCommunity />} />
            <Route path="/communities/discover" element={<DiscoverCommunities />} />
            <Route path="/communities/:id" element={<CommunityDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/teams/:id" element={<TeamDetail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
