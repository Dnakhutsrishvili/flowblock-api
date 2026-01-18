const crypto = require('crypto');
const { upsertSubscriber, updateSubscriptionStatus, initDB } = require('../lib/db');

// Verify Paddle webhook signature
function verifyPaddleWebhook(rawBody, signature, secretKey) {
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(rawBody);
  const calculatedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(calculatedSignature)
  );
}

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Paddle-Signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize database
    await initDB();

    const signature = req.headers['paddle-signature'];
    const secretKey = process.env.PADDLE_WEBHOOK_SECRET;

    // In production, verify the webhook signature
    // For now, we'll skip verification in development
    if (process.env.NODE_ENV === 'production' && secretKey) {
      const rawBody = JSON.stringify(req.body);
      if (!verifyPaddleWebhook(rawBody, signature, secretKey)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const event = req.body;
    const eventType = event.event_type;

    console.log('Paddle webhook received:', eventType);

    switch (eventType) {
      // Subscription created/started
      case 'subscription.created':
      case 'subscription.activated': {
        const data = event.data;
        await upsertSubscriber({
          email: data.customer.email,
          paddle_customer_id: data.customer_id,
          paddle_subscription_id: data.id,
          status: 'active',
          plan: 'premium',
          current_period_end: data.current_billing_period?.ends_at || null
        });
        console.log('Subscription activated for:', data.customer.email);
        break;
      }

      // Subscription updated (renewal, plan change)
      case 'subscription.updated': {
        const data = event.data;
        await upsertSubscriber({
          email: data.customer.email,
          paddle_customer_id: data.customer_id,
          paddle_subscription_id: data.id,
          status: data.status === 'active' ? 'active' : 'inactive',
          plan: 'premium',
          current_period_end: data.current_billing_period?.ends_at || null
        });
        console.log('Subscription updated for:', data.customer.email);
        break;
      }

      // Subscription cancelled
      case 'subscription.canceled': {
        const data = event.data;
        await updateSubscriptionStatus(data.id, 'cancelled');
        console.log('Subscription cancelled:', data.id);
        break;
      }

      // Subscription paused
      case 'subscription.paused': {
        const data = event.data;
        await updateSubscriptionStatus(data.id, 'paused');
        console.log('Subscription paused:', data.id);
        break;
      }

      // Payment succeeded
      case 'transaction.completed': {
        console.log('Payment completed');
        break;
      }

      // Payment failed
      case 'transaction.payment_failed': {
        const data = event.data;
        if (data.subscription_id) {
          await updateSubscriptionStatus(data.subscription_id, 'past_due');
        }
        console.log('Payment failed for subscription:', data.subscription_id);
        break;
      }

      default:
        console.log('Unhandled event type:', eventType);
    }

    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};
