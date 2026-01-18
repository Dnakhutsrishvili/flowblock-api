const { sql } = require('@vercel/postgres');

// Initialize database table
async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS subscribers (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      paddle_customer_id VARCHAR(255),
      paddle_subscription_id VARCHAR(255),
      status VARCHAR(50) DEFAULT 'inactive',
      plan VARCHAR(50) DEFAULT 'free',
      current_period_end TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

// Create or update subscriber
async function upsertSubscriber(data) {
  const { email, paddle_customer_id, paddle_subscription_id, status, plan, current_period_end } = data;
  
  const result = await sql`
    INSERT INTO subscribers (email, paddle_customer_id, paddle_subscription_id, status, plan, current_period_end, updated_at)
    VALUES (${email}, ${paddle_customer_id}, ${paddle_subscription_id}, ${status}, ${plan}, ${current_period_end}, NOW())
    ON CONFLICT (email) 
    DO UPDATE SET 
      paddle_customer_id = ${paddle_customer_id},
      paddle_subscription_id = ${paddle_subscription_id},
      status = ${status},
      plan = ${plan},
      current_period_end = ${current_period_end},
      updated_at = NOW()
    RETURNING *
  `;
  
  return result.rows[0];
}

// Get subscriber by email
async function getSubscriber(email) {
  const result = await sql`
    SELECT * FROM subscribers WHERE email = ${email}
  `;
  return result.rows[0] || null;
}

// Update subscription status
async function updateSubscriptionStatus(paddle_subscription_id, status) {
  const result = await sql`
    UPDATE subscribers 
    SET status = ${status}, updated_at = NOW()
    WHERE paddle_subscription_id = ${paddle_subscription_id}
    RETURNING *
  `;
  return result.rows[0];
}

module.exports = {
  initDB,
  upsertSubscriber,
  getSubscriber,
  updateSubscriptionStatus
};
