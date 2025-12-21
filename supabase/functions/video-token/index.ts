import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AccessToken } from "npm:livekit-server-sdk@2.9.2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { serverId, user } = await req.json();
        console.log(`Generating token for User: ${user?.uid} Room: ${serverId}`);

        if (!serverId || !user || !user.uid) {
            console.error("Invalid Request Body", { serverId, user });
            return new Response(JSON.stringify({ error: 'Missing serverId or user info' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const apiKey = Deno.env.get('LIVEKIT_API_KEY')?.trim();
        const apiSecret = Deno.env.get('LIVEKIT_API_SECRET')?.trim();

        console.log("Checking Secrets Check:", { 
            hasApiKey: !!apiKey, 
            hasApiSecret: !!apiSecret, 
            apiKeyLength: apiKey ? apiKey.length : 0 
        });

        if (!apiKey || !apiSecret) {
            console.error("LiveKit misconfigured: Missing API KEY or SECRET");
            throw new Error("Server video configuration missing");
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: user.uid,
            name: user.displayName || 'User',
        });

        // Grant permission to join the room (Server ID)
        at.addGrant({ roomJoin: true, room: serverId });

        const token = await at.toJwt();

        return new Response(JSON.stringify({ token }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error('Video Token Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
