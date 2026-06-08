const { OpenAI } = require('openai');

const neev = new OpenAI({
  apiKey: 'sk-nc-kpI9ZaZf2wcHRckskFTCdisRSfO3gq4eMiMgrRk2qVc',
  baseURL: 'https://inference.ai.neevcloud.com/v1',
});

const questions = [
  {
    text: "What is the primary purpose of React's 'useMemo' hook?",
    options: ["Managing local state", "Memoizing expensive calculations", "Handling side effects", "Accessing DOM nodes"],
    correct: 1,
    explanation: "useMemo is used to cache/memoize the result of a calculation between re-renders.",
    difficulty: "medium"
  },
  {
    text: "Explain the difference between Virtual DOM and Shadow DOM.",
    options: [],
    correct: 0,
    explanation: "",
    difficulty: "hard"
  }
];

const answers = [
  {
    question: "What is the primary purpose of React's 'useMemo' hook?",
    candidateAnswer: "Memoizing expensive calculations"
  },
  {
    question: "Explain the difference between Virtual DOM and Shadow DOM.",
    candidateAnswer: "Virtual DOM is a lightweight copy of the real DOM used by React to optimize rendering. Shadow DOM is a browser technology used for encapsulation in Web Components."
  }
];

const prompt = `
Please evaluate a candidate's answers to a technical assessment.

Questions:
${JSON.stringify(questions, null, 2)}

Candidate Answers:
${JSON.stringify(answers, null, 2)}

Calculate an overall score from 0 to 100 based on the correctness and quality of their answers.
For multiple-choice questions, grade them strictly against the correct answer.
For descriptive/text questions, evaluate them fairly based on technical accuracy and completeness.

Return a JSON object strictly following this structure:
{
  "score": 85,
  "feedback": "The candidate did well on X but struggled with Y."
}
`;

const systemPrompt = "You are an expert technical assessor and AI evaluator. Return ONLY valid JSON.";

async function main() {
  try {
    console.log("Calling Neev API for evaluation...");
    const response = await neev.chat.completions.create({
      model: 'gpt-oss-20b',
      messages: [
        { role: 'system', content: `${systemPrompt} Return ONLY valid JSON.` },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    });
    console.log("Success! Response:");
    console.log(response.choices[0].message.content);
  } catch (error) {
    console.error("Neev API failed with error:");
    console.error(error);
  }
}

main();
