/**
 * AuraHR Platform-Specific Scraper
 *
 * Strategy:
 *  - GitHub   → Official public REST API (no auth, 60 req/hr limit)
 *  - LeetCode → Official public GraphQL API (no auth needed)
 *  - Fallback → Generic HTTP page dump
 *
 * Usage: node scrape.js <url>
 */

const https = require('https');
const http  = require('http');
const { URL } = require('url');

const rawUrl = process.argv[2];
if (!rawUrl || !rawUrl.startsWith('http')) {
    console.error('Invalid URL provided.');
    process.exit(1);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function httpGet(url, options = {}) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? https : http;
        const reqOpts = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                ...options.headers,
            },
            timeout: 10000,
        };
        const req = lib.request(reqOpts, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
        req.end();
    });
}

function httpPost(url, payload, options = {}) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const data = JSON.stringify(payload);
        const lib = parsed.protocol === 'https:' ? https : http;
        const reqOpts = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                ...options.headers,
            },
            timeout: 12000,
        };
        const req = lib.request(reqOpts, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
        req.write(data);
        req.end();
    });
}

// ── GitHub ──────────────────────────────────────────────────────────────────

async function scrapeGitHub(profileUrl) {
    // Extract username from various URL forms:
    // https://github.com/username  or  https://github.com/username/
    const match = profileUrl.match(/github\.com\/([^/?\s]+)/i);
    if (!match) return 'Could not extract GitHub username from URL.';
    const username = match[1];

    const [userRes, reposRes] = await Promise.all([
        httpGet(`https://api.github.com/users/${username}`, { headers: { 'Accept': 'application/vnd.github+json' } }),
        httpGet(`https://api.github.com/users/${username}/repos?sort=pushed&per_page=20&type=owner`, { headers: { 'Accept': 'application/vnd.github+json' } }),
    ]);

    if (userRes.status === 404) return `GitHub user "${username}" not found.`;
    if (userRes.status !== 200) return `GitHub API returned status ${userRes.status}.`;

    const user = JSON.parse(userRes.body);
    const repos = userRes.status === 200 && reposRes.status === 200 ? JSON.parse(reposRes.body) : [];

    const languages = [...new Set(repos.filter(r => r.language).map(r => r.language))];
    const topRepos  = repos.slice(0, 8).map(r =>
        `${r.name} [${r.language || 'N/A'}] – ★${r.stargazers_count}, ${r.description || 'no description'}`
    ).join('\n');

    return [
        `GitHub Profile: ${user.name || username} (@${user.login})`,
        `Bio: ${user.bio || 'N/A'}`,
        `Location: ${user.location || 'N/A'}`,
        `Company: ${user.company || 'N/A'}`,
        `Public Repos: ${user.public_repos} | Followers: ${user.followers} | Following: ${user.following}`,
        `Account Created: ${user.created_at}`,
        `Languages Used: ${languages.join(', ') || 'N/A'}`,
        `\nTop Repositories:\n${topRepos || 'No repositories found.'}`,
    ].join('\n');
}

// ── LeetCode ────────────────────────────────────────────────────────────────

async function scrapeLeetCode(profileUrl) {
    const match = profileUrl.match(/leetcode\.com\/(?:u\/)?([^/?\s]+)/i);
    if (!match) return 'Could not extract LeetCode username from URL.';
    const username = match[1];

    const query = `
    {
      matchedUser(username: "${username}") {
        username
        submitStats {
          acSubmissionNum { difficulty count submissions }
        }
        profile {
          realName
          ranking
          starRating
          reputation
          school
          company
          skillTags
        }
        tagProblemCounts {
          advanced      { tagName problemsSolved }
          intermediate  { tagName problemsSolved }
          fundamental   { tagName problemsSolved }
        }
      }
      userContestRanking(username: "${username}") {
        attendedContestsCount
        rating
        globalRanking
        badge { name }
      }
    }`;

    const res = await httpPost(
        'https://leetcode.com/graphql',
        { query },
        { headers: { 'Referer': 'https://leetcode.com', 'Origin': 'https://leetcode.com' } }
    );

    if (res.status !== 200) return `LeetCode API returned status ${res.status}.`;

    const json = JSON.parse(res.body);
    const u = json?.data?.matchedUser;
    if (!u) return `LeetCode user "${username}" not found or profile is private.`;

    const stats   = u.submitStats?.acSubmissionNum || [];
    const allStat = stats.find(s => s.difficulty === 'All');
    const easy    = stats.find(s => s.difficulty === 'Easy');
    const med     = stats.find(s => s.difficulty === 'Medium');
    const hard    = stats.find(s => s.difficulty === 'Hard');

    const contest = json?.data?.userContestRanking;

    const topTags = [
        ...(u.tagProblemCounts?.advanced      || []),
        ...(u.tagProblemCounts?.intermediate  || []),
        ...(u.tagProblemCounts?.fundamental   || []),
    ].sort((a, b) => b.problemsSolved - a.problemsSolved).slice(0, 10)
     .map(t => `${t.tagName}(${t.problemsSolved})`).join(', ');

    return [
        `LeetCode Profile: ${u.profile?.realName || username} (@${u.username})`,
        `Global Ranking: ${u.profile?.ranking ?? 'N/A'} | Star Rating: ${u.profile?.starRating ?? 0}`,
        `School: ${u.profile?.school || 'N/A'} | Company: ${u.profile?.company || 'N/A'}`,
        `Skills: ${(u.profile?.skillTags || []).join(', ') || 'N/A'}`,
        `\nProblems Solved:`,
        `  Total : ${allStat?.count ?? 0} (${allStat?.submissions ?? 0} submissions)`,
        `  Easy  : ${easy?.count ?? 0}`,
        `  Medium: ${med?.count ?? 0}`,
        `  Hard  : ${hard?.count ?? 0}`,
        `\nTop Problem Tags: ${topTags || 'N/A'}`,
        contest ? [
            `\nContest Stats:`,
            `  Attended: ${contest.attendedContestsCount}`,
            `  Rating: ${Math.round(contest.rating ?? 0)}`,
            `  Global Rank: ${contest.globalRanking}`,
            `  Badge: ${contest.badge?.name || 'None'}`,
        ].join('\n') : '',
    ].join('\n');
}

// ── Generic Fallback ─────────────────────────────────────────────────────────

async function scrapeGeneric(url) {
    const res = await httpGet(url);
    const text = res.body
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return text.slice(0, 6000) || 'No content retrieved.';
}

// ── Router ───────────────────────────────────────────────────────────────────

(async () => {
    try {
        let result;
        const lower = rawUrl.toLowerCase();

        if (lower.includes('github.com')) {
            result = await scrapeGitHub(rawUrl);
        } else if (lower.includes('leetcode.com')) {
            result = await scrapeLeetCode(rawUrl);
        } else {
            result = await scrapeGeneric(rawUrl);
        }

        console.log(result);
    } catch (err) {
        console.error('Scraping Error:', err.message);
        process.exit(1);
    }
})();
