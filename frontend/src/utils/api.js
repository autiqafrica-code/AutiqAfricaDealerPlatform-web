const _base = (() => {
  const raw = import.meta.env.VITE_API_URL || 'http://localhost:8007'
  return raw.endsWith('/api') ? raw : `${raw.replace(/\/$/, '')}/api`
})()

export const API_BASE = _base

export function getToken() {
  return localStorage.getItem('autiq_token') || ''
}

export function getUser() {
  try {
    const t = getToken()
    if (!t) return null
    return JSON.parse(atob(t.split('.')[1]))
  } catch { return null }
}

export function authHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
    ...extra,
  }
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${_base}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  })
  if (res.status === 401) {
    window.dispatchEvent(new Event('autiq:unauthorized'))
  }
  return res
}
