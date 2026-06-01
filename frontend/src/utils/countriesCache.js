import { apiFetch } from './api'

let _cache = null
let _inflight = null

export async function fetchCountries() {
  if (_cache) return _cache
  if (_inflight) return _inflight
  _inflight = apiFetch('/countries')
    .then(r => r.json())
    .then(d => {
      _cache = d.success ? d.data : []
      _inflight = null
      return _cache
    })
    .catch(() => { _inflight = null; return [] })
  return _inflight
}
