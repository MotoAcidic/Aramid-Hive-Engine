import OpenAI from 'openai';
import { config } from '../../config/config.mjs';
import { performGoogleSearch } from '../../utils/searchUtils.mjs'; // Import the search utility
import { fetchCryptoMarketData } from '../../utils/apiUtils.mjs'; // Import the CoinGecko API utility

const openai = new OpenAI();

export async function generateAgentConfigurations(userInput) {
    const prompt = `
        ### Dynamic Agent Orchestrator

        Based on the user's input, generate a list of agents to create dynamically. Each agent should have:
        - name: Name of the agent.
        - personality: A descriptor for the agent's personality (e.g., creative, analytical).
        - specialty: The specific task or expertise of the agent (e.g., crypto analysis, social media copywriting).

        User Input: "${userInput}"

        Return a JSON array of objects with agent configurations.
    `;

    try {
        const completion = await openai.chat.completions.create({
            model: config.openAI.model,
            messages: [
                { role: "system", content: prompt },
                { role: "user", content: userInput }
            ]
        });

        let responseText = completion.choices[0].message.content;
        console.log("Response from OpenAI:", responseText); // Log the response for debugging

        // Remove any code block formatting from the response
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '');

        const agentConfigurations = JSON.parse(responseText);
        return agentConfigurations;
    } catch (error) {
        console.error("Error generating agent configurations:", error);
        throw new Error("Failed to generate agent configurations.");
    }
}

async function fetchSpecifications(query) {
    const searchResults = await performGoogleSearch(`${query} specifications`);
    const specifications = searchResults.map(result => `${result.title}: ${result.snippet}`).join('\n');
    return specifications;
}

async function fetchCurrentCryptoData() {
    const marketData = await fetchCryptoMarketData();
    const currentData = marketData.map(data => `${data.name}: ${data.current_price} USD, Market Cap: ${data.market_cap} USD`).join('\n');
    return currentData;
}

async function fetchCurrentData(query) {
    const searchResults = await performGoogleSearch(query);
    const currentData = searchResults.map(result => `${result.title}: ${result.snippet}`).join('\n');
    return currentData;
}

export async function handleQuestion(question) {
    const openai = new OpenAI({
        apiKey: config.openAI.apiKey,
        organization: config.openAI.organization
    });

    async function generateResponse(input, promptFunction, additionalContext = "") {
        const personality = await promptFunction();
        const prompt = `${personality}\n${additionalContext}\nUser: ${input}\nDynamicAgent:`;
        try {
            const completion = await openai.chat.completions.create({
                model: config.openAI.model,
                messages: [
                    { role: "system", content: personality },
                    { role: "user", content: input },
                ],
            });
            return completion.choices[0].message.content;
        } catch (error) {
            console.error("Error connecting to OpenAI API:", error);
            throw new Error("Failed to connect to OpenAI API.");
        }
    }

    let searchContext = "";

    if (question.toLowerCase().includes("specifications")) {
        searchContext = await fetchSpecifications(question);
    } else if (question.toLowerCase().includes("crypto")) {
        searchContext = await fetchCurrentCryptoData();
    } else {
        searchContext = await fetchCurrentData(question);
    }

    // Generate response with search context
    const response = await generateResponse(question, generateAgentConfigurations, searchContext);

    // Final combined response
    return `
        ### Dynamic Agent Response:
        ${response}
    `;
}
