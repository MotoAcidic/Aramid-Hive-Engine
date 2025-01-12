# Small Time Devs - AI

This project is a web-based AI interaction platform that allows users to interact with an AI model. The platform supports generating text responses, training the AI model, conducting AI-to-AI conversations.

## Features

- **Text Generation**: Generate text responses based on user prompts.
- **Agent Chat**: Spawn AI Agents that are specialized to procure the proper answer to your question or tasks.

## Prerequisites

- **Node.js** and **npm** (Node Package Manager)
- **Python** (for fine-tuning the AI model)
- **LM Studio**: A local model management software for running AI models. [Download and install LM Studio here.](https://lmstudio.ai/)

## Installation

1. **Clone the Repository**:
    ```sh
    git clone https://github.com/MotoAcidic/Aramid-Hive-Engine.git
    cd AI-Chat
    ```

2. **Install Dependencies**:
    ```sh
    npm install
    ```

3. **Set Up Environment Variables**:
    Create a `.env` file in the root directory. Populate it with the following values:
    // filepath: /home/tfinch/Aramid-Hive-Engine/.env

    ```env    
    LOCAL_MODEL_API_URL='http://localhost:1234/v1/completions'
    SEARCH_API_KEY='your-search-api-key'
    SEARCH_ENGINE_ID='your-search-engine-id'
    SEARCH_API_URL='https://www.googleapis.com/customsearch/v1'
    OPENAI_API_KEY='your-openai-api-key'
    SITE_URL='https://your-site-url'
    ```

    - **LOCAL_MODEL_API_URL**: The local model endpoint URL from LM Studio for generating responses.

4. **Install and Configure LM Studio**:
    - Download and install LM Studio from [lmstudio.ai](https://lmstudio.ai/).
    - Import or set up your local model in LM Studio.
    - Start LM Studio and note the model’s API endpoint (e.g., `http://localhost:8000/generate`), which you will set as the `LOCAL_MODEL_API_URL` in `.env`.

## Usage

1. **Start the Server**:
    ```sh
    npm start
    ```

2. **Open the Application**:
    Open your web browser and navigate to `http://localhost:5000`.

3. **Interact with the AI**:
    - **Generate Text**: Enter a prompt in the text area and click "Generate" to get a response from the AI.
    - **Train the AI**: Click "Train" to train the AI model with the provided prompt and predefined follow-up questions.
    - **Agent Chat**: Spawn AI Agents that are specialized to procure the proper answer to your question or tasks.

## Customization

### Config File

The `config.mjs` file located in `src/config/` allows you to customize various settings:

```javascript
// filepath: /home/tfinch/Aramid-Hive-Engine/src/config/config.mjs
import dotenv from 'dotenv';

dotenv.config();

export const config = {
    useLocalLLM: false, // Set to false to use OpenAI API
    openAI: {
        apiKey: process.env.OPENAI_API_KEY, // Set your OpenAI API key here
        model: 'gpt-4o', // Set the OpenAI model to use
        store: true, // Set to true to store conversations in the 'conversations' folder
    },
    localLLM: {
        modelPath: process.env.LOCAL_MODEL_API_URL, // Set the file path to your local LLM model
        serverUrl: process.env.LOCAL_MODEL_API_URL, // Set the server URL for LM Studio
    },
    siteUrl: process.env.SITE_URL || 'http://localhost:5051', // Add site URL configuration
    runFrontend: 'false' // This will run the frontend by default if set to true and only run the backend if set to false
};
```

### Environment Variables

The `.env` file should contain the following variables:

```properties
// filepath: /home/tfinch/Aramid-Hive-Engine/.env
LOCAL_MODEL_API_URL='http://localhost:1234/v1/completions'
SEARCH_API_KEY='your-search-api-key'
SEARCH_ENGINE_ID='your-search-engine-id'
SEARCH_API_URL='https://www.googleapis.com/customsearch/v1'
OPENAI_API_KEY='your-openai-api-key'
SITE_URL='https://your-site-url'
```

## File Structure

- `public/`
  - `index.html`: The main HTML file for the application.
  - `app.js`: All functions for the front end site.
  - `styles.css`: The CSS file for styling the application.
- `index.js`: The Node.js server file.
- `.env`: The environment variables file.

### Debugging Helpers

- **Grid Helper**: A grid to visualize the scene.
- **Axes Helper**: Axes to visualize the orientation of the scene.
  
### Links

- **LM Studio**: [https://lmstudio.ai](https://lmstudio.ai).
- **Small Time Devs Website**: [https://smalltimedevs.com](https://smalltimedevs.com).
- **Lucky Bet Bots**: [https://lucky-bet.io](https://lucky-bet.io).

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
