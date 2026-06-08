// Test public APIs for GitHub and LeetCode
const username = 'shreyashpoddar';

async function testGitHub(username) {
    console.log('--- GitHub API ---');
    try {
        const res = await fetch(`https://api.github.com/users/${username}`);
        const user = await res.json();
        console.log(`Name: ${user.name}, Repos: ${user.public_repos}, Followers: ${user.followers}`);

        const reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=pushed&per_page=10`);
        const repos = await reposRes.json();
        if (Array.isArray(repos)) {
            console.log('Repos:', repos.map(r => `${r.name}(${r.language})`).join(', '));
        }
    } catch(e) {
        console.error('GitHub error:', e.message);
    }
}

async function testLeetCode(username) {
    console.log('\n--- LeetCode GraphQL API ---');
    const query = `
    {
      matchedUser(username: "${username}") {
        username
        submitStats {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
        }
        profile {
          realName
          ranking
          starRating
          reputation
        }
        tagProblemCounts {
          advanced { tagName problemsSolved }
          intermediate { tagName problemsSolved }
          fundamental { tagName problemsSolved }
        }
      }
    }`;
    try {
        const res = await fetch('https://leetcode.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://leetcode.com'
            },
            body: JSON.stringify({ query })
        });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch(e) {
        console.error('LeetCode error:', e.message);
    }
}

(async () => {
    await testGitHub(username);
    await testLeetCode(username);
})();
