import dotenv from 'dotenv';

dotenv.config();

export const config = {
    useLocalLLM: false, // Set to false to use OpenAI API
    openAI: {
        apiKey: process.env.OPENAI_API_KEY, // Set your OpenAI API key here
        model: 'gpt-4o-mini', // Set the OpenAI model to use
        store: true, // Set to true to store conversations in the 'conversations' folder
    },
    localLLM: {
        modelPath: process.env.LOCAL_MODEL_API_URL, // Set the file path to your local LLM model
        serverUrl: process.env.LOCAL_MODEL_API_URL, // Set the server URL for LM Studio
    },

    siteUrl: process.env.SITE_URL || 'http://localhost:5051', // Add site URL configuration
    runFrontend: 'true', // This will run the frontend by default if set to true and only run the backend if set to false
    xAutoPoster: false, // Set to true to enable auto-posting to Twitter/X
    postsPerDay: 50, // Set the number of posts per day (max 50 to stay within 1500 posts/month limit)
    postsPerMonth: 1500, // Set the maximum number of posts per month
    // Note: To stay within the free limit of 1500 posts per month, set postsPerDay <= 50
    
    autoPostSpecifications: {
        platformName: "Small Time Devs",
        keyFeature: "AI Bots Trading, Telegram Bot for Solana And XRPL, Custom Raydium API, Solana Volume Bot Custom XRP Trading API",
        urls: ["https://smalltimedevs.com/", "https://aramid.smalltimedevs", "https://twitter.com/smalltimedevs", "https://api.smalltimedevs.com/", "https://github.com/Small-Time-Devs"],
        targetAudience: "Crypto traders and enthusiasts",
        // Add more specifications as needed
    },

    // Add CoinGecko API URL
    coinGeckoApiUrl: 'https://api.coingecko.com/api/v3',

    // Add API sections and their respective APIs
    apis: {
        crypto: {
            coinGecko: 'https://api.coingecko.com/api/v3',
            // Add more crypto-related APIs as needed
        },
        weather: {
            openWeatherMap: 'https://api.openweathermap.org/data/2.5',
            // Add more weather-related APIs as needed
        },
        // Add more API sections as needed
    }
};
