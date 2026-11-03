# Jammy's Signature Salon — Installable PWA launcher

This package adds a branded, installable PWA home screen for the existing salon billing web app. **It does not replace or rewrite the Google Apps Script billing backend.** The PWA opens the existing Apps Script app in a new browser tab/window, where Google account authentication and the existing billing, invoice history, Reports, settings, PDF generation and WhatsApp link workflow continue to run.

## 1. Deploy the existing Apps Script app first

1. Sign in to the dedicated salon Gmail account.
2. Open the existing Google Apps Script project containing `Code.gs`, `Index.html` and `InvoicePdf.html`.
3. Do not replace the current project with the copies in `apps-script-source` unless you intentionally want to restore this exact supplied ZIP version.
4. Confirm the web app deployment is working. Use **Deploy → Manage deployments** and copy the Web app URL ending in `/exec`.
5. Restrict access to the authorised salon Google account (for a single-owner setup, choose the narrowest available access option that allows that account to use it). Keep execution as the account that owns the salon Drive files.
6. Test that the web app opens and that invoice creation, Reports and Drive permissions still work before proceeding.

## 2. Configure the PWA link

1. Open `config.js` in a text editor.
2. Replace `PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE` with the deployed Apps Script `/exec` URL.
3. Keep the URL inside the quotation marks. Do not add passwords, API keys, OAuth secrets or customer data to this file.
4. Save `config.js`.

## 3. Create the GitHub repository and publish

1. Sign in to GitHub as `jammyssignaturesalon-code`.
2. Create a repository named `jammy-salon-pwa`.
3. Upload the contents of this package to the repository root. Upload the files and folders themselves, not the outer ZIP file.
4. Open **Settings → Pages**.
5. Under Build and deployment, choose **Deploy from a branch**; select branch `main` and folder `/ (root)`, then Save.
6. Wait for GitHub Pages to publish and open the provided Pages URL over HTTPS.

**Free-plan privacy note:** GitHub Pages commonly requires a public repository on GitHub Free. Assume the PWA source files are publicly readable. This package contains no credentials, but the Apps Script backend must enforce access itself. Do not put customer records, invoices, secrets or private files in this repository. If a public source repository is unacceptable, stop before publishing and choose a host/plan that supports private-source deployment.

## 4. Install on devices

### Android

Open the GitHub Pages URL in Chrome. Use the **Install App** button if Chrome offers it, or Chrome menu → **Install app** / **Add to Home screen**.

### iPhone / iPad

Open the GitHub Pages URL in Safari → Share → **Add to Home Screen** → Add. iOS does not allow a website to force installation; the user must confirm this manually.

## 5. Daily use

Open the Jammy Salon icon. The branded welcome page appears first. Tap **Open Billing App** and sign in with the authorised salon Google account if Google asks. The billing app opens separately. The PWA welcome page itself does not store the Gmail password or a login token.

## Important limitations and security

- This is a PWA launcher, not a conversion of the Apps Script billing interface into a fully offline PWA. Billing requires internet and the Apps Script service.
- The current Apps Script interface uses `google.script.run`; it cannot run directly as a GitHub Pages frontend. This package intentionally preserves the working Apps Script frontend instead of introducing an untested public API bridge.
- The existing backend sets each invoice PDF to **Anyone with the link – Viewer** so the WhatsApp message can contain a customer-openable link. Anyone who obtains that link can view that PDF. Keep the invoice contents appropriate for link sharing.
- WhatsApp opens with a pre-filled draft; staff still review and press Send. It is not sent automatically.
- Test installation, sign-in, invoice creation, PDF access, WhatsApp sharing and reports on both Android and iPhone before relying on the app at the salon.
