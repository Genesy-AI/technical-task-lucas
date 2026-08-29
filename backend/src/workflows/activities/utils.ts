// Same shape as the frontend isValidEmail check (frontend/src/utils/csvParser.ts)
// so the two layers agree on what a well-formed address looks like.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function verifyEmail(email: string): Promise<boolean> {
  // Reject anything that isn't a well-formed address.
  if (!EMAIL_REGEX.test(email)) {
    return false
  }

  // Simulated provider result: this address is well-formed but unverifiable.
  if (email.includes('john.doe')) {
    return false
  }

  return true
}
