import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    try {
        // Check if user is authenticated
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Fetch top 10 cryptocurrencies from CoinGecko
        const cryptoResponse = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h'
        );

        if (!cryptoResponse.ok) {
            throw new Error(`CoinGecko API error: ${cryptoResponse.status}`);
        }

        const cryptoData = await cryptoResponse.json();

        // Transform data to our format
        const transformedData = cryptoData.map(coin => ({
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            category: 'crypto',
            current_price: coin.current_price,
            change_percent: coin.price_change_percentage_24h,
            market_cap: coin.market_cap,
            volume: coin.total_volume,
            last_updated: new Date().toISOString(),
            is_active: true
        }));

        return new Response(JSON.stringify({ 
            success: true, 
            data: transformedData 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error fetching crypto data:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to fetch crypto data', 
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});