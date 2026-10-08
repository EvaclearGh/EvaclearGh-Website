# Evaclear Store: Evafresh home cleaning products

Online store for **Evaclear Trading Enterprise** (Kumasi, Ghana), built with React and Tailwind CSS.
**Day-to-day changes are made in the website editor** at **/cms** (products, prices, photos, contact details, delivery fees, blog…), then published with one button in the Staff dashboard (**/admin → Website**). See section 16. Behind the scenes the content is plain JSON files in `content/` and `src/data/`.

---

## 1. Run it on your computer

You need [Node.js](https://nodejs.org) version 20 or newer.

```bash
npm install        # first time only
npm run dev        # opens a live preview at http://localhost:5173
npm run build      # makes the finished website in the /dist folder
```

`npm run build` also **pre-renders every page** to plain HTML and creates `sitemap.xml`. That makes the site load faster on slow mobile connections and helps Google read it.

## 2. Put it online

**Recommended: GitHub + Netlify** (needed for the website editor and Publish button, see section 16). Netlify reads `netlify.toml` and builds the site itself.

Or upload the finished **`dist`** folder to any static host:

- **Netlify** or **Cloudflare Pages** (free): connect the project, set the build command to `npm run build` and the publish folder to `dist`.
- **Vercel**: the same settings.
- **cPanel / shared hosting**: run `npm run build` and upload the contents of `dist/` into `public_html`.

Then change `siteUrl` in `src/data/site.json` to your real domain and rebuild. Search engines, link previews and the sitemap all use that address.

---

## 3. Everyday edits (all in `src/data/`)

| What you want to change | File | Field |
|---|---|---|
| WhatsApp number | `site.json` | `whatsapp.number`: digits only, international format, e.g. `233256116151`; also update `whatsapp.display` |
| WhatsApp greeting message | `site.json` | `whatsapp.greeting` |
| Phone numbers shown on the site | `site.json` | `phones` (list; `phone` is the main number) |
| Email, address, digital address, opening hours | `site.json` | `email`, `address`, `openingHours` |
| Instagram / Facebook / TikTok links | `site.json` | `social` |
| Tagline | `site.json` | `tagline` (3 alternatives are listed in `taglineAlternatives`) |
| Announcement bar text | `site.json` | `announcement` |
| **Free-delivery amount** | `delivery.json` | `freeDeliveryThreshold` |
| **Delivery zones, fees and times** | `delivery.json` | `zones` (set `freeAboveThreshold: true` on zones that get free delivery) |
| Pickup option | `delivery.json` | `pickup` (set `enabled: false` to hide it) |
| **Products, prices, sizes, scents** | `products.json` | see section 4 |
| Menu links and the two promo tiles in the Shop menu | `navigation.json` | |
| Collections and categories | `collections.json` | |
| Product reviews | `reviews.json` | |
| Home page testimonials | `testimonials.json` | |
| "Trusted by" logos and press quotes | `press.json` | |
| Help Centre FAQs | `faqs.json` | |
| Blog / cleaning tips | `articles.json` | |
| Stockists (Where to Buy) | `stockists.json` | |
| Marketing claims in "Why Evaclear" | `site.json` | `claims` (see section 7) |

Save the file and the preview updates immediately. Run `npm run build` again before uploading.

---

## 4. Editing products

**Use the website editor (/cms → Products & packs)**. The details below are for people editing the files directly.

Each product is its own file in **`content/products/`** (e.g. `content/products/floor-cleaner.json`). When the site is built, `scripts/build-content.mjs` combines them into `src/data/products.json`, so don't edit that file by hand. Blog articles work the same way: `content/articles/*.json`, with the article text written in Markdown (`## Heading`, `- bullet`). Two extra fields: `"published": false` hides a product or article, and `"order"` sets the shop order (lower first).

Each product looks like this. Only the main fields are shown:

```json
{
  "id": "floor-cleaner",                    // also the web address: /products/floor-cleaner
  "type": "product",                        // "product" or "bundle"
  "name": "Evafresh Floor Cleaner",
  "tagline": "Clean, shine and protect",    // small green line above the name
  "shortDescription": "One line for product cards.",
  "description": "Longer text for the product page.",
  "category": "floor-cleaners",             // laundry, dishwashing, surface-cleaners, floor-cleaners, bathroom, hand-care, air-care, accessories, kits
  "alsoIn": ["bathroom"],                   // optional: show in extra categories too
  "collections": ["best-sellers"],          // best-sellers, starter-packs, bundles, refills, accessories
  "badge": "New",                           // "Best Seller", "Most Loved", "New" or ""
  "variants": [
    { "id": "fc-1l", "size": "1L", "price": 25, "image": "/images/photos/floor-cleaner-range-1280.webp" },
    { "id": "fc-5l", "size": "5L", "price": 100, "compareAt": 120 }
  ],
  "images": ["/images/photos/floor-cleaner-range-1280.webp", "/images/uploads/new-photo.webp"],
  "usedFor": ["Tiles", "Terrazzo"],
  "benefits": ["Cleans, shines and protects"],
  "ingredients": "…",
  "howToUse": ["Step 1", "Step 2"],
  "dilution": [{ "use": "Everyday mopping", "ratio": "1 capful in 5L water" }],
  "safety": "Keep out of reach of children…",
  "faqs": [{ "q": "Question?", "a": "Answer." }],
  "popularity": 3,                          // 1 = best seller (used for "Best selling" sort)
  "dateAdded": "2026-03-01",                // used for "Newest" sort
  "lineupOrder": 3,                         // optional: position in the home page "Everything You Need" list
  "crossSell": ["bleach", "multipurpose-liquid-soap"]   // "Complete your set" suggestions
}
```

- **Prices** are plain numbers in cedis (`25` shows as GH₵25).
- **Sale price:** add `"compareAt"` to a variant to show a crossed-out old price.
- **Scents:** add `"scent": "Lemon"` to variants. The product page then shows scent buttons and size buttons.
- **Bundles:** set `"type": "bundle"` and list the items in `"includes"`. The "Worth GH₵X, you save GH₵Y" figures are calculated automatically from the item prices.
- **Remove a product:** untick **Show on website** in the editor (or delete its file). The build warns you if a pack still includes it.
- **Every `id` must be unique.** Use lowercase letters and dashes only.

> ⚠️ All prices and many sizes are **placeholders**. Check every price before launch.
> Fields marked `[PLACEHOLDER]` (ingredients, dilution ratios) need your real label information.

## 5. Photos

**Easiest: upload photos in the website editor.** They are saved in `public/images/uploads/`, automatically converted to WebP and resized to at most 1600 px, so they stay fast on mobile data.

Your original photos are in `public/images/photos/`, already converted to WebP in two sizes (`-640` and `-1280`). The site automatically uses the small size on phones. In the JSON files they appear as `/images/photos/NAME-1280.webp` (the short form `NAME` also still works).

To add a photo without the editor, you have two options:

- **Easiest:** put `my-photo.jpg` in `public/images/` and use `"/images/my-photo.jpg"` in the JSON.
- **Fastest-loading:** export two WebP files named `my-photo-640.webp` and `my-photo-1280.webp` into `public/images/photos/`, then add `"my-photo": [1280, 853]` (the width and height) to `src/data/photo-sizes.json`. After that you can use `"my-photo"`.

Keep photos under about 200 KB each so the site stays fast on mobile data.
The sample accessories (spray bottle, pump, cloths) use simple drawings in `public/images/placeholders/`. Replace them or delete those products.

## 6. Colours and fonts

Open **`src/index.css`**. The top of the file has the brand colours:

```css
--evc-primary: #0f5c5a;     /* main teal */
--evc-aqua:    #a8e3d9;     /* soft aqua accent */
--evc-lime:    #cde77f;     /* badges */
--evc-bg:      #faf7f2;     /* page background */
--evc-ink:     #23292b;     /* text */
```

Change a value and the whole site updates. To change fonts, edit the Google Fonts link in `index.html` and the `--evc-font-heading` and `--evc-font-body` lines in `src/index.css`.

The logo is drawn in `src/components/Logo.jsx`. To use your own logo file, put it in `public/` and replace the `<svg>…</svg>` with `<img src="/logo.svg" alt="" width="34" height="34" />`.

## 7. Marketing claims (important)

The "Why Evaclear" section on the home page only shows claims you have **confirmed are true**. In `site.json` → `claims`:

```json
"previewUnconfirmed": true,   // ← set to false BEFORE launch
"gentleOnSkin": false,
"toughOnStains": false,
"locallyMade": false,
"valueConcentrates": false,
"lessPlastic": false,
"safeAroundKids": false
```

While `previewUnconfirmed` is `true`, every claim is shown with a "Needs your confirmation" tag so you can see the design.
Set each claim you can back up to `true`, then set `previewUnconfirmed` to `false`. The rest disappear.
Germ-kill or safety claims may need approval from the Ghana FDA before you use them.

## 8. Checkout and payments

### Pay by Mobile Money to the company wallet (switched on)

At checkout, customers see the company MTN MoMo wallet (**025 611 6151, Evaclear Trading Enterprise**), the exact amount and their order reference, with copy buttons and *170# steps. After paying they enter the **Transaction ID** from their SMS. WhatsApp then opens with the order and payment details.

**Before you dispatch an order, check the Transaction ID and amount in your MoMo statement.** The website cannot confirm MoMo payments by itself.

Change the wallet details in `site.json → momo` (number, display, accountName, network). Set `"enabled": false` to hide this option.

### Bank transfer, cash deposit and cheque (switched on)

Checkout also offers payment into **Evaclear Trading Enterprise, Ecobank, Harper Road Adum Branch, account 1441005160147**. Customers pick transfer, cash deposit or cheque, see the account details and their order reference, and send their receipt or slip on WhatsApp. Cheques are payable to Evaclear Trading Enterprise and orders ship after the cheque clears. Edit the details in `site.json → bank`.

### VISA / card payments into the Ecobank account

A website can't take a VISA card payment straight into a bank account; it needs a payment gateway. With Paystack (below), set the **settlement (payout) account** in your Paystack dashboard to the Ecobank account above (Settings → Payouts / Settlement bank). Every card payment is then paid out into that account automatically.

### Other options


Checkout offers two options:

1. **Order via WhatsApp.** This always works. The cart becomes a pre-filled WhatsApp message with the items, quantities, delivery fee, total and the customer's details, sent to `site.json → whatsapp.number`.
2. **Pay online.** Customers pay with MTN MoMo, Telecel Cash, AirtelTigo Money or Visa/Mastercard through **Paystack** (default) or **Flutterwave**.

### To switch on online payments

1. Create a Paystack (or Flutterwave) business account and get your **public key**.
2. Copy `.env.example` to `.env` and fill it in:

   ```
   VITE_PAYMENT_PROVIDER=paystack
   VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxx
   ```

3. **Recommended:** deploy `server/verify-payment.js` as a serverless function on Netlify or Vercel. Put your **secret key** (`PAYSTACK_SECRET_KEY`) in your host's environment settings, then set `VITE_VERIFY_PAYMENT_URL` to the function's address. This confirms each payment really happened before you ship.
4. Run `npm run build` again and upload.

Until a key is added, the "Pay online" option shows "coming soon" and customers can still order on WhatsApp.
**Never put a secret key (`sk_…`) in `.env` with a `VITE_` prefix.** Anything prefixed `VITE_` is visible to everyone who visits the site.

## 9. Customer accounts and buying on credit

Customers and institutions can create an account, log in, see their orders and, once you approve them, **buy on credit**. This runs on **Supabase**, a free service that stores the logins and orders securely. A plain website can't store accounts on its own, so you set this up once.

### What customers see
- **Create an account** (`/account/register`): as a business/institution (name, type, registration/TIN, contact person) or an individual. They can request a credit limit.
- **My Account** (`/account`): approval status, credit limit, amount owed, available credit and overdue warnings. Each order shows its invoice, balance and due date, and the customer's saved details are here too.
- **Invoices** (`/account/invoice?ref=…`): a numbered invoice (INV-order ref) for every order. It shows bill-to details, items, delivery, total, amount paid, balance due, due date and how to pay.
- **Record a payment:** after paying by MoMo, bank transfer, bank deposit, cheque or cash, the customer enters the amount, date and transaction ID or cheque number. They can pay one invoice or their whole balance (oldest invoices first). It shows as *Being checked* until you confirm it, and they can send the slip on WhatsApp in one tap.
- **Receipts** (`/account/receipt?id=…`): once you confirm a payment, a numbered receipt (RCT-2026-00001) appears. It shows the amount in words and which invoices it paid.
- **Statement & outstanding payments** (`/account/statement`): everything owed, ageing (not yet due, 1–30, 31–60, 61–90 and over 90 days overdue), each outstanding invoice, and all invoices and payments with a running balance.
- **Order received:** on each order the customer taps **Yes, I received it** (the order is marked Delivered) or **Report a problem** with a short note.
- Invoices, receipts and statements have **Print / Save as PDF** and print cleanly on A4.
- **Checkout:** approved accounts get a **Buy on credit** option, defaulted for them. It's blocked automatically if the order is above their available credit or anything is overdue. Their details are filled in automatically.

### What you (staff) see: `/admin`
- **Accounts:** new applications appear under *Pending*. Set the credit limit and payment days, then **Approve**, **Reject** or **Suspend credit**.
- **Orders:** every order with its invoice link, balance and due date, and whether the customer confirmed receipt or reported a problem (there's a *Problems reported* filter). Change the status (confirmed, delivered…). Money that arrives without the customer recording it (e.g. cash at the office) can be recorded with **Record** or **Paid in full**, and a receipt is issued straight away.
- **Payments:** payments customers have recorded wait under *To check*. Check each one on your MoMo or Ecobank statement, correct the amount if needed, then **Confirm & issue receipt** (or **Not received**, with a note the customer will see). Confirming applies the money to the chosen invoice first, then the oldest unpaid invoices.
- **Statement** on each account card opens that customer's statement, which you can print or send to them.

The database enforces all the rules, not just the web pages. Customers can't approve themselves, change their own limit, see other customers' data, or create a credit order beyond their limit.

### One-time setup (about 15 minutes)
1. Create a free account at **supabase.com**, then **New project** (region: choose the closest, e.g. Europe West).
2. Open **SQL Editor → New query**, paste the whole of `supabase/schema.sql` and click **Run**. Then do the same with `supabase/notifications.sql` (section 10) and `supabase/credit-documents.sql` (invoices, payments, receipts and delivery confirmation), in that order.
3. Go to **Authentication → URL Configuration**. Set **Site URL** to your domain (e.g. `https://www.evacleartradingenterprise.com`) and add `https://www.evacleartradingenterprise.com/**` under Redirect URLs.
4. Go to **Project Settings → API**. Copy the **Project URL** and the **anon public** key into `.env`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
   (Or send them to Claude to rebuild the upload-ready folder for you. Never share the `service_role` key.)
5. Run `npm run build` and upload the new `dist` folder.
6. Register on your own website with your work email, then in Supabase **SQL Editor** run:
   ```sql
   update public.profiles set role = 'admin', status = 'approved' where email = 'your-email@example.com';
   ```
   Log out and in again: you'll see **Staff dashboard** in My Account, and `/admin` works.

Optional: under **Authentication → Providers → Email** you can turn off "Confirm email" if customers struggle with confirmation emails. You can also add your own email sender (SMTP) so emails come from your domain.

### Good to know
- Check the item prices on each new credit order before confirming it (the order list shows them).
- **Already set up Supabase before invoices and receipts were added?** Just run `supabase/credit-documents.sql` once in the SQL Editor. It is safe to run again.
- With WhatsApp alerts on (section 10), you also get a message when a customer **records a payment**, **confirms an order arrived** or **reports a problem**.
- Without the Supabase keys, accounts are switched off and **My Account** shows the WhatsApp tracking page instead.
- The free Supabase plan is plenty for a shop this size. Free projects pause after a week with no activity, so log in to the dashboard occasionally, or upgrade, if the site goes quiet.

## 10. Automatic WhatsApp alerts to the company number

Every order placed on the website, by a guest or a logged-in customer with any payment method, is saved in Supabase. The database then **sends a copy to the company WhatsApp (025 611 6151) automatically**. You also get an alert whenever a **new customer account is created and needs approval**. Customers don't have to tap "Send" in WhatsApp any more.

The messages are sent by **CallMeBot**, a free service for sending WhatsApp alerts to your own number.

### Setup (about 5 minutes)
1. On the phone that has the **company WhatsApp (025 611 6151)**, save the contact shown on callmebot.com/blog/free-api-whatsapp-messages/ (at the time of writing: **+34 621 331 709**).
2. Send it this exact WhatsApp message: `I allow callmebot to send me messages`
3. Within a few minutes it replies with your **API key** (a number such as `1234567`).
4. In Supabase, go to **SQL Editor**, paste the whole of `supabase/notifications.sql` and click **Run**.
5. Still in SQL Editor, run this with your key:
   ```sql
   insert into private.whatsapp_settings (id, provider, phone, callmebot_key)
   values (true, 'callmebot', '+233256116151', 'YOUR_KEY')
   on conflict (id) do update set provider = excluded.provider, phone = excluded.phone,
     callmebot_key = excluded.callmebot_key, enabled = true;
   ```
6. Test it: `select private.send_whatsapp('test', 'Evaclear alerts are working');`. You should receive the message within a minute.

The key is stored in a private part of the database that the website and the public can't read.
To pause the alerts: `update private.whatsapp_settings set enabled = false;`
To see what was sent: `select * from private.whatsapp_log order by id desc limit 20;`

**Alternative:** if you later move to the official WhatsApp Business **Cloud API** (from Meta), set `provider = 'cloudapi'` and fill in `cloud_token`, `cloud_phone_id` and an approved `cloud_template` in the same settings table.

**Fallback:** if the alert can't be saved (no internet, Supabase down), checkout falls back to opening WhatsApp so the customer can send the order themselves. To switch automatic alerts off completely, set `notifications.whatsappAlerts` to `false` in `src/data/site.json`.

## 11. Android app and "install" on phones

- **Installable website (PWA):** `public/manifest.webmanifest`, `public/icons/` and `public/sw.js` let customers add the shop to their home screen (Chrome → ⋮ → Install app). Pages they've visited still open on a weak connection, and `public/offline.html` shows when there's no internet. Accounts, payments and WhatsApp are never cached. If you change `sw.js`, bump `VERSION` at the top.
- **Android app:** the separate `evaclear-android` project wraps this website in a Play Store app. See its README.
- **App links:** after publishing the app, save the filled-in `assetlinks.json` from the Android project as `public/.well-known/assetlinks.json` and redeploy, so website links open in the app.
- **"Get the app" button:** set `app.playStoreUrl` in `src/data/site.json`. It shows in the footer, but not inside the app.

## 12. Forms (newsletter, contact, wholesale)

There is no server, so:

- **Newsletter:** paste a form endpoint from Formspree, Mailchimp or Brevo into `site.json → newsletter.endpoint`.
- **Contact and Wholesale forms:** paste a Formspree endpoint into `site.json → forms`. If you leave it empty, the form opens WhatsApp with the details pre-filled.

## 13. Sample content to replace before launch

Search the `src/data` folder for `SAMPLE` and `[PLACEHOLDER]`. Content to replace:

- Reviews and testimonials: each has `"sample": true` and is labelled on the site.
- "Trusted by" logos and press quotes: placeholders.
- Stockists: fictional examples.
- Our Story text and team: `src/pages/OurStory.jsx`.
- Privacy Policy and Terms: `src/pages/Info.jsx`. Have these reviewed by a legal professional.
- The Rewards and Refer-a-Friend rules: sample amounts.
- Video guides on How It Works: placeholders.

## 14. Project structure

```
content/
  products/      ← one file per product (edited in /cms)
  articles/      ← one file per blog article (edited in /cms)
src/
  data/          ← settings, delivery, menus, FAQs… (JSON, edited in /cms); products.json & articles.json are generated
  pages/         ← one file per page
  components/    ← header, footer, cart drawer, product card, etc.
  lib/           ← helpers: router, SEO, payments, WhatsApp, delivery, images
  context/       ← the shopping cart
  index.css      ← colours, fonts, shared styles
public/          ← photos, favicon, robots.txt, social share image (og-image.jpg)
  cms/           ← the website editor (index.html + config.yml)
netlify.toml     ← build settings for Netlify
server/          ← optional payment-verification function
supabase/        ← database setup: schema.sql, notifications.sql, credit-documents.sql, website-admin.sql
scripts/         ← build-content.mjs (content → data), page pre-rendering + sitemap
```

## 15. Built-in features

- **Accessibility:** keyboard navigation, visible focus outlines, skip link, labelled forms with error messages, alt text and screen-reader announcements. Animations are reduced for people who prefer less motion.
- **SEO:** a unique title and description on every page, Open Graph tags for WhatsApp and Facebook link previews, Product, FAQ, Article and Store schema, clean URLs, a sitemap and robots.txt.
- **Performance:** lazy-loaded responsive WebP images, pre-rendered HTML, no heavy libraries, and fonts that load without blocking the page.
- **Cart:** saved in the visitor's browser, so it survives a page refresh.

## 16. Website editor, publishing & maintenance (for the website administrator)

**Where to log in**

| What | Address | Login |
|---|---|---|
| **Staff dashboard** (accounts, orders, payments, **Website** tab) | `/admin` (also the **Staff login** link at the bottom of every page) | Your staff email & password (a website account with `role = 'admin'`, see section 9) |
| **Website editor** (products, prices, photos, contact details…) | `/cms` (or **Open website editor** in /admin → Website) | **Sign In with GitHub** (or a GitHub access token) |
| Hosting, publish history, undo | app.netlify.com | Your Netlify login |
| Database, customer logins, backups | supabase.com/dashboard | Your Supabase login |

**How it works:** you edit in `/cms` → each save is stored safely in your GitHub repository (not live yet) → when you've finished, press **Publish website now** in `/admin → Website` → Netlify rebuilds the site and it's live in about 2 minutes. Every change is kept in GitHub's history, so any edit can be undone.

> **Why a Publish button?** On Netlify's free plan each publish uses 15 of your 300 monthly credits (about 20 publishes a month). If credits run out, Netlify pauses the site until the next month. So editor saves don't publish by themselves (their commit messages contain `[skip netlify]`). Make several edits, then publish once.

### One-time setup (about 30 minutes)

**A. Put the project on GitHub**
1. Create a free account at **github.com** (use the business email). Create a **private** repository called `evaclear-website`.
2. Upload the contents of `evaclear-store.zip` (unzipped). The quickest way is **Add file → Upload files**: drag everything in, including the `content`, `public`, `src`, `scripts` and `supabase` folders, `netlify.toml` and `package.json`, then **Commit changes**.
3. Open `public/cms/config.yml` in GitHub (click it, then the ✏️ pencil), change `YOUR-GITHUB-USERNAME/evaclear-website` to your real `username/evaclear-website`, and commit.

**B. Connect Netlify to GitHub** (this replaces drag-and-drop uploads)
1. In Netlify: **Add new project → Import an existing project → GitHub**, choose `evaclear-website`. The build settings are read from `netlify.toml` (build `npm run build`, publish `dist`). Click **Deploy**.
2. Move your domain to this new Netlify project (**Domain management → Add a domain**), or delete the old drag-and-drop project first so the domain is free. DNS records at WordPress.com/Squarespace stay the same.
3. **Build hook for the Publish button:** **Project configuration → Build & deploy → Build hooks → Add build hook** (name `Publish button`, branch `main`). Copy the address.
4. In **Supabase → SQL Editor**, run `supabase/website-admin.sql`, then save the hook:
   ```sql
   insert into private.site_settings (id, netlify_build_hook)
   values (true, 'https://api.netlify.com/build_hooks/PASTE_YOUR_HOOK_ID')
   on conflict (id) do update set netlify_build_hook = excluded.netlify_build_hook;
   ```
   The address is stored privately: staff can press the button but can't see or copy it.

**C. Let the editor sign in with GitHub**
1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**. Name: `Evaclear website editor`. Homepage URL: `https://www.evacleartradingenterprise.com`. Authorization callback URL: `https://api.netlify.com/auth/done`. Create it, then **Generate a new client secret**.
2. Netlify → your project → **Project configuration → Access & security → OAuth → Install provider → GitHub**, and paste the Client ID and Client secret.
3. Open `https://www.evacleartradingenterprise.com/cms/` and click **Sign In with GitHub**.

   *Alternative without step C:* click **Sign In Using Access Token** and paste a GitHub *fine-grained personal access token* for this one repository with **Contents: Read and write**. The token is remembered in that browser only.

**D. Fill in the dashboard links:** in the editor open **Business details & settings → Staff dashboard links** and enter your GitHub repository, Netlify site name and site ID. This turns on the status badge and the maintenance links in /admin → Website. Then press **Publish website now**.

**Other people who can edit:** invite them to the GitHub repository (**Settings → Collaborators**). For the staff dashboard, give their website account the admin role (section 9). Remove access the same way when someone leaves.

### Everyday use
- **Change a price:** /cms → Products & packs → choose the product → *Sizes & prices* → Save. Then /admin → Website → **Publish website now**.
- **Add a product:** /cms → Products & packs → **New** (or duplicate a similar product and change it). Upload photos, add at least one size and price, Save, Publish.
- **Hide a product** (out of stock): untick **Show on website**, Save, Publish.
- **Change the top banner, phone numbers, MoMo or bank details:** Business details & settings → Business details, contact & payments.
- **Undo a bad publish:** Netlify → Deploys → pick the previous good one → **Publish deploy**. To undo an edit itself, find it in GitHub → Commits.

### Monthly maintenance
The checklist is in /admin → Website. In short: test checkout on a phone, check prices and stock, approve accounts and confirm payments, **download customers, orders and payments (CSV)**, log in to Supabase so the free project doesn't pause, check Netlify for failed publishes and credits, and renew the domain in time. Developers can update packages with `npm update` and test with `npm run build`.

### Without GitHub (manual way)
The editor also has **Work with Local Repository** (Chrome or Edge on a computer): open the unzipped project folder, edit visually, then run `npm run build` and drag the `dist` folder to Netlify as before.
