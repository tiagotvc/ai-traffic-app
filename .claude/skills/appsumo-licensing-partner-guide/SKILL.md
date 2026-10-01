---
name: appsumo-licensing-partner-guide
description: >
  Expert guide for AppSumo Licensing API v2 integration. Use this skill whenever a partner, developer, or user asks about:
  integrating with AppSumo licensing, setting up webhooks, implementing OAuth/user login, using the AppSumo Licensing API,
  handling license events (purchase, activate, upgrade, downgrade, deactivate, migrate), troubleshooting 403 errors or
  webhook failures, understanding license keys, deal add-ons, or getting started with AppSumo's partner portal configuration.
  Also trigger on any question about AppSumo license activation, customer onboarding after an AppSumo purchase, or
  validating webhooks with HMAC signatures. This skill turns Claude into a knowledgeable AppSumo licensing integration expert.
---

# AppSumo Licensing Partner Guide

You are an expert on AppSumo's Licensing API v2. Your job is to help partners (developers, product teams) integrate seamlessly with AppSumo's licensing system — answering questions, troubleshooting errors, and guiding them from zero to a working integration.

## What AppSumo Licensing Does

When a customer purchases a product on AppSumo, two things happen in sequence:

1. **Webhook**: AppSumo sends a POST to the partner's webhook URL to notify them of the license event.
2. **OAuth**: The customer is prompted to connect via OAuth, landing on the partner's redirect URL to create/log in to their account.

**Critical rule**: All license keys are exclusively generated and managed by AppSumo. Partners must store all `license_key` data and make it searchable by their support team — AppSumo does NOT store customer email addresses, only license keys.

---

## Quick Start Checklist

To get integrated, a partner needs:

1. An **OAuth Redirect URL** (handles GET requests, must return `200 OK`)
2. A **Webhook URL** (handles POST requests, must return `200 OK` + `{"event": "...", "success": true}`)
3. Both URLs validated in the [AppSumo Partner Portal](https://www.appsumo.com/partners/products/)
4. OAuth credentials (`client_id` + `client_secret`) — auto-generated after both URLs are validated
5. An **API key** — visible in the Partner Portal (hidden by default, click the eye icon)

For full setup walkthrough: see `references/quick-start.md`

---

## Webhooks

AppSumo sends webhook events for these license actions:

| Event | When it fires |
|-------|--------------|
| `purchase` | Customer buys the product |
| `activate` | Customer activates their license |
| `upgrade` | Customer upgrades to a higher tier |
| `downgrade` | Customer downgrades to a lower tier |
| `migrate` | Add-on-specific: fires on upgrade/downgrade of a parent deal |
| `deactivate` | License is deactivated (refund, cancellation, or AppSumo staff action) |

**Test webhooks**: When saving a webhook URL in the Partner Portal, AppSumo sends a test POST with `"test": true`. The endpoint must return `200` with `{"event": "purchase", "success": true}` (or the event type received). Do not trigger real product actions for test events.

**Required response format** for any webhook:
```json
{
  "event": "activate",
  "success": true
}
```

**Important nuances:**
- On `activate`: `license_status` will be `"inactive"` in the payload — AppSumo only marks it active after receiving a successful `200` response from the partner.
- On `deactivate`: `license_status` will be `"active"` in the payload — AppSumo deactivates it after the partner responds with `200`.
- On `upgrade`/`downgrade`: A new `license_key` UUID is always generated. The old key receives a simultaneous `deactivate` event. Use `prev_license_key` to find the existing user and update their key and tier.
- The partner is responsible for activating/deactivating the user in their own application.

For full webhook payload examples (including add-on payloads): see `references/webhook-payloads.md`

### Webhook Security (HMAC SHA256)

AppSumo signs every webhook with two headers:
- `X-Appsumo-Signature` — HMAC SHA256 of `timestamp + request_body`, signed with the shared API key
- `X-Appsumo-Timestamp` — Unix timestamp of when the request was sent

To verify: combine the timestamp and raw request body, generate your own HMAC SHA256 using your API key, and compare it against `X-Appsumo-Signature`. If they match, the request is authentic. This step is optional but strongly recommended.

---

## OAuth (User Login)

After a purchase, customers activate via OAuth. The flow:

**Step 1 — Extract the `code`**
After user consent, AppSumo redirects to the partner's OAuth Redirect URL with a `?code=` parameter.
```
https://your-url.com/?code=1d512d96ba99465ba9942bdf282233ea
```
The code is **single-use** — it expires after first use or if the OAuth attempt fails.

**Step 2 — Fetch an access token**
POST to `https://appsumo.com/openid/token/` with:
- `client_id` and `client_secret`
- `redirect_uri` (must match exactly what's in the Partner Portal)
- `code` from Step 1
- `grant_type`: `authorization_code`

Response:
```json
{
  "access_token": "82b35f3d810f4cf49dd7a52d4b22a594",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "0bac2d80d75d46658b0b31d3778039bb",
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**Step 3 — Fetch the license key**
GET `https://appsumo.com/openid/license_key/?access_token=YOUR_ACCESS_TOKEN`

Response:
```json
{
  "license_key": "d8bfa201-d8c0-4bc8-a27c-b1c12efa4a5a",
  "status": "active",
  "scopes": ["read_license"]
}
```

**Step 4 — Handle the user**

| License status | Meaning | Action |
|---------------|---------|--------|
| `active` | Previously activated | Log the user in |
| `inactive` | Valid but not yet activated | Create account, activate license, grant access |
| `deactivated` | No longer valid | Restrict/disable access |

When the access token expires (`401 Unauthorized`), use `refresh_token` to get a new one via POST to `https://appsumo.com/openid/token/`.

---

## Licensing API

Base URL: `https://api.licensing.appsumo.com/v2/`

**Authentication**: Include `X-AppSumo-Licensing-Key: YOUR_API_KEY` header on every request.

**Rate limit**: 20 requests per minute.

**Content-Type for POST requests**: `application/json`

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/licenses` | List all licenses (filter by status, paginate) |
| GET | `/licenses/events` | List all license events |
| GET | `/licenses/:license_key` | Get a specific license |
| GET | `/licenses/:license_key/events` | Get events for a specific license |
| GET | `/licenses/:license_key/webhook-responses` | Get webhook response history for a license |
| GET | `/profile` | Get partner profile (webhook URL, redirect URL, contacts) |
| PUT | `/profile` | Update partner profile |
| POST | `/profile/contact` | Add a contact (requires `email` and `name`) |
| DELETE | `/profile/contact/:contact_id` | Remove a contact |

Query params for list endpoints: `status` (active/inactive/deactivated), `page`, `limit` (max 100).

The API is optional — use it for auditing (e.g., verify a license is still valid, do monthly sync checks).

For full API response examples: see `references/api-reference.md`

---

## Deal Add-Ons

Add-ons are supplementary purchases attached to a parent deal (e.g., extra seats, white-labeling).

**How to identify an add-on webhook**: presence of `parent_license_key` field — this links the add-on's `license_key` to its parent deal's `license_key`.

**Add-on specific fields**:
- `parent_license_key` — UUID of the parent deal's license
- `partner_plan_name` — identifier for the add-on type (e.g., `"add_on_user_seats"`)
- `unit_quantity` — number of units purchased

**`migrate` event**: Fires on parent deal upgrade/downgrade for associated add-ons. It signals that data should be transferred to the newly issued parent `license_key`. The add-on's own `license_key` stays the same; only the `parent_license_key` changes.

---

## Common Troubleshooting

**403 Forbidden during OAuth**
- `redirect_uri` doesn't match exactly what's in the Partner Portal — check for trailing slashes, http vs https, etc.
- The `code` has already been used or expired — restart the activation process to get a fresh code
- `client_id` or `client_secret` is wrong

**Webhook not saving in Partner Portal**
- Endpoint must return `200 OK` with `{"event": "<event_type>", "success": true}` for test events
- Check that your server accepts POST requests from `appsumo.com`

**Webhook URL validation fails**
- Ensure the endpoint is publicly accessible (not localhost or behind a firewall)
- Ensure it returns HTTP 200 (not 201, not 204)

**Upgrade/downgrade: can't find the user**
- Use `prev_license_key` to look up the existing user, then replace with the new `license_key` and update the tier

**`activate` event but license_status is `inactive`**
- This is correct behavior. AppSumo marks the license active only after receiving a 200 response from the partner. Return a success response and activate the user in your system.

**How to collect user email**
- AppSumo does not send emails in webhooks. Collect email during the OAuth redirect flow — when the user lands on your `redirect_uri`, prompt them to create an account with email/password.

**Manually triggering webhook events**
- Do not do this. AppSumo exclusively manages all webhook events. Contact AppSumo support if you need a manual event — self-listed partners: support@appsumo.com, Select Partners: reach out via Slack.

**Resetting OAuth/Webhook URLs after going live**
- Contact your Launch Operations Associate to invalidate and reopen URLs for testing. Do not change these URLs on a live product without coordinating with AppSumo — it will break the connection.

---

## First-Run Onboarding

When this skill is invoked without a specific question — or when the user says anything like "get started", "set up", "boot up", "install", or "first time" — treat it as first-run onboarding:

1. Welcome the user and briefly explain what this skill covers.
2. Present the contents of `references/server.js` as a ready-to-use starting point. Show the full file in a code block and explain what each route does:
   - `POST /v2/webhooks` — handles all AppSumo webhook events and returns the required `{ event, success: true }` response
   - `GET /v2/redirect-url` — handles the OAuth redirect after a customer purchase
   - `GET /` and `POST /` — catch-all debug routes that log and echo requests
3. Tell the user to run `npm install express` and then `node server.js` to start it on port 8083.
4. Remind them they'll need a tunnel (e.g. `ngrok http 8083`) to expose `localhost:8083` so AppSumo can reach their webhook and redirect URLs during testing.
5. Point them to the Quick Start checklist above for next steps in the Partner Portal.

---

## Reference Files

- `references/quick-start.md` — Step-by-step Partner Portal setup walkthrough
- `references/webhook-payloads.md` — Full webhook payload examples for all event types including add-ons
- `references/api-reference.md` — API endpoint details with example responses
- `references/server.js` — Simple Node/Express test server that logs all requests and returns valid Licensing v2 responses
