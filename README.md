# FlowBlock API

Backend API for FlowBlock Chrome Extension subscription management.

## Features

- 🔔 Paddle webhook handling
- ✅ Subscription validation
- 💾 Vercel Postgres database
- 🚀 Serverless deployment

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/validate` | GET/POST | Check subscription status |
| `/api/webhook` | POST | Paddle webhook receiver |

## Setup Instructions

### 1. Create GitHub Repo

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/flowblock-api.git
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Select your `flowblock-api` repo
4. Click "Deploy"

### 3. Add Vercel Postgres

1. In Vercel dashboard, go to your project
2. Click "Storage" tab
3. Click "Create Database"
4. Select "Postgres"
5. Follow the setup (it auto-adds env variables)

### 4. Add Environment Variables

In Vercel project settings → Environment Variables:

```
PADDLE_WEBHOOK_SECRET=your_paddle_webhook_secret
PADDLE_API_KEY=your_paddle_api_key
```

### 5. Configure Paddle Webhook

1. Go to Paddle Dashboard → Developers → Notifications
2. Add webhook URL: `https://your-project.vercel.app/api/webhook`
3. Select events:
   - subscription.created
   - subscription.activated
   - subscription.updated
   - subscription.canceled
   - subscription.paused
   - transaction.completed
   - transaction.payment_failed
4. Copy the webhook secret to Vercel env variables

## Usage in FlowBlock Extension

### Check subscription status:

```javascript
async function checkSubscription(email) {
  const response = await fetch(
    `https://your-project.vercel.app/api/validate?email=${encodeURIComponent(email)}`
  );
  const data = await response.json();
  return data.isPremium;
}
```

### Example response:

```json
{
  "isPremium": true,
  "status": "active",
  "plan": "premium",
  "expiresAt": "2024-02-15T00:00:00.000Z",
  "message": "Subscription active"
}
```

## Local Development

```bash
npm install
npm run dev
```

## License

MIT
