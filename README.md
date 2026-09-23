# Kulzzy Celebration Booking

GitHub Pages frontend for:

**AM CELEBRATING TODAY — MENTION MY NAME ON-AIR**

## Included

- `index.html` — public celebration booking page
- `admin.html` — admin booking list
- `css/style.css` — complete responsive design
- `js/app.js` — public booking/payment handoff
- `js/admin.js` — admin booking retrieval

## Important backend requirement

GitHub Pages is static hosting. It cannot securely:

- verify a payment secret
- receive a payment webhook
- store the paid booking queue
- assign unique booking numbers safely
- assign the next on-air slot
- protect the admin records

Therefore the GitHub pages are designed to call a secure backend.

Set the same backend URL in both:

- `js/app.js`
- `js/admin.js`

Example:

`https://your-api.example.com`

Do NOT put payment secret keys in GitHub.

## Required API

### GET /api/celebrations/today

Response:

```json
{
  "bookedCount": 12
}
```

Only paid/verified bookings should be counted.

### POST /api/celebrations/create

Request:

```json
{
  "name": "Example Name",
  "celebrationType": "Birthday",
  "celebrating": "My Friend",
  "wishes": 1000000,
  "date": "2026-09-23"
}
```

Server must:

1. Validate that the date is today in Africa/Lagos.
2. Validate wishes are between 1,000,000 and 900,000,000,000,000.
3. Create a pending payment.
4. Return a secure payment URL.

Response:

```json
{
  "paymentLink": "https://payment-provider.example/..."
}
```

### GET /api/celebrations/verify?reference=...

The server must verify the transaction directly with the payment provider before marking it paid.

Response:

```json
{
  "paid": true,
  "bookingNumber": 13,
  "onAirTime": "08:30 AM",
  "bookedCount": 13
}
```

The booking number/time must only be assigned after verified payment.

### GET /api/admin/celebrations/today

Must be authenticated and return only paid bookings.

Response:

```json
{
  "bookings": [
    {
      "bookingNumber": 1,
      "name": "Example Name",
      "celebrationType": "Birthday",
      "celebrating": "My Friend",
      "wishes": 1000000,
      "date": "2026-09-23",
      "onAirTime": "06:30 AM",
      "amount": 3000,
      "reference": "TX-123"
    }
  ]
}
```

## Queue rule

The first paid booking for the day starts at **6:30 AM**.

The backend should assign each later paid booking the next available slot based on the existing paid records. The slot duration should be configured on the backend according to Kulzzy Radio's actual on-air schedule.

Do not calculate the official queue only in browser JavaScript.

## GitHub Pages

Upload these files to a GitHub repository and enable GitHub Pages.

The frontend can then be served from a GitHub Pages URL.

The backend remains separate and must use HTTPS.
