import { useState, useEffect } from 'react';
import { ChevronDown, Mail, Loader2, AlertCircle, Plus, X, Send, Check } from 'lucide-react';
import { getApprovedSenders, createSender } from '../api/bulkEmail';

const MAX_SENDERS = 3;

export default function SenderSelect({ value, onChange, onSenderAdded, mode = 'select' }) {
  const [senders, setSenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formError, setFormError] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadSenders = async () => {
    try {
      setLoading(true);
      const data = await getApprovedSenders();
      const list = data.senders || [];
      setSenders(list);
      if (list.length > 0 && !value && onChange) {
        onChange(list[0]);
      }
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load senders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'add') {
      // Add-mode: skip loading existing senders, show form directly
      setLoading(false);
      setShowAddForm(true);
    } else {
      loadSenders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.sender-select-wrapper')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleAddSender = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
      setFormError('All fields are required.');
      return;
    }
    if (formPassword.length < 8) {
      setFormError('App Password must be at least 8 characters.');
      return;
    }

    setFormSubmitting(true);
    try {
      await createSender({
        display_name: formName.trim(),
        email: formEmail.trim(),
        smtp_host: 'smtp.gmail.com',
        smtp_port: 465,
        smtp_username: formEmail.trim(),
        smtp_password: formPassword,
        use_ssl: true,
        use_tls: false,
      });

      // Reset form
      setFormName('');
      setFormEmail('');
      setFormPassword('');
      setShowAddForm(false);
      setFormError(null);

      // Reload senders
      if (mode !== 'add') {
        await loadSenders();
      }

      // Notify parent
      if (onSenderAdded) {
        onSenderAdded();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to add sender.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const canAddMore = senders.length < MAX_SENDERS;
  const selected = value || senders[0];

  // ---- ADD MODE: Just show form ----
  if (mode === 'add') {
    return (
      <form
        onSubmit={handleAddSender}
        className="space-y-3 animate-fade-in"
      >
        <div>
          <label className="block text-xs text-white/60 mb-1">
            Display Name
          </label>
          <input
            type="text"
            required
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. AsyncPulse Sales"
            className="input-base text-sm"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs text-white/60 mb-1">
            Email Address
          </label>
          <input
            type="email"
            required
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            placeholder="sales@yourcompany.com"
            className="input-base text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-white/60 mb-1">
            SMTP App Password
          </label>
          <input
            type="password"
            required
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
            placeholder="16-character App Password"
            className="input-base text-sm"
          />
          <p className="mt-1.5 text-[10px] text-white/40 leading-relaxed">
            Gmail App Password chahiye.{' '}
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-hover hover:underline"
            >
              Google Account → App Passwords
            </a>
          </p>
        </div>

        {formError && (
          <div className="flex items-start gap-2 rounded-lg border border-error/30 bg-error/10 p-2.5 text-xs text-error">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={formSubmitting}
            className="btn-primary text-sm flex-1"
          >
            {formSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Submit
              </>
            )}
          </button>
        </div>
      </form>
    );
  }

  // --- Loading ---
  if (loading) {
    return (
      <div className="mb-5">
        <label className="block text-sm font-medium text-white/80 mb-2">
          From Sender
        </label>
        <div className="input-base flex items-center gap-2 text-white/40">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading senders...
        </div>
      </div>
    );
  }

  // --- Error ---
  if (error) {
    return (
      <div className="mb-5">
        <label className="block text-sm font-medium text-white/80 mb-2">
          From Sender
        </label>
        <div className="input-base flex items-center gap-2 text-error border-error/30">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 sender-select-wrapper relative">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-white/80">
          From Sender
        </label>
        <span className="text-xs text-white/40">
          {senders.length}/{MAX_SENDERS} senders
        </span>
      </div>

      {/* Add Form (inline) */}
      {showAddForm ? (
        <form
          onSubmit={handleAddSender}
          className="card p-4 space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white">
              Add New Sender
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1">
              Display Name
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. AsyncPulse Sales"
              className="input-base text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="sales@yourcompany.com"
              className="input-base text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1">
              SMTP App Password
            </label>
            <input
              type="password"
              required
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              placeholder="16-character App Password"
              className="input-base text-sm"
            />
            <p className="mt-1.5 text-[10px] text-white/40 leading-relaxed">
              Gmail App Password chahiye.{' '}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-hover hover:underline"
              >
                Google Account → App Passwords
              </a>
            </p>
          </div>

          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-error/30 bg-error/10 p-2.5 text-xs text-error">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="btn-ghost text-sm flex-1"
              disabled={formSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="btn-primary text-sm flex-1"
            >
              {formSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Submit
                </>
              )}
            </button>
          </div>
        </form>
      ) : senders.length === 0 ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all duration-200 group"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Plus className="w-4 h-4 text-primary-hover" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-white">
              Add Your First Sender
            </span>
            <span className="text-xs text-white/40">
              Add an email to start sending
            </span>
          </div>
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="input-base flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="w-4 h-4 text-primary-hover shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm text-white truncate">
                  {selected.display_name}
                </span>
                <span className="text-xs text-white/40 font-mono truncate">
                  {selected.email}
                </span>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isOpen && (
            <div className="absolute z-50 mt-1 w-full rounded-xl border border-white/10 bg-bg-elevated shadow-2xl overflow-hidden animate-fade-in">
              {senders.map((sender) => {
                const isActive = sender.id === selected.id;
                return (
                  <button
                    key={sender.id}
                    type="button"
                    onClick={() => {
                      if (onChange) onChange(sender);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-white'
                        : 'hover:bg-white/5 text-white/80'
                    }`}
                  >
                    <Mail
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-primary-hover' : 'text-white/40'
                      }`}
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm truncate">
                        {sender.display_name}
                      </span>
                      <span className="text-xs text-white/40 font-mono truncate">
                        {sender.email}
                      </span>
                    </div>
                    {isActive && (
                      <Check className="w-3.5 h-3.5 text-primary-hover shrink-0" />
                    )}
                  </button>
                );
              })}

              {canAddMore && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setShowAddForm(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left border-t border-white/5 hover:bg-primary/5 text-primary-hover transition-colors"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium">
                    Add New Sender
                  </span>
                  <span className="ml-auto text-[10px] text-white/40">
                    {MAX_SENDERS - senders.length} left
                  </span>
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}