import OpenAI from 'openai';

if (!process.env.NEEV_API_KEY || process.env.NEEV_API_KEY.includes("YOUR_KEY")) {
  console.warn("NEEV_API_KEY is missing or placeholder. AI features will use high-fidelity Generative Mock mode.");
}

export const neev = new OpenAI({
  apiKey: process.env.NEEV_API_KEY || 'mock-key',
  baseURL: process.env.NEEV_BASE_URL || 'https://inference.ai.neevcloud.com/v1',
});

export const MODEL = 'gpt-oss-120b';

/**
 * High-fidelity Mock Generator for common recruitment roles
 */
function getMockDataForRole(role: string): any[] {
  const r = role.toLowerCase();
  
  if (r.includes('frontend') || r.includes('react')) {
    return [
      { id: 'q1', type: 'mcq', question: "What is the primary purpose of React's 'useMemo' hook?", options: ["Managing local state", "Memoizing expensive calculations", "Handling side effects", "Accessing DOM nodes"], correctAnswer: "Memoizing expensive calculations" },
      { id: 'q2', type: 'mcq', question: "Which CSS property is used for controlling the stacking order of elements?", options: ["position", "display", "z-index", "float"], correctAnswer: "z-index" },
      { id: 'q3', type: 'mcq', question: "In Next.js, which function is used for server-side rendering on every request?", options: ["getStaticProps", "getServerSideProps", "getInitialProps", "componentDidMount"], correctAnswer: "getServerSideProps" },
      { id: 'q4', type: 'mcq', question: "What does JSX stand for?", options: ["JavaScript XML", "Java Syntax Extension", "JSON Syntax XML", "JavaScript X-platform"], correctAnswer: "JavaScript XML" },
      { id: 'q5', type: 'mcq', question: "Which hook would you use to sync state with localStorage?", options: ["useState", "useEffect", "useContext", "useReducer"], correctAnswer: "useEffect" },
      { id: 'q6', type: 'text', question: "Explain the difference between Virtual DOM and Shadow DOM." },
      { id: 'q7', type: 'text', question: "Describe the 'Lift State Up' pattern in React and when it is used." },
      { id: 'q8', type: 'text', question: "What are Web Workers and how do they help in frontend performance?" },
      { id: 'q9', type: 'text', question: "Explain the concept of 'Hydration' in Server-Side Rendering." },
      { id: 'q10', type: 'text', question: "How does the 'Key' prop work in React lists?" }
    ];
  }

  if (r.includes('backend') || r.includes('node') || r.includes('python')) {
    return [
      { id: 'q1', type: 'mcq', question: "Which HTTP status code represents 'Internal Server Error'?", options: ["200", "404", "500", "503"], correctAnswer: "500" },
      { id: 'q2', type: 'mcq', question: "What is the main advantage of using a Load Balancer?", options: ["Encryption", "Data storage", "Distributing network traffic", "Caching responses"], correctAnswer: "Distributing network traffic" },
      { id: 'q3', type: 'mcq', question: "Which indexing type is most common for primary keys in SQL databases?", options: ["B-Tree", "Hash", "GIST", "GIN"], correctAnswer: "B-Tree" },
      { id: 'q4', type: 'mcq', question: "What does ACID stand for in database transactions?", options: ["Access, Connect, Input, Data", "Atomicity, Consistency, Isolation, Durability", "Action, Commit, Index, Delete", "API, Cache, Interface, Driver"], correctAnswer: "Atomicity, Consistency, Isolation, Durability" },
      { id: 'q5', type: 'mcq', question: "Which Node.js module is used for handling file paths?", options: ["fs", "http", "path", "os"], correctAnswer: "path" },
      { id: 'q6', type: 'text', question: "Explain the difference between SQL and NoSQL databases." },
      { id: 'q7', type: 'text', question: "What is an ORM and what are its pros and cons?" },
      { id: 'q8', type: 'text', question: "Describe the event loop in Node.js." },
      { id: 'q9', type: 'text', question: "What is JWT and how is it used for authentication?" },
      { id: 'q10', type: 'text', question: "Explain the concept of 'Microservices Architecture'." }
    ];
  }

  // Default General Technical questions
  return [
    { id: 'q1', type: 'mcq', question: "What does 'SOLID' stand for in software engineering?", options: ["Security, Optimization, Logic, Interface, Data", "Single responsibility, Open-closed, Liskov substitution, Interface segregation, Dependency inversion", "Speed, Objectivity, Linearity, Integration, Deployment", "None of the above"], correctAnswer: "Single responsibility, Open-closed, Liskov substitution, Interface segregation, Dependency inversion" },
    { id: 'q2', type: 'mcq', question: "Which version control system is distributed?", options: ["SVN", "CVS", "Git", "Perforce"], correctAnswer: "Git" },
    { id: 'q3', type: 'mcq', question: "What is the time complexity of searching in a balanced BST?", options: ["O(1)", "O(n)", "O(log n)", "O(n log n)"], correctAnswer: "O(log n)" },
    { id: 'q4', type: 'mcq', question: "What is 'DRY' in programming?", options: ["Deep Reference Yield", "Don't Repeat Yourself", "Data Reliability Yield", "Distributed Runtime Yard"], correctAnswer: "Don't Repeat Yourself" },
    { id: 'q5', type: 'mcq', question: "What is the primary purpose of a CI/CD pipeline?", options: ["Automating deployments", "Writing code", "Database management", "Email notifications"], correctAnswer: "Automating deployments" },
    { id: 'q6', type: 'text', question: "Describe the 'Observer' design pattern." },
    { id: 'q7', type: 'text', question: "Explain the concept of 'Big O' notation." },
    { id: 'q8', type: 'text', question: "What is the difference between synchronous and asynchronous code?" },
    { id: 'q9', type: 'text', question: "Explain 'Dependency Injection'." },
    { id: 'q10', type: 'text', question: "What are the benefits of Unit Testing?" }
  ];
}

/**
 * Helper to get structured JSON from GPT-OSS 120B or High-fidelity Mock
 */
export async function getStructuredAIResponse<T>(prompt: string, systemPrompt: string = "View as an expert HR analyst."): Promise<T | null> {
  // Check if we should use mock
  if (!process.env.NEEV_API_KEY || process.env.NEEV_API_KEY.includes("YOUR_KEY")) {
    const roleMatch = prompt.match(/\*\*([^*]+)\*\*/); // Extract role from prompt if possible
    const role = roleMatch ? roleMatch[1] : "General";
    return getMockDataForRole(role) as unknown as T;
  }

  try {
    const response = await neev.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: `${systemPrompt} Return ONLY valid JSON.` },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    return content ? JSON.parse(content) as T : null;
  } catch (error) {
    console.error("AI Response Error:", error);
    // Final fallback to mock if AI fails
    return getMockDataForRole("General") as unknown as T;
  }
}
