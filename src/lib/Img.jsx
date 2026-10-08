/*
 * Responsive, lazy-loaded image.
 * `src` can be either:
 *   - a prepared photo from public/images/photos, by name ("floor-cleaner-range") or path
 *     ("/images/photos/floor-cleaner-range-1280.webp") → served as WebP in 640px & 1280px
 *   - any other path or URL (e.g. "/images/uploads/new-product.webp" from the website editor)
 */
import sizes from '../data/photo-sizes.json'

const env = import.meta.env || {}
// Base path for files in /public. "./" is used for single-file previews.
export const ASSET_BASE = env.VITE_ASSET_BASE ?? '/'

export function asset(path) {
  if (!path || /^(https?:|data:)/.test(path)) return path
  return ASSET_BASE + path.replace(/^\//, '')
}

/** The name of a prepared photo (which has 640px and 1280px versions), or null. */
export function photoKey(src) {
  if (!src) return null
  if (sizes[src]) return src
  const m = /^\/?images\/photos\/(.+)-(?:640|1280)\.webp$/.exec(src)
  return m && sizes[m[1]] ? m[1] : null
}

export function photoUrl(src, width = 1280) {
  if (!src) return ''
  const key = photoKey(src)
  if (key) return asset(`/images/photos/${key}-${width}.webp`)
  return asset(src)
}

export function isPortrait(src) {
  const s = sizes[photoKey(src)]
  return s ? s[1] > s[0] : false
}

export default function Img({ src, alt = '', className = '', sizesAttr = '(min-width: 1024px) 33vw, 100vw', priority = false, fit, ...rest }) {
  if (!src) return null
  const key = photoKey(src)
  const known = key ? sizes[key] : null
  const objectFit = fit || (known && known[1] > known[0] ? 'contain' : 'cover')
  const common = {
    alt,
    loading: priority ? 'eager' : 'lazy',
    decoding: priority ? 'sync' : 'async',
    fetchPriority: priority ? 'high' : undefined,
    className: `${className} ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`,
    ...rest,
  }
  if (known) {
    return (
      <img
        src={photoUrl(src, 1280)}
        srcSet={`${photoUrl(src, 640)} 640w, ${photoUrl(src, 1280)} 1280w`}
        sizes={sizesAttr}
        width={known[0]}
        height={known[1]}
        {...common}
      />
    )
  }
  return <img src={photoUrl(src)} {...common} />
}
