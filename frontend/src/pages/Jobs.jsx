import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
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
  const [yieldActiveOnly, setYieldActiveOnly] = useState(false);
  const [sort, setSort] = useState("newest"); // newest, budget, closing

  useEffect(() => {
    getCategories().then((r) => setCategories(r.categories || [])).catch(console.error);
  }, []);

  const fetchJobs = useCallback(() => {
    setLoading(true);
    getJobs({ 
      search, 
      category, 
      min_budget: minBudget, 
      max_budget: maxBudget, 
      status: "OPEN", 
      limit: 30 
    })
      .then((r) => { 
        let filtered = r.jobs || [];
        // Apply yield active filter client-side if checked (or if server supports it)
        if (yieldActiveOnly) {
          filtered = filtered.filter(j => j.status === "ACTIVE" || j.status === "OPEN");
        }
        // Apply sort client side
        if (sort === "budget") {
          filtered.sort((a, b) => b.budget - a.budget);
        } else if (sort === "newest") {
          filtered.sort((a, b) => b.created_at - a.created_at);
        }
        setJobs(filtered); 
        setTotal(filtered.length); 
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, category, minBudget, maxBudget, yieldActiveOnly, sort]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = {};
    if (search) params.search = search;
    if (category) params.category = category;
    setSearchParams(params);
    fetchJobs();
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setMinBudget("");
    setMaxBudget("");
    setYieldActiveOnly(false);
    setSort("newest");
    setSearchParams({});
  };

  return (
    <div className="container page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "600", color: "var(--text-primary)" }}>Find work</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            <span className="font-mono">{total}</span> open opportunity available right now
          </p>
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "12px", width: "100%" }}>
          <input
            className="input"
            style={{ flex: 1, height: "44px" }}
            placeholder="Search jobs by title or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" style={{ height: "44px" }}>Search</button>
        </div>
      </form>

      <div className="sidebar-layout">
        {/* Filter Sidebar */}
        <aside style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          position: "sticky",
          top: "72px"
        }}>
          {/* Sort Segmented Control */}
          <div>
            <h4 style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: "600", textTransform: "uppercase", marginBottom: "12px" }}>Sort order</h4>
            <div style={{ display: "flex", background: "var(--bg-void)", borderRadius: "8px", padding: "2px", border: "1px solid var(--border-subtle)" }}>
              {["newest", "budget"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSort(opt)}
                  style={{
                    flex: 1,
                    background: sort === opt ? "var(--bg-surface)" : "transparent",
                    color: sort === opt ? "var(--accent-cyan)" : "var(--text-secondary)",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 0",
                    fontSize: "11px",
                    fontFamily: "var(--font-ui)",
                    fontWeight: "600",
                    cursor: "pointer",
                    textTransform: "uppercase"
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Budget section */}
          <div>
            <h4 style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: "600", textTransform: "uppercase", marginBottom: "12px" }}>Budget (USDC)</h4>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input 
                className="input input-mono" 
                style={{ width: "100%", height: "36px", padding: "6px 10px", fontSize: "13px" }}
                type="number" 
                placeholder="Min" 
                value={minBudget} 
                onChange={(e) => setMinBudget(e.target.value)} 
              />
              <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>to</span>
              <input 
                className="input input-mono" 
                style={{ width: "100%", height: "36px", padding: "6px 10px", fontSize: "13px" }}
                type="number" 
                placeholder="Max" 
                value={maxBudget} 
                onChange={(e) => setMaxBudget(e.target.value)} 
              />
            </div>
          </div>

          {/* Yield active toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-primary)", textTransform: "uppercase" }}>Yield active only</span>
            <button
              type="button"
              onClick={() => setYieldActiveOnly(!yieldActiveOnly)}
              style={{
                width: "40px",
                height: "20px",
                borderRadius: "10px",
                background: yieldActiveOnly ? "var(--accent-cyan)" : "var(--text-disabled)",
                border: "none",
                position: "relative",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
            >
              <div style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "var(--bg-void)",
                position: "absolute",
                top: "2px",
                left: yieldActiveOnly ? "22px" : "2px",
                transition: "left 0.2s"
              }} />
            </button>
          </div>

          {/* Category section */}
          <div>
            <h4 style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: "600", textTransform: "uppercase", marginBottom: "12px" }}>Category</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setCategory("")}
                style={{
                  display: "flex",
                  width: "100%",
                  textAlign: "left",
                  background: !category ? "rgba(0, 229, 255, 0.12)" : "transparent",
                  border: !category ? "1px solid rgba(0, 229, 255, 0.3)" : "1px solid transparent",
                  color: !category ? "var(--accent-cyan)" : "var(--text-secondary)",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: !category ? "600" : "400",
                  cursor: "pointer"
                }}
              >
                All categories
              </button>
              {categories.map((cat) => {
                const isSelected = category === String(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(String(cat.id))}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      textAlign: "left",
                      background: isSelected ? "rgba(0, 229, 255, 0.12)" : "transparent",
                      border: isSelected ? "1px solid rgba(0, 229, 255, 0.3)" : "1px solid transparent",
                      color: isSelected ? "var(--accent-cyan)" : "var(--text-secondary)",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: isSelected ? "600" : "400",
                      cursor: "pointer"
                    }}
                  >
                    <span>{cat.icon} {cat.name}</span>
                    <span className="font-mono" style={{ fontSize: "11px", color: "var(--text-muted)" }}>{cat.job_count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clear filters button */}
          <button 
            type="button" 
            onClick={clearFilters}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "12px",
              cursor: "pointer",
              textAlign: "center",
              marginTop: "8px"
            }}
            onMouseEnter={(e) => e.target.style.color = "var(--text-secondary)"}
            onMouseLeave={(e) => e.target.style.color = "var(--text-muted)"}
          >
            Clear filters
          </button>
        </aside>

        {/* Job list */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          ) : jobs.length === 0 ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
              <EmptyState 
                icon="🔍" 
                title="No jobs match your filters." 
                subtitle="Try clearing your budget search or filtering tags." 
                action={<Link to="/post-job" className="btn btn-primary btn-sm">Post a job →</Link>} 
              />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
              {jobs.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
