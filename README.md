# Nivesha payments backend

Two tiny serverless endpoints that keep the Razorpay **secret** key off the
phone: the app only ever holds the public Key ID.

- `POST /api/create-order` — app sends `{ planId }`, backend creates a
  Razorpay order (amount comes from `api/_plans.ts`, never trusted from the
  client) and returns the order id + public key id.
- `POST /api/verify-payment` — app sends back Razorpay's
  `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`; backend
  recomputes the HMAC signature with the secret key and confirms the
  payment is genuine before the app marks the plan active.

## Deploy (one time)

1. Install the Vercel CLI once: `npm i -g vercel`
2. From this folder: `vercel` — log in with GitHub when it opens the
   browser, accept the defaults (it'll ask to link/create a project, say
   yes to create a new one).
3. In the Vercel dashboard for this project → **Settings → Environment
   Variables**, add:
   - `RAZORPAY_KEY_ID` = your Razorpay **Test** Key Id (starts `rzp_test_`)
   - `RAZORPAY_KEY_SECRET` = your Razorpay **Test** Key Secret
4. Redeploy once from the dashboard (or run `vercel --prod` again) so the
   new environment variables take effect.
5. Copy the deployment URL (looks like
   `https://nivesha-payments-backend.vercel.app`) — that goes into the
   Nivesha app's `src/config/apiKeys.ts` as `PAYMENTS_BACKEND_URL`.

## Going live later

When Razorpay finishes your KYC and gives you **Live** keys, just replace
the two environment variables in Vercel with the live `rzp_live_...` pair
and redeploy — no app code changes needed.
