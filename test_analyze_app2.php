<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');
global $DB, $USER;

// Log in as Admin User (id = 2)
$USER = $DB->get_record('user', ['id' => 2], '*', MUST_EXIST);

$appid = 2;
echo "Running analyze_socials for Application {$appid}...\n";

try {
    require_once('C:/xampp/htdocs/moodle/local/aurahr_jobs/classes/external/analyze_socials.php');
    $result = \local_aurahr_jobs\external\analyze_socials::execute($appid);
    echo "Result: " . json_encode($result) . "\n";

    $app = $DB->get_record('local_aurahr_applications', ['id' => $appid]);
    echo "After Analysis:\n";
    echo "  GitHub URL: '{$app->github_url}' | Score: {$app->github_score}\n";
    echo "  LeetCode URL: '{$app->leetcode_url}' | Score: {$app->leetcode_score}\n";
    echo "  AI Summary: '{$app->ai_summary}'\n";
    echo "  Overall Score: {$app->overall_score}\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
