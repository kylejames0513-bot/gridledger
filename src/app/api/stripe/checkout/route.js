import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { userId, email, priceType } = await request.json();
    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing user info' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Check if user already has a Stripe customer
    let customerId = null;
    if (supabase) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();
      customerId = profile?.stripe_customer_id;
    }

    // Create Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        email, metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
      if (supabase) {
        await supabase.from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', userId);
      }
    }

    // Use monthly or yearly price
    const priceId = priceType === 'yearly'
      ? process.env.STRIPE_PRICE_YEARLY
      : process.env.STRIPE_PRICE_MONTHLY;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://grid-ledger.com'}/?pro=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://grid-ledger.com'}/?pro=cancelled`,
      subscription_data: {
        trial_period_days: 7,
        metadata: { supabase_user_id: userId },
      },
      metadata: { supabase_user_id: userId },
    });

    return NextResponse.json({ url: session.url });
  } catch(e) {
    console.error('Stripe checkout error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
