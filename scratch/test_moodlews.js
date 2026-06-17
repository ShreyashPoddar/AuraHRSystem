const token = '2ad61f610b07c24d9c923a3ef17266fa';
const MOODLE_URL = 'http://localhost/moodle';

async function test() {
  const url = new URL(`${MOODLE_URL}/webservice/rest/server.php`);
  url.searchParams.set('wstoken', token);
  url.searchParams.set('wsfunction', 'local_aurahr_academia_create_assessment');
  url.searchParams.set('moodlewsrestformat', 'json');
  
  const params = {
    jobid: 1, // let's use job ID 1
    title: 'Technical Test - Job 1',
    num_questions: 20,
    duration_mins: 30,
    pass_percentage: 60.0,
    ai_topic: 'Automatically generated based on JD Analysis: Focus on SQL, Python, Pandas, Scikit-learn, Data Modeling, Data Visualization, Tableau, Power BI, R, Big Data.'
  };

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  console.log('Requesting URL:', url.toString());

  try {
    const res = await fetch(url.toString());
    const data = await res.json();
    console.log('Response:', data);
    
    if (data.id) {
      console.log('Successfully created assessment ID:', data.id);
      // Now try generating questions
      const genUrl = new URL(`${MOODLE_URL}/webservice/rest/server.php`);
      genUrl.searchParams.set('wstoken', token);
      genUrl.searchParams.set('wsfunction', 'local_aurahr_academia_generate_questions');
      genUrl.searchParams.set('moodlewsrestformat', 'json');
      genUrl.searchParams.set('assessmentid', data.id);
      
      console.log('Generating questions...');
      const genRes = await fetch(genUrl.toString());
      const genData = await genRes.json();
      console.log('Generation Response:', genData);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
