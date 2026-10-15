/**
 * AsyncPulse Bulk Email API Client
 *
 * All requests go through Vite proxy (/api/* → http://127.0.0.1:8000/*).
 * In production, VITE_API_URL can override the base.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Custom error class for API failures with structured info.
 */
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Generic fetch wrapper with JSON handling and error parsing.
 * Automatically attaches JWT token from localStorage.
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  // Get JWT token from localStorage (saved by AuthContext)
  const token = localStorage.getItem('asyncpulse_access_token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    // Parse body (may be empty for some responses)
    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    }

    if (!response.ok) {
      const message =
        data?.error ||
        data?.detail ||
        data?.message ||
        `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status, data);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    // Network or parsing error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(
        'Cannot connect to server. Is the backend running?',
        0,
        null
      );
    }

    throw new ApiError(
      error.message || 'An unexpected error occurred',
      0,
      null
    );
  }
}

/**
 * Queue a bulk email dispatch task.
 */
export async function sendBulkEmail(emailList, subject, message, senderId = null) {
  return apiFetch('/send-bulk-email/', {
    method: 'POST',
    body: JSON.stringify({
      email_list: emailList,
      subject,
      message,
      sender_id: senderId,
    }),
  });
}

/**
 * Poll the status of an async task.
 */
export async function getTaskStatus(taskId) {
  return apiFetch(`/task-status/${taskId}/`, {
    method: 'GET',
  });
}

/**
 * Task status constants.
 */
export const TaskStatus = {
  PENDING: 'PENDING',
  STARTED: 'STARTED',
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  RETRY: 'RETRY',
};

export function isTerminalStatus(status) {
  return status === TaskStatus.SUCCESS || status === TaskStatus.FAILURE;
}

export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(trimmed);
}

export function parseEmailInput(input) {
  if (!input) return [];
  return input
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

export function dedupeEmails(emails) {
  const seen = new Set();
  return emails.filter((email) => {
    const lower = email.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

// ============================================================================
// SENDER MANAGEMENT
// ============================================================================

export async function getSenders() {
  return apiFetch('/senders/', { method: 'GET' });
}

export async function getApprovedSenders() {
  return apiFetch('/senders/approved/', { method: 'GET' });
}

export async function createSender(data) {
  return apiFetch('/senders/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function approveSender(senderId) {
  return apiFetch(`/senders/${senderId}/approve/`, { method: 'POST' });
}

export async function rejectSender(senderId, reason = '') {
  return apiFetch(`/senders/${senderId}/reject/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}