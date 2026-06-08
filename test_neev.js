const { OpenAI } = require('openai');

const neev = new OpenAI({
  apiKey: 'sk-nc-kpI9ZaZf2wcHRckskFTCdisRSfO3gq4eMiMgrRk2qVc',
  baseURL: 'https://inference.ai.neevcloud.com/v1',
});

async function main() {
  try {
    console.log("Calling Neev API...");
    const response = await neev.chat.completions.create({
      model: 'gpt-oss-20b',
      messages: [
        { role: 'system', content: "You are a helpful assistant. Return ONLY valid JSON." },
        { role: 'user', content: "Return a JSON with score: 85 and feedback: 'Good'." }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 100,
    });
    console.log("Success! Response:");
    console.log(response.choices[0].message.content);
  } catch (error) {
    console.error("Neev API failed with error:");
    console.error(error);
  }
}

main();
