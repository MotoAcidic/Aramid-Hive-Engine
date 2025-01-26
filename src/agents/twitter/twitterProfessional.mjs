import OpenAI from "openai";
import { config } from "../../config/config.mjs";
import dotenv from "dotenv";
import { TwitterApi } from "twitter-api-v2";
import { fetchLatestTokenProfiles, fetchTokenName, fetchTokenPrice } from "../../utils/apiUtils.mjs";
import { checkRateLimit, updateRateLimitInfo } from "../../utils/helpers.mjs";
import { generateAgentConfigurations } from "../dynamic/dynamic.mjs";

dotenv.config();

const openai = new OpenAI();

class TwitterAgent {
  constructor(name, personality, specialty) {
    this.name = name;
    this.personality = personality;
    this.specialty = specialty;
    this.history = [];
  }

  async generateResponse(input) {
    const prompt = `${this.personality}\nUser: ${input}\n${this.name}:`;
    try {
      const completion = await openai.chat.completions.create({
        model: config.llmSettings.openAI.model,
        messages: [
          { role: "system", content: this.personality },
          { role: "user", content: input },
        ],
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

async function fetchTokenData() {
  const tokenProfiles = await fetchLatestTokenProfiles();
  for (const randomToken of tokenProfiles) {
    const tokenDescription = randomToken.description || "No description available";
    const tokenAddress = randomToken.tokenAddress;
    console.log("Fetching token data for:", tokenAddress);
    const tokenName = await fetchTokenName(tokenAddress) || randomToken.name || randomToken.symbol || "Unnamed Token"; // Ensure token name is correctly extracted
    try {
      const tokenPrice = await fetchTokenPrice(tokenAddress);
      return {
        tokenName,
        tokenDescription,
        tokenAddress,
        tokenPrice,
        links: randomToken.links
      };
    } catch (error) {
      console.warn(`Error fetching token price for ${tokenName}:`, error);
      // Continue to the next token if the price is not found
    }
  }
  throw new Error('No valid token data found.');
}

async function generatePrompt(tokenData) {
  const { tokenName, tokenDescription, tokenAddress, tokenPrice, links, amountSpent, dollarsSpent } = tokenData;
  return `
    Generate a tweet, comment, and hashtags for the following token:
    - Token Name: ${tokenName}
    - Token Description: ${tokenDescription}
    - Token Address: ${tokenAddress}
    - Token Price: ${tokenPrice}
    - Links: ${JSON.stringify(links)}
    - Amount Spent: ${amountSpent}
    - Dollars Spent: ${dollarsSpent}

    Each agent should only have one response.
    The first agent should analyze the token and provide a positive or negative response.
    The second agent should generate a tweet based on the analysis. Include the Token Name in the tweet.
    The third agent should generate a comment based on second agents response and the analysis including the price if there is a price.
    The fourth agent should generate hashtags based on the analysis from the first agent and the tweet from the second agent and comment of the thrid agent.

    Each agent should have a specific personality and specialty:
    - Agent 1: Analytical, Crypto Analysis
    - Agent 2: If analysis of the project seems good be snarky funny but if it has a bad analysis be snarky and rude, Social Media Copywriting
    - Agent 3: If Agent 2s response is positive, be sarcastic and funny. If Agent 2s response is negative, be rude, cautious and informative, Social Media Copywriting
    - Agent 4: Professional, Hashtags Generation that match the tone of the response and tags major relevant topics and crypto influencers.

    Instead of having the agent name like "name": "Agent Analyser" i want each agent to have their own personality and specialty as their name like "name": "Dave" or something funny and creative.

    If the token seems like a good project to support, provide a positive and engaging response. If the token seems suspicious or risky, provide a cautious and informative response, be snarky and make fun of it in a hilarious manor. Include relevant hashtags and emojis to match the tone of the response.
    Each tweet should be under 280 characters since this will be posted via the twitter api and the twitter api can only handle tweets under 280 characters so the post can only be 280 characters long and the comment can only be 280 characters long as well as the hashtags comment.
  `;
}

export async function handleQuestion() {
  let tokenData;
  try {
    tokenData = await fetchTokenData();
  } catch (error) {
    console.error("Error fetching token data:", error);
    throw new Error("Failed to fetch valid token data.");
  }

  const prompt = await generatePrompt(tokenData);

  const agentConfigs = await generateAgentConfigurations(prompt);

  const tweetAgent = agentConfigs[1];
  const commentAgent = agentConfigs[2];
  const hashtagsAgent = agentConfigs[3];

  if (!tweetAgent || !tweetAgent.name || !tweetAgent.response) {
    throw new Error("Invalid tweet agent response.");
  }
  if (!commentAgent || !commentAgent.name || !commentAgent.response) {
    throw new Error("Invalid comment agent response.");
  }
  if (!hashtagsAgent || !hashtagsAgent.name || !hashtagsAgent.response) {
    throw new Error("Invalid hashtags agent response.");
  }

  const projectLink = `https://dexscreener.com/solana/${tokenData.tokenAddress}`;
  let tweet = `${tweetAgent.name}:\n${tweetAgent.response.replace(tokenData.tokenName, `[${tokenData.tokenName}](${projectLink})`)}`;
  let comment = `${commentAgent.name}:\n${tweetAgent.name} ${commentAgent.response.replace(tokenData.tokenName, `[${tokenData.tokenName}](${projectLink})`)}`;
  let hashtagsComment = `${hashtagsAgent.name}:\n${hashtagsAgent.response}`;

  if (tweet.length > 280) {
    tweet = tweet.substring(0, 277) + '...';
  }
  if (comment.length > 280) {
    comment = comment.substring(0, 277) + '...';
  }
  if (hashtagsComment.length > 280) {
    hashtagsComment = hashtagsComment.substring(0, 277) + '...';
  }

  return {
    tweet,
    comment,
    hashtagsComment,
    ...tokenData,
  };
}

export async function generateAutoPostTweet() {
  let tweetData;
  try {
    tweetData = await handleQuestion();
    while (!tweetData.tweet) {
      console.log("Generated tweet is null, retrying...");
      tweetData = await handleQuestion();
    }
    console.log("Generated Tweet:", tweetData.tweet);
    return tweetData;
  } catch (error) {
    console.error("Error generating auto-post tweet:", error);
    throw new Error("Failed to generate an auto-post tweet.");
  }
}

export async function postToTwitter(tweetData, client) {
  try {
    if (config.twitter.settings.devMode) {
      console.log('Development mode is enabled. Not posting to twitter. Generated tweet data:', tweetData);
      return tweetData;
    }

    const canPost = await checkRateLimit(client);
    if (!canPost) {
      console.log('Skipping post due to rate limit.');
      return;
    }

    const formattedTweet = tweetData.tweet.replace(/\*\*/g, '').replace(/\\n/g, '\n').replace(/\s+/g, ' ').trim();
    const { data: createdTweet, headers } = await client.v2.tweet(formattedTweet);
    console.log('Tweet headers:', headers); // Log headers for debugging
    updateRateLimitInfo(headers);
    console.log('Tweet posted successfully:', createdTweet);

    if (tweetData.comment) {
      const formattedComment = tweetData.comment.replace(/\*\*/g, '').replace(/\\n/g, '\n').replace(/\s+/g, ' ').trim();
      const { headers: commentHeaders } = await client.v2.reply(formattedComment, createdTweet.id);
      console.log('Comment headers:', commentHeaders); // Log headers for debugging
      updateRateLimitInfo(commentHeaders);
      console.log('Comment posted successfully:', formattedComment);
    }

    if (tweetData.hashtagsComment) {
      const formattedHashtagsComment = tweetData.hashtagsComment.replace(/\*\*/g, '').replace(/\\n/g, '\n').replace(/\s+/g, ' ').trim();
      const { headers: hashtagsHeaders } = await client.v2.reply(formattedHashtagsComment, createdTweet.id);
      console.log('Hashtags headers:', hashtagsHeaders); // Log headers for debugging
      updateRateLimitInfo(hashtagsHeaders);
      console.log('Hashtags comment posted successfully:', formattedHashtagsComment);
    }

    return createdTweet;
  } catch (error) {
    if (error.code === 401) {
      console.error('Unauthorized: Check your Twitter API credentials.');
    } else if (error.code === 403) {
      console.error('Forbidden: You do not have permission to perform this action. Check your Twitter API permissions.');
    } else if (error.response && error.response.headers) {
      console.log('Error headers:', error.response.headers); // Log headers for debugging
      updateRateLimitInfo(error.response.headers);
      console.error('Error posting tweet:', error);
    } else {
      console.error('Error posting tweet:', error);
    }
    // Do not throw an error to keep the application running
    console.log('Continuing execution despite the error.');
  }
}

export async function scanAndRespondToPosts() {
  const client = new TwitterApi({
    appKey: `${config.twitter.keys.appKey}`,
    appSecret: `${config.twitter.keys.appSecret}`,
    accessToken: `${config.twitter.keys.accessToken}`,
    accessSecret: `${config.twitter.keys.accessSecret}`,
  });

  try {
    const { data } = await client.v2.userTimeline(config.twitter.twitterUserID, { max_results: 5 }); // Set max_results to a valid value
    const tweets = data.data;
    for (const tweet of tweets) {
      if (tweet.in_reply_to_user_id === null) {
        const response = await generateResponseToTweet(tweet.text);
        await client.v2.reply(response, tweet.id);
        console.log('Replied to tweet:', tweet.id);
      }
    }
  } catch (error) {
    console.error('Error scanning and responding to posts:', error);
  }
}

async function generateResponseToTweet(tweetText) {
  const openai = new OpenAI();
  const prompt = `
    ### Twitter Response Generator

    You are a highly engaging and professional Twitter bot. Your job is to create a thoughtful and engaging response to the following tweet:
    
    Tweet: "${tweetText}"

    Response:
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: config.llmSettings.openAI.model,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: tweetText }
      ],
    });
    let response = completion.choices[0].message.content.trim();
    response = response.replace(/\*\*/g, ''); // Remove Markdown bold formatting
    response = response.replace(/\n/g, ' \\n '); // Replace newlines with escaped newlines
    response = response.replace(/\s+/g, ' ').trim(); // Remove extra spaces
    if (response.length > 280) {
      response = response.substring(0, 277) + '...'; // Ensure response is within 280 characters
    }
    return response;
  } catch (error) {
    console.error("Error generating response to tweet:", error);
    throw new Error("Failed to generate a response to the tweet.");
  }
}
