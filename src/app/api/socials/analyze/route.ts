import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { applicationid } = await request.json();
    if (!applicationid) {
      return NextResponse.json({ error: 'Missing applicationid' }, { status: 400 });
    }

    const MOODLE_URL = process.env.NEXT_PUBLIC_MOODLE_URL || 'http://localhost/moodle';
    const MOODLE_TOKEN = process.env.MOODLE_TOKEN || process.env.MOODLE_ADMIN_TOKEN;

    if (!MOODLE_TOKEN) {
      console.warn("MOODLE_TOKEN is missing. Cannot automatically trigger scraping.");
      return NextResponse.json({ error: 'Moodle token missing' }, { status: 500 });
    }

    const endpoint = `${MOODLE_URL}/webservice/rest/server.php`;

    const formData = new URLSearchParams();
    formData.append('wstoken', MOODLE_TOKEN);
    formData.append('wsfunction', 'local_aurahr_jobs_analyze_socials');
    formData.append('moodlewsrestformat', 'json');
    formData.append('applicationid', applicationid.toString());

    // Trigger the analysis in Moodle using the admin token
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    const data = await response.json();
    
    if (data.exception) {
      console.error("Moodle Exception during analyze_socials:", data);
      return NextResponse.json({ error: data.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Failed to trigger analyze_socials:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
