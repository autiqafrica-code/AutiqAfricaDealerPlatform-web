import { useEffect, useState } from 'react'
import {
  Camera, CheckCircle2, Copy, ExternalLink,
  Link2, Link2Off, RefreshCw, Search, ShieldOff,
} from 'lucide-react'
import { apiFetch } from '../../utils/api'

function statusPill(s) {
  if (['Completed', 'Ready'].includes(s)) return 'green'
  if (['InProgress', 'WaitingApproval', 'WaitingParts', 'QCReview', 'Payment'].includes(s)) return 'amber'
  return 'soft'
}

function fmtDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CustomerPortal() {
  const [jobs,        setJobs]        = useState([])
  const [search,      setSearch]      = useState('')
  const [selected,    setSelected]    = useState(null)   // full job object from list
  const [linkStatus,  setLinkStatus]  = useState(null)
  const [media,       setMedia]       = useState([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [loadingLink, setLoadingLink] = useState(false)
  const [generating,  setGenerating]  = useState(false)
  const [revoking,    setRevoking]    = useState(false)
  const [newUrl,      setNewUrl]      = useState('')
  const [copied,      setCopied]      = useState(false)
  const [msg,         setMsg]         = useState('')
  const [err,         setErr]         = useState('')

  // Load jobs on mount
  useEffect(() => {
    apiFetch('/jobs?limit=100')
      .then(r => r.json())
      .then(d => { if (d.success) setJobs(d.data?.data || []) })
      .catch(() => {})
      .finally(() => setLoadingJobs(false))
  }, [])

  // When job selected — load link status + job media in parallel
  useEffect(() => {
    if (!selected) { setLinkStatus(null); setMedia([]); setNewUrl(''); setMsg(''); setErr(''); return }
    setLoadingLink(true)
    setNewUrl(''); setMsg(''); setErr('')
    Promise.all([
      apiFetch(`/front-desk/portal/${selected.id}/link`).then(r => r.json()),
      apiFetch(`/jobs/${selected.id}`).then(r => r.json()),
    ])
      .then(([linkData, jobData]) => {
        if (linkData.success) setLinkStatus(linkData.data)
        if (jobData.success)  setMedia(jobData.data?.job?.media || [])
      })
      .catch(() => setErr('Failed to load link status. Please try again.'))
      .finally(() => setLoadingLink(false))
  }, [selected])

  async function generateLink(regenerate = false) {
    setGenerating(true); setErr(''); setMsg('')
    try {
      const path = regenerate
        ? `/front-desk/portal/${selected.id}/link/regenerate`
        : `/front-desk/portal/${selected.id}/link`
      const res  = await apiFetch(path, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setNewUrl(data.data.url)
        setMsg(regenerate ? 'New link generated. The old link is now invalid.' : 'Customer link generated successfully.')
        setLinkStatus({ hasLink: true, status: 'Active', accessCount: 0, lastAccessedAt: null })
      } else {
        setErr(data.message || 'Failed to generate link.')
      }
    } catch { setErr('Network error. Please try again.') }
    finally   { setGenerating(false) }
  }

  async function revokeLink() {
    if (!window.confirm('Revoke this link? The customer will immediately lose access to their tracking page.')) return
    setRevoking(true); setErr(''); setMsg('')
    try {
      const res  = await apiFetch(`/front-desk/portal/${selected.id}/link/revoke`, { method: 'PATCH' })
      const data = await res.json()
      if (data.success) {
        setMsg('Link revoked. The customer can no longer access this tracking page.')
        setLinkStatus(prev => ({ ...prev, status: 'Revoked' }))
        setNewUrl('')
      } else {
        setErr(data.message || 'Failed to revoke link.')
      }
    } catch { setErr('Network error. Please try again.') }
    finally   { setRevoking(false) }
  }

  async function toggleVisibility(mediaId, currentVisible) {
    try {
      const res  = await apiFetch(`/front-desk/portal/${selected.id}/media/${mediaId}/customer-visible`, {
        method: 'PATCH',
        body:   JSON.stringify({ customerVisible: !currentVisible }),
      })
      const data = await res.json()
      if (data.success) {
        setMedia(prev => prev.map(m => m.id === mediaId ? { ...m, customerVisible: !currentVisible } : m))
      }
    } catch { /* silently ignore toggle failures */ }
  }

  function copyUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  const filtered = jobs.filter(j => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      j.jobNumber?.toLowerCase().includes(q) ||
      j.quotation?.customer?.name?.toLowerCase().includes(q) ||
      j.vehicle?.makeModel?.toLowerCase().includes(q) ||
      j.vehicle?.registrationNo?.toLowerCase().includes(q)
    )
  })

  const isActive = linkStatus?.hasLink && linkStatus.status === 'Active'

  return (
    <div className="pageStack">
      {/* Hero */}
      <section className="panel heroPanel">
        <p className="eyebrow">Front Desk / Service Consultant</p>
        <h2>Customer Tracking Link</h2>
        <p>
          Select a job to generate or manage the secure customer portal link.
          Customers use this link to track their vehicle, approve quotations, view photos, and set collection preferences.
        </p>
      </section>

      <div className="portalTwoCol">

        {/* ── Left: job list ── */}
        <section className="panel">
          <div className="sectionHeader compact">
            <h3>Select a Job</h3>
            {!loadingJobs && <small style={{ color: 'var(--muted)' }}>{filtered.length} jobs</small>}
          </div>

          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
            <input
              placeholder="Job no., customer or vehicle…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 34, width: '100%' }}
            />
          </div>

          {loadingJobs ? (
            <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px 0' }}>Loading jobs…</p>
          ) : filtered.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px 0' }}>No jobs found.</p>
          ) : (
            <div className="jobSelectList">
              {filtered.map(job => (
                <button
                  key={job.id}
                  className={`jobSelectRow${selected?.id === job.id ? ' selected' : ''}`}
                  onClick={() => setSelected(job)}
                >
                  <div>
                    <strong>{job.jobNumber}</strong>
                    <span>{job.quotation?.customer?.name || '—'}</span>
                  </div>
                  <div>
                    <small>{job.vehicle?.makeModel || '—'}</small>
                    <span className={`pill ${statusPill(job.status)}`} style={{ fontSize: 11, padding: '3px 8px' }}>{job.status}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── Right: link management ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {!selected ? (
            <section className="panel">
              <div className="portalEmptyState">
                <Link2 size={44} />
                <p>Select a job from the list to generate or manage its customer tracking link.</p>
              </div>
            </section>
          ) : (
            <>
              {/* Job summary */}
              <section className="panel">
                <div className="sectionHead">
                  <div>
                    <p className="eyebrow" style={{ marginBottom: 2 }}>{selected.jobNumber}</p>
                    <h3 style={{ margin: '0 0 4px' }}>{selected.quotation?.customer?.name || '—'}</h3>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>
                      {selected.vehicle?.makeModel}
                      {selected.vehicle?.registrationNo ? ` · ${selected.vehicle.registrationNo}` : ''}
                    </p>
                  </div>
                  <span className={`pill ${statusPill(selected.status)}`}>{selected.status}</span>
                </div>
              </section>

              {/* Feedback banner */}
              {(err || msg) && (
                <div style={{
                  background: err ? '#fff8f7' : '#f0fdf4',
                  border: `1px solid ${err ? '#fda29b' : '#abefc6'}`,
                  borderRadius: 12, padding: '10px 16px',
                  color: err ? '#b91c1c' : '#027a48',
                  fontWeight: 700, fontSize: 13,
                }}>
                  {err || msg}
                </div>
              )}

              {/* Link management panel */}
              <section className="panel">
                <div className="sectionHeader compact">
                  <div>
                    <p className="eyebrow" style={{ marginBottom: 2 }}>Customer portal link</p>
                    <h3 style={{ margin: 0 }}>Tracking link</h3>
                  </div>
                  {!loadingLink && linkStatus && (
                    <span className={`pill ${isActive ? 'green' : linkStatus.hasLink ? 'red' : 'amber'}`}>
                      {!linkStatus.hasLink ? 'No link' : linkStatus.status}
                    </span>
                  )}
                </div>

                {loadingLink ? (
                  <p style={{ color: 'var(--muted)' }}>Loading…</p>
                ) : (
                  <>
                    {/* Access stats when active */}
                    {isActive && (
                      <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--muted)' }}>
                        Accessed <strong>{linkStatus.accessCount || 0}</strong> time{linkStatus.accessCount !== 1 ? 's' : ''}
                        {linkStatus.lastAccessedAt ? ` · Last opened ${fmtDate(linkStatus.lastAccessedAt)}` : ' · Not yet opened'}
                        {linkStatus.createdAt ? ` · Created ${fmtDate(linkStatus.createdAt)}` : ''}
                      </p>
                    )}

                    {/* Newly generated URL box */}
                    {newUrl && (
                      <div className="portalLinkBox">
                        <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 800, color: '#027a48', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                          Share this link with the customer
                        </p>
                        <div className="portalLinkUrl">{newUrl}</div>
                        <div className="portalLinkActions">
                          <button className="softBtn" onClick={() => copyUrl(newUrl)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Copy size={14} /> {copied ? 'Copied!' : 'Copy link'}
                          </button>
                          <a
                            href={newUrl} target="_blank" rel="noopener noreferrer"
                            className="softBtn"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                          >
                            <ExternalLink size={14} /> Preview
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="rowActions" style={{ marginTop: newUrl ? 14 : 0 }}>
                      {!isActive && (
                        <button className="primaryBtn" onClick={() => generateLink(false)} disabled={generating}>
                          <Link2 size={16} /> {generating ? 'Generating…' : 'Generate link'}
                        </button>
                      )}
                      {isActive && (
                        <>
                          <button className="softBtn" onClick={() => generateLink(true)} disabled={generating}>
                            <RefreshCw size={16} /> {generating ? 'Regenerating…' : 'Regenerate link'}
                          </button>
                          <button
                            className="softBtn" onClick={revokeLink} disabled={revoking}
                            style={{ color: 'var(--red)' }}
                          >
                            <Link2Off size={16} /> {revoking ? 'Revoking…' : 'Revoke link'}
                          </button>
                        </>
                      )}
                    </div>

                    <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                      {isActive
                        ? 'Regenerating creates a new link and immediately invalidates the current one. Use Revoke to permanently block access.'
                        : 'Generating a link allows the customer to view their vehicle progress, approve quotations, and set collection preferences.'}
                    </p>
                  </>
                )}
              </section>

              {/* Media visibility */}
              <section className="panel">
                <div className="sectionHeader compact">
                  <div>
                    <p className="eyebrow" style={{ marginBottom: 2 }}>Photo &amp; video gallery</p>
                    <h3 style={{ margin: 0 }}>Customer visibility</h3>
                  </div>
                  <Camera size={20} style={{ color: 'var(--teal)', flexShrink: 0 }} />
                </div>

                {media.length === 0 ? (
                  <div className="infoStrip">No photos or videos uploaded for this job yet. Upload media from the job card view.</div>
                ) : (
                  <>
                    <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--muted)' }}>
                      Toggle which photos and videos the customer can see on their tracking page.
                    </p>
                    <div className="tableWrap">
                      <table>
                        <thead>
                          <tr>
                            <th>File</th>
                            <th>Type</th>
                            <th>Uploaded</th>
                            <th>Customer can see</th>
                          </tr>
                        </thead>
                        <tbody>
                          {media.map(m => (
                            <tr key={m.id}>
                              <td>
                                <a
                                  href={m.fileUrl} target="_blank" rel="noopener noreferrer"
                                  style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}
                                >
                                  {m.fileName}
                                </a>
                              </td>
                              <td>{m.mediaType}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(m.createdAt)}</td>
                              <td>
                                <button
                                  className={`mediaToggleBtn ${m.customerVisible ? 'visible' : 'hidden'}`}
                                  onClick={() => toggleVisibility(m.id, m.customerVisible)}
                                >
                                  {m.customerVisible
                                    ? <><CheckCircle2 size={14} /> Visible</>
                                    : <><ShieldOff size={14} /> Hidden</>}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
