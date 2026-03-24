import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch(e) {
    console.error('Webhook sig failed:', e.message);
    return NextResponse.json({ error: 'Bad signature' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 503 });
  }

  try {
    switch(event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id;
        const subId = session.subscription;
        if (userId) {
          await supabase.from('profiles').update({
            is_pro: true,
            stripe_subscription_id: subId,
            pro_expires_at: null,
          }).eq('id', userId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;
        const active = ['active', 'trialing'].includes(sub.status);
        await supabase.from('profiles').update({
          is_pro: active,
          stripe_subscription_id: sub.id,
          pro_expires_at: active ? null : new Date(sub.current_period_end * 1000).toISOString(),
        }).eq('id', userId);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          await supabase.from('profiles').update({
            is_pro: false,
            stripe_subscription_id: null,
            pro_expires_at: new Date().toISOString(),
          }).eq('id', userId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        const { data } = await supabase.from('profiles')
          .select('id').eq('stripe_customer_id', customerId).single();
        if (data) {
          await supabase.from('profiles').update({ is_pro: false }).eq('id', data.id);
        }
        break;
      }
    }
  } catch(e) {
    console.error('Webhook handler error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
