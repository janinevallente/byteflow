import { useState, useCallback, useRef } from 'react'
import {
  ScrollText,
  Search,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  Building2,
  UserRound,
  Network,
  ChevronDown,
  ChevronUp,
  Globe,
  CircleX,
} from 'lucide-react'
import { SyncLoader } from 'react-spinners'
import PageHeader from '../components/ui/PageHeader'
import { getRequest } from '../api/apiClient'

// RDAP (Registration Data Access Protocol) is the modern, structured
// replacement for legacy port-43 WHOIS. rdap.org acts as a bootstrap service:
// it looks up which registry is authoritative for the TLD and redirects to
// that registry's own RDAP server, which responds with JSON directly to the
// browser.
const RDAP_BOOTSTRAP = 'https://rdap.org/domain/'

// Cloudflare's public DNS-over-HTTPS resolver
const DOH_URL = 'https://cloudflare-dns.com/dns-query'
const LIVE_RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'PTR', 'SRV', 'CAA', 'DS', 'DNSKEY']
// DS/DNSKEY only exist for domains with DNSSEC enabled
const DNSSEC_RECORD_TYPES = new Set(['DS', 'DNSKEY'])

function isValidHostname(h) {
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(h)
}

function normaliseHostname(raw) {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
}

// RDAP parsing helpers

// jCard (vCard-as-JSON) -> plain object. vcardArray looks like:
// ["vcard", [["version",{},"text","4.0"], ["fn",{},"text","Jane Doe"], ...]]
function parseVcard(vcardArray) {
  const fields = vcardArray?.[1] ?? []
  const out = {}
  for (const [name, params, , value] of fields) {
    if (name === 'adr' && Array.isArray(value)) {
      // jCard adr components, per RFC 6350 §6.3.1: [PO Box, Extended Address,
      // Street, Locality, Region, Postal Code, Country] — country is last.
      // In practice, many RDAP servers leave that last slot blank and instead
      // carry the ISO country code in the field's own `cc` parameter
      // (e.g. ["adr", {"cc": "US"}, "text", ["", "", ..., ""]]), so check
      // that first.
      out.adr = value.filter(Boolean).join(', ')
      out.country = params?.cc || value[6] || undefined
    } else if (name === 'tel') {
      out.tel = String(value).replace(/^tel:/, '')
    } else if (typeof value === 'string') {
      out[name] = value
    }
  }
  return out
}

function findEntity(entities = [], role) {
  return entities.find(e => e.roles?.includes(role))
}

function findEventDate(events = [], action) {
  return events.find(e => e.eventAction === action)?.eventDate ?? null
}

function formatDate(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return iso
  }
}

function isRedacted(value) {
  return typeof value === 'string' && /redact|privacy|withheld|not\s*disclosed/i.test(value)
}

// Passes a value through only if it's real data — redacted placeholders
// ("REDACTED FOR PRIVACY", etc.) are treated as absent so InfoRow's own
// empty-value check hides that specific field instead of showing the
// placeholder text.
function realValue(value) {
  return isRedacted(value) ? undefined : value
}

async function fetchRdapJson(url, signal) {
  const { data, success, error } = await getRequest(
    url,
    {},
    { Accept: 'application/rdap+json' },
    { signal }
  )

  if (!success) {
    if (error?.response?.status === 404) {
      throw new Error('No RDAP record found — this domain may not be registered.')
    }
    if (error?.response) {
      throw new Error(`RDAP server returned HTTP ${error.response.status}`)
    }
    throw error
  }

  return data
}

// Merge entities from a "thick" registrar RDAP response into the (usually
// thinner) registry response. Registrar data wins for contact-heavy roles
// since it's the more complete source; registry data is kept as a fallback
// for fields like the registrar's IANA ID, which some registrar RDAP servers
// omit from their own registrar entity.
function mergeEntities(primaryEntities = [], relatedEntities = []) {
  const keyFor = (e) => (e.roles ?? []).slice().sort().join(',')
  const merged = new Map()
  for (const e of primaryEntities) merged.set(keyFor(e), e)
  for (const e of relatedEntities) {
    const key = keyFor(e)
    const existing = merged.get(key)
    if (existing && key.includes('registrar') && !e.publicIds?.length && existing.publicIds?.length) {
      merged.set(key, { ...e, publicIds: existing.publicIds, entities: e.entities ?? existing.entities })
    } else {
      merged.set(key, e)
    }
  }
  return Array.from(merged.values())
}

// .com/.net (and a handful of other TLDs) use "thin" registries: the registry
// itself only knows the registrar, not registrant/admin/tech contacts — that
// data (including things like the registrant's organization) lives solely at
// the registrar's own RDAP server. The registry response points to it via a
// `rel: "related"` link, which we follow here. "Thick" registries (.org, most
// other gTLDs, many ccTLDs) already return everything in one response, so
// there's nothing to follow.
async function fetchRdap(domain, signal) {
  const primary = await fetchRdapJson(`${RDAP_BOOTSTRAP}${domain}`, signal)
  const relatedLink = primary.links?.find(l => l.rel === 'related' && (!l.type || l.type.includes('rdap')))

  if (!relatedLink?.href) return primary

  try {
    const related = await fetchRdapJson(relatedLink.href, signal)
    return { ...primary, entities: mergeEntities(primary.entities, related.entities) }
  } catch {
    // Registrar RDAP server may be down, rate-limiting us, or not CORS-enabled
    // for browser fetches. Fall back to the registry-only data rather than
    // failing the whole lookup.
    return primary
  }
}

async function queryDoh(name, type, signal) {
  const { data, success, error } = await getRequest(
    DOH_URL,
    { name, type },
    { Accept: 'application/dns-json' },
    { signal }
  )

  if (!success) {
    const status = error?.response?.status
    throw new Error(status ? `DoH HTTP ${status}` : error?.message ?? 'DoH request failed')
  }

  return data
}

async function fetchLiveDnsRecords(domain, signal) {
  const settled = await Promise.allSettled(
    LIVE_RECORD_TYPES.map(type => queryDoh(domain, type, signal).then(data => ({ type, data })))
  )
  const results = {}
  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      const { type, data } = outcome.value
      results[type] = data.Answer ?? []
    }
  }
  return results
}

function stripTrailingDot(s = '') {
  return s.replace(/\.$/, '')
}

// Cloudflare's DoH JSON returns each answer's value as a single presentation-
// format string (e.g. "10 smtp.google.com." for MX, or a space-separated
// SOA/DS/DNSKEY payload). This breaks each record type's raw `data` string
// into the same structured columns a real DNS table shows (dnschecker.org-
// style) instead of one opaque blob per row.
function parseRecordRow(type, entry, domain) {
  const name = stripTrailingDot(entry.name || domain)
  const ttl = entry.TTL
  const data = entry.data ?? ''
  const base = { Type: type, 'Domain Name': name, TTL: ttl }

  switch (type) {
    case 'A':
    case 'AAAA':
      return { ...base, Address: data }

    case 'CNAME':
    case 'NS':
    case 'PTR':
      return { ...base, 'Canonical Name': stripTrailingDot(data) }

    case 'MX': {
      const [preference, ...rest] = data.split(' ')
      return { ...base, Preference: preference, Address: stripTrailingDot(rest.join(' ')) }
    }

    case 'SRV': {
      const [priority, weight, port, ...target] = data.split(' ')
      return { ...base, Priority: priority, Weight: weight, Port: port, Target: stripTrailingDot(target.join(' ')) }
    }

    case 'SOA': {
      const [mname, rname, serial, refresh, retry, expire] = data.split(' ')
      return {
        ...base,
        'Primary NS': stripTrailingDot(mname),
        'Responsible Email': stripTrailingDot(rname),
        Serial: serial,
        Refresh: refresh,
        Retry: retry,
        Expire: expire,
      }
    }

    case 'TXT':
      // Long TXT records arrive as multiple quoted chunks: "part1" "part2"
      return { ...base, Record: data.replace(/^"|"$/g, '').replace(/"\s*"/g, '') }

    case 'CAA':
      return { ...base, Record: data }

    case 'DS': {
      const [keyTag, algorithm, digestType, ...digest] = data.split(' ')
      return { ...base, 'Key Tag': keyTag, Algorithm: algorithm, 'Digest Type': digestType, Digest: digest.join(' ') }
    }

    case 'DNSKEY': {
      const [flags, protocol, algorithm, ...publicKey] = data.split(' ')
      return { ...base, Flags: flags, Protocol: protocol, Algorithm: algorithm, 'Public Key': publicKey.join(' ') }
    }

    default:
      return { ...base, Record: data }
  }
}

//UI component helpers

function SectionCard({ icon: Icon, title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-backgroundCard border border-borderColor rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-transparent border-none cursor-pointer hover:bg-backgroundColor transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <Icon size={16} className="text-accent shrink-0" />
          <h2 className="text-sm font-semibold text-textHeader m-0">{title}</h2>
        </div>
        {open ? <ChevronUp size={14} className="text-text" /> : <ChevronDown size={14} className="text-text" />}
      </button>
      {open && <div className="border-t border-borderColor px-5 py-4">{children}</div>}
    </div>
  )
}

function InfoRow({ label, value, mono = false, copyable = false, onCopy, copiedKey, fieldKey }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-borderColor last:border-b-0">
      <span className="text-xs text-text shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`text-textHeader truncate text-right text-sm ${mono ? 'font-mono' : 'font-medium'}`}>
          {value}
        </span>
        {copyable && (
          <button
            onClick={() => onCopy(String(value), fieldKey)}
            className="text-text hover:text-accent transition-colors bg-transparent border-none cursor-pointer p-0.5 shrink-0"
            title="Copy"
          >
            {copiedKey === fieldKey ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </div>
  )
}

export default function WhoisLookup() {
  const [inputValue, setInputValue] = useState('')
  const [domain, setDomain] = useState('')
  const [rdap, setRdap] = useState(null)
  const [liveDns, setLiveDns] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copiedKey, setCopiedKey] = useState(null)
  const abortRef = useRef(null)

  const runLookup = useCallback(async () => {
    const target = normaliseHostname(inputValue)

    if (!target) {
      setError('Please enter a domain name.')
      return
    }
    if (!isValidHostname(target)) {
      setError(`"${target}" doesn't look like a valid domain name.`)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setDomain(target)
    setRdap(null)
    setLiveDns(null)

    try {
      const [rdapResult, dnsResult] = await Promise.allSettled([
        fetchRdap(target, controller.signal),
        fetchLiveDnsRecords(target, controller.signal),
      ])

      if (rdapResult.status === 'rejected') {
        if (rdapResult.reason?.name === 'AbortError') return
        throw rdapResult.reason
      }

      setRdap(rdapResult.value)
      setLiveDns(dnsResult.status === 'fulfilled' ? dnsResult.value : {})
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message ?? 'WHOIS lookup failed.')
    } finally {
      setLoading(false)
    }
  }, [inputValue])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') runLookup()
  }

  const copy = useCallback((text, key) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }, [])

  const registrar = rdap ? findEntity(rdap.entities, 'registrar') : null
  const registrarVcard = registrar ? parseVcard(registrar.vcardArray) : {}
  const registrarIanaId = registrar?.publicIds?.find(p => p.type === 'IANA Registrar ID')?.identifier
  const abuseEntity = registrar ? findEntity(registrar.entities, 'abuse') : null
  const abuseVcard = abuseEntity ? parseVcard(abuseEntity.vcardArray) : {}

  const registrant = rdap ? findEntity(rdap.entities, 'registrant') : null
  const registrantVcard = registrant ? parseVcard(registrant.vcardArray) : {}
  const registrantFields = {
    fn: realValue(registrantVcard.fn),
    org: realValue(registrantVcard.org),
    email: realValue(registrantVcard.email),
    tel: realValue(registrantVcard.tel),
    adr: realValue(registrantVcard.adr),
    country: realValue(registrantVcard.country),
  }
  const hasVisibleRegistrantData = Object.values(registrantFields).some(Boolean)

  const registeredDate = rdap ? formatDate(findEventDate(rdap.events, 'registration')) : null
  const expiresDate = rdap ? formatDate(findEventDate(rdap.events, 'expiration')) : null
  const updatedDate = rdap ? formatDate(findEventDate(rdap.events, 'last changed')) : null
  const dnssecSigned = rdap?.secureDNS?.delegationSigned

  return (
    <div className="mx-auto px-5 md:px-10 py-8 font-poppins">
      <PageHeader
        title="WHOIS Lookup"
        description="Look up domain registration data via RDAP — domain info, registrar, registrant contact, and live DNS records."
        badge="Beta"
      />

      {/* Privacy notice */}
      <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-accentBg border border-accentBorder">
        <ShieldCheck size={15} className="text-accent shrink-0 mt-0.5" />
        <p className="text-xs text-text m-0 leading-relaxed">
          <span className="text-accent font-semibold">Privacy-first.</span>{' '}
          Lookups query <span className="text-textHeader font-medium">rdap.org</span> and{' '}
          <span className="text-textHeader font-medium">Cloudflare DNS-over-HTTPS</span> directly from
          your browser. Byteflow never sees or logs your queries.
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-6">
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
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          <span className="hidden sm:inline">Lookup</span>
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-5 p-4 rounded-2xl bg-red-500/10 border border-red-400/30 flex items-start gap-2.5">
          <CircleX size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-400 font-medium m-0">Lookup failed</p>
            <p className="text-xs text-red-400/80 m-0 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/*Data loader*/}
      {!rdap && loading && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <SyncLoader color="#3B5BDB" size={13} />
          <p className="text-sm text-textHeader font-medium m-0 pt-2">Fetching Data...</p>
        </div>
      )}
      
      {/* Results */}
      {rdap && (
        <div className="flex flex-col gap-4">
          {/* Domain Information */}
          <SectionCard icon={ScrollText} title="Domain Information">
            <InfoRow label="Domain Name" value={rdap.ldhName ?? domain} mono copyable onCopy={copy} copiedKey={copiedKey} fieldKey="domain-name" />
            <InfoRow label="Registry Domain ID" value={rdap.handle} mono copyable onCopy={copy} copiedKey={copiedKey} fieldKey="domain-handle" />
            <InfoRow label="Status" value={rdap.status?.join(', ')} />
            <InfoRow label="Registered On" value={registeredDate} />
            <InfoRow label="Expires On" value={expiresDate} />
            <InfoRow label="Last Updated" value={updatedDate} />
            <InfoRow
              label="DNSSEC"
              value={rdap.secureDNS ? (dnssecSigned ? 'Signed' : 'Unsigned') : undefined}
            />
          </SectionCard>

          {/* Registrar Information */}
          <SectionCard icon={Building2} title="Registrar Information">
            {registrar ? (
              <>
                <InfoRow label="Registrar" value={registrarVcard.fn} copyable onCopy={copy} copiedKey={copiedKey} fieldKey="registrar-name" />
                <InfoRow label="IANA ID" value={registrarIanaId} mono />
                <InfoRow label="Registrar URL" value={registrarVcard.url} mono copyable onCopy={copy} copiedKey={copiedKey} fieldKey="registrar-url" />
                <InfoRow label="Abuse Contact Email" value={abuseVcard.email} mono copyable onCopy={copy} copiedKey={copiedKey} fieldKey="abuse-email" />
                <InfoRow label="Abuse Contact Phone" value={abuseVcard.tel} mono />
              </>
            ) : (
              <p className="text-xs text-text m-0">No registrar information was returned for this domain.</p>
            )}
          </SectionCard>

          {/* Registrant Contact */}
          <SectionCard icon={UserRound} title="Registrant Contact">
            {hasVisibleRegistrantData ? (
              <>
                <InfoRow label="Name" value={registrantFields.fn} />
                <InfoRow label="Organization" value={registrantFields.org} />
                <InfoRow label="Email" value={registrantFields.email} mono copyable onCopy={copy} copiedKey={copiedKey} fieldKey="registrant-email" />
                <InfoRow label="Phone" value={registrantFields.tel} mono />
                <InfoRow label="Address" value={registrantFields.adr} />
                <InfoRow label="Country" value={registrantFields.country} />
              </>
            ) : (
              <p className="text-xs text-text m-0">
                No public registrant details for this domain — either redacted for privacy or not returned.
              </p>
            )}
          </SectionCard>

          {/* DNS Records — every record type is always shown, as a proper
              table with columns specific to that record type (matching how
              tools like dnschecker.org present them), rather than a flat
              list of raw strings.*/}
          <SectionCard icon={Network} title="DNS Records">
            <div className="flex flex-col gap-4">
              {liveDns && LIVE_RECORD_TYPES.map(type => {
                const answers = liveDns[type] ?? []
                const rows = answers.map(a => parseRecordRow(type, a, domain))
                const columns = rows[0] ? Object.keys(rows[0]) : []

                return (
                  <div key={type}>
                    <div className="text-[10px] font-semibold tracking-wider text-text uppercase mb-1.5">
                      {type} Records
                    </div>
                    {rows.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-borderColor">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-backgroundColor">
                              {columns.map(col => (
                                <th
                                  key={col}
                                  className="text-left font-semibold text-text uppercase tracking-wide px-3 py-2 border-b border-borderColor whitespace-nowrap"
                                >
                                  {col}
                                </th>
                              ))}
                              <th className="px-3 py-2 border-b border-borderColor w-8" />
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, i) => {
                              const rowKey = `${type}-${i}`
                              const copyValue = columns.map(col => row[col]).join(' ')
                              return (
                                <tr key={i} className="hover:bg-backgroundColor transition-colors">
                                  {columns.map(col => (
                                    <td
                                      key={col}
                                      className="px-3 py-2 border-b border-borderColor last:border-b-0 text-textHeader font-mono align-top break-all"
                                    >
                                      {row[col]}
                                    </td>
                                  ))}
                                  <td className="px-3 py-2 border-b border-borderColor align-top">
                                    <button
                                      onClick={() => copy(copyValue, rowKey)}
                                      className="text-text hover:text-accent transition-colors bg-transparent border-none cursor-pointer p-0.5"
                                      title="Copy row"
                                    >
                                      {copiedKey === rowKey ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-text m-0 px-3 py-1.5 rounded-lg bg-backgroundColor border border-borderColor">
                        {DNSSEC_RECORD_TYPES.has(type) && !dnssecSigned
                          ? 'DNSSEC is not enabled for this domain.'
                          : `No ${type} records found.`}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </SectionCard>
        </div>
      )}

      {/* Empty state */}
      {!rdap && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-accentBg border border-accentBorder rounded-2xl p-4 mb-4 text-accent">
            <Globe size={28} />
          </div>
          <p className="text-sm text-textHeader font-medium m-0 mb-1">Enter a domain to get started</p>
          <p className="text-xs text-text m-0 max-w-xs">
            Try <code className="font-mono text-accent">cloudflare.com</code> or any domain you want to inspect.
          </p>
        </div>
      )}
    </div>
  )
}