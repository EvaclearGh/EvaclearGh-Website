import Header, { AnnouncementBar } from './Header.jsx'
import Footer, { CookieBanner, WhatsAppFloat } from './Footer.jsx'
import CartDrawer from './CartDrawer.jsx'

export default function Layout({ children }) {
  return (
    <>
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        Skip to main content
      </a>
      <AnnouncementBar />
      <Header />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <Footer />
      <CartDrawer />
      <WhatsAppFloat />
      <CookieBanner />
    </>
  )
}
