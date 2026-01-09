
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
    'https://altimer.netlify.app',
    'http://localhost:5173',
    'http://localhost:3000'
];

serve(async (req) => {
    // Dynamic CORS
    const origin = req.headers.get('origin') || '';
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

    const corsHeaders = {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { productId, supabaseUid } = await req.json();

        if (!productId || !supabaseUid) {
            return new Response(JSON.stringify({ error: 'Missing productId or supabaseUid' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const polarAccessToken = Deno.env.get('POLAR_ACCESS_TOKEN');
        if (!polarAccessToken) {
            console.error('POLAR_ACCESS_TOKEN is not set');
            throw new Error('Server configuration error');
        }

        // Call Polar API to create a checkout session
        const response = await fetch('https://api.polar.sh/v1/checkouts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${polarAccessToken}`
            },
            body: JSON.stringify({
                product_id: productId,
                metadata: {
                    supabase_uid: supabaseUid
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Polar API Error:', errorText);
            throw new Error(`Polar API failed: ${response.status} ${errorText}`);
        }

        const data = await response.json();

        return new Response(JSON.stringify({ url: data.url }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error: any) {
        console.error('Create checkout error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
