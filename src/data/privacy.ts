// Shared by the sign-up forms (consent record) and the /privacy page.
// Bump PRIVACY_VERSION whenever the policy text changes in a way that needs fresh consent.
export const PRIVACY_VERSION = '2026-10-22'

// TODO before launch: replace with a real mailbox you control.
export const CONTACT_EMAIL = 'privacy@ecopet.example'

/** What gets stored on the account when someone ticks the consent box while signing up. */
export const consentRecord = () => ({
  privacy_consent_version: PRIVACY_VERSION,
  privacy_consent_at: new Date().toISOString(),
})
