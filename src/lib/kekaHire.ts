import { getKekaAccessToken } from './kekaAuth';

export async function fetchCandidateResume(candidateId: string): Promise<any> {
  const token = await getKekaAccessToken();
  const url = `https://rackbank.keka.com/api/v1/hire/jobs/candidate/${candidateId}/resume`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch resume for candidate ${candidateId}:`, response.status, errorText);
      throw new Error(`Keka API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Keka Raw Response:', data);
    
    const fileUrl = data?.data?.fileUrl;
    if (!fileUrl) {
      return { error: "No fileUrl found", rawKekaData: data };
    }

    // Download the actual file from the secure URL
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file from Keka AWS link. Status: ${fileResponse.status}`);
    }
    
    // Convert to ArrayBuffer then to Base64
    const arrayBuffer = await fileResponse.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    let filename = 'resume.pdf';
    try {
      const urlWithoutQuery = fileUrl.split('?')[0];
      const segments = urlWithoutQuery.split('/');
      const extracted = segments.pop();
      if (extracted) {
        filename = extracted;
      }
    } catch (e) {
      console.warn('Failed to extract filename from fileUrl, using fallback resume.pdf');
    }

    return { base64Data, filename };
  } catch (error) {
    console.error('Error in fetchCandidateResume:', error);
    throw error;
  }
}

export async function fetchKekaJobs(): Promise<any[]> {
  const token = await getKekaAccessToken();
  const url = 'https://rackbank.keka.com/api/v1/hire/jobs';

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch Keka jobs:', response.status, errorText);
      throw new Error(`Keka API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Keka wraps list responses: { "succeeded": true, "data": [...] }
    // Fall back gracefully if the API ever returns a raw array.
    const jobs: any[] = Array.isArray(data) ? data : (data.data ?? []);
    return jobs;
  } catch (error) {
    console.error('Error in fetchKekaJobs:', error);
    throw error;
  }
}

export async function fetchKekaCandidates(jobId: string): Promise<any[]> {
  const token = await getKekaAccessToken();
  const url = `https://rackbank.keka.com/api/v1/hire/jobs/${jobId}/candidates`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch candidates for job ${jobId}:`, response.status, errorText);
      throw new Error(`Keka API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Keka wraps list responses: { "succeeded": true, "data": [...] }
    // Fall back gracefully if the API ever returns a raw array.
    const candidates: any[] = Array.isArray(data) ? data : (data.data ?? []);
    return candidates;
  } catch (error) {
    console.error('Error in fetchKekaCandidates:', error);
    throw error;
  }
}

export async function fetchKekaJobDetails(jobId: string): Promise<any> {
  const token = await getKekaAccessToken();
  // Falling back to the postings endpoint to avoid 404s on the root jobs path
  const url = `https://rackbank.keka.com/api/v1/hire/postings/${jobId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch Keka job details for ${jobId}:`, response.status, errorText);
      throw new Error(`Keka API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('Error in fetchKekaJobDetails:', error);
    throw error;
  }
}