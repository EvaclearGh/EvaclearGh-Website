import { Router, matchPath, useRouter } from './lib/router.jsx'
import { SeoProvider } from './lib/seo.jsx'
import { CartProvider } from './context/CartContext.jsx'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import NotFound from './pages/NotFound.jsx'
import Collection from './pages/Collection.jsx'
import Product from './pages/Product.jsx'
import Bundles from './pages/Bundles.jsx'
import Checkout from './pages/Checkout.jsx'
import OrderConfirmed from './pages/OrderConfirmed.jsx'
import HowItWorks from './pages/HowItWorks.jsx'
import OurStory from './pages/OurStory.jsx'
import { Blog, Article } from './pages/Blog.jsx'
import { Stockists, Contact, Help, Wholesale } from './pages/Support.jsx'
import { Rewards, Refer, Privacy, Terms } from './pages/Info.jsx'
import { AccountPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages/AccountPages.jsx'
import AdminPage from './pages/Admin.jsx'
import { InvoicePage, ReceiptPage, StatementPage } from './pages/CreditDocs.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

// Route table: [path pattern, page component]
export const routes = [
  ['/', Home],
  ['/shop', Collection],
  ['/collections/:slug', Collection],
  ['/products/:slug', Product],
  ['/bundles', Bundles],
  ['/checkout', Checkout],
  ['/order-confirmed', OrderConfirmed],
  ['/how-it-works', HowItWorks],
  ['/our-story', OurStory],
  ['/tips', Blog],
  ['/tips/:slug', Article],
  ['/help', Help],
  ['/stockists', Stockists],
  ['/contact', Contact],
  ['/wholesale', Wholesale],
  ['/rewards', Rewards],
  ['/refer', Refer],
  ['/account', AccountPage],
  ['/account/login', LoginPage],
  ['/account/register', RegisterPage],
  ['/account/reset', ResetPasswordPage],
  ['/account/invoice', InvoicePage],
  ['/account/receipt', ReceiptPage],
  ['/account/statement', StatementPage],
  ['/admin', AdminPage],
  ['/privacy', Privacy],
  ['/terms', Terms],
]

function Routes() {
  const { pathname } = useRouter()
  for (const [pattern, Page] of routes) {
    const params = matchPath(pattern, pathname)
    if (params) return <Page key={pathname} params={params} />
  }
  return <NotFound />
}

export default function App({ url, seoCollector }) {
  return (
    <Router url={url}>
      <SeoProvider collector={seoCollector}>
        <AuthProvider>
          <CartProvider>
            <Layout>
              <Routes />
            </Layout>
          </CartProvider>
        </AuthProvider>
      </SeoProvider>
    </Router>
  )
}
