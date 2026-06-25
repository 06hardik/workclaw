import { Routes, Route } from "react-router-dom";
import Navbar from "./components/common/Navbar";
import Home from "./pages/Home";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import PostJob from "./pages/PostJob";
import Dashboard from "./pages/Dashboard";
import Contracts from "./pages/Contracts";
import ContractDetail from "./pages/ContractDetail";
import Proposals from "./pages/Proposals";
import Profile from "./pages/Profile";
import AgentActivity from "./pages/AgentActivity";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/post-job" element={<PostJob />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/contracts" element={<Contracts />} />
        <Route path="/contracts/:id" element={<ContractDetail />} />
        <Route path="/proposals" element={<Proposals />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/agent" element={<AgentActivity />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <footer style={{ borderTop: "1px solid var(--gray-200)", background: "var(--gray-50)", padding: "32px 0", marginTop: 40 }}>
        <div className="container text-center text-sm text-muted">
          🦀 WorkClaw — Built for Turing Test Hackathon 2026 · Agentic Economy Track · Powered by Byreal
        </div>
      </footer>
    </>
  );
}
