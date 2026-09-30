# WebMek — Full Agency Website

This is a standalone Flask + SQLite WebMek agency website.

## Included
- Animated responsive homepage
- Services, pricing, portfolio, process and CTA sections
- Apply / enquiry form
- Lead storage in SQLite
- Login + signup with hashed passwords
- Admin dashboard
- Lead status management
- Client dashboard
- Project creation for clients
- WhatsApp message generation
- Optional server-side WhatsApp Cloud API notification

## Folder structure

```text
WebMek-final/
├── app.py
├── requirements.txt
├── .env.example
├── README.md
├── data/
├── templates/
│   ├── index.html
│   ├── admin.html
│   └── client.html
└── static/
    ├── styles.css
    ├── script.js
    ├── admin.js
    └── client.js
```

## Windows setup

Open CMD in the project folder.

```bat
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
copy .env.example .env
python app.py
```

Then open:

- Website: http://127.0.0.1:5000
- Admin: http://127.0.0.1:5000/admin
- Client: http://127.0.0.1:5000/client

## Admin login

The default values are created from `.env`:

```text
Email: admin@webmek.in
Password: Admin@123456
```

**Change the admin password before public deployment.**

## WhatsApp

Open `static/script.js` and replace:

```javascript
whatsappNumber: "916351199175"
```

with your business WhatsApp number in international digits, without `+`.

The public website will then open a pre-filled WhatsApp message after an enquiry is submitted.

For automatic server-side WhatsApp notifications, fill these variables in `.env`:

```text
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ADMIN_NUMBER=
```

The exact WhatsApp Business/Meta account setup and approved messaging rules are external to this code.

## Connect your existing WebMek frontend

You can replace the HTML/CSS design later while keeping the same API routes:

```text
POST /api/signup
POST /api/login
POST /api/logout
GET  /api/me
POST /api/leads
GET  /api/leads
PATCH /api/leads/<id>
GET  /api/projects
POST /api/admin/projects
GET  /api/health
```

## Production notes
- Use a strong random `SECRET_KEY`.
- Change the default admin password.
- Put the app behind a production WSGI server and HTTPS.
- Set restrictive CORS if the frontend is hosted separately.
- Add a proper privacy policy and terms before collecting real customer data.
