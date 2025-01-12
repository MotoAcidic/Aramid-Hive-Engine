import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { startConversation, autoPostToTwitter } from './src/agents/orchestrator.mjs';
import { config } from './src/config/config.mjs'; // Import the config

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5051;

// Derive __dirname from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

if (config.runFrontend) {
    app.use(express.static(path.join(__dirname, 'public')));
}

// Ensure 'conversations' folder exists
const conversationsDir = path.join(__dirname, 'conversations');
if (!fs.existsSync(conversationsDir)) fs.mkdirSync(conversationsDir);

// Define known application paths for different platforms
const appPaths = {
    chrome: {
        win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        linux: '/usr/bin/google-chrome'
    },
    notepad: {
        win32: 'notepad.exe'
    }
};

// Route to generate AI responses using the local model
app.post('/generate', async (req, res) => {
    const prompt = req.body.prompt || '';
    const payload = { prompt, max_tokens: 5000 };
    try {
        const response = await axios.post(process.env.LOCAL_MODEL_API_URL, payload);
        const generatedText = response.data.text || response.data.choices[0].text;
        res.json({ text: generatedText });
    } catch (error) {
        console.error('Error with local model API:', error.message);
        res.status(500).json({ error: 'Error processing the request on the server.' });
    }
});

// Research and Summarize function
app.post('/research-and-summarize', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    try {
        const searchResults = await internetResearch(query);
        const llmPrompt = `Based on these search results, provide a summary:\n${searchResults.map(result => `- ${result.name}: ${result.snippet}`).join('\n')}`;
        const response = await axios.post(process.env.LOCAL_MODEL_API_URL, { prompt: llmPrompt });
        const summary = response.data.text || response.data.choices[0].text;
        res.json({ summary });
    } catch (error) {
        console.error('Error in research and summarization:', error.message);
        res.status(500).json({ error: 'Error processing research and summarization request.' });
    }
});

// Helper function to format the response with the agent's role as a header
function formatAgentResponse(agentRole, responseText) {
    return `### ${agentRole}\n\n${responseText}`;
}

app.post('/agent-chat', async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: "Query is required." });
    }

    try {
        const { agents = [], summary = "No summary available." } = await startConversation(query); // Ensure default values

        res.json({ agents, summary });
    } catch (error) {
        console.error("Agent Chat Error:", error);
        res.status(500).json({ agents: [], summary: "An error occurred while processing your request." });
    }
});

// Helper to perform internet research using Google Custom Search API
async function internetResearch(query) {
    try {
        const response = await axios.get(process.env.SEARCH_API_URL, {
            params: { key: process.env.SEARCH_API_KEY, cx: process.env.SEARCH_ENGINE_ID, q: query, num: 3 }
        });
        return response.data.items.map(item => ({ name: item.title, url: item.link, snippet: item.snippet }));
    } catch (error) {
        console.error('Error with internet research:', error.message);
        throw new Error('Failed to retrieve search results.');
    }
}

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

// Call autoPostToTwitter function if auto-posting is enabled
if (config.xAutoPoster) {
    autoPostToTwitter();
}
