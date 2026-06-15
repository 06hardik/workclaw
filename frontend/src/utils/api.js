const API_BASE = "/api";

function getAuthHeaders() {
  const wallet = localStorage.getItem("wc_wallet");
  const session = localStorage.getItem("wc_session");
  return {
    "Content-Type": "application/json",
    ...(wallet && { "x-wallet-address": wallet }),
    ...(session && { "x-session-token": session }),
  };
}

async function req(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: getAuthHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  
  const headers = getAuthHeaders();
  delete headers["Content-Type"]; // Let browser set multipart/form-data boundary
  
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers,
    body: formData,
  });
  let data;
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
  return data;
}

export const api = {
  get: (path) => req("GET", path),
  post: (path, body) => req("POST", path, body),
  put: (path, body) => req("PUT", path, body),
  delete: (path) => req("DELETE", path),
};

// ── Auth ──
export const getAuthNonce = () => api.get("/auth/nonce");
export const verifySignature = (message, signature) => api.post("/auth/verify", { message, signature });
export const logout = () => api.post("/auth/logout");

// ── Users ──
export const getMe = () => api.get("/users/me");
export const updateProfile = (data) => api.put("/users/me", data);
export const getUser = (addr) => api.get(`/users/${addr}`);
export const getUserStats = (addr) => api.get(`/users/stats/${addr}`);

// ── Jobs ──
export const getJobs = (params = {}) => {
  const cleaned = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null));
  const q = new URLSearchParams(cleaned).toString();
  return api.get(`/jobs${q ? "?" + q : ""}`);
};
export const getJob = (id) => api.get(`/jobs/${id}`);
export const getMyJobs = () => api.get("/jobs/my-posted");
export const createJob = (data) => api.post("/jobs", data);
export const linkJobOnChain = (id, on_chain_job_id) => api.put(`/jobs/${id}/onchain`, { on_chain_job_id });
export const deleteJob = (id) => api.delete(`/jobs/${id}`);
export const getCategories = () => api.get("/jobs/categories");

// ── Proposals ──
export const getJobProposals = (jobId) => api.get(`/proposals/job/${jobId}`);
export const getMyProposals = () => api.get("/proposals/my-proposals");
export const submitProposal = (data) => api.post("/proposals", data);
export const acceptProposal = (id, data) => api.post(`/proposals/${id}/accept`, data);
export const rejectProposal = (id) => api.post(`/proposals/${id}/reject`);

// ── Contracts ──
export const getMyContracts = () => api.get("/contracts/my-contracts");
export const getContract = (id) => api.get(`/contracts/${id}`);
export const getContractYield = (id) => api.get(`/contracts/${id}/yield`);
export const submitDeliverable = (id, data) => api.post(`/contracts/${id}/submit-deliverable`, data);
export const forceApprove = (id) => api.post(`/contracts/${id}/force-approve`);
export const raiseDispute = (id, reason) => api.post(`/contracts/${id}/raise-dispute`, { reason });
export const resolveDispute = (id, data) => api.post(`/contracts/${id}/resolve-dispute`, data);
export const cancelContract = (id) => api.post(`/contracts/${id}/cancel`);
export const getContractLogs = (id) => api.get(`/contracts/${id}/logs`);
export const getContractMessages = (id) => api.get(`/contracts/${id}/messages`);
export const sendContractMessage = (id, content) => api.post(`/contracts/${id}/messages`, { content });

// ── Stats ──
export const getPlatformStats = () => api.get("/stats/platform");
export const getAgentLogs = () => api.get("/stats/agent-logs");

// ── WebSocket ──
let wsInstance = null;
const wsListeners = new Set();

export function connectWS() {
  if (wsInstance && (wsInstance.readyState === WebSocket.OPEN || wsInstance.readyState === WebSocket.CONNECTING)) {
    return wsInstance;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  wsInstance = new WebSocket(`${protocol}//${window.location.host}/ws`);
  wsInstance.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      wsListeners.forEach((fn) => fn(data));
    } catch {}
  };
  wsInstance.onclose = () => {
    setTimeout(connectWS, 3000);
  };
  return wsInstance;
}

export function onWsMessage(fn) {
  wsListeners.add(fn);
  return () => wsListeners.delete(fn);
}
