# Quick Start: Setting Up AppSumo Licensing

## What You Need Before You Start

- An approved product on AppSumo
- A publicly accessible **OAuth Redirect URL** (must handle GET requests and return `200 OK`)
- A publicly accessible **Webhook URL** (must handle POST requests and return `200 OK` + JSON)

## Step 1: Register Your URLs in the Partner Portal

Go to [AppSumo Partner Portal](https://www.appsumo.com/partners/products/) and navigate to your product's API settings.

### Webhook URL Validation

AppSumo validates your webhook URL by sending a test POST request with this payload:

```json
{
  "license_key": "00000000-aaaa-1111-bbbb-abcdef012345",
  "event": "purchase",
  "license_status": "inactive",
  "event_timestamp": 1318781876406,
  "created_at": 1318738512,
  "test": true
}
```

Your endpoint must respond with HTTP `200` and:

```json
{
  "event": "purchase",
  "success": true
}
```

The event field should echo back whatever event type was received. Validate any event type that appears in the test: at minimum `activate` and `deactivate` must work. `purchase` is optional but recommended.

### OAuth Redirect URL Validation

AppSumo validates your OAuth Redirect URL by sending a GET request with no payload. Your endpoint must return `200 OK`. No body is required for this check.

## Step 2: Get Your OAuth Credentials

Once both URLs are successfully validated, AppSumo auto-generates:
- `client_id`
- `client_secret`

These appear in the Partner Portal. They're hidden by default — click the eye icon to reveal them.

## Step 3: Get Your API Key

Your API key is also in the Partner Portal (same eye-icon pattern). You'll use this for:
- Authenticating Licensing API requests (`X-AppSumo-Licensing-Key` header)
- Verifying webhook signatures (HMAC SHA256 shared secret)

## Step 4: Test with Developer Credits

Once configured, AppSumo provides developer credits so you can:
- Click the buy button on your product page
- Receive real webhook payloads
- Walk through the full OAuth activation flow
- Review License History in the API settings section

## Checklist

- [ ] OAuth Redirect URL registered and validated (GET → 200)
- [ ] Webhook URL registered and validated (POST → 200 + success JSON)
- [ ] `client_id` and `client_secret` retrieved from Partner Portal
- [ ] API key retrieved from Partner Portal
- [ ] Webhook handler stores `license_key` in your database
- [ ] Support dashboard can look up customers by `license_key`
- [ ] OAuth flow creates/links user accounts to license keys
- [ ] `deactivate` events disable user access in your system
- [ ] `upgrade`/`downgrade` events update user tier using `prev_license_key` → new `license_key`
