// In dev, Vite proxies /api to localhost:4000 (see vite.config.js).
// In production we don't have that proxy, so point straight at the
// deployed backend via an env var. Falls back to /api for local dev.
const BASE = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {}

async function handle(res) {
  if (res.status === 204) return null;
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no JSON body */
  }
  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export async function fetchBoard(priority) {
  const url = priority ? `${BASE}/board?priority=${encodeURIComponent(priority)}` : `${BASE}/board`;
  const res = await fetch(url);
  return handle(res);
}

export async function createTask(task) {
  const res = await fetch(`${BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  return handle(res);
}

export async function updateTask(id, patch) {
  const res = await fetch(`${BASE}/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return handle(res);
}

export async function deleteTask(id) {
  const res = await fetch(`${BASE}/tasks/${id}`, { method: 'DELETE' });
  return handle(res);
}

export async function moveTask(id, columnId) {
  const res = await fetch(`${BASE}/tasks/${id}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ columnId }),
  });
  return handle(res);
}

export { ApiError };
