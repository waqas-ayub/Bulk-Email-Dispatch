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
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const config = {
    headers: {
      'Content-Type': 'application/json',
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
 *
 * @param {string[]} emailList - Array of recipient email addresses
 * @param {string} subject - Email subject line
 * @param {string} message - Email body
 * @returns {Promise<{message: string, task_id: string, recipients: number, status_check_url: string}>}
 */
export async function sendBulkEmail(emailList, subject, message) {
  return apiFetch('/send-bulk-email/', {
    method: 'POST',
    body: JSON.stringify({
      email_list: emailList,
      subject,
      message,
    }),
  });
}

/**
 * Poll the status of an async task.
 *
 * @param {string} taskId - UUID of the Celery task
 * @returns {Promise<{task_id: string, status: string, result: any, error: string|null}>}
 */
export async function getTaskStatus(taskId) {
  return apiFetch(`/task-status/${taskId}/`, {
    method: 'GET',
  });
}

/**
 * Task status constants for consistent referencing.
 */
export const TaskStatus = {
  PENDING: 'PENDING',
  STARTED: 'STARTED',
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  RETRY: 'RETRY',
};

/**
 * Helper: check if a task status is terminal (finished).
 */
export function isTerminalStatus(status) {
  return status === TaskStatus.SUCCESS || status === TaskStatus.FAILURE;
}

/**
 * Helper: validate an email address (basic RFC-ish check).
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(trimmed);
}

/**
 * Helper: parse comma/newline/semicolon-separated email input into a clean array.
 */
export function parseEmailInput(input) {
  if (!input) return [];
  return input
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

/**
 * Helper: deduplicate an array of emails (case-insensitive).
 */
export function dedupeEmails(emails) {
  const seen = new Set();
  return emails.filter((email) => {
    const lower = email.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}