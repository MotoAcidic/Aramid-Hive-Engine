import OpenAI from 'openai';
import { config } from '../../config/config.mjs';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export async function ONBOARDING_AGENT() {
  return `
      ### Onboarding Agent

      Welcome the user and explain the step-by-step process of identifying a replacement for their motor or component. Outline the roles of subsequent agents in the process.
  `;
}

export async function SPECIFICATION_RETRIEVAL_AGENT() {
  return `
      ### Specification Retrieval Agent

      Your role is to find all relevant specifications for the item the user is inquiring about (e.g., motor, blower, capacitor). Use dynamic information retrieval to extract key data such as power rating, voltage, RPM, frame size, and more.
  `;
}

export async function REPLACEMENT_FINDER_AGENT() {
  return `
      ### Replacement Finder Agent

      Based on the specifications provided by the previous agent, identify compatible replacements. Include both direct replacements and alternatives from other manufacturers, if applicable. Provide detailed specifications for each replacement option.
  `;
}

export async function SUMMARY_AGENT() {
  return `
      ### Summary Agent

      Summarize the findings of all previous agents. Provide the user with a concise overview of the specifications retrieved, the replacement options identified, and actionable next steps.
  `;
}

async function getSpecificationsDynamically(query) {
  const apiKey = process.env.SEARCH_API_KEY;
  const searchEngineId = process.env.SEARCH_ENGINE_ID;
  const searchUrl = process.env.SEARCH_API_URL;

  try {
    const response = await axios.get(searchUrl, {
      params: {
        q: `${query} specifications`,
        key: apiKey,
        cx: searchEngineId,
      },
    });

    if (response.data && response.data.items && response.data.items.length > 0) {
      const topResult = response.data.items[0];
      const parsedSpecs = extractSpecificationsFromText(`${topResult.snippet} ${topResult.title}`);
      return { link: topResult.link, ...parsedSpecs };
    }
    return null;
  } catch (error) {
    console.error('Error fetching specifications dynamically:', error);
    return null;
  }
}

function extractSpecificationsFromText(text) {
  const horsepowerMatch = text.match(/(\d+(\.\d+)?)\s*hp/i);
  const rpmMatch = text.match(/(\d+)\s*rpm/i);
  const voltageMatch = text.match(/(\d+)\s*v/i);
  const phaseMatch = text.match(/(single|three)\s*phase/i);

  return {
    horsepower: horsepowerMatch ? parseFloat(horsepowerMatch[1]) : "Unknown",
    rpm: rpmMatch ? parseInt(rpmMatch[1], 10) : "Unknown",
    voltage: voltageMatch ? parseInt(voltageMatch[1], 10) : "Unknown",
    phase: phaseMatch ? phaseMatch[1].toLowerCase() : "Unknown",
  };
}

export async function handleQuestion(question) {
  const openai = new OpenAI();

  async function generateResponse(input, promptFunction, additionalContext = "") {
    const personality = await promptFunction();
    const prompt = `${personality}\n${additionalContext}\nUser: ${input}\nElectricMotorIndustry:`;
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

  // Onboarding agent response
  const onboardingResponse = await generateResponse(
    question,
    ONBOARDING_AGENT
  );

  // Specification Retrieval Agent
  const dynamicSpecs = await getSpecificationsDynamically(question);
  if (!dynamicSpecs) {
    return `Sorry, I couldn't retrieve information for your query: "${question}". Please check the model or try refining your input.`;
  }

  const specificationResponse = await generateResponse(
    question,
    SPECIFICATION_RETRIEVAL_AGENT,
    `Specifications: ${JSON.stringify(dynamicSpecs)}`
  );

  // Replacement Finder Agent
  const replacementResponse = await generateResponse(
    specificationResponse,
    REPLACEMENT_FINDER_AGENT,
    `Specifications: ${JSON.stringify(dynamicSpecs)}`
  );

  // Summary Agent
  const summaryResponse = await generateResponse(
    replacementResponse,
    SUMMARY_AGENT,
    `Specifications: ${JSON.stringify(dynamicSpecs)}`
  );

  // Final combined response
  return `
    ### Onboarding Agent Response:
    ${onboardingResponse}

    ### Specification Retrieval Agent Response:
    ${specificationResponse}

    ### Replacement Finder Agent Response:
    ${replacementResponse}

    ### Summary Agent Response:
    ${summaryResponse}
  `;
}
