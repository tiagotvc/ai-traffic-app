# Webhook Payload Reference

All webhooks are POST requests. AppSumo accepts `application/json` or `application/x-www-form-urlencoded`.
All responses from AppSumo are returned in JSON format.

## Required Response for Every Webhook

```json
{
  "event": "<same event type as received>",
  "success": true
}
```

HTTP status must be `200`.

---

## Webhook Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `license_key` | string (UUID) | The license key for this event. RFC 4122 UUID. |
| `prev_license_key` | string (UUID) | Previous license key. Only present on `upgrade` and `downgrade`. |
| `event` | string | One of: `purchase`, `activate`, `upgrade`, `downgrade`, `migrate`, `deactivate` |
| `event_timestamp` | integer | Unix timestamp (ms) when the webhook was sent. Changes on retry. |
| `created_at` | integer | Unix timestamp (s) when the license was created. Does not change on retry. |
| `license_status` | string | Current license status on AppSumo's side (`inactive`, `active`, `deactivated`) |
| `tier` | integer | License tier number (1, 2, 3, ...) |
| `test` | boolean | `true` for test/validation requests; ignore data but still return 200 + success |
| `extra` | object | Metadata. Contains `reason` string explaining why the webhook fired. |
| `partner_plan_name` | string | **Add-on only.** Identifier for the add-on type (e.g., `"add_on_user_seats"`). |
| `parent_license_key` | string (UUID) | **Add-on only.** Links the add-on's license to its parent deal's license key. |
| `unit_quantity` | integer | **Add-on only.** Number of units purchased (e.g., 15 seats, 1 white-label). |

---

## Event Payloads

### Purchase Event

Fires when a customer buys the product. Use this to pre-create a placeholder account.

**Standard (no add-ons):**
```json
{
  "license_key": "3794577c-3dbc-11ec-9bbc-0242ac130002",
  "event": "purchase",
  "license_status": "inactive",
  "event_timestamp": 1318781876406,
  "created_at": 1318738512,
  "test": false
}
```

**With 2 deal add-ons (3 separate webhook calls):**
```json
{
  "license_key": "9869ba65-cf39-405e-98db-6e2ca29f94fa",
  "event": "purchase",
  "event_timestamp": 1754671919169,
  "created_at": 1754671919158,
  "license_status": "inactive",
  "tier": 2,
  "extra": { "reason": "Purchased" },
  "partner_plan_name": "License Tier 2",
  "unit_quantity": 1
}
```
```json
{
  "license_key": "9204570c-7832-47e2-8708-efb67d702995",
  "event": "purchase",
  "event_timestamp": 1754671919197,
  "created_at": 1754671919194,
  "license_status": "inactive",
  "tier": 1,
  "extra": { "reason": "Purchased" },
  "partner_plan_name": "addon_partner_name_here_add_seats",
  "unit_quantity": 10,
  "parent_license_key": "9869ba65-cf39-405e-98db-6e2ca29f94fa"
}
```
```json
{
  "license_key": "1a5eb69f-4fb3-4734-ba69-e6e9fdd7da1b",
  "event": "purchase",
  "event_timestamp": 1754671919221,
  "created_at": 1754671919219,
  "license_status": "inactive",
  "tier": 1,
  "extra": { "reason": "Purchased" },
  "partner_plan_name": "addon_partner_name_here_white_labeling",
  "unit_quantity": 1,
  "parent_license_key": "9869ba65-cf39-405e-98db-6e2ca29f94fa"
}
```

**Standalone add-on purchased after parent deal already activated** (triggers both `purchase` AND `activate` for the add-on):
```json
{
  "license_key": "b0c3ceec-d4dd-4ca6-a074-744e08733729",
  "event": "purchase",
  "event_timestamp": 1754671919221,
  "created_at": 1754671919219,
  "license_status": "inactive",
  "tier": 1,
  "extra": { "reason": "Purchased" },
  "partner_plan_name": "addon_partner_name_here_white_labeling",
  "unit_quantity": 1,
  "parent_license_key": "826315d7-1bfc-43d9-a3b4-ef80c47352b6"
}
```
```json
{
  "license_key": "b0c3ceec-d4dd-4ca6-a074-744e08733729",
  "event": "activate",
  "event_timestamp": 1754671919221,
  "created_at": 1754671919219,
  "license_status": "inactive",
  "tier": 1,
  "extra": { "reason": "Post-purchase add-on for active parent deal" },
  "partner_plan_name": "addon_partner_name_here_white_labeling",
  "unit_quantity": 1,
  "parent_license_key": "826315d7-1bfc-43d9-a3b4-ef80c47352b6"
}
```

---

### Activate Event

Fires when a customer activates their license and begins the OAuth flow.

Note: `license_status` is `"inactive"` — AppSumo activates it only after receiving a `200` response.

**Standard:**
```json
{
  "license_key": "3794577c-3dbc-11ec-9bbc-0242ac130002",
  "event": "activate",
  "license_status": "inactive",
  "event_timestamp": 1318781876406,
  "created_at": 1318738512,
  "tier": 1,
  "test": false,
  "extra": {
    "reason": "Purchased by the customer"
  }
}
```

**With 2 deal add-ons:**
```json
{
  "license_key": "9869ba65-cf39-405e-98db-6e2ca29f94fa",
  "event": "activate",
  "event_timestamp": 1754671943761,
  "created_at": 1754671943750,
  "license_status": "inactive",
  "tier": 2,
  "extra": { "reason": "Activated by user" },
  "partner_plan_name": "License Tier 2",
  "unit_quantity": 1
}
```
```json
{
  "license_key": "9204570c-7832-47e2-8708-efb67d702995",
  "event": "activate",
  "event_timestamp": 1754671943783,
  "created_at": 1754671943781,
  "license_status": "inactive",
  "tier": 1,
  "extra": { "reason": "Parent deal activated" },
  "partner_plan_name": "addon_partner_name_here_add_seats",
  "unit_quantity": 10,
  "parent_license_key": "9869ba65-cf39-405e-98db-6e2ca29f94fa"
}
```

---

### Upgrade Event

Fires when a customer upgrades their license tier. Always generates a **new** `license_key` UUID.

A simultaneous `deactivate` event is sent for the old `license_key`.

**Logic**: Find the user by `prev_license_key`, replace their license key with the new `license_key`, and update their tier.

```json
{
  "license_key": "c86ad3d7-3942-4d11-8814-b0bd81971691",
  "prev_license_key": "3794577c-3dbc-11ec-9bbc-0242ac130002",
  "event": "upgrade",
  "event_timestamp": 1671586387628,
  "created_at": 1671586387624,
  "license_status": "inactive",
  "tier": 2,
  "test": false,
  "extra": {
    "reason": "Upgraded by the customer"
  }
}
```

Simultaneous deactivate for old key:
```json
{
  "license_key": "3794577c-3dbc-11ec-9bbc-0242ac130002",
  "event": "deactivate",
  "event_timestamp": 1671586388077,
  "created_at": 1671586388072,
  "license_status": "deactivated",
  "tier": 1,
  "test": false,
  "extra": {
    "reason": "Upgraded by the customer"
  }
}
```

**Upgrade with add-ons** (also sends `migrate` events for add-ons):
```json
{
  "license_key": "5be40bfd-1f04-44e9-ab4f-cc0e8848415c",
  "prev_license_key": "10281aa4-d79e-469a-ade2-0a0601b76ebb",
  "event": "upgrade",
  "event_timestamp": 1754671653171,
  "created_at": 1754671653169,
  "license_status": "inactive",
  "tier": 2,
  "extra": { "reason": "Upgraded by customer" },
  "partner_plan_name": "License Tier 2",
  "unit_quantity": 1
}
```
```json
{
  "license_key": "6e3d9ed5-96f8-47e9-9e37-cce4fcbd2fea",
  "event": "migrate",
  "event_timestamp": 1754671653193,
  "created_at": 1754671653192,
  "license_status": "active",
  "tier": 1,
  "extra": { "reason": "Parent deal upgrade" },
  "partner_plan_name": "addon_partner_name_here_add_seats",
  "unit_quantity": 5,
  "parent_license_key": "5be40bfd-1f04-44e9-ab4f-cc0e8848415c"
}
```

---

### Downgrade Event

Same pattern as upgrade — new `license_key` UUID generated, old key gets a simultaneous `deactivate`.

```json
{
  "license_key": "c8e57fa3-ea5b-4c39-a2bf-74f7f51d01b0",
  "prev_license_key": "c86ad3d7-3942-4d11-8814-b0bd81971691",
  "event": "downgrade",
  "event_timestamp": 1671586699435,
  "created_at": 1671586699431,
  "license_status": "inactive",
  "tier": 1,
  "test": false,
  "extra": {
    "reason": "Downgraded by the customer"
  }
}
```

---

### Deactivate Event

Fires on refund, cancellation, or AppSumo staff action.

Note: `license_status` is `"active"` — AppSumo deactivates it only after receiving a `200` response.

```json
{
  "license_key": "c8e57fa3-ea5b-4c39-a2bf-74f7f51d01b0",
  "event": "deactivate",
  "license_status": "active",
  "event_timestamp": 1671586699927,
  "created_at": 1671586699922,
  "test": false,
  "extra": {
    "reason": "Refunded by the user"
  }
}
```

When a parent deal is refunded, deactivate events fire for the parent AND all associated add-ons.

---

### Migrate Event (Add-Ons Only)

Fires during `upgrade` or `downgrade` events for deal add-ons. Signals that data should be transferred to the newly issued parent `license_key`. The add-on's own `license_key` does not change — only its `parent_license_key` updates.

```json
{
  "license_key": "9ac1dd89-d8ac-4a26-9bfd-856e9b79c3f4",
  "event": "migrate",
  "event_timestamp": 1754434889229,
  "created_at": 1754434889226,
  "license_status": "inactive",
  "tier": 1,
  "extra": { "reason": "Parent deal upgrade" },
  "partner_plan_name": "addon_partner_name_here_add_seats",
  "unit_quantity": 15,
  "parent_license_key": "cba05276-0c32-493b-856e-7836b71df387"
}
```

---

### Test Event

Sent when saving/re-validating the webhook URL. Must return `200` + success response. Do not apply real product actions.

```json
{
  "license_key": "00000000-aaaa-1111-bbbb-abcdef012345",
  "event": "purchase",
  "license_status": "inactive",
  "event_timestamp": 1318781876406,
  "created_at": 1318738512,
  "tier": 1,
  "test": true,
  "extra": {
    "reason": "Test event"
  }
}
```

---

## Webhook Security (HMAC SHA256)

AppSumo sends two headers with every webhook:
- `X-Appsumo-Signature` — HMAC SHA256 encrypted value
- `X-Appsumo-Timestamp` — Unix timestamp

To verify (optional but recommended):
1. Concatenate: `timestamp + request_body`
2. Generate HMAC SHA256 using your API key as the secret
3. Compare your generated hash against `X-Appsumo-Signature`

Code examples available in Python, Node.js, Go, and PHP in the [Webhook Security docs](https://docs.licensing.appsumo.com/webhook/webhook__security.html).
