// Shown on every screen (UX.md: privacy). Keep it true: if anything the
// candidate says ever goes over the network, this wording has to change. The
// font (Inter) comes from Google Fonts, so the downloads line names it.
export function PrivacyNote() {
  return (
    <p className="privacy-note">
      Everything runs in this browser. What you say never leaves this device; the
      only downloads are the models (the first time) and the font.
    </p>
  )
}
