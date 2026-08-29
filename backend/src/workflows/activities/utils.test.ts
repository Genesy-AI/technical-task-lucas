import { describe, it, expect } from 'vitest'
import { verifyEmail } from './utils'

describe('verifyEmail', () => {
  it('returns false for john.doe emails (simulated non-existent address)', async () => {
    expect(await verifyEmail('john.doe@example.com')).toBe(false)
  })

  it('returns false for malformed emails', async () => {
    expect(await verifyEmail('not-an-email')).toBe(false)
    expect(await verifyEmail('missing@domain')).toBe(false)
    expect(await verifyEmail('@example.com')).toBe(false)
    expect(await verifyEmail('spaces in@example.com')).toBe(false)
    expect(await verifyEmail('')).toBe(false)
  })

  it('returns true for a properly formatted plus-addressed email', async () => {
    expect(await verifyEmail('user+tag@example.com')).toBe(true)
  })

  it('returns true for a normal email', async () => {
    expect(await verifyEmail('emily.johnson@example.com')).toBe(true)
  })

  // Regression guard: jane.smith used to sleep 20s, which (with the 1s activity
  // timeout + unlimited retries) hung the whole verify-emails request forever.
  it('resolves quickly for jane.smith emails (no 20s hang)', async () => {
    const start = Date.now()
    const result = await verifyEmail('jane.smith@example.com')
    const elapsed = Date.now() - start

    expect(result).toBe(true)
    expect(elapsed).toBeLessThan(1000)
  })
})
