/**
 * Evaclear wordmark, matching the company letterhead:
 * "EVACLEAR" in bold capitals with "TRADING ENTERPRISE" underneath, in the letterhead green.
 * To use an image logo instead, put the file in /public and return <img src="/logo.png" alt="" height="40" />.
 */
export default function Logo({ light = false, className = '' }) {
  const color = light ? '#ffffff' : 'var(--evc-brand-ink)'
  return (
    <span className={`inline-flex flex-col items-center leading-none ${className}`} style={{ color, fontFamily: 'var(--evc-font-logo)' }}>
      <span className="text-[1.55rem] font-bold tracking-[0.02em] sm:text-[1.7rem]">EVACLEAR</span>
      <span className="mt-0.5 text-[0.62rem] font-normal tracking-[0.12em] sm:text-[0.68rem]">TRADING ENTERPRISE</span>
    </span>
  )
}
