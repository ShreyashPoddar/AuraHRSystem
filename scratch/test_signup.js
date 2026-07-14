const fetch = require('node-fetch');

async function testSignup() {
  const res = await fetch('http://localhost:3000/api/moodle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'signup',
      username: 'testorg99',
      password: 'Password123!',
      firstname: 'Test',
      lastname: 'Org',
      email: 'testorg99@example.com',
      role: 'organization'
    })
  });
  const data = await res.json();
  console.log(data);
}
testSignup();
