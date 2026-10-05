// ============================================================================
// ⚠️ PURANA APP.JSX — COMMENTED OUT
// ============================================================================
// Ye purana AsyncPulse webhook UI hai. Bulk email feature ke saath conflict
// karta hai (different design system, alag API_BASE, alag layout).
//
// Future me agar ise wapas chahiye, to neeche wale code ko uncomment karo
// aur naya code comment kar do.
//
// Chahiye to simply: naya App neeche comment karo, purana uncomment karo.
// ============================================================================

/*
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Radio,
  RefreshCw,
  Send,
  Server,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://127.0.0.1:8000/api';
const DEFAULT_PAYLOAD = `{
  "event": "user_signup",
  "user_id": 101
}`;

async function apiFetch(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonSafely(value) {
  try {
    return { ok: true, data: JSON.parse(value), error: null };
  } catch (err) {
    return { ok: false, data: null, error: err.message };
  }
}

function formatJson(value) {
  if (value == null) return '';
  if (typeof value === 'string') {
    const parsed = parseJsonSafely(value);
    return parsed.ok ? JSON.stringify(parsed.data, null, 2) : value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function isTerminalStatus(status) {
  return status === 'SUCCESS' || status === 'FAILURE';
}

function StatusBadge({ status }) {
  const normalized = (status || '').toUpperCase();

  if (normalized === 'SUCCESS' || normalized === 'HEALTHY') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.25)]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        {normalized === 'HEALTHY' ? 'Healthy' : 'SUCCESS'}
      </span>
    );
  }

  if (normalized === 'PENDING' || normalized === 'STARTED' || normalized === 'RETRY' || normalized === 'RECEIVED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.25)]">
        <RefreshCw className="h-3 w-3 animate-spin" />
        {normalized}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-rose-400 shadow-[0_0_16px_rgba(244,63,94,0.25)]">
      <AlertCircle className="h-3 w-3" />
      {normalized === 'UNHEALTHY' || normalized === 'OFFLINE' || normalized === 'DEGRADED'
        ? 'Offline'
        : normalized || 'Offline'}
    </span>
  );
}

function ServicePill({ icon: Icon, label, value }) {
  const healthy = (value || '').toLowerCase() === 'healthy';

  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
      <Icon className={`h-4 w-4 ${healthy ? 'text-emerald-400' : 'text-rose-400'}`} />
      <span className="text-xs text-slate-400">{label}</span>
      <StatusBadge status={healthy ? 'HEALTHY' : 'OFFLINE'} />
    </div>
  );
}

export default function App() {
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState(null);

  const [targetUrl, setTargetUrl] = useState('https://httpbin.org/post');
  const [payload, setPayload] = useState(DEFAULT_PAYLOAD);
  const [jsonError, setJsonError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const [tasks, setTasks] = useState([]);

  const pendingCount = useMemo(
    () => tasks.filter((task) => !isTerminalStatus(task.status)).length,
    [tasks],
  );

  const checkHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await apiFetch(`${API_BASE}/health/`);
      const data = await res.json().catch(() => null);
      if (!data) {
        throw new Error('Health endpoint returned an empty response.');
      }
      setHealth(data);
    } catch {
      setHealth({
        status: 'unhealthy',
        services: { database: 'offline', redis_broker: 'offline' },
      });
      setHealthError('Unable to reach Django at 127.0.0.1:8000');
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  useEffect(() => {
    const json = parseJsonSafely(payload);
    setJsonError(json.ok ? null : json.error);
  }, [payload]);

  useEffect(() => {
    const activeTasks = tasks.filter((task) => task.status === 'PENDING');
    if (activeTasks.length === 0) return undefined;

    let cancelled = false;

    const poll = async () => {
      await Promise.all(
        activeTasks.map(async (task) => {
          try {
            const res = await apiFetch(`${API_BASE}/task-status/${task.task_id}/`);
            if (!res.ok || cancelled) return;
            const data = await res.json();
            if (data.status === 'PENDING') return;
            setTasks((prev) =>
              prev.map((item) =>
                item.task_id === task.task_id
                  ? {
                      ...item,
                      status: data.status,
                      result: data.result ?? null,
                      error: data.error ?? null,
                    }
                  : item,
              ),
            );
          } catch (err) {
            console.error('Polling error', err);
          }
        }),
      );
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tasks]);

  const handleTriggerWebhook = async (event) => {
    event.preventDefault();
    setFormError(null);

    const parsed = parseJsonSafely(payload);
    if (!parsed.ok) {
      setJsonError(parsed.error);
      setFormError('Fix the JSON payload before dispatching.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch(`${API_BASE}/trigger-webhook/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_url: targetUrl,
          payload: parsed.data,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTasks((prev) => [
          {
            task_id: data.task_id,
            target_url: targetUrl,
            status: 'PENDING',
            result: null,
            error: null,
            created_at: new Date().toLocaleString(),
          },
          ...prev,
        ]);
      } else {
        setFormError(data.error || data.detail || formatJson(data) || `Request failed (${res.status})`);
      }
    } catch {
      setFormError('Failed to connect to Django backend. Ensure it is running on 127.0.0.1:8000.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.12),_transparent_55%)]" />

      <nav className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-blue-500/30 bg-blue-600/20 p-2.5 text-blue-400 shadow-[0_0_24px_rgba(59,130,246,0.2)]">
              <Activity className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">AsyncPulse</h1>
              <p className="text-xs text-slate-400">Asynchronous Webhook &amp; Task Execution Engine</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ServicePill icon={Database} label="Database" value={health?.services?.database} />
            <ServicePill icon={Server} label="Redis" value={health?.services?.redis_broker} />
            <button
              type="button"
              onClick={checkHealth}
              disabled={healthLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        {healthError && (
          <div className="border-t border-rose-900/40 bg-rose-950/40 px-4 py-2 text-center text-xs text-rose-300 sm:px-6">
            {healthError}
          </div>
        )}
      </nav>

      <main className="relative mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-12 sm:px-6">
        <section className="lg:col-span-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md">
            <div className="mb-6 flex items-center gap-2 border-b border-slate-800 pb-4">
              <Send className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-slate-100">Webhook Trigger</h2>
            </div>

            <form onSubmit={handleTriggerWebhook} className="space-y-5">
              <div>
                <label htmlFor="target-url" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                  Target Webhook URL
                </label>
                <input
                  id="target-url"
                  type="url"
                  required
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://example.com/webhook"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="payload" className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                    JSON Payload
                  </label>
                  {jsonError ? (
                    <span className="text-[11px] text-rose-400">Invalid JSON</span>
                  ) : (
                    <span className="text-[11px] text-emerald-400">Valid JSON</span>
                  )}
                </div>
                <textarea
                  id="payload"
                  rows={10}
                  required
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  spellCheck={false}
                  className={`w-full rounded-xl border bg-slate-950 p-3 font-mono text-xs text-emerald-300 outline-none transition focus:ring-2 ${
                    jsonError
                      ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20'
                      : 'border-slate-800 focus:border-blue-500 focus:ring-blue-500/20'
                  }`}
                />
                {jsonError && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-rose-400">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {jsonError}
                  </p>
                )}
              </div>

              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || Boolean(jsonError)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-blue-900/40 transition hover:from-blue-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Dispatching…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Dispatch Task
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        <section className="lg:col-span-7">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl backdrop-blur-md">
            <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-indigo-400" />
                <h2 className="text-lg font-semibold text-slate-100">Live Task Stream</h2>
              </div>
              <span className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-[11px] text-slate-400">
                {pendingCount > 0 ? `Polling ${pendingCount} pending · 3s` : 'Polling idle'}
              </span>
            </div>

            {tasks.length === 0 ? (
              <div className="space-y-3 py-16 text-center text-slate-500">
                <Clock className="mx-auto h-10 w-10 stroke-1" />
                <p className="text-sm">No webhook tasks triggered yet.</p>
                <p className="text-xs text-slate-600">Dispatch a payload to watch execution in real time.</p>
              </div>
            ) : (
              <div className="max-h-[640px] space-y-4 overflow-y-auto pr-1">
                {tasks.map((task) => (
                  <article
                    key={task.task_id}
                    className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4 transition hover:border-slate-700"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[11px] text-slate-500">Task ID: {task.task_id}</p>
                        <p className="mt-1 truncate text-sm font-medium text-slate-200">{task.target_url}</p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                          <Clock className="h-3 w-3" />
                          {task.created_at}
                        </p>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>

                    {task.status === 'SUCCESS' && (
                      <div className="overflow-x-auto rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3">
                        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Result
                        </div>
                        <pre className="font-mono text-xs text-emerald-300">{formatJson(task.result)}</pre>
                      </div>
                    )}

                    {task.status === 'FAILURE' && (
                      <div className="rounded-lg border border-rose-900/40 bg-rose-950/30 p-3">
                        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-rose-400">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Error
                        </div>
                        <p className="font-mono text-xs text-rose-300">{task.error || 'Task failed without an error payload.'}</p>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
*/

// ============================================================================
// ✅ NAYA APP.JSX — BULK EMAIL UI (Active)
// ============================================================================

import Sidebar from './components/Sidebar';
import BulkEmailPage from './pages/BulkEmailPage';
import { ToastProvider } from './components/Toast';
import './App.css';

export default function App() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-bg">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden">
          <BulkEmailPage />
        </main>
      </div>
    </ToastProvider>
  );
}