# AppSumo Licensing API v2 Reference

Base URL: `https://api.licensing.appsumo.com/v2/`

## Authentication

All requests require:
```
X-AppSumo-Licensing-Key: YOUR_API_KEY
```

Find your API key in the AppSumo Partner Portal (hidden by default — click the eye icon).

**Rate limit**: 20 requests per minute.

**POST content-type**: `application/json`

---

## Licensing Endpoints

### GET /licenses

List all licenses for your application.

**Query parameters:**
- `status` — Filter by `active`, `inactive`, or `deactivated`
- `page` — Page number (starts at 1)
- `limit` — Results per page (max 100)

**Example:**
```
GET https://api.licensing.appsumo.com/v2/licenses?limit=1&page=1&status=active
```

**Response fields:** `license_key`, `status`, `tier`, `created_at`, `updated_at`, plus redemption and change-plan URLs.

---

### GET /licenses/events

Fetch all license events for your application, with webhook responses (limited to 10 items per event).

**Query parameters:** `status`, `page`, `limit`

**Example:**
```
GET https://api.licensing.appsumo.com/v2/licenses/events?limit=1&page=1&status=active
```

---

### GET /licenses/:license_key

Get details for a specific license.

**Example:**
```
GET https://api.licensing.appsumo.com/v2/licenses/2191a2c1-01a9-4060-8067-1b466484f21b
```

---

### GET /licenses/:license_key/events

Get all events for a specific license, with paginated webhook responses.

---

### GET /licenses/:license_key/webhook-responses

Get detailed webhook request/response history for a specific license. Useful for debugging missed or failed webhook deliveries.

---

## License Status Values

| Status | Meaning |
|--------|---------|
| `inactive` | License exists but has not been activated yet |
| `active` | License is active and the user has access |
| `deactivated` | License has been deactivated (refund, cancellation, etc.) |

---

## Partner Profile Endpoints

### GET /profile

Retrieve your complete partner profile.

**Example:**
```
GET https://api.licensing.appsumo.com/v2/profile
```

**Response includes:**
- Profile ID and timestamps
- `webhook_url` and `redirect_url`
- `contacts` array (size + individual contact details: ID, name, email, timestamps)

---

### PUT /profile

Update your partner profile (webhook URL, redirect URL).

---

### POST /profile/contact

Add a new contact to your partner profile. AppSumo uses contacts as a backup communication channel if direct app requests fail.

**Required body:**
```json
{
  "email": "developer@yourcompany.com",
  "name": "Developer Name"
}
```

**Example:**
```
POST https://api.licensing.appsumo.com/v2/profile/contact
```

**Response:** Contact ID, name, email, and timestamps.

---

### DELETE /profile/contact/:contact_id

Remove a contact. Get the `contact_id` from GET /profile.

**Example:**
```
DELETE https://api.licensing.appsumo.com/v2/profile/contact/19
```

**Response:** Confirmation message.

---

## When to Use the API

The API is **optional**. Common use cases:
- Auditing: verify a license is still valid before granting access
- Monthly sync: check that license statuses in your system match AppSumo's records
- Debugging: inspect webhook response history to diagnose delivery failures
- Support: look up a customer by `license_key` to verify their tier and status

The primary integration path is webhooks (real-time) + OAuth (user onboarding). Use the API as a supplement, not a replacement.
