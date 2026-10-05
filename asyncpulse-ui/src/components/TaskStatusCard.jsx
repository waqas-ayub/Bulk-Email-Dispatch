import { useEffect, useState, useRef } from 'react';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  Mail,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { getTaskStatus, isTerminalStatus, TaskStatus } from '../api/bulkEmail';

const POLL_INTERVAL = 2000;
const HISTORY_KEY = 'asyncpulse_bulk_email_history';
const HISTORY_LIMIT = 5;

const STATUS_CONFIG = {
  [TaskStatus.PENDING]: {
    label: 'Pending',
    icon: Clock,
    className: 'badge-neutral',
    color: 'text-white/60',
  },
  [TaskStatus.STARTED]: {
    label: 'Sending',
    icon: Loader2,
    className: 'badge-info',
    color: 'text-info',
    spin: true,
  },
  [TaskStatus.SUCCESS]: {
    label: 'Delivered',
    icon: CheckCircle2,
    className: 'badge-success',
    color: 'text-success',
    glow: 'glow-success',
  },
  [TaskStatus.FAILURE]: {
    label: 'Failed',
    icon: XCircle,
    className: 'badge-error',
    color: 'text-error',
    glow: 'glow-error',
  },
  [TaskStatus.RETRY]: {
    label: 'Retrying',
    icon: AlertTriangle,
    className: 'badge-warning',
    color: 'text-warning',
  },
};

export default function TaskStatusCard({ task }) {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const pollRef = useRef(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  // Poll the current task
  useEffect(() => {
    if (!task?.task_id) {
      setStatus(null);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const data = await getTaskStatus(task.task_id);
        if (cancelled) return;
        setStatus(data);

        if (isTerminalStatus(data.status)) {
          clearInterval(pollRef.current);
          // Save to history
          const entry = {
            task_id: task.task_id,
            status: data.status,
            recipients: task.recipients,
            subject: task.subject || '',
            timestamp: Date.now(),
            result: data.result,
            error: data.error,
          };
          const updated = [entry, ...history.filter((h) => h.task_id !== task.task_id)].slice(
            0,
            HISTORY_LIMIT
          );
          setHistory(updated);
          localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        }
      } catch (err) {
        if (cancelled) return;
        setStatus({
          task_id: task.task_id,
          status: 'FAILURE',
          error: err.message || 'Failed to fetch task status',
        });
        clearInterval(pollRef.current);
      }
    };

    // Immediate poll
    poll();
    // Then interval
    pollRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.task_id]);

  const handleCopy = async (id) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Current Task */}
      <CurrentTaskCard task={task} status={status} onCopy={handleCopy} copiedId={copiedId} />

      {/* History */}
      {history.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-white/50">
              Recent Tasks
            </h3>
            <button
              onClick={() => {
                setHistory([]);
                localStorage.removeItem(HISTORY_KEY);
              }}
              className="text-[10px] text-white/40 hover:text-error transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-2">
            {history.map((h) => (
              <HistoryRow key={h.task_id} entry={h} onCopy={handleCopy} copiedId={copiedId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Current task ---------- */

function CurrentTaskCard({ task, status, onCopy, copiedId }) {
  if (!task) {
    return (
      <div className="card p-6 flex flex-col items-center justify-center text-center min-h-[280px]">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
          <Mail className="w-6 h-6 text-white/30" strokeWidth={1.75} />
        </div>
        <p className="text-sm font-medium text-white/70 mb-1">No active task</p>
        <p className="text-xs text-white/40 max-w-[220px]">
          Compose and send a bulk email to see live task progress here.
        </p>
      </div>
    );
  }

  const currentStatus = status?.status || TaskStatus.PENDING;
  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG[TaskStatus.PENDING];
  const Icon = config.icon;
  const isSpinning = config.spin;
  const isSuccess = currentStatus === TaskStatus.SUCCESS;
  const isFailure = currentStatus === TaskStatus.FAILURE;

  return (
    <div
      className={`card p-5 transition-all duration-500 ${
        isSuccess ? 'glow-success border-success/30' : ''
      } ${isFailure ? 'glow-error border-error/30' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-white/50">
          Current Task
        </h3>
        <span className={`badge ${config.className} text-[11px]`}>
          <Icon className={`w-3 h-3 ${isSpinning ? 'animate-spin' : ''}`} />
          {config.label}
        </span>
      </div>

      {/* Task ID */}
      <div className="mb-4">
        <span className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">
          Task ID
        </span>
        <button
          onClick={() => onCopy(task.task_id)}
          className="group w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-bg-elevated border border-white/5 hover:border-white/10 transition-colors text-left"
        >
          <code className="text-[11px] font-mono text-white/70 truncate">
            {task.task_id}
          </code>
          {copiedId === task.task_id ? (
            <Check className="w-3.5 h-3.5 text-success shrink-0" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-white/40 group-hover:text-white shrink-0 transition-colors" />
          )}
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <MetricBox icon={Users} label="Recipients" value={task.recipients} />
        <MetricBox
          icon={isSuccess ? CheckCircle2 : isFailure ? XCircle : Clock}
          label="Status"
          value={currentStatus}
          valueClass={config.color}
        />
      </div>

      {/* Subject preview */}
      {task.subject && (
        <div className="mb-4">
          <span className="text-[10px] uppercase tracking-wider text-white/40 block mb-1">
            Subject
          </span>
          <p className="text-xs text-white/70 line-clamp-2">{task.subject}</p>
        </div>
      )}

      {/* Result / error */}
      {isSuccess && status?.result && (
        <div className="rounded-lg bg-success/5 border border-success/20 p-3">
          <p className="text-xs text-success font-medium">
            ✓ Delivered to {status.result.sent ?? task.recipients} recipient
            {(status.result.sent ?? task.recipients) !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {isFailure && (
        <div className="rounded-lg bg-error/5 border border-error/20 p-3">
          <p className="text-[10px] uppercase tracking-wider text-error/70 font-semibold mb-1">
            Error
          </p>
          <p className="text-xs text-error/90 break-words">
            {status?.error || 'Task failed'}
          </p>
        </div>
      )}

      {/* Progress indicator when active */}
      {!isTerminalStatus(currentStatus) && (
        <div className="mt-4 h-1 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full w-1/3 bg-gradient-to-r from-primary to-info animate-[shimmer_2s_linear_infinite] rounded-full" />
        </div>
      )}
    </div>
  );
}

function MetricBox({ icon: Icon, label, value, valueClass = 'text-white' }) {
  return (
    <div className="rounded-lg bg-bg-elevated border border-white/5 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-white/40" />
        <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">
          {label}
        </span>
      </div>
      <p className={`text-lg font-bold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

/* ---------- History ---------- */

function HistoryRow({ entry, onCopy, copiedId }) {
  const config = STATUS_CONFIG[entry.status] || STATUS_CONFIG[TaskStatus.PENDING];
  const Icon = config.icon;
  const time = new Date(entry.timestamp);
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <button
      onClick={() => onCopy(entry.task_id)}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left group"
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/80 truncate">
          {entry.subject || 'Untitled email'}
        </p>
        <p className="text-[10px] text-white/40 truncate">
          {entry.recipients} recipient{entry.recipients !== 1 ? 's' : ''} · {timeStr}
        </p>
      </div>
      {copiedId === entry.task_id ? (
        <Check className="w-3 h-3 text-success shrink-0" />
      ) : (
        <Copy className="w-3 h-3 text-white/30 group-hover:text-white/60 shrink-0 transition-colors" />
      )}
    </button>
  );
}