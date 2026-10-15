import { useState, useEffect } from 'react';
import {
  Mail,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { getSenders } from '../api/bulkEmail';
import { useToast } from '../components/Toast';
import SenderSelect from '../components/SenderSelect';

export default function SendersPage() {
  const toast = useToast();
  const [senders, setSenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadSenders = async () => {
    try {
      setLoading(true);
      const data = await getSenders();
      setSenders(Array.isArray(data) ? data : data.senders || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load senders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSenders();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this sender? This action cannot be undone.')) {
      return;
    }
    toast.info('Delete feature coming soon.');
  };

  const handleAddSuccess = () => {
    setShowAddForm(false);
    loadSenders();
    toast.success('Sender added! Awaiting admin approval.', 'Submitted');
  };

  const approved = senders.filter((s) => s.status === 'approved');
  const pending = senders.filter((s) => s.status === 'pending');
  const rejected = senders.filter((s) => s.status === 'rejected');

  const MAX_SENDERS = 3;
  const canAddMore = senders.length < MAX_SENDERS;

  if (loading) {
    return (
      <div className="min-h-screen bg-bg bg-grid bg-radial-glow p-8">
        <div className="max-w-4xl mx-auto">
          <div className="card p-8 flex items-center justify-center gap-3 text-white/40">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading senders...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg bg-grid bg-radial-glow">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-primary to-info" />
              <h1 className="text-3xl font-bold tracking-tight text-gradient">
                My Senders
              </h1>
            </div>
            <p className="text-sm text-white/50 ml-4 max-w-xl">
              Manage your sender email addresses. Each sender must be approved
              by admin before use.
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 animate-fade-in">
          <StatBox
            label="Total"
            value={senders.length}
            max={MAX_SENDERS}
            icon={Mail}
            accent="primary"
          />
          <StatBox
            label="Approved"
            value={approved.length}
            icon={CheckCircle2}
            accent="success"
          />
          <StatBox
            label="Pending"
            value={pending.length}
            icon={Clock}
            accent="warning"
          />
          <StatBox
            label="Rejected"
            value={rejected.length}
            icon={XCircle}
            accent="error"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Failed to load senders</p>
              <p className="text-xs opacity-80 mt-0.5">{error}</p>
            </div>
            <button
              onClick={loadSenders}
              className="text-xs underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Add Sender Section */}
        {showAddForm ? (
          <div className="mb-8 animate-fade-in">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Add New Sender
                </h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-white/40 hover:text-white transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
              <SenderSelect
                mode="add"
                onChange={() => {}}
                onSenderAdded={handleAddSuccess}
              />
            </div>
          </div>
        ) : (
          canAddMore && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full mb-8 flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all duration-200 group"
            >
              <Plus className="w-5 h-5 text-primary-hover" />
              <span className="font-medium text-white">Add New Sender</span>
              <span className="text-xs text-white/40 ml-2">
                ({MAX_SENDERS - senders.length} left)
              </span>
            </button>
          )
        )}

        {/* Approved Section */}
        <Section
          title="Approved"
          count={approved.length}
          icon={CheckCircle2}
          iconClass="text-success"
        >
          {approved.length === 0 ? (
            <EmptyState message="No approved senders yet." />
          ) : (
            approved.map((sender) => (
              <SenderRow
                key={sender.id}
                sender={sender}
                onDelete={handleDelete}
                badge="success"
              />
            ))
          )}
        </Section>

        {/* Pending Section */}
        <Section
          title="Pending Approval"
          count={pending.length}
          icon={Clock}
          iconClass="text-warning"
        >
          {pending.length === 0 ? (
            <EmptyState message="No pending senders." />
          ) : (
            pending.map((sender) => (
              <SenderRow
                key={sender.id}
                sender={sender}
                onDelete={handleDelete}
                badge="warning"
              />
            ))
          )}
        </Section>

        {/* Rejected Section */}
        {rejected.length > 0 && (
          <Section
            title="Rejected"
            count={rejected.length}
            icon={XCircle}
            iconClass="text-error"
          >
            {rejected.map((sender) => (
              <SenderRow
                key={sender.id}
                sender={sender}
                onDelete={handleDelete}
                badge="error"
              />
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function StatBox({ label, value, max, icon: Icon, accent = 'primary' }) {
  const colors = {
    primary: 'text-primary-hover bg-primary/10 border-primary/20',
    success: 'text-success bg-success/10 border-success/20',
    warning: 'text-warning bg-warning/10 border-warning/20',
    error: 'text-error bg-error/10 border-error/20',
  };

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
          {label}
        </span>
        <div
          className={`w-7 h-7 rounded-lg border flex items-center justify-center ${colors[accent]}`}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-white tabular-nums">
          {value}
        </span>
        {max !== undefined && (
          <span className="text-sm text-white/30">/{max}</span>
        )}
      </div>
    </div>
  );
}

function Section({ title, count, icon: Icon, iconClass, children }) {
  return (
    <div className="mb-8 animate-fade-in">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Icon className={`w-4 h-4 ${iconClass}`} />
        <h2 className="text-sm font-semibold text-white uppercase tracking-wide">
          {title}
        </h2>
        <span className="text-xs text-white/40">({count})</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function SenderRow({ sender, onDelete, badge }) {
  const badgeColors = {
    success: 'bg-success/10 border-success/30 text-success',
    warning: 'bg-warning/10 border-warning/30 text-warning',
    error: 'bg-error/10 border-error/30 text-error',
  };

  const badgeLabels = {
    success: 'Approved',
    warning: 'Pending',
    error: 'Rejected',
  };

  return (
    <div className="card p-4 flex items-center gap-4 hover:border-white/10 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Mail className="w-4 h-4 text-primary-hover" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {sender.display_name}
        </p>
        <p className="text-xs text-white/40 font-mono truncate">
          {sender.email}
        </p>
      </div>

      <span className={`badge ${badgeColors[badge]} text-[10px] shrink-0`}>
        {badgeLabels[badge]}
      </span>

      <button
        onClick={() => onDelete(sender.id)}
        className="p-2 rounded-lg text-white/30 hover:text-error hover:bg-error/10 transition-colors shrink-0"
        title="Delete sender"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="card-elevated p-6 text-center">
      <p className="text-sm text-white/40">{message}</p>
    </div>
  );
}
