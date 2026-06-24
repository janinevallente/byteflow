import { useState, useCallback, useRef } from 'react'
import {
  Globe,
  Search,
  Copy,
  Check,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Info,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'

const DNS_RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'PTR', 'SRV', 'CAA']

// DoH resolver — Cloudflare's public resolver. No account, no logging per policy.
// All queries go directly from the browser; no Byteflow server ever sees them.
const DOH_URL = 'https://cloudflare-dns.com/dns-query'

// DNS response codes
const RCODE_LABELS = {
  0: 'NOERROR',
  1: 'FORMERR',
  2: 'SERVFAIL',
  3: 'NXDOMAIN',
  4: 'NOTIMP',
  5: 'REFUSED',
}

// Human-readable descriptions per record type
const RECORD_DESCRIPTIONS = {
  A:     'Maps a hostname to an IPv4 address.',
  AAAA:  'Maps a hostname to an IPv6 address.',
  CNAME: 'Canonical name — alias from one hostname to another.',
  MX:    'Mail exchange — servers that handle email for this domain.',
  NS:    'Name servers authoritative for this domain.',
  TXT:   'Arbitrary text — used for SPF, DKIM, domain verification, etc.',
  SOA:   'Start of Authority — primary name server and zone metadata.',
  PTR:   'Pointer record — reverse DNS, maps IP back to hostname.',
  SRV:   'Service locator — host, port and priority for a given service.',
  CAA:   'Certification Authority Authorization — which CAs may issue certs.',
}

// TTL display helper
function formatTtl(seconds) {
  if (seconds < 60)   return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// Strip trailing dot that DNS names carry
function cleanName(name = '') {
  return name.replace(/\.$/, '')
}

// DoH fetch — uses DNS-over-HTTPS (RFC 8484) JSON API
// No cookies, no auth headers, no tracking params. Pure DNS wire protocol over HTTPS.
async function queryDoh(name, type, signal) {
  const url = new URL(DOH_URL)
  url.searchParams.set('name', name)
  url.searchParams.set('type', type)

  const res = await fetch(url.toString(), {
    signal,
    headers: {
      Accept: 'application/dns-json',
    },
    // Explicitly avoid sending cookies or credentials
    credentials: 'omit',
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`DoH HTTP ${res.status}`)
  return res.json()
}

// Resolve all selected record types in parallel
async function resolveAll(hostname, selectedTypes, signal) {
  const start = performance.now()

  const settled = await Promise.allSettled(
    selectedTypes.map(type =>
      queryDoh(hostname, type, signal).then(data => ({ type, data }))
    )
  )

  const elapsed = Math.round(performance.now() - start)

  const results = {}
  const errors  = {}

  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      const { type, data } = outcome.value
      results[type] = data
    } else {
      // Extract type from the rejection; we can't easily map without restructuring, to capture as a generic resolver error
      errors[outcome.reason?.type ?? 'unknown'] = outcome.reason?.message ?? 'Request failed'
    }
  }

  return { results, errors, elapsed }
}

// Parse answer records into a flat display shape
function parseAnswers(type, answers = []) {
  return answers.map(rec => {
    const base = {
      name: cleanName(rec.name),
      ttl:  rec.TTL,
      type: rec.type,
      raw:  rec.data,
    }

    // Per-type data shaping
    switch (type) {
      case 'MX': {
        const parts = String(rec.data).split(' ')
        return { ...base, priority: parts[0], exchange: cleanName(parts.slice(1).join(' ')) }
      }
      case 'SRV': {
        const [priority, weight, port, target] = String(rec.data).split(' ')
        return { ...base, priority, weight, port, target: cleanName(target) }
      }
      case 'SOA': {
        const [mname, rname, serial, refresh, retry, expire, minimum] = String(rec.data).split(' ')
        return { ...base, mname: cleanName(mname), rname: cleanName(rname), serial, refresh, retry, expire, minimum }
      }
      case 'CAA': {
        const parts = String(rec.data).split(' ')
        return { ...base, flags: parts[0], tag: parts[1], value: parts.slice(2).join(' ').replace(/^"|"$/g, '') }
      }
      default:
        return { ...base, value: cleanName(rec.data) }
    }
  })
}

// Sub-components

function Badge({ children, variant = 'default' }) {
  const styles = {
    default:  'bg-accentBg text-accent border-accentBorder',
    success:  'bg-green-500/10 text-green-400 border-green-400/30',
    error:    'bg-red-500/10 text-red-400 border-red-400/30',
    muted:    'bg-backgroundColor text-text border-borderColor',
    warning:  'bg-yellow-500/10 text-yellow-400 border-yellow-400/30',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold tracking-wide ${styles[variant]}`}>
      {children}
    </span>
  )
}

function CopyButton({ text, fieldKey, copiedKey, onCopy }) {
  const copied = copiedKey === fieldKey
  return (
    <button
      onClick={() => onCopy(text, fieldKey)}
      title="Copy"
      className="text-text hover:text-accent transition-colors bg-transparent border-none cursor-pointer p-0.5 shrink-0"
    >
      {copied
        ? <Check size={12} className="text-green-400" />
        : <Copy size={12} />
      }
    </button>
  )
}

// Collapsible record type section
function RecordSection({ type, dohResult, copiedKey, onCopy }) {
  const [open, setOpen] = useState(true)

  const rcode      = dohResult?.Status
  const rcodeLabel = RCODE_LABELS[rcode] ?? `RCODE ${rcode}`
  const answers    = dohResult?.Answer ?? []
  const parsed     = parseAnswers(type, answers)
  const hasRecords = parsed.length > 0
  const isNxDomain = rcode === 3
  const isError    = rcode !== 0 && !isNxDomain

  return (
    <div className="bg-backgroundCard border border-borderColor rounded-2xl overflow-hidden">
      {/* Section header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-transparent border-none cursor-pointer hover:bg-backgroundColor transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="font-mono font-bold text-sm text-accent w-10 shrink-0">{type}</span>
          <span className="text-[11px] text-text hidden sm:block">{RECORD_DESCRIPTIONS[type]}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasRecords && <Badge variant="success">{parsed.length} record{parsed.length !== 1 ? 's' : ''}</Badge>}
          {isNxDomain  && <Badge variant="muted">NXDOMAIN</Badge>}
          {isError     && <Badge variant="error">{rcodeLabel}</Badge>}
          {!hasRecords && !isNxDomain && !isError && <Badge variant="muted">No records</Badge>}
          {open ? <ChevronUp size={14} className="text-text" /> : <ChevronDown size={14} className="text-text" />}
        </div>
      </button>

      {/* Records table */}
      {open && hasRecords && (
        <div className="border-t border-borderColor overflow-x-auto">
          <RecordTable type={type} records={parsed} copiedKey={copiedKey} onCopy={onCopy} />
        </div>
      )}

      {/* Empty / NXDOMAIN info */}
      {open && !hasRecords && (
        <div className="border-t border-borderColor px-4 py-3 text-xs text-text">
          {isNxDomain
            ? 'Domain does not exist (NXDOMAIN).'
            : isError
              ? `Resolver returned ${rcodeLabel}.`
              : `No ${type} records found.`
          }
        </div>
      )}
    </div>
  )
}

// Renders the appropriate columns per record type
function RecordTable({ type, records, copiedKey, onCopy }) {
  const headCls = 'px-3 py-2 text-[10px] font-semibold tracking-wider text-text uppercase bg-backgroundColor text-left'
  
  const columns = {
    A:     [['Name', 'name'], ['TTL', 'ttl'], ['IPv4 Address', 'value']],
    AAAA:  [['Name', 'name'], ['TTL', 'ttl'], ['IPv6 Address', 'value']],
    CNAME: [['Name', 'name'], ['TTL', 'ttl'], ['Canonical Name', 'value']],
    NS:    [['Name', 'name'], ['TTL', 'ttl'], ['Name Server', 'value']],
    TXT:   [['Name', 'name'], ['TTL', 'ttl'], ['Value', 'value']],
    PTR:   [['Name', 'name'], ['TTL', 'ttl'], ['Pointer', 'value']],
    MX:    [['Name', 'name'], ['TTL', 'ttl'], ['Priority', 'priority'], ['Mail Server', 'exchange']],
    SRV:   [['Name', 'name'], ['TTL', 'ttl'], ['Pri', 'priority'], ['Wt', 'weight'], ['Port', 'port'], ['Target', 'target']],
    SOA:   [['Primary NS', 'mname'], ['Resp. Mailbox', 'rname'], ['Serial', 'serial'], ['Refresh', 'refresh'], ['Retry', 'retry'], ['Expire', 'expire'], ['Min TTL', 'minimum']],
    CAA:   [['Name', 'name'], ['TTL', 'ttl'], ['Flags', 'flags'], ['Tag', 'tag'], ['Value', 'value']],
  }

  const cols = columns[type] ?? [['Name', 'name'], ['TTL', 'ttl'], ['Value', 'value']]
  const copyField = type === 'MX' ? 'exchange' : type === 'SRV' ? 'target' : 'value'

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {cols.map(([label]) => (
              <th key={label} className={headCls}>
                {label}
              </th>
            ))}
            <th className={`${headCls} w-10 text-center`}>Copy</th>
          </tr>
        </thead>
        <tbody>
          {records.map((rec, i) => {
            // Determine if this is a value cell that should be truncatable
            const isValueField = (field) => ['value', 'exchange', 'target', 'rname', 'mname'].includes(field)
            
            return (
              <tr key={i} className="border-t border-borderColor hover:bg-backgroundColor/50 transition-colors">
                {cols.map(([, field]) => {
                  const cellContent = field === 'ttl' ? (
                    <span className="flex items-center gap-1 text-text whitespace-nowrap">
                      <Clock size={10} className="shrink-0" />
                      {formatTtl(Number(rec[field]))}
                    </span>
                  ) : (
                    <span className={`
                      ${isValueField(field) ? 'truncate max-w-[200px] inline-block align-middle' : 'whitespace-nowrap'}
                    `}>
                      {rec[field] ?? '—'}
                    </span>
                  )
                  
                  return (
                    <td key={field} className="px-3 py-2 text-xs font-mono text-textHeader">
                      {cellContent}
                    </td>
                  )
                })}
                <td className="px-2 py-2 text-center">
                  <CopyButton
                    text={String(rec[copyField] ?? rec.raw ?? '')}
                    fieldKey={`${type}-${i}`}
                    copiedKey={copiedKey}
                    onCopy={onCopy}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function DnsLookup() {
  const [hostname, setHostname]       = useState('')
  const [inputValue, setInputValue]   = useState('')
  const [selectedTypes, setSelectedTypes] = useState(['A', 'AAAA', 'MX', 'NS', 'TXT'])
  const [results, setResults]         = useState(null)   // { results, errors, elapsed }
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [copiedKey, setCopiedKey]     = useState(null)
  const abortRef = useRef(null)

  // Normalise and validate hostname input
  function normaliseHostname(raw) {
    return raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  }

  function isValidHostname(h) {
    return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(h)
  }

  const runLookup = useCallback(async (hostnameOverride) => {
    const target = normaliseHostname(hostnameOverride ?? inputValue)

    if (!target) {
      setError('Please enter a hostname or domain name.')
      return
    }
    if (!isValidHostname(target)) {
      setError(`"${target}" doesn't look like a valid hostname.`)
      return
    }

    // Cancel any in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setHostname(target)
    setResults(null)

    try {
      const data = await resolveAll(target, selectedTypes, controller.signal)
      setResults(data)
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message ?? 'DNS resolution failed.')
    } finally {
      setLoading(false)
    }
  }, [inputValue, selectedTypes])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') runLookup()
  }

  const toggleType = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.length > 1 ? prev.filter(t => t !== type) : prev   // keep at least one
        : [...prev, type]
    )
  }

  const copy = useCallback((text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }, [])

  const totalRecords = results
    ? Object.values(results.results).reduce((sum, d) => sum + (d?.Answer?.length ?? 0), 0)
    : 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 font-poppins">
      <PageHeader
        icon={Globe}
        title="DNS Lookup"
        description="Query DNS records for any domain directly from your browser — no server middleman, no logs."
      />

      {/* Privacy notice */}
      <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-accentBg border border-accentBorder">
        <ShieldCheck size={15} className="text-accent shrink-0 mt-0.5" />
        <p className="text-xs text-text m-0 leading-relaxed">
          <span className="text-accent font-semibold">Privacy-first.</span>{' '}
          All DNS queries run directly from your browser to{' '}
          <span className="text-textHeader font-medium">Cloudflare DNS-over-HTTPS</span> (1.1.1.1).
          Byteflow never sees your queries — no proxying, no logging, no analytics on your lookups.
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-accent pointer-events-none" />
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="example.com"
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-backgroundCard border border-borderColor text-sm text-textHeader placeholder-text focus:outline-none focus:border-accent transition-colors font-mono"
          />
        </div>
        <button
          onClick={() => runLookup()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-accent text-white border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
        >
          {loading
            ? <Loader2 size={14} className="animate-spin" />
            : <Search size={14} />
          }
          <span className="hidden sm:inline">Lookup</span>
        </button>
      </div>

      {/* Record type selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {DNS_RECORD_TYPES.map(type => {
          const active = selectedTypes.includes(type)
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              title={RECORD_DESCRIPTIONS[type]}
              className={`px-3 py-1 rounded-lg border text-xs font-mono font-semibold transition-colors cursor-pointer
                ${active
                  ? 'bg-accentBg text-accent border-accentBorder'
                  : 'bg-backgroundCard text-text border-borderColor hover:border-accentBorder hover:text-accent'
                }`}
            >
              {type}
            </button>
          )
        })}
        <span className="flex items-center gap-1 text-[11px] text-text ml-1 select-none">
          <Info size={11} /> click to toggle
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-5 p-4 rounded-2xl bg-red-500/10 border border-red-400/30 flex items-start gap-2.5">
          <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-400 font-medium m-0">Lookup failed</p>
            <p className="text-xs text-red-400/80 m-0 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="flex flex-col gap-4">
          {/* Summary bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-backgroundCard border border-borderColor">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-mono text-sm font-bold text-textHeader truncate">{hostname}</span>
              <Badge variant={totalRecords > 0 ? 'success' : 'muted'}>
                {totalRecords} record{totalRecords !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[11px] text-text">
                <Clock size={11} /> {results.elapsed}ms
              </span>
              <button
                onClick={() => runLookup(hostname)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accentBg text-accent border border-accentBorder cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {/* One section per queried record type */}
          {selectedTypes.map(type => (
            <RecordSection
              key={type}
              type={type}
              dohResult={results.results[type] ?? null}
              copiedKey={copiedKey}
              onCopy={copy}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!results && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="bg-accentBg border border-accentBorder rounded-2xl p-4 mb-4 text-accent">
            <Globe size={28} />
          </span>
          <p className="text-sm text-textHeader font-medium m-0 mb-1">Enter a domain to get started</p>
          <p className="text-xs text-text m-0 max-w-xs">
            Try <code className="font-mono text-accent">cloudflare.com</code> or any domain you want to inspect.
          </p>
        </div>
      )}
    </div>
  )
}
