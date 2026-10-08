import { useEffect, useRef } from 'react'

/**
 * Accessible dialog behaviour: focus moves inside on open, Tab is trapped,
 * Escape closes, page scroll is locked, focus returns to the opener on close.
 */
export default function useDialog(open, onClose) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement
    const node = ref.current
    const focusables = () =>
      [...node.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
        (el) => el.offsetParent !== null,
      )
    const first = node.querySelector('[data-autofocus]') || focusables()[0]
    setTimeout(() => first?.focus(), 30)
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      } else if (e.key === 'Tab') {
        const els = focusables()
        if (!els.length) return
        const a = els[0]
        const z = els[els.length - 1]
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault()
          z.focus()
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault()
          a.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      opener?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  return ref
}
