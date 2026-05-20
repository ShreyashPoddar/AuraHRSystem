import { NextResponse } from 'next/server';

export async function GET() {
  // Mock AI generated summary logic
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate AI processing delay

  const summaries = [
    {
      title: "Payroll cycle for March is ready.",
      highlight: "Tax regulations in Germany updated.",
      body: "Your global payroll is expected to run smoothly. We've automatically adjusted German employee contracts to reflect the new local tax deductions.",
      highlightWord: "Germany"
    },
    {
      title: "Compliance score increased to 98%.",
      highlight: "Missing SOC2 documents uploaded.",
      body: "Our AI systems detected 4 missing employee agreements in the UK branch. They have been generated and sent for e-signatures.",
      highlightWord: "SOC2"
    },
    {
      title: "Quarterly bonus payouts approved.",
      highlight: "34 employees received commendations.",
      body: "Performance review data has been seamlessly integrated with payroll. Bonus disbursements will clear by end of day.",
      highlightWord: "34 employees"
    }
  ];

  const randomSummary = summaries[Math.floor(Math.random() * summaries.length)];

  return NextResponse.json(randomSummary);
}

export async function POST(req: Request) {
  // Allows taking in custom stats
  const body = await req.json();
  const summary = {
    title: `AI Analysis complete for ${body.location || 'Global'}`,
    highlight: "All metrics normal.",
    body: "No issues detected in current payroll queue.",
    highlightWord: "normal"
  };
  return NextResponse.json(summary);
}
