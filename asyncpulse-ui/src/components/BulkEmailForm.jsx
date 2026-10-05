import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Send,
  Trash2,
  Users,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Loader2,
  Info,
} from 'lucide-react';
import {
  sendBulkEmail,
  parseEmailInput,
  dedupeEmails,
  isValidEmail,
} from '../api/bulkEmail';
import { useToast } from './Toast';

const SUBJECT_MAX = 200;
const MESSAGE_MAX = 5000;

export default function BulkEmailForm({ onTaskQueued }) {
  const toast = useToast();
  const [emailsInput, setEmailsInput] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const subjectRef = useRef(null);
  const messageRef = useRef(null);

  // Parse & validate emails
  const { emails, validEmails, invalidEmails } = useMemo(() => {
    const parsed = parseEmailInput(emailsInput);
    const deduped = dedupeEmails(parsed);
    const valid = deduped.filter(isValidEmail);
    const invalid = deduped.filter((e) => !isValidEmail(e));
    return { emails: deduped, validEmails: valid, invalidEmails: invalid };
  }, [emailsInput]);

  const isValid =
    validEmails.length > 0 &&
    validEmails.length <= 500 &&
    subject.trim().length > 0 &&
    subject.length <= SUBJECT_MAX &&
    message.trim().length > 0 &&
    message.length <= MESSAGE_MAX;

  // Cmd/Ctrl+Enter submit
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && isValid && !submitting) {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const handleClear = () => {
    setEmailsInput('');
    setSubject('');
    setMessage('');
    setFieldErrors({});
  };

  const handleSubmit = async () => {
    const errors = {};
    if (validEmails.length === 0) errors.emails = 'Add at least one valid email.';
    if (validEmails.length > 500) errors.emails = 'Max 500 recipients per request.';
    if (!subject.trim()) errors.subject = 'Subject is required.';
    if (subject.length > SUBJECT_MAX) errors.subject = `Max ${SUBJECT_MAX} characters.`;
    if (!message.trim()) errors.message = 'Message is required.';
    if (message.length > MESSAGE_MAX) errors.message = `Max ${MESSAGE_MAX} characters.`;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fix the form errors.', 'Validation failed');
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      const response = await sendBulkEmail(validEmails, subject.trim(), message.trim());
      toast.success(
        `Task queued for ${response.recipients} recipient${response.recipients > 1 ? 's' : ''}.`,
        'Bulk email dispatched'
      );
      onTaskQueued?.(response);
      // Reset form (keep subject/message for iteration)
      setEmailsInput('');
    } catch (err) {
      toast.error(err.message || 'Failed to queue task.', 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card p-6 md:p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Send className="w-5 h-5 text-primary-hover" strokeWidth={2.25} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Compose Bulk Email
          </h2>
          <p className="text-xs text-white/40">
            Queue an async dispatch task via Celery
          </p>
        </div>
      </div>

      {/* Recipients */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="recipients" className="text-sm font-medium text-white/80">
            Recipients
          </label>
          <RecipientCounter
            valid={validEmails.length}
            invalid={invalidEmails.length}
            total={emails.length}
          />
        </div>
        <textarea
          id="recipients"
          ref={undefined}
          value={emailsInput}
          onChange={(e) => setEmailsInput(e.target.value)}
          placeholder="alice@example.com, bob@example.com&#10;Or separate by newlines/semicolons"
          rows={4}
          className={`input-base font-mono text-sm resize-y ${
            fieldErrors.emails ? 'border-error/50 ring-2 ring-error/20' : ''
          }`}
          autoFocus
        />
        {fieldErrors.emails && <FieldError>{fieldErrors.emails}</FieldError>}
        {invalidEmails.length > 0 && !fieldErrors.emails && (
          <p className="mt-2 text-xs text-warning flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              {invalidEmails.length} invalid address
              {invalidEmails.length > 1 ? 'es' : ''} will be skipped:{' '}
              <span className="font-mono text-warning/80">
                {invalidEmails.slice(0, 3).join(', ')}
                {invalidEmails.length > 3 ? `, +${invalidEmails.length - 3} more` : ''}
              </span>
            </span>
          </p>
        )}
      </div>

      {/* Subject */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="subject" className="text-sm font-medium text-white/80">
            Subject
          </label>
          <CharCounter current={subject.length} max={SUBJECT_MAX} />
        </div>
        <input
          id="subject"
          ref={subjectRef}
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value.slice(0, SUBJECT_MAX))}
          placeholder="Your email subject line"
          className={`input-base ${
            fieldErrors.subject ? 'border-error/50 ring-2 ring-error/20' : ''
          }`}
          maxLength={SUBJECT_MAX}
        />
        {fieldErrors.subject && <FieldError>{fieldErrors.subject}</FieldError>}
      </div>

      {/* Message */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="message" className="text-sm font-medium text-white/80">
            Message
          </label>
          <CharCounter current={message.length} max={MESSAGE_MAX} />
        </div>
        <textarea
          id="message"
          ref={messageRef}
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
          placeholder="Write your email body here...&#10;&#10;You can use template variables like {name} or {company}."
          rows={8}
          className={`input-base resize-y ${
            fieldErrors.message ? 'border-error/50 ring-2 ring-error/20' : ''
          }`}
          maxLength={MESSAGE_MAX}
        />
        {fieldErrors.message && <FieldError>{fieldErrors.message}</FieldError>}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-white/40">
          <Sparkles className="w-3.5 h-3.5 text-primary-hover" />
          <span>
            Tip: use{' '}
            <code className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-[11px] text-primary-hover">
              {'{name}'}
            </code>{' '}
            and{' '}
            <code className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-[11px] text-primary-hover">
              {'{company}'}
            </code>{' '}
            for personalization.
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-5 border-t border-white/5">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/40">
          <Info className="w-3.5 h-3.5" />
          <span>
            Press{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px]">
              Ctrl
            </kbd>{' '}
            +{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px]">
              Enter
            </kbd>{' '}
            to send
          </span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={handleClear}
            disabled={submitting}
            className="btn-ghost text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="btn-primary text-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Queuing task...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Bulk Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Small subcomponents ---------- */

function RecipientCounter({ valid, invalid, total }) {
  if (total === 0) {
    return (
      <span className="badge badge-neutral text-[11px]">
        <Users className="w-3 h-3" />
        No recipients yet
      </span>
    );
  }
  if (invalid > 0 && valid === 0) {
    return (
      <span className="badge badge-error text-[11px]">
        <AlertCircle className="w-3 h-3" />
        {invalid} invalid
      </span>
    );
  }
  if (invalid > 0) {
    return (
      <span className="badge badge-warning text-[11px]">
        <CheckCircle2 className="w-3 h-3" />
        {valid} valid · {invalid} invalid
      </span>
    );
  }
  return (
    <span className="badge badge-success text-[11px]">
      <CheckCircle2 className="w-3 h-3" />
      {valid} recipient{valid !== 1 ? 's' : ''}
    </span>
  );
}

function CharCounter({ current, max }) {
  const pct = current / max;
  const color =
    pct > 0.9 ? 'text-error' : pct > 0.75 ? 'text-warning' : 'text-white/40';
  return (
    <span className={`text-[11px] font-mono tabular-nums ${color}`}>
      {current}/{max}
    </span>
  );
}

function FieldError({ children }) {
  return (
    <p className="mt-1.5 text-xs text-error flex items-center gap-1.5">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      {children}
    </p>
  );
}