require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createRecurringPrice() {
  try {
    console.log('Creating recurring price for $9.99/month...');
    const price = await stripe.prices.create({
      unit_amount: 999, // $9.99 in cents
      currency: 'usd',
      product: 'prod_SXHhz4ygt2u9zr',
      recurring: {
        interval: 'month'
      }
    });
    console.log('✅ Created recurring price:', price.id);
    console.log('💰 Amount:', price.unit_amount / 100, 'USD');
    console.log('🔄 Interval:', price.recurring.interval);
    return price.id;
  } catch (error) {
    console.error('❌ Error creating price:', error.message);
    console.error('Full error:', error);
  }
}

createRecurringPrice().then(() => {
  console.log('Script completed');
}).catch((error) => {
  console.error('Script error:', error);
});
