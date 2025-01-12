import * as accountant from "./accounting/accountant.mjs";
import * as xrayTech from "./medical/xrayTech.mjs";
import * as cryptoAnalyst from "./crypto/cryptoAnalyst.mjs";
import * as electricMotorIndustry from "./industry/electricMotorIndustry.mjs";
import * as twitterProfessional from "./twitter/twitterProfessional.mjs";
import { config } from '../config/config.mjs';
import axios from 'axios';
import OpenAI from 'openai';
import { keywords } from './keyWords.mjs'; // Import the keyword mapping
import { generateAgentConfigurations, handleQuestion } from './dynamic/dynamic.mjs'; // Import the dynamic agent generator and handler

const openai = new OpenAI();

class Agent {
    constructor(name, personality, specialty, apis) {
        this.name = name;
        this.personality = personality;
        this.specialty = specialty;
        this.apis = apis;
        this.history = [];
    }

    async generateResponse(input) {
        const prompt = `${this.personality}\nUser: ${input}\n${this.name}:`;
        if (config.useLocalLLM) {
            try {
                const response = await axios.post(config.localLLM.serverUrl, {
                    modelPath: config.localLLM.modelPath,
                    prompt: prompt
                });
                const generatedResponse = response.data;
                this.history.push(generatedResponse);
                return generatedResponse;
            } catch (error) {
                console.error('Error connecting to local LLM:', error);
                throw new Error('Failed to connect to local LLM.');
            }
        } else {
            try {
                const completion = await openai.chat.completions.create({
                    model: config.openAI.model,
                    messages: [
                        { "role": "system", "content": this.personality },
                        { "role": "user", "content": input }
                    ]
                });
                const generatedResponse = completion.choices[0].message.content;
                this.history.push(generatedResponse);
                return generatedResponse;
            } catch (error) {
                console.error('Error connecting to OpenAI API:', error);
                throw new Error('Failed to connect to OpenAI API.');
            }
        }
    }
}

export async function startConversation(question) {
    const agentResponses = [];
    let summary = "";

    // Determine the API section based on the keywords in the question
    let apiSection = null;
    for (const [section, words] of Object.entries(keywords)) {
        if (words.some(word => question.toLowerCase().includes(word))) {
            apiSection = section;
            break;
        }
    }

    // Generate agent configurations dynamically
    const agentConfigs = await generateAgentConfigurations(question);

    // Create and execute tasks for each generated agent
    for (const config of agentConfigs) {
        const agentApis = apiSection ? config.apis[apiSection] : {};
        const agent = new Agent(config.name, config.personality, config.specialty, agentApis);
        try {
            const response = await agent.generateResponse(question);
            agentResponses.push({ name: agent.name, response });
        } catch (error) {
            console.error(`Error handling role ${agent.name}:`, error);
            throw new Error("Failed to generate a response.");
        }
    }

    // Generate summary from agent responses
    if (agentResponses.length > 0) {
        summary = `Based on the analysis of the following agents: ${agentResponses
            .map((agent) => agent.name)
            .join(", ")}, we conclude that...`; // Customize as needed
    }

    return { agents: agentResponses, summary };
}

export async function autoPostToTwitter() {
    if (!config.xAutoPoster) return;

    const maxPostsPerMonth = config.postsPerMonth;
    const postsPerDay = config.postsPerDay;
    const maxPostsPerDay = Math.min(postsPerDay, Math.floor(maxPostsPerMonth / 30));
    const interval = 24 * 60 * 60 * 1000 / maxPostsPerDay; // Interval in milliseconds

    for (let i = 0; i < maxPostsPerDay; i++) {
        setTimeout(async () => {
            try {
                const tweet = await twitterProfessional.generateAutoPostTweet();
                await twitterProfessional.postToTwitter(tweet);
                console.log("Auto-posted Tweet:", tweet);
            } catch (error) {
                console.error("Error auto-posting to Twitter:", error);
            }
        }, i * interval);
    }
}