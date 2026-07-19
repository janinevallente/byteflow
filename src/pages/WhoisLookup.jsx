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
  ChevronDown,
  ChevronUp,
  Globe,
  CircleX,
  MapPin,
} from 'lucide-react'
import { SyncLoader } from 'react-spinners'
import PageHeader from '../components/ui/PageHeader'
import { getRdapRequest } from '../api/apiClient'

// RDAP endpoints
const RDAP_DOMAIN_BOOTSTRAP = 'https://rdap.org/domain/' //for domain query
const RDAP_IP_BOOTSTRAP = 'https://rdap.org/ip/' //for ip query

// Validation functions
function isValidHostname(h) {
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(h)
}

function isValidIPv4(ip) {
  return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)
}

function normaliseInput(raw) {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
}

// Detect if input is an IP or domain
function detectQueryType(input) {
  if (isValidIPv4(input)) return 'ip'
  if (isValidHostname(input)) return 'domain'
  return 'unknown'
}

// RDAP parsing helpers
function parseVcard(vcardArray) {
  const fields = vcardArray?.[1] ?? []
  const out = {}
  for (const [name, params, , value] of fields) {
    if (name === 'adr' && Array.isArray(value)) {
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
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')
  } catch {
    return iso
  }
}

function isRedacted(value) {
  return typeof value === 'string' && /redact|privacy|withheld|not\s*disclosed/i.test(value)
}

function realValue(value) {
  return isRedacted(value) ? undefined : value
}

// Capitalize first letter of each word
function capitalizeWords(str) {
  if (!str) return str
  return str.split(' ').map(word => {
    if (word.length === 0) return word
    return word.charAt(0).toUpperCase() + word.slice(1)
  }).join(' ')
}

// Get color for status based on status type
function getStatusColor(status) {
  const statusLower = status.toLowerCase()
  
  // Active/OK statuses - green
  if (statusLower.includes('ok') || 
      statusLower.includes('active') || 
      statusLower.includes('verified')) {
    return 'bg-green-500/10 text-green-400 border-green-500/20'
  }
  
  // Prohibited/Restricted statuses - red
  if (statusLower.includes('prohibited') || 
      statusLower.includes('blocked') || 
      statusLower.includes('locked') ||
      statusLower.includes('hold')) {
    return 'bg-red-500/10 text-red-400 border-red-500/20'
  }
  
  // Pending/In progress statuses - yellow
  if (statusLower.includes('pending') || 
      statusLower.includes('processing') || 
      statusLower.includes('in progress') ||
      statusLower.includes('hold')) {
    return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
  }
  
  // Transfer related - purple
  if (statusLower.includes('transfer') || 
      statusLower.includes('change')) {
    return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  }
  
  // Deletion/Expiry related - orange
  if (statusLower.includes('delete') || 
      statusLower.includes('expir') || 
      statusLower.includes('expired')) {
    return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
  }
  
  // Auto renew - cyan
  if (statusLower.includes('auto renew')) {
    return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
  }
  
  // Default - blue
  return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
}

async function fetchRdapJson(url, signal) {
  const { data, success, error, status, message } = await getRdapRequest(
    url,
    {},
    { signal }
  )

  if (!success) {
    if (status === 404) {
      throw new Error('No RDAP record found for this query.')
    }
    if (status) {
      throw new Error(`RDAP server returned HTTP ${status}`)
    }
    throw error || new Error('RDAP request failed')
  }

  return data
}

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

async function fetchRdapDomain(domain, signal) {
  const primary = await fetchRdapJson(`${RDAP_DOMAIN_BOOTSTRAP}${domain}`, signal)
  const relatedLink = primary.links?.find(l => l.rel === 'related' && (!l.type || l.type.includes('rdap')))

  if (!relatedLink?.href) return primary

  try {
    const related = await fetchRdapJson(relatedLink.href, signal)
    return { ...primary, entities: mergeEntities(primary.entities, related.entities) }
  } catch {
    return primary
  }
}

async function fetchRdapIP(ip, signal) {
  return await fetchRdapJson(`${RDAP_IP_BOOTSTRAP}${ip}`, signal)
}

// Main lookup function that auto-detects query type
async function fetchRdap(input, signal) {
  const queryType = detectQueryType(input)
  
  if (queryType === 'domain') {
    return { data: await fetchRdapDomain(input, signal), type: 'domain' }
  } else if (queryType === 'ip') {
    return { data: await fetchRdapIP(input, signal), type: 'ip' }
  } else {
    throw new Error('Invalid input. Please enter a valid domain name or IPv4 address.')
  }
}

// UI component helpers
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

// RDAP plain text display for IP lookups
function RdapTextDisplay({ data, queryInput }) {
  const ipNetwork = data?.ipNetwork || data
  
  // Extract entities
  const registrant = data ? findEntity(data.entities, 'registrant') : null
  const registrantVcard = registrant ? parseVcard(registrant.vcardArray) : {}
  const registrantFields = {
    fn: realValue(registrantVcard.fn),
    org: realValue(registrantVcard.org),
    email: realValue(registrantVcard.email),
    tel: realValue(registrantVcard.tel),
    adr: realValue(registrantVcard.adr),
    country: realValue(registrantVcard.country),
  }
  
  // Find technical and abuse contacts
  const techEntity = data ? findEntity(data.entities, 'technical') : null
  const techVcard = techEntity ? parseVcard(techEntity.vcardArray) : {}
  
  const abuseEntity = data ? findEntity(data.entities, 'abuse') : null
  const abuseVcard = abuseEntity ? parseVcard(abuseEntity.vcardArray) : {}
  
  // Get dates
  const registeredDate = data ? formatDate(findEventDate(data.events, 'registration')) : null
  const updatedDate = data ? formatDate(findEventDate(data.events, 'last changed')) : null

  // Build the RDAP plain text output as an array of lines
  const lines = []
  
  // RDAP header
  lines.push('RDAP IP Network Information')
  lines.push('='.repeat(40))
  lines.push('')
  
  // Network Information
  if (ipNetwork.startAddress && ipNetwork.endAddress) {
    lines.push(`Network Range:    ${ipNetwork.startAddress} - ${ipNetwork.endAddress}`)
  }
  if (ipNetwork.cidr) {
    lines.push(`CIDR:             ${ipNetwork.cidr}`)
  }
  if (ipNetwork.name) {
    lines.push(`Network Name:     ${ipNetwork.name}`)
  }
  if (ipNetwork.handle) {
    lines.push(`Handle:           ${ipNetwork.handle}`)
  }
  if (ipNetwork.parentHandle) {
    lines.push(`Parent Handle:    ${ipNetwork.parentHandle}`)
  }
  if (ipNetwork.type) {
    lines.push(`Network Type:     ${ipNetwork.type}`)
  }
  if (data?.country) {
    lines.push(`Country:          ${data.country}`)
  }
  if (registrantFields.org) {
    lines.push(`Organization:     ${registrantFields.org}`)
  }
  if (registeredDate) {
    lines.push(`Registration Date: ${registeredDate}`)
  }
  if (updatedDate) {
    lines.push(`Last Updated:     ${updatedDate}`)
  }
  if (data?.status && data.status.length > 0) {
    lines.push(`Status:           ${data.status.join(', ')}`)
  }
  if (data?.remarks && data.remarks.length > 0 && data.remarks[0].description) {
    const comment = data.remarks[0].description.join(' ')
    lines.push(`Comment:          ${comment}`)
  }
  if (data?.links && data.links.find(l => l.rel === 'self')?.href) {
    lines.push(`Reference:        ${data.links.find(l => l.rel === 'self')?.href}`)
  }
  
  lines.push('')
  lines.push('Organization Details')
  lines.push('-'.repeat(40))
  lines.push('')
  
  // Organization details
  if (registrantFields.org || registrant) {
    if (registrantFields.org) {
      lines.push(`Organization Name: ${registrantFields.org}`)
    }
    if (registrant?.handle) {
      lines.push(`Organization ID:   ${registrant.handle}`)
    }
    if (registrantFields.adr) {
      lines.push(`Address:           ${registrantFields.adr}`)
    }
    if (registrantVcard.locality) {
      lines.push(`City:              ${registrantVcard.locality}`)
    }
    if (registrantVcard.region) {
      lines.push(`State/Province:    ${registrantVcard.region}`)
    }
    if (registrantVcard.postalCode) {
      lines.push(`Postal Code:       ${registrantVcard.postalCode}`)
    }
    if (registrantFields.country) {
      lines.push(`Country:           ${registrantFields.country}`)
    }
    if (registrantFields.email) {
      lines.push(`Email:             ${registrantFields.email}`)
    }
    if (registrantFields.tel) {
      lines.push(`Phone:             ${registrantFields.tel}`)
    }
    if (registeredDate) {
      lines.push(`Registration Date: ${registeredDate}`)
    }
    if (updatedDate) {
      lines.push(`Last Updated:      ${updatedDate}`)
    }
    if (registrant?.links && registrant.links.find(l => l.rel === 'self')?.href) {
      lines.push(`Reference:         ${registrant.links.find(l => l.rel === 'self')?.href}`)
    }
  } else {
    lines.push('No organization details available')
  }
  
  lines.push('')
  lines.push('Contacts')
  lines.push('-'.repeat(40))
  lines.push('')
  
  // Abuse Contact
  if (abuseEntity) {
    lines.push('Abuse Contact:')
    if (abuseEntity.handle) {
      lines.push(`  Handle:          ${abuseEntity.handle}`)
    }
    if (abuseVcard.fn) {
      lines.push(`  Name:            ${abuseVcard.fn}`)
    }
    if (abuseVcard.tel) {
      lines.push(`  Phone:           ${abuseVcard.tel}`)
    }
    if (abuseVcard.email) {
      lines.push(`  Email:           ${abuseVcard.email}`)
    }
    if (abuseEntity.links && abuseEntity.links.find(l => l.rel === 'self')?.href) {
      lines.push(`  Reference:       ${abuseEntity.links.find(l => l.rel === 'self')?.href}`)
    }
    lines.push('')
  }
  
  // Technical Contact
  if (techEntity) {
    lines.push('Technical Contact:')
    if (techEntity.handle) {
      lines.push(`  Handle:          ${techEntity.handle}`)
    }
    if (techVcard.fn) {
      lines.push(`  Name:            ${techVcard.fn}`)
    }
    if (techVcard.tel) {
      lines.push(`  Phone:           ${techVcard.tel}`)
    }
    if (techVcard.email) {
      lines.push(`  Email:           ${techVcard.email}`)
    }
    if (techEntity.links && techEntity.links.find(l => l.rel === 'self')?.href) {
      lines.push(`  Reference:       ${techEntity.links.find(l => l.rel === 'self')?.href}`)
    }
    lines.push('')
  }
  
  // Administrative Contact (if available)
  const adminEntity = data ? findEntity(data.entities, 'administrative') : null
  const adminVcard = adminEntity ? parseVcard(adminEntity.vcardArray) : {}
  if (adminEntity) {
    lines.push('Administrative Contact:')
    if (adminEntity.handle) {
      lines.push(`  Handle:          ${adminEntity.handle}`)
    }
    if (adminVcard.fn) {
      lines.push(`  Name:            ${adminVcard.fn}`)
    }
    if (adminVcard.tel) {
      lines.push(`  Phone:           ${adminVcard.tel}`)
    }
    if (adminVcard.email) {
      lines.push(`  Email:           ${adminVcard.email}`)
    }
    if (adminEntity.links && adminEntity.links.find(l => l.rel === 'self')?.href) {
      lines.push(`  Reference:       ${adminEntity.links.find(l => l.rel === 'self')?.href}`)
    }
    lines.push('')
  }
  
  // Events
  if (data?.events && data.events.length > 0) {
    lines.push('Events')
    lines.push('-'.repeat(40))
    data.events.forEach(event => {
      const date = formatDate(event.eventDate)
      if (date) {
        lines.push(`${event.eventAction}: ${date}`)
      }
    })
    lines.push('')
  }
  
  // Nameservers (if any)
  if (data?.nameservers && data.nameservers.length > 0) {
    lines.push('Nameservers')
    lines.push('-'.repeat(40))
    data.nameservers.forEach(ns => {
      if (ns.ldhName) {
        lines.push(`  ${ns.ldhName}`)
      }
    })
    lines.push('')
  }
  
  // RDAP footer
  lines.push('='.repeat(40))
  lines.push(`RDAP query for: ${queryInput}`)
  lines.push(`Data source: rdap.org`)

  // Join all lines with newlines
  const whoisText = lines.join('\n')

  return (
    <div className="bg-backgroundCard border border-borderColor rounded-2xl overflow-hidden font-mono">
      <div className="p-5 overflow-x-auto">
        <div className="flex justify-between items-start mb-3">
          <span className="text-xs text-text">RDAP Plain Text Format</span>
          <button
            onClick={() => navigator.clipboard.writeText(whoisText)}
            className="text-text hover:text-accent transition-colors bg-transparent border-none cursor-pointer p-1 text-xs flex items-center gap-1"
          >
            <Copy size={12} />
            Copy All
          </button>
        </div>
        <pre className="text-xs text-text whitespace-pre-wrap break-all">
          {whoisText}
        </pre>
      </div>
    </div>
  )
}

export default function WhoisLookup() {
  const [inputValue, setInputValue] = useState('')
  const [queryInput, setQueryInput] = useState('')
  const [rdapData, setRdapData] = useState(null)
  const [queryType, setQueryType] = useState(null) // 'domain' or 'ip'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copiedKey, setCopiedKey] = useState(null)
  const abortRef = useRef(null)

  const runLookup = useCallback(async () => {
    const target = normaliseInput(inputValue)

    if (!target) {
      setError('Please enter a domain name or IP address.')
      return
    }

    const detectedType = detectQueryType(target)
    if (detectedType === 'unknown') {
      setError(`"${target}" doesn't look like a valid domain name or IPv4 address.`)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setQueryInput(target)
    setRdapData(null)
    setQueryType(null)

    try {
      const result = await fetchRdap(target, controller.signal)
      setRdapData(result.data)
      setQueryType(result.type)
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message ?? 'Lookup failed.')
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

  // Get data for structured view
  const registrar = rdapData ? findEntity(rdapData.entities, 'registrar') : null
  const registrarVcard = registrar ? parseVcard(registrar.vcardArray) : {}
  const registrarIanaId = registrar?.publicIds?.find(p => p.type === 'IANA Registrar ID')?.identifier
  const abuseEntity = registrar ? findEntity(registrar.entities, 'abuse') : null
  const abuseVcard = abuseEntity ? parseVcard(abuseEntity.vcardArray) : {}

  const registrant = rdapData ? findEntity(rdapData.entities, 'registrant') : null
  const registrantVcard = registrant ? parseVcard(registrant.vcardArray) : {}
  const registrantFields = {
    fn: registrantVcard.fn,
    org: registrantVcard.org,
    email: realValue(registrantVcard.email),
    tel: realValue(registrantVcard.tel),
    adr: realValue(registrantVcard.adr),
    country: realValue(registrantVcard.country),
  }
  const hasVisibleRegistrantData = Object.values(registrantFields).some(Boolean)

  const registeredDate = rdapData ? formatDate(findEventDate(rdapData.events, 'registration')) : null
  const expiresDate = rdapData ? formatDate(findEventDate(rdapData.events, 'expiration')) : null
  const updatedDate = rdapData ? formatDate(findEventDate(rdapData.events, 'last changed')) : null
  const dnssecSigned = rdapData?.secureDNS?.delegationSigned

  const isIPQuery = queryType === 'ip'
  const ipNetwork = rdapData?.ipNetwork || rdapData

  // Format status with capitalization
  const formatStatus = (status) => {
    if (!status) return status
    return capitalizeWords(status.replace(/_/g, ' '))
  }

  return (
    <div className="mx-auto px-5 md:px-10 py-8 font-poppins">
      <PageHeader
        title="WHOIS Lookup"
        description="Look up domain registration via RDAP — works with both domain names and IPv4 addresses."
      />

      {/* Privacy notice */}
      <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-accentBg border border-accentBorder">
        <ShieldCheck size={15} className="text-accent shrink-0 mt-0.5" />
        <p className="text-xs text-text m-0 leading-relaxed">
          <span className="text-accent font-semibold">Privacy-first.</span>{' '}
          Lookups query <span className="text-textHeader font-medium">rdap.org</span> directly from
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
            placeholder="example.com or 8.8.8.8"
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

      {/* Query type indicator */}
      {queryType && rdapData && !loading && (
        <div className="mb-4 flex items-center gap-2 text-xs">
          <span className="text-text">Query type:</span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
            isIPQuery 
              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
          }`}>
            {isIPQuery ? <MapPin size={12} /> : <Globe size={12} />}
            {isIPQuery ? 'IP Address' : 'Domain Name'}
          </span>
        </div>
      )}

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

      {/* Data loader */}
      {!rdapData && loading && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <SyncLoader color="#3B5BDB" size={13} />
          <p className="text-sm text-textHeader font-medium m-0 pt-2">Fetching Data...</p>
        </div>
      )}

      {/* Results */}
      {rdapData && !loading && (
        <div className="flex flex-col gap-4">
          {isIPQuery ? (
            // RDAP plain text display for IP lookups
            <RdapTextDisplay data={rdapData} queryInput={queryInput} />
          ) : (
            // Structured format for domain lookups
            <>
              {/* Domain Information */}
              <SectionCard icon={ScrollText} title="Domain Information">
                <InfoRow label="Domain Name" value={rdapData.ldhName ?? queryInput} mono copyable onCopy={copy} copiedKey={copiedKey} fieldKey="domain-name" />
                <InfoRow label="Registry Domain ID" value={rdapData.handle} mono copyable onCopy={copy} copiedKey={copiedKey} fieldKey="domain-handle" />
                
                {/* Status with colorful badges */}
                {rdapData.status && rdapData.status.length > 0 && (
                  <div className="flex items-start gap-3 py-2 border-b border-borderColor last:border-b-0">
                    <span className="text-xs text-text shrink-0 pt-0.5">Status</span>
                    <div className="flex-1 flex flex-wrap gap-1.5 justify-end">
                      {rdapData.status.map((status, index) => {
                        const formattedStatus = formatStatus(status)
                        const colorClass = getStatusColor(status)
                        return (
                          <span
                            key={index}
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}
                          >
                            {formattedStatus}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                <InfoRow label="Registered On" value={registeredDate} />
                <InfoRow label="Expires On" value={expiresDate} />
                <InfoRow label="Last Updated" value={updatedDate} />
                <InfoRow
                  label="DNSSEC"
                  value={rdapData.secureDNS ? (dnssecSigned ? 'Signed' : 'Unsigned') : undefined}
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
            </>
          )}
        </div>
      )}

      {/* Empty state */}
      {!rdapData && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Globe size={32} className="text-accent mx-auto mb-2.5 sm:mb-3 sm:size-10" />
          <p className="text-sm text-textHeader font-medium m-0 mb-1">Enter a domain or IP to get started</p>
          <p className="text-xs text-text m-0 max-w-xs">
            Try <code className="font-mono text-accent">cloudflare.com</code> or{' '}
            <code className="font-mono text-accent">8.8.8.8</code>
          </p>
        </div>
      )}
    </div>
  )
}