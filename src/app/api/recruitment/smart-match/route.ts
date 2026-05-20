import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    
    // 1. Get the first active Job Description as the primary matching target
    const jd = db.jobDescriptions.find(j => j.active) || db.jobDescriptions[0];

    if (!jd) {
      return NextResponse.json({ 
        jd: { title: "No Active JD Found" }, 
        ranked: [] 
      });
    }

    // 2. Score candidates against the JD
    const ranked = db.candidates.map(c => {
      // Basic matching logic using must-haves and nice-to-haves
      const matchedMust = jd.mustHave.filter(skill => 
        (c.matchTags || []).some(t => t.toLowerCase().includes(skill.toLowerCase()))
      );
      
      const matchedNice = jd.niceToHave.filter(skill => 
        (c.matchTags || []).some(t => t.toLowerCase().includes(skill.toLowerCase()))
      );

      const missingMust = jd.mustHave.filter(skill => !matchedMust.includes(skill));

      // Calculate a dynamic match percentage for this specific JD
      const mustWeight = 0.7;
      const niceWeight = 0.3;
      
      const mustScore = jd.mustHave.length > 0 ? (matchedMust.length / jd.mustHave.length) * 100 : 100;
      const niceScore = jd.niceToHave.length > 0 ? (matchedNice.length / jd.niceToHave.length) * 100 : 100;
      
      const matchPct = Math.round((mustScore * mustWeight) + (niceScore * niceWeight));

      return {
        ...c,
        matchPct,
        matchedSkills: [...matchedMust, ...matchedNice],
        missingSkills: missingMust
      };
    }).sort((a, b) => b.matchPct - a.matchPct);

    return NextResponse.json({
      jd,
      ranked
    });

  } catch (error: any) {
    console.error("Smart Match API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
