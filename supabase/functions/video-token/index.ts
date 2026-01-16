import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AccessToken } from "npm:livekit-server-sdk@2.9.2";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const ALLOWED_ORIGINS = [
    'https://datimer.netlify.app',
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
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    };

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { serverId } = await req.json();

        // 1. Verify User (JWT)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !user) {
            console.error("Auth Error:", authError);
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 2. Verify Server Membership
        if (!serverId) {
             return new Response(JSON.stringify({ error: 'Missing serverId' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const { data: membership, error: membershipError } = await supabaseClient
            .from('server_members')
            .select('role')
            .eq('server_id', serverId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (membershipError || !membership) {
            console.error("Membership Check Failed:", membershipError);
             return new Response(JSON.stringify({ error: 'Not a member of this server' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        console.log(`Generating token for User: ${user.id} Room: ${serverId}`);

        const apiKey = Deno.env.get('LIVEKIT_API_KEY')?.trim();
        const apiSecret = Deno.env.get('LIVEKIT_API_SECRET')?.trim();

        if (!apiKey || !apiSecret) {
            console.error("LiveKit misconfigured: Missing API KEY or SECRET");
            throw new Error("Server video configuration missing");
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: user.id,
            name: user.user_metadata?.full_name || user.email || 'User',
        });

        // Grant permission to join the room (Server ID)
        at.addGrant({ roomJoin: true, room: serverId });

        const token = await at.toJwt();

        return new Response(JSON.stringify({ token }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error: any) {
        console.error('Video Token Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
