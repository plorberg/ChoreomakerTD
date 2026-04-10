import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createEmptyChoreography } from '@/domain/choreo';
import { resolveEntitlements, assertEntitlement } from '@/lib/licensing/entitlements';
import { publicUrl } from '@/lib/http/publicUrl';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(publicUrl(req, '/login'), { status: 303 });

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const ent = resolveEntitlements(
    sub
      ? {
          userId: user.id,
          tier: sub.tier,
          status: sub.status,
          stripeCustomerId: sub.stripe_customer_id,
          stripeSubscriptionId: sub.stripe_subscription_id,
          currentPeriodEnd: sub.current_period_end,
        }
      : null,
  );

  const { count } = await supabase
    .from('choreographies')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', user.id);

  try {
    assertEntitlement(ent, 'maxChoreographies', count ?? 0);
  } catch {
    return NextResponse.redirect(publicUrl(req, '/dashboard?error=limit'), { status: 303 });
  }

  const c = createEmptyChoreography(user.id, 'New choreography');
  const { error } = await supabase.from('choreographies').insert({
    id: c.id,
    owner_id: user.id,
    title: c.title,
    data: c,
  });
  if (error) {
    console.error(error);
    return NextResponse.redirect(publicUrl(req, '/dashboard?error=create'), { status: 303 });
  }

  return NextResponse.redirect(publicUrl(req, `/editor/${c.id}`), { status: 303 });
}
