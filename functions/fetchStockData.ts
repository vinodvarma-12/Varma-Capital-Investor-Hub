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

        const apiKey = Deno.env.get("ALPHA_VANTAGE_API_KEY");
        if (!apiKey) {
            throw new Error('Alpha Vantage API key not configured');
        }

        // Define the symbols we want to track
        const symbols = [
            'SPY',    // S&P 500 ETF
            'QQQ',    // NASDAQ ETF
            'DIA',    // Dow Jones ETF
            'AAPL',   // Apple
            'MSFT',   // Microsoft
            'GOOGL',  // Google
            'AMZN',   // Amazon
            'TSLA',   // Tesla
            'NVDA',   // NVIDIA
            'META'    // Meta
        ];

        const stockData = [];

        // Fetch data for each symbol (Alpha Vantage free tier allows 5 calls per minute)
        for (let i = 0; i < Math.min(symbols.length, 5); i++) {
            const symbol = symbols[i];
            try {
                const response = await fetch(
                    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
                );

                if (!response.ok) {
                    console.warn(`Failed to fetch data for ${symbol}`);
                    continue;
                }

                const data = await response.json();
                const quote = data['Global Quote'];

                if (!quote || !quote['05. price']) {
                    console.warn(`No data available for ${symbol}`);
                    continue;
                }

                stockData.push({
                    symbol: symbol,
                    name: getCompanyName(symbol),
                    category: symbol.includes('SPY') || symbol.includes('QQQ') || symbol.includes('DIA') ? 'indices' : 'stocks',
                    current_price: parseFloat(quote['05. price']),
                    change_percent: parseFloat(quote['10. change percent'].replace('%', '')),
                    change_amount: parseFloat(quote['09. change']),
                    volume: parseInt(quote['06. volume']),
                    last_updated: new Date().toISOString(),
                    is_active: true
                });

                // Add delay to respect rate limits
                if (i < symbols.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 12000)); // 12 second delay
                }

            } catch (error) {
                console.warn(`Error fetching ${symbol}:`, error.message);
            }
        }

        return new Response(JSON.stringify({ 
            success: true, 
            data: stockData,
            note: `Fetched ${stockData.length} of ${symbols.length} symbols due to API rate limits`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error fetching stock data:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to fetch stock data', 
            details: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

function getCompanyName(symbol) {
    const names = {
        'SPY': 'S&P 500 ETF',
        'QQQ': 'NASDAQ-100 ETF',
        'DIA': 'Dow Jones ETF',
        'AAPL': 'Apple Inc.',
        'MSFT': 'Microsoft Corp.',
        'GOOGL': 'Alphabet Inc.',
        'AMZN': 'Amazon.com Inc.',
        'TSLA': 'Tesla Inc.',
        'NVDA': 'NVIDIA Corp.',
        'META': 'Meta Platforms Inc.'
    };
    return names[symbol] || symbol;
}