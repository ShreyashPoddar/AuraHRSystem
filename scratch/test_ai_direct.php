<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');

global $DB, $USER;
$USER = $DB->get_record('user', ['id' => 2]);

$applicationid = 8;
$app = $DB->get_record('local_aurahr_applications', ['id' => $applicationid], '*', MUST_EXIST);
$job = $DB->get_record('local_aurahr_jobs', ['id' => $app->jobid], '*', MUST_EXIST);

$github_url = $app->github_url;
$linkedin_url = $app->linkedin_url;
$leetcode_url = $app->leetcode_url;

$github_data = "Skip to content Mona the Octocat, Copilot, and Ducky float jubilantly. Node.js developer with 5 years experience, React, Redux, PostgreSQL.";
$linkedin_data = "Agree & Join LinkedIn... Sign in... (No profile info)";
$leetcode_data = "ShreyashPoddar Solved 0/3949 problems. Acceptance 0%. Total active days: 0.";

$jd_skills_context = "PRIORITY SKILLS FROM JD PARSER:\n- MUST HAVE: Node.js, React, SQL\n- GOOD TO HAVE: Docker\n";

$prompt = "You are an expert technical recruiter and software engineering manager.
I will provide you with a Job Description, extracted Priority Skills, and the scraped public profile data of a candidate from GitHub, LinkedIn, and LeetCode.
Your task is to analyze these profiles against the Priority Skills and Job Description, and score them out of 100.

JOB DESCRIPTION:
{$job->title}
{$job->description}

{$jd_skills_context}

CANDIDATE GITHUB DATA (URL: {$github_url}):
{$github_data}

CANDIDATE LINKEDIN DATA (URL: {$linkedin_url}):
{$linkedin_data}

CANDIDATE LEETCODE DATA (URL: {$leetcode_url}):
{$leetcode_data}

Please output ONLY a valid JSON object matching this schema, without any markdown formatting or code blocks:
{
  \"github_score\": 85,
  \"linkedin_score\": 90,
  \"leetcode_score\": 80,
  \"reasoning\": \"Brief 2-3 sentence summary of which priority skills were extracted and compared across the websites to justify these scores.\"
}
If the scraped data says 'Forbidden', 'Access Denied', or is empty for a specific platform, output 0 for its score, OR if you find strong indirect evidence of their proficiency, default to a moderate score (e.g., 60).
";

$system_prompt = "You are an expert technical recruiter and software engineering manager.";

echo "Calling Neev AI...\n";
try {
    $ai = new \local_aurahr_jdparser\ai_client();
    $result = $ai->chat($system_prompt, $prompt, 0.2);
    echo "Raw response from Neev AI:\n";
    echo $result . "\n\n";
    
    $json = $ai->parse_json_response($result);
    echo "Parsed JSON:\n";
    print_r($json);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
