
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const payload = await req.json();
        console.log('Polar Webhook received:', payload.type);

        const eventType = payload.type;
        const data = payload.data;

        // Check for test events or relevant events
        if (eventType !== 'order.created' && eventType !== 'subscription.created') {
            // We only care about successful payments for now
            return new Response('Event ignored', { status: 200 });
        }

        const supabaseUid = data.metadata?.supabase_uid;

        if (!supabaseUid) {
            console.warn('No supabase_uid in metadata:', data.metadata);
            return new Response('No supabase_uid found', { status: 200 });
        }

        // Initialize Supabase Admin Client
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Update Profile
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ is_pro: true })
            .eq('id', supabaseUid);

        if (profileError) {
            console.error('Failed to update profile:', profileError);
            return new Response('Database update failed', { status: 500 });
        }

        // Update User Settings
        // Determine plan type from event
        const isSubscription = eventType === 'subscription.created';
        const planType = isSubscription ? 'pro_subscription' : 'pro_lifetime';

        await supabase.from('user_settings').upsert({
            user_id: supabaseUid,
            subscription: {
                plan: 'pro',
                status: 'active',
                type: planType,
                provider: 'polar',
                since: Date.now()
            },
            updated_at: new Date()
        });

        console.log(`Successfully upgraded user ${supabaseUid} to Pro via Polar`);
        return new Response('Success', { status: 200 });

    } catch (error) {
        console.error('Webhook processing error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
});
