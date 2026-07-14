const fetch = require('node-fetch');

async function testMoodleCall() {
  const res = await fetch('http://localhost:3000/api/moodle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wsfunction: 'local_aurahr_jobs_list_applications',
      params: { jobid: 1 },
      token: '65da8df9bde07b04b6ae35be15a852ea' // token for adminaurahrin
    })
  });
  const data = await res.json();
  console.log('Result for adminaurahrin:', data);
  
  const res2 = await fetch('http://localhost:3000/api/moodle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wsfunction: 'local_aurahr_jobs_list_applications',
      params: { jobid: 1 },
      token: '5b6877ab072d0b1cb64e058db238135a' // token for userexamplecom
    })
  });
  const data2 = await res2.json();
  console.log('Result for userexamplecom:', data2);
}
testMoodleCall();
