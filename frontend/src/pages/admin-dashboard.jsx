import { useNavigate } from "react-router-dom";
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Shield, LayoutDashboard, Ban, Settings, Activity,
  ShieldAlert, ShieldCheck, Bell, Save, PlayCircle,
  AlertOctagon, CheckCircle, XCircle, Plus, RefreshCw, Zap
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${localStorage.getItem("token")}`
  };
}

function getAdminName() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return "Admin";
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.username || "Admin";
  } catch {
    return "Admin";
  }
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const adminName = getAdminName();

  useEffect(() => {
    if (localStorage.getItem("role") !== "ADMIN") navigate("/dashboard");
  }, []);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Data
  const [metrics, setMetrics] = useState({ totalLogs: 0, activeBlocks: 0, failedAttempts: 0, whitelisted: 0, status: 'Active' });
  const [liveLogs, setLiveLogs] = useState([]);
  const [blacklistedIPs, setBlacklistedIPs] = useState([]);
  const [whitelistedIPs, setWhitelistedIPs] = useState([]);

  // Notifications for sidebar
  const [notifications, setNotifications] = React.useState([]);
  const prevBlacklistRef = React.useRef([]);

  // Config
  const [config, setConfig] = useState({ max_failed_attempts: 5, block_duration_minutes: 30 });
  const [configSaved, setConfigSaved] = useState('');

  // Blacklist form
  const [newBlacklistIP, setNewBlacklistIP] = useState('');
  const [newBlacklistReason, setNewBlacklistReason] = useState('');
  const [newWhitelistIP, setNewWhitelistIP] = useState('');

  // Simulation
  const [simIP, setSimIP] = useState('');
  const [simUsername, setSimUsername] = useState('attacker');
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);

  // Chart hover state
  const [hoveredChartIndex, setHoveredChartIndex] = useState(null);

  // ─── API Fetchers ───────────────────────────────────────────────────────────

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/metrics`, { headers: authHeaders() });
      if (res.ok) setMetrics(await res.json());
    } catch {}
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/logs`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        // Sort by login_time descending — handles both "2026-03-16 HH:MM:SS" and ISO "2026-03-16THH:MM:SS+00:00" formats
        data.sort((a, b) => {
          const toMs = t => new Date(t.replace(" ", "T") + (t.includes("+") || t.endsWith("Z") ? "" : "Z")).getTime();
          const ta = toMs(a.login_time);
          const tb = toMs(b.login_time);
          return tb - ta;
        });
        setLiveLogs(data);
      }
    } catch {}
  }, []);

  const fetchBlacklist = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/blacklist`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setBlacklistedIPs(data);
        // Detect newly auto-blocked IPs and create notifications
        const prevIPs = prevBlacklistRef.current.map(x => x.ip_address);
        const newlyBlocked = data.filter(x => x.auto_blocked && !prevIPs.includes(x.ip_address));
        if (newlyBlocked.length > 0) {
          setNotifications(prev => {
            const next = [...newlyBlocked.map(x => ({
              id: x._id,
              ip: x.ip_address,
              reason: x.reason,
              time: x.blocked_at
            })), ...prev].slice(0, 5);
            return next;
          });
        }
        prevBlacklistRef.current = data;
      }
    } catch {}
  }, []);

  const fetchWhitelist = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/whitelist`, { headers: authHeaders() });
      if (res.ok) setWhitelistedIPs(await res.json());
    } catch {}
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/config`, { headers: authHeaders() });
      if (res.ok) setConfig(await res.json());
    } catch {}
  }, []);

  const refreshAll = useCallback(() => {
    fetchMetrics(); fetchLogs(); fetchBlacklist(); fetchWhitelist();
  }, [fetchMetrics, fetchLogs, fetchBlacklist, fetchWhitelist]);

  useEffect(() => {
    refreshAll();
    fetchConfig();
    const interval = setInterval(refreshAll, 8000);
    return () => clearInterval(interval);
  }, [refreshAll, fetchConfig]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleAddBlacklist = async (e) => {
    e.preventDefault();
    if (!newBlacklistIP.trim()) return;
    await fetch(`${API}/api/admin/blacklist`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ ip_address: newBlacklistIP.trim(), reason: newBlacklistReason.trim() || "Manually Blocked" })
    });
    setNewBlacklistIP(''); setNewBlacklistReason('');
    refreshAll();
  };

  const handleAddWhitelist = async (e) => {
    e.preventDefault();
    if (!newWhitelistIP.trim()) return;
    await fetch(`${API}/api/admin/whitelist`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ ip_address: newWhitelistIP.trim() })
    });
    setNewWhitelistIP('');
    refreshAll();
  };

  const handleWhitelistIP = async (ip) => {
    await fetch(`${API}/api/admin/whitelist`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ ip_address: ip })
    });
    refreshAll();
  };

  const handleBlacklistIP = async (ip) => {
    await fetch(`${API}/api/admin/blacklist`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ ip_address: ip, reason: "Manually Blocked" })
    });
    refreshAll();
  };

  const handleRemoveBlacklist = async (ip) => {
    await fetch(`${API}/api/admin/blacklist/${encodeURIComponent(ip)}`, {
      method: "DELETE", headers: authHeaders()
    });
    refreshAll();
  };

  const handleRemoveWhitelist = async (ip) => {
    await fetch(`${API}/api/admin/whitelist/${encodeURIComponent(ip)}`, {
      method: "DELETE", headers: authHeaders()
    });
    refreshAll();
  };

  const handleSaveConfig = async () => {
    setConfigSaved('');
    const res = await fetch(`${API}/api/admin/config`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify(config)
    });
    const data = await res.json();
    setConfigSaved(data.message || 'Saved');
    setTimeout(() => setConfigSaved(''), 3000);
  };

  // MAIN: Simulation — calls real backend API
  const handleSimulate = async (status) => {
    setSimLoading(true);
    setSimResult(null);
    try {
      const ip = simIP.trim() || '10.0.0.99';
      const res = await fetch(`${API}/api/admin/simulate`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ ip_address: ip, status, username: simUsername.trim() || 'attacker' })
      });
      const data = await res.json();
      setSimResult({ ...data, type: status });
      refreshAll();
    } catch (err) {
      setSimResult({ message: 'Request failed', type: 'ERROR' });
    }
    setSimLoading(false);
  };

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    setIsTransitioning(true);
    setTimeout(() => { setActiveTab(tab); setIsTransitioning(false); }, 150);
  };

  // ─── Sub-components ────────────────────────────────────────────────────────

  const SidebarItem = ({ icon: Icon, label, id }) => {
    const isActive = activeTab === id;
    return (
      <button onClick={() => handleTabChange(id)}
        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-[#111827] text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
        <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
        <span className="font-medium text-sm tracking-wide">{label}</span>
      </button>
    );
  };

  const Header = ({ title, subtitle }) => (
    <div className="flex justify-between items-start mb-8">
      <div>
        <h1 className="text-3xl font-serif italic text-slate-800 tracking-wide mb-1">{title}</h1>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="flex items-center space-x-3">
        <button onClick={refreshAll} title="Refresh"
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <RefreshCw size={18} />
        </button>
        <div className="text-right">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Admin Session</p>
          <p className="text-sm font-bold text-slate-800">{adminName}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-sm shadow-sm">{adminName.charAt(0).toUpperCase()}</div>
      </div>
    </div>
  );

  const statusBadge = (status) => {
    const map = {
      SUCCESS: 'bg-green-50 text-green-700',
      FAILED: 'bg-red-50 text-red-700',
      BLOCKED: 'bg-orange-50 text-orange-700',
    };
    return `inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${map[status] || 'bg-slate-50 text-slate-600'}`;
  };

  // ─── Views ─────────────────────────────────────────────────────────────────

  // ─── Chart Data: bucket logs into 12 time slots ────────────────────────────
  const chartData = useMemo(() => {
    const nowMs = Date.now();
    const slots = 12;
    const intervalMs = 30 * 60 * 1000;
    const windowStartMs = nowMs - slots * intervalMs;

    const buckets = Array.from({ length: slots }, (_, i) => {
      const slotEndMs = windowStartMs + (i + 1) * intervalMs;
      const t = new Date(slotEndMs);
      return { time: t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), success: 0, failed: 0 };
    });

    liveLogs.forEach(log => {
      const s = log.login_time;
      // MongoDB stores as UTC. Backend serialize_doc converts datetime objects to IST string,
      // but if the value comes back as a plain string like "2026-03-17 16:50:06" it is UTC.
      // Detect: if string has no timezone suffix and hour < browser local hour by ~5.5h, it is UTC.
      // Safest: always parse as UTC (append Z) then compare against browser UTC timestamps.
      const normalized = s.replace(" ", "T") + (s.includes("+") || s.endsWith("Z") ? "" : "Z");
      const logMs = new Date(normalized).getTime();
      if (isNaN(logMs) || logMs < windowStartMs) return;
      const slotIndex = Math.min(slots - 1, Math.floor((logMs - windowStartMs) / intervalMs));
      if (log.status === 'SUCCESS') buckets[slotIndex].success++;
      else if (log.status === 'FAILED') buckets[slotIndex].failed++;
    });

    return buckets;
  }, [liveLogs]);

  // ─── LiveChart Component ───────────────────────────────────────────────────
  const LiveChart = () => {
    const maxVal = Math.max(4, ...chartData.map(d => Math.max(d.success, d.failed)));
    const W = 600, H = 200, PAD = { top: 16, right: 16, bottom: 32, left: 32 };
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    const xPos = (i) => PAD.left + (i / (chartData.length - 1)) * plotW;
    const yPos = (v) => PAD.top + plotH - (v / maxVal) * plotH;

    const buildPath = (key) =>
      chartData.map((d, i) => `${i === 0 ? 'M' : 'L'}${xPos(i)},${yPos(d[key])}`).join(' ');

    const buildArea = (key, base) =>
      `${buildPath(key)} L${xPos(chartData.length - 1)},${PAD.top + plotH} L${PAD.left},${PAD.top + plotH} Z`;

    const yGridLines = [0, 0.25, 0.5, 0.75, 1].map(f => ({
      y: PAD.top + plotH * (1 - f),
      label: Math.round(f * maxVal)
    }));

    return (
      <div className="flex-1 w-full relative min-h-[200px]" style={{ minHeight: 200 }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
          {/* Grid lines */}
          {yGridLines.map((g, i) => (
            <g key={i}>
              <line x1={PAD.left} y1={g.y} x2={W - PAD.right} y2={g.y}
                stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4,4" />
              <text x={PAD.left - 4} y={g.y + 4} textAnchor="end"
                fontSize="9" fill="#94a3b8">{g.label}</text>
            </g>
          ))}

          {/* Areas */}
          <defs>
            <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="failedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={buildArea('success')} fill="url(#successGrad)" />
          <path d={buildArea('failed')} fill="url(#failedGrad)" />

          {/* Lines */}
          <path d={buildPath('success')} fill="none" stroke="#22c55e" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
          <path d={buildPath('failed')} fill="none" stroke="#ef4444" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />

          {/* Hover vertical line */}
          {hoveredChartIndex !== null && (
            <line
              x1={xPos(hoveredChartIndex)} y1={PAD.top}
              x2={xPos(hoveredChartIndex)} y2={PAD.top + plotH}
              stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4,2"
            />
          )}

          {/* Hover dots */}
          {hoveredChartIndex !== null && chartData[hoveredChartIndex] && (
            <>
              <circle cx={xPos(hoveredChartIndex)} cy={yPos(chartData[hoveredChartIndex].success)}
                r="4" fill="#22c55e" stroke="white" strokeWidth="2" />
              <circle cx={xPos(hoveredChartIndex)} cy={yPos(chartData[hoveredChartIndex].failed)}
                r="4" fill="#ef4444" stroke="white" strokeWidth="2" />
            </>
          )}

          {/* X-axis labels */}
          {chartData.map((d, i) => (
            (i % 2 === 0) && (
              <text key={i} x={xPos(i)} y={H - 4} textAnchor="middle"
                fontSize="9" fill="#94a3b8">{d.time}</text>
            )
          ))}

          {/* Invisible hover zones */}
          {chartData.map((_, i) => (
            <rect key={i}
              x={i === 0 ? PAD.left : (xPos(i - 1) + xPos(i)) / 2}
              y={PAD.top}
              width={i === 0 || i === chartData.length - 1
                ? plotW / (chartData.length - 1) / 2
                : (xPos(i + 1) - xPos(i - 1)) / 2}
              height={plotH}
              fill="transparent"
              style={{ cursor: 'crosshair' }}
              onMouseEnter={() => setHoveredChartIndex(i)}
              onMouseLeave={() => setHoveredChartIndex(null)}
            />
          ))}
        </svg>

        {/* Tooltip */}
        {hoveredChartIndex !== null && chartData[hoveredChartIndex] && (() => {
          const d = chartData[hoveredChartIndex];
          const pct = hoveredChartIndex / (chartData.length - 1);
          return (
            <div
              className="absolute z-20 pointer-events-none bg-[#111827] text-white rounded-lg shadow-xl p-2.5 text-xs w-max"
              style={{
                bottom: '28px',
                left: `clamp(8px, ${pct * 100}%, calc(100% - 120px))`,
                transform: 'translateX(-50%)'
              }}
            >
              <div className="font-semibold text-slate-200 border-b border-slate-700 pb-1.5 mb-1.5 flex justify-between gap-4">
                <span>Time</span><span>{d.time}</span>
              </div>
              <div className="flex flex-col gap-1 font-medium">
                <span className="flex items-center text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-2"></span>
                  Success: {d.success}
                </span>
                <span className="flex items-center text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-2"></span>
                  Failed: {d.failed}
                </span>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  const renderDashboard = () => (
    <div className={`space-y-6 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
      <Header title="Security Overview" subtitle="Real-time IP monitoring — automatic blocking active." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: 'Total Logs', value: metrics.totalLogs, icon: Activity, color: 'text-blue-500' },
          { title: 'Active Blocks', value: metrics.activeBlocks, icon: Ban, color: 'text-red-500' },
          { title: 'Failed (24h)', value: metrics.failedAttempts, icon: ShieldAlert, color: 'text-amber-500' },
          { title: 'Whitelisted', value: metrics.whitelisted, icon: ShieldCheck, color: 'text-green-500' },
        ].map((m, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <m.icon size={22} className={`${m.color} mb-3`} strokeWidth={1.5} />
            <p className="text-xs text-slate-500 font-medium mb-1">{m.title}</p>
            <p className="text-3xl font-bold text-slate-800">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Live Access Trends Chart */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="font-serif italic text-slate-700 text-lg">Access Trends</h3>
            <p className="text-xs text-slate-400 mt-0.5">Last 6 hours · 30-min intervals</p>
          </div>
          <div className="flex items-center space-x-4 text-xs font-medium text-slate-500">
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>SUCCESS</span>
            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>FAILED</span>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse ml-2" title="Live"></div>
          </div>
        </div>
        <LiveChart />
      </div>

      {/* Live Auto-block Status */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shrink-0"></div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Auto-Block Engine: Active</p>
          <p className="text-xs text-slate-500">
            Blocking IPs after <strong>{config.max_failed_attempts}</strong> failed attempts within{' '}
            <strong>{config.block_duration_minutes} minutes</strong>.
            Currently <strong>{metrics.activeBlocks}</strong> blocked IPs.
          </p>
        </div>
        <button onClick={() => handleTabChange('settings')}
          className="ml-auto text-xs text-slate-500 hover:text-slate-800 border border-slate-200 px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors shrink-0">
          Configure
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-serif italic text-slate-700 text-lg">Live Access Log</h3>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Real-time Feed · Last 100</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <th className="pb-3 font-semibold">Timestamp</th>
                <th className="pb-3 font-semibold">IP Address</th>
                <th className="pb-3 font-semibold">Username</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Simulated</th>
              </tr>
            </thead>
            <tbody>
              {liveLogs.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-12 text-slate-400 italic">No logs yet.</td></tr>
              ) : liveLogs.map(log => (
                <tr key={log._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="py-3 text-slate-500 text-xs">{log.login_time}</td>
                  <td className="py-3 font-mono text-slate-700">{log.ip_address}</td>
                  <td className="py-3 text-slate-600">{log.username}</td>
                  <td className="py-3"><span className={statusBadge(log.status)}>{log.status}</span></td>
                  <td className="py-3 text-slate-400 text-xs">{log.simulated ? '⚡ sim' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderBlacklist = () => (
    <div className={`space-y-6 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
      <Header title="Blacklist Management" subtitle="Manage blocked and allowed IP addresses." />

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-serif italic text-slate-700 text-lg mb-4 flex items-center">
          <Plus size={18} className="text-red-500 mr-2" />Add to Blacklist
        </h3>
        <form onSubmit={handleAddBlacklist} className="flex gap-3 flex-wrap">
          <input value={newBlacklistIP} onChange={e => setNewBlacklistIP(e.target.value)}
            placeholder="IP Address (e.g. 192.168.1.1)"
            className="flex-1 min-w-[200px] p-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#111827]" />
          <input value={newBlacklistReason} onChange={e => setNewBlacklistReason(e.target.value)}
            placeholder="Reason (optional)"
            className="flex-1 min-w-[180px] p-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#111827]" />
          <button type="submit"
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-lg text-sm font-medium transition-colors">
            Block IP
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex justify-between items-center border-b border-slate-50 pb-4 mb-5">
          <h3 className="flex items-center font-serif italic text-slate-700 text-lg">
            <AlertOctagon size={18} className="text-red-500 mr-2" />Blacklisted IPs
          </h3>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">{blacklistedIPs.length} active</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <th className="pb-3 font-semibold">IP Address</th>
                <th className="pb-3 font-semibold">Reason</th>
                <th className="pb-3 font-semibold">Blocked At</th>
                <th className="pb-3 font-semibold">Type</th>
                <th className="pb-3 font-semibold text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {blacklistedIPs.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-12 text-slate-400 italic">No blacklisted IPs.</td></tr>
              ) : blacklistedIPs.map(item => (
                <tr key={item._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="py-4 font-mono text-slate-700">{item.ip_address}</td>
                  <td className="py-4 text-slate-500 text-xs max-w-[200px]">{item.reason}</td>
                  <td className="py-4 text-slate-500 text-xs">{item.blocked_at}</td>
                  <td className="py-4">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${item.auto_blocked ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'}`}>
                      {item.auto_blocked ? 'AUTO' : 'MANUAL'}
                    </span>
                  </td>
                  <td className="py-4 text-right space-x-2">
                    <button onClick={() => handleWhitelistIP(item.ip_address)}
                      className="inline-flex items-center text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-md transition-colors">
                      <CheckCircle size={13} className="mr-1" />Whitelist
                    </button>
                    <button onClick={() => handleRemoveBlacklist(item.ip_address)}
                      className="inline-flex items-center text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-md transition-colors">
                      <XCircle size={13} className="mr-1" />Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-serif italic text-slate-700 text-lg mb-4 flex items-center">
          <Plus size={18} className="text-emerald-500 mr-2" />Add to Whitelist
        </h3>
        <form onSubmit={handleAddWhitelist} className="flex gap-3">
          <input value={newWhitelistIP} onChange={e => setNewWhitelistIP(e.target.value)}
            placeholder="IP Address (e.g. 192.168.1.1)"
            className="flex-1 p-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#111827]" />
          <button type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-lg text-sm font-medium transition-colors">
            Allow IP
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex justify-between items-center border-b border-slate-50 pb-4 mb-5">
          <h3 className="flex items-center font-serif italic text-slate-700 text-lg">
            <ShieldCheck size={18} className="text-emerald-500 mr-2" />Whitelisted IPs
          </h3>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">{whitelistedIPs.length} allowed</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <th className="pb-3 font-semibold">IP Address</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Last Access</th>
                <th className="pb-3 font-semibold text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {whitelistedIPs.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-12 text-slate-400 italic">No whitelisted IPs.</td></tr>
              ) : whitelistedIPs.map(item => (
                <tr key={item._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="py-4 font-mono text-slate-700">{item.ip_address}</td>
                  <td className="py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">{item.status}</span>
                  </td>
                  <td className="py-4 text-slate-500 text-xs">{item.last_access}</td>
                  <td className="py-4 text-right">
                    <button onClick={() => handleBlacklistIP(item.ip_address)}
                      className="inline-flex items-center text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors">
                      <XCircle size={13} className="mr-1" />Blacklist
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className={`space-y-6 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
      <Header title="System Configuration" subtitle="Tune auto-block thresholds and run live attack simulations." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Config */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8">
          <h3 className="flex items-center font-serif italic text-slate-700 text-lg mb-6">
            <Settings size={18} className="text-slate-400 mr-2" />Security Thresholds
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">
                Max Failed Attempts Before Block
              </label>
              <input type="number" min="1" max="100"
                value={config.max_failed_attempts}
                onChange={e => setConfig(p => ({ ...p, max_failed_attempts: parseInt(e.target.value) || 5 }))}
                className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#111827]" />
              <p className="mt-2 text-xs text-slate-400">IPs are auto-blocked after this many failures.</p>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">
                Monitoring Window (Minutes)
              </label>
              <input type="number" min="1" max="1440"
                value={config.block_duration_minutes}
                onChange={e => setConfig(p => ({ ...p, block_duration_minutes: parseInt(e.target.value) || 30 }))}
                className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#111827]" />
              <p className="mt-2 text-xs text-slate-400">Failed attempts are counted within this window.</p>
            </div>
            {configSaved && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-100 px-4 py-2 rounded-lg">{configSaved}</p>
            )}
            <button onClick={handleSaveConfig}
              className="w-full bg-[#111827] hover:bg-slate-700 text-white py-3 px-4 rounded-lg flex items-center justify-center font-medium transition-colors shadow-sm">
              <Save size={16} className="mr-2" />Save Configuration
            </button>
          </div>
        </div>

        {/* Simulation */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8">
          <h3 className="flex items-center font-serif italic text-slate-700 text-lg mb-6">
            <Zap size={18} className="text-amber-500 mr-2" />Attack Simulation
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">Target IP</label>
              <input type="text" value={simIP} onChange={e => setSimIP(e.target.value)}
                placeholder="e.g. 10.0.0.99  (blank = 10.0.0.99)"
                className="w-full p-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#111827]" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">Simulated Username</label>
              <input type="text" value={simUsername} onChange={e => setSimUsername(e.target.value)}
                placeholder="attacker"
                className="w-full p-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#111827]" />
            </div>

            {/* Result card */}
            {simResult && (
              <div className={`p-4 rounded-lg border text-sm ${simResult.auto_blocked ? 'bg-red-50 border-red-200 text-red-800' : simResult.type === 'SUCCESS' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                <p className="font-semibold mb-1">{simResult.message}</p>
                {simResult.type === 'FAILED' && (
                  <div className="text-xs space-y-0.5 mt-2">
                    <p>Failed attempts in window: <strong>{simResult.failed_attempts_in_window}</strong> / {simResult.max_failed_attempts}</p>
                    {simResult.auto_blocked
                      ? <p className="text-red-700 font-bold mt-1">🚫 IP AUTO-BLOCKED by system!</p>
                      : <p>Attempts remaining before block: <strong>{simResult.attempts_remaining}</strong></p>
                    }
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button onClick={() => handleSimulate('SUCCESS')} disabled={simLoading}
                className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 py-3 px-4 rounded-lg font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                <CheckCircle size={16} />Simulate Success
              </button>
              <button onClick={() => handleSimulate('FAILED')} disabled={simLoading}
                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-3 px-4 rounded-lg font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                <XCircle size={16} />Simulate Failure
              </button>
            </div>
            <p className="text-center text-xs text-slate-400 italic">
              Click "Simulate Failure" {config.max_failed_attempts}× to trigger auto-block on the target IP.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Layout ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans text-slate-900">
      <aside className="w-64 bg-white border-r border-slate-100 flex flex-col justify-between shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
        <div>
          <div className="h-20 flex items-center px-6 border-b border-slate-50 mb-6">
            <div className="bg-[#111827] p-2 rounded-lg mr-3 shadow-md flex items-center justify-center" style={{width:'40px',height:'40px'}}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="26" height="26">
                <path d="M16 2 L28 7 L28 17 C28 23.5 22.5 28.5 16 31 C9.5 28.5 4 23.5 4 17 L4 7 Z" fill="#111827"/>
                <path d="M16 5 L25 9 L25 17 C25 22 21 26.2 16 28.2 C11 26.2 7 22 7 17 L7 9 Z" fill="#1f2937"/>
                <path d="M11 16 L14.5 19.5 L21 13" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="16" cy="10" r="2" fill="#6366f1" opacity="0.7"/>
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-[#111827] tracking-tight leading-tight">IP SENTINEL</h2>
              <p className="text-[9px] text-slate-400 font-bold tracking-[0.2em] uppercase">Security Core</p>
            </div>
          </div>
          <nav className="px-4 space-y-1">
            <SidebarItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <SidebarItem id="blacklist" icon={Ban} label="Blacklist" />
            <div className="h-px w-full bg-slate-100 my-2"></div>
            <SidebarItem id="settings" icon={Settings} label="Settings & Simulation" />
          </nav>
        </div>
        <div className="p-4 mb-4 space-y-3">
          {/* Status summary */}
          <div className={`border p-3 rounded-xl ${metrics.activeBlocks > 0 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'}`}>
            <div className={`flex items-center mb-1 ${metrics.activeBlocks > 0 ? 'text-red-700' : 'text-blue-700'}`}>
              <Bell size={13} className="mr-2" />
              <span className="font-semibold text-xs uppercase tracking-wide">System Alert</span>
            </div>
            <p className={`text-xs leading-relaxed ${metrics.activeBlocks > 0 ? 'text-red-600' : 'text-blue-600/80'}`}>
              {metrics.activeBlocks > 0
                ? `🚫 ${metrics.activeBlocks} IP(s) currently blocked.`
                : '✅ No active blocks.'}{' '}
              {metrics.failedAttempts > 0 && `${metrics.failedAttempts} failed attempt(s) in 24h.`}
            </p>
          </div>
          {/* Auto-block notifications */}
          {notifications.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">🔔 Auto-Blocked</span>
                <button onClick={() => setNotifications([])} className="text-[10px] text-orange-400 hover:text-orange-600">Clear</button>
              </div>
              <div className="space-y-2">
                {notifications.map((n, i) => (
                  <div key={i} className="bg-white border border-orange-100 rounded-lg px-2 py-2">
                    <p className="text-xs font-mono font-semibold text-slate-700">{n.ip}</p>
                    <p className="text-[10px] text-orange-600 mt-0.5 leading-snug">{n.reason}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-7xl mx-auto p-8 lg:p-10">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'blacklist' && renderBlacklist()}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </main>
    </div>
  );
}