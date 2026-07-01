const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const NUMBERS = '0123456789'
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?'
const SIMILAR = 'il1Lo0O'

// Uses window.crypto.getRandomValues for cryptographically secure randomness
function getSecureRandomInt(max) {
  const array = new Uint32Array(1)
  window.crypto.getRandomValues(array)
  return array[0] % max
}

export function generatePassword({ length, useUpper, useLower, useNumbers, useSymbols, excludeSimilar }) {
  let charset = ''
  if (useLower) charset += LOWERCASE
  if (useUpper) charset += UPPERCASE
  if (useNumbers) charset += NUMBERS
  if (useSymbols) charset += SYMBOLS

  if (excludeSimilar) {
    charset = charset.split('').filter(c => !SIMILAR.includes(c)).join('')
  }

  if (!charset) return ''

  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset[getSecureRandomInt(charset.length)]
  }
  return password
}

export function calculateEntropy(length, poolSize) {
  if (poolSize <= 0) return 0
  return length * Math.log2(poolSize)
}

export function strengthFromEntropy(bits) {
  if (bits >= 100) return { label: 'Very Strong', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-400/30', pct: 100 }
  if (bits >= 70) return { label: 'Strong', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-400/30', pct: 80 }
  if (bits >= 45) return { label: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-400/30', pct: 55 }
  if (bits >= 25) return { label: 'Weak', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-400/30', pct: 30 }
  return { label: 'Very Weak', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-400/30', pct: 10 }
}