import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export async function performGoogleSearch(query) {
    const apiKey = process.env.SEARCH_API_KEY;
    const searchEngineId = process.env.SEARCH_ENGINE_ID;
    const searchUrl = process.env.SEARCH_API_URL;

    try {
        const response = await axios.get(searchUrl, {
            params: {
                q: query,
                key: apiKey,
                cx: searchEngineId,
            },
        });
        console.log('Google search response:', response.data);
        if (response.data && response.data.items && response.data.items.length > 0) {
            return response.data.items;
        }
        return [];
    } catch (error) {
        console.error('Error performing Google search:', error);
        return [];
    }
}
