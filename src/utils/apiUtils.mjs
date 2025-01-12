import axios from 'axios';
import { config } from '../config/config.mjs';

export async function fetchCryptoMarketData() {
    try {
        const response = await axios.get(`${config.coinGeckoApiUrl}/coins/markets`, {
            params: {
                vs_currency: 'usd',
                order: 'market_cap_desc',
                per_page: 10,
                page: 1,
                sparkline: false,
            },
        });

        if (response.data && response.data.length > 0) {
            return response.data;
        }
        return [];
    } catch (error) {
        console.error('Error fetching crypto market data:', error);
        return [];
    }
}
