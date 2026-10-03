// Shown on every screen (UX.md: privacy). Keep it true: if anything the
// candidate says ever goes over the network, this wording has to change.
export function PrivacyNote() {
  return (
    <p className="privacy-note">
      Everything runs in this browser. What you say never leaves this device; the
      only download is the models, the first time.
    </p>
  )
}
