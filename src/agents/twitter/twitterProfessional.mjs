import OpenAI from "openai";
import { config } from "../../config/config.mjs";
import axios from "axios";
import dotenv from "dotenv";
import Twitter from "twitter-lite";

dotenv.config();

export async function TWITTER_AGENT() {
  return `
    ### Master Twitter Marketing Genius Prompt

    You are a master Twitter marketing genius. Your job is to create highly engaging and professional tweets that drive followers, likes, and engagement for a business or product. 
    Each tweet must:
    - Capture attention immediately with a hook.
    - Include valuable information or unique insights about the product or topic.
    - Use a persuasive call-to-action (CTA) that encourages readers to engage or follow.
    - Optionally include hashtags for discoverability and emojis for personality.

    Write a tweet based on the provided specifications or topic. Keep the tone professional, yet approachable and exciting.
  `;
}

export async function TWITTER_AUTO_POSTER_AGENT() {
  return `
    ### Automated Twitter Marketing Prompt

    You are an automated Twitter marketing agent. Your job is to create highly engaging and professional tweets that drive followers, likes, and engagement for a business or product. 
    Each tweet must:
    - Capture attention immediately with a hook.
    - Include valuable information or unique insights about the product or topic.
    - Use a persuasive call-to-action (CTA) that encourages readers to engage or follow.
    - Optionally include hashtags for discoverability and emojis for personality.

    Write a tweet based on the provided specifications or topic. Keep the tone professional, yet approachable and exciting.
    The specifications are predefined and should be used to tailor the tweet to the user's business needs.
  `;
}

export async function generateTweet(input, specifications = "") {
  const openai = new OpenAI();
  const prompt = await TWITTER_AGENT();

  try {
    const completion = await openai.chat.completions.create({
      model: config.openAI.model,
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: `
            ### Input
            ${input}

            ### Specifications
            ${JSON.stringify(specifications)}
          `,
        },
      ],
    });
    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating tweet:", error);
    throw new Error("Failed to generate a tweet.");
  }
}

export async function generateAutoPostTweet() {
  const openai = new OpenAI();
  const prompt = await TWITTER_AUTO_POSTER_AGENT();

  try {
    const completion = await openai.chat.completions.create({
      model: config.openAI.model,
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: `
            ### Specifications
            ${JSON.stringify(config.autoPostSpecifications)}
          `,
        },
      ],
    });

    let tweet = completion.choices[0].message.content.trim();

    // Ensure each post includes a unique URL from the config
    const urls = config.autoPostSpecifications.urls;
    const uniqueUrl = urls[Math.floor(Math.random() * urls.length)];
    tweet += `\n\nMore info: ${uniqueUrl}`;

    return tweet;
  } catch (error) {
    console.error("Error generating auto-post tweet:", error);
    throw new Error("Failed to generate an auto-post tweet.");
  }
}

export async function postToTwitter(tweet) {
  const client = new Twitter({
    consumer_key: process.env.TWITTER_API_KEY,
    consumer_secret: process.env.TWITTER_API_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_SECRET,
  });

  try {
    const response = await client.post("statuses/update", { status: tweet });
    console.log("Tweet posted successfully:", response);
  } catch (error) {
    console.error("Error posting tweet:", error);
    throw new Error("Failed to post tweet.");
  }
}

export async function createTwitterPost(input, specifications = "") {
  try {
    const tweet = await generateTweet(input, specifications);
    console.log("Generated Tweet:", tweet);
    return tweet;
  } catch (error) {
    console.error("Error creating Twitter post:", error);
    throw new Error("Failed to create Twitter post.");
  }
}

export async function handleTwitterPost(question, specs = {}) {
  try {
    const tweet = await generateTweet(question, specs);
    console.log("Generated Tweet:", tweet);
    return tweet;
  } catch (error) {
    console.error("Error handling Twitter post:", error);
    throw new Error("Failed to handle Twitter post.");
  }
}

export async function handleQuestion(question) {
  const openai = new OpenAI();

  async function generateResponse(input, promptFunction, additionalContext = "") {
    const personality = await promptFunction();
    const prompt = `${personality}\n${additionalContext}\nUser: ${input}\nTwitterProfessional:`;
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

  // Generate tweet response
  const tweetResponse = await generateResponse(question, TWITTER_AGENT);

  // Final combined response
  return `
    ### Tweet Response:
    ${tweetResponse}
  `;
}