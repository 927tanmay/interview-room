import { useEffect, useRef, type ReactNode } from 'react'

// Every screen starts with its heading, and focus moves to it when the screen
// appears, so keyboard and screen reader users land at the top of the new
// screen instead of on a button that no longer exists.
export function ScreenFrame({ title, children }: { title: string; children: ReactNode }) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    // The screen's one glass panel (UX.md: blur only on a few big panels).
    <section className="screen glass" aria-labelledby="screen-title">
      <h1 id="screen-title" ref={headingRef} tabIndex={-1}>
        {title}
      </h1>
      {children}
    </section>
  )
}
