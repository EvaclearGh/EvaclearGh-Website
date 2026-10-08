import { Link } from '../lib/router.jsx'
import { useSeo } from '../lib/seo.jsx'

export default function NotFound() {
  useSeo({ title: 'Page not found', noindex: true })
  return (
    <section className="container-x py-24 text-center">
      <p className="eyebrow mb-3">Error 404</p>
      <h1 className="text-4xl sm:text-5xl">This page has been wiped clean</h1>
      <p className="mx-auto mt-4 max-w-md text-muted">We couldn't find the page you were looking for. It may have moved, or the link may be wrong.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn btn-primary">
          Go to home page
        </Link>
        <Link to="/shop" className="btn btn-outline">
          Shop all products
        </Link>
      </div>
    </section>
  )
}
