const { getSubscriber, initDB } = require('../lib/db');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize database
    await initDB();

    // Get email from query params or body
    const email = req.query.email || req.body?.email;

    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required',
        isPremium: false 
      });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Look up subscriber
    const subscriber = await getSubscriber(normalizedEmail);

    if (!subscriber) {
      return res.status(200).json({
        isPremium: false,
        status: 'not_found',
        message: 'No subscription found for this email'
      });
    }

    // Check if subscription is active
    const isActive = subscriber.status === 'active';
    
    // Check if subscription has expired
    let isExpired = false;
    if (subscriber.current_period_end) {
      isExpired = new Date(subscriber.current_period_end) < new Date();
    }

    const isPremium = isActive && !isExpired;

    return res.status(200).json({
      isPremium,
      status: subscriber.status,
      plan: subscriber.plan,
      expiresAt: subscriber.current_period_end,
      message: isPremium ? 'Subscription active' : 'Subscription inactive'
    });

  } catch (error) {
    console.error('Validation error:', error);
    return res.status(500).json({ 
      error: 'Validation failed',
      isPremium: false 
    });
  }
};
