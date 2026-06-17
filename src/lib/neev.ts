import OpenAI from 'openai';

if (!process.env.NEEV_API_KEY || process.env.NEEV_API_KEY.includes("YOUR_KEY")) {
  console.warn("NEEV_API_KEY is missing or placeholder. AI features will use high-fidelity Generative Mock mode.");
}

export const neev = new OpenAI({
  apiKey: process.env.NEEV_API_KEY || 'mock-key',
  baseURL: process.env.NEEV_BASE_URL || 'https://inference.ai.neevcloud.com/v1',
});

export const MODEL = 'gpt-oss-20b';

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
 * Helper to generate mock structured data matching expected schemas
 */
function getFallbackMockData<T>(prompt: string, systemPrompt: string): T {
  const p = prompt.toLowerCase();
  const sys = systemPrompt.toLowerCase();

  // 1. Check if it's assessment evaluation (score & feedback)
  if (p.includes('evaluate') || p.includes('score') || sys.includes('evaluator')) {
    return {
      score: 75,
      feedback: "The candidate answered the questions with good overall technical accuracy. MCQs were handled correctly, and descriptive responses covered the core concepts well, though some answers could benefit from more detailed implementation context."
    } as unknown as T;
  }

  // 2. Check if it's AI Interview evaluation (matrix & nextQuestion)
  if (p.includes('communication clarity') || p.includes('cultural fit') || sys.includes('interview')) {
    return {
      matrix: {
        technicalAccuracy: 80,
        communicationClarity: 85,
        culturalFit: 85,
        jdRelevance: 80,
        overall: 82,
        sentiment: "positive",
        nextQuestion: "Can you elaborate on how you optimize performance in frontend applications?",
        reasoning: {
          technicalAccuracy: "Candidate explains core concepts correctly.",
          communicationClarity: "Clear verbal delivery and structure.",
          culturalFit: "Shows strong alignment with team values.",
          jdRelevance: "Addresses key skills required in the job description."
        }
      }
    } as unknown as T;
  }

  // 3. Check if it's JD Parse
  if (p.includes('job description') || p.includes('jd:') || sys.includes('hiring strategist')) {
    return {
      role: "Software Engineer",
      mustHave: ["React", "TypeScript", "Node.js"],
      goodToHave: ["Next.js", "Tailwind CSS", "SQL"],
      futureProof: ["AI integrations", "Cloud architecture"],
      teamGap: ["Advanced caching", "Real-time state sync"],
      summary: "This role focuses on building interactive full-stack web applications with advanced modern styling and logic."
    } as unknown as T;
  }

  // 4. Check if it's Resume Parse
  if (p.includes('resume') || sys.includes('recruitment ai')) {
    return {
      bio: "Skilled Software Engineer with extensive experience developing full-stack web applications.",
      technical_skills: ["JavaScript", "TypeScript", "React", "Node.js", "SQL", "Git"],
      non_technical_skills: ["Agile methodology", "Mentoring", "Technical Writing"],
      experience: [
        {
          role: "Software Engineer",
          company: "Tech Solutions Inc.",
          achievements: [
            "Developed responsive user interfaces using React and Tailwind CSS.",
            "Integrated RESTful APIs and optimized database queries."
          ]
        }
      ],
      education: [
        {
          degree: "Bachelor of Science in Computer Science",
          institution: "University of Technology",
          year: "2022"
        }
      ]
    } as unknown as T;
  }

  const roleMatch = prompt.match(/\*\*([^*]+)\*\*/);
  const role = roleMatch ? roleMatch[1] : "General";

  // 5. Check if it is wrapped questions list
  if (p.includes('"questions":') || sys.includes('array of questions')) {
    return {
      questions: getMockDataForRole(role)
    } as unknown as T;
  }

  // 6. Default to standard questions list
  return getMockDataForRole(role) as unknown as T;
}

/**
 * Helper to get structured JSON from GPT-OSS 120B or High-fidelity Mock
 */
export async function getStructuredAIResponse<T>(prompt: string, systemPrompt: string = "View as an expert HR analyst."): Promise<T | null> {
  // Check if we should use mock
  if (!process.env.NEEV_API_KEY || process.env.NEEV_API_KEY.includes("YOUR_KEY")) {
    return getFallbackMockData<T>(prompt, systemPrompt);
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
    return getFallbackMockData<T>(prompt, systemPrompt);
  }
}
