import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { getJobs, getCategories } from "../utils/api";
import JobCard from "../components/common/JobCard";
import { CardSkeleton, EmptyState } from "../components/common/UI";

export default function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");

  useEffect(() => {
    getCategories().then((r) => setCategories(r.categories || [])).catch(console.error);
  }, []);

  const fetchJobs = useCallback(() => {
    setLoading(true);
    getJobs({ search, category, min_budget: minBudget, max_budget: maxBudget, status: "OPEN", limit: 30 })
      .then((r) => { setJobs(r.jobs || []); setTotal(r.total || 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, category, minBudget, maxBudget]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = {};
    if (search) params.search = search;
    if (category) params.category = category;
    setSearchParams(params);
    fetchJobs();
  };

  return (
    <div className="container page">
      <h1 className="mb-2">Find Work</h1>
      <p className="text-muted mb-6">{total} open job{total !== 1 ? "s" : ""} available right now</p>

      <form onSubmit={handleSearchSubmit} className="mb-6">
        <div className="flex gap-3" style={{ flexWrap: "wrap" }}>
          <input
            className="input"
            style={{ flex: 1, minWidth: 240 }}
            placeholder="Search jobs by title or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </div>
      </form>

      <div className="sidebar-layout">
        {/* Sidebar filters */}
        <aside className="flex-col gap-4">
          <div className="card card-compact">
            <h4 className="mb-3">Category</h4>
            <div className="flex-col gap-2">
              <FilterBtn active={!category} onClick={() => setCategory("")}>All Categories</FilterBtn>
              {categories.map((cat) => (
                <FilterBtn key={cat.id} active={category === String(cat.id)} onClick={() => setCategory(String(cat.id))}>
                  <span>{cat.icon}</span> {cat.name} <span className="text-muted text-xs">({cat.job_count})</span>
                </FilterBtn>
              ))}
            </div>
          </div>

          <div className="card card-compact">
            <h4 className="mb-3">Budget (USDC)</h4>
            <div className="flex gap-2">
              <input className="input" type="number" placeholder="Min" value={minBudget} onChange={(e) => setMinBudget(e.target.value)} />
              <input className="input" type="number" placeholder="Max" value={maxBudget} onChange={(e) => setMaxBudget(e.target.value)} />
            </div>
          </div>

          <div className="card card-compact" style={{ background: "linear-gradient(135deg, #0d1b2a, #16283d)", color: "white", border: "none" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#00d4ff", marginBottom: 6 }}>⚡ DID YOU KNOW?</div>
            <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,.8)", lineHeight: 1.6 }}>
              Every escrowed payment on WorkClaw earns ~18.3% APY via Byreal CLMM pools while
              the freelancer completes the work — split between client and freelancer on release.
            </p>
          </div>
        </aside>

        {/* Job list */}
        <div className="flex-col gap-4">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)
            : jobs.length === 0
              ? <EmptyState icon="🔍" title="No jobs found" subtitle="Try adjusting your filters or check back later for new opportunities." />
              : jobs.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      </div>
    </div>
  );
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6, textAlign: "left",
        padding: "8px 10px", borderRadius: "var(--radius-md)", border: "none",
        background: active ? "var(--green-light)" : "transparent",
        color: active ? "var(--green-dark)" : "var(--gray-600)",
        fontWeight: active ? 700 : 500, fontSize: "0.85rem", cursor: "pointer",
        transition: "all .15s", width: "100%"
      }}
    >
      {children}
    </button>
  );
}
