<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');

global $DB, $USER;

$jobid = 7;
$userid = 4;

echo "Cleaning up existing application for User {$userid} on Job {$jobid}...\n";
$DB->delete_records('local_aurahr_applications', ['userid' => $userid, 'jobid' => $jobid]);

// Log in as user 4
$USER = $DB->get_record('user', ['id' => $userid], '*', MUST_EXIST);
echo "Logged in as User {$USER->username} ({$USER->firstname} {$USER->lastname})\n";

// Execute apply function
try {
    echo "Executing apply::execute for Job {$jobid}...\n";
    require_once('C:/xampp/htdocs/moodle/local/aurahr_jobs/classes/external/apply.php');
    $result = \local_aurahr_jobs\external\apply::execute($jobid);
    echo "Application result: " . json_encode($result) . "\n";

    // Retrieve the newly created application and print it
    $app = $DB->get_record('local_aurahr_applications', ['userid' => $userid, 'jobid' => $jobid]);
    if ($app) {
        echo "Newly created Application ID: {$app->id}\n";
        echo "Stage: {$app->stage}\n";
        echo "JD Parser Score: {$app->jd_score}\n";
        echo "GitHub Score: {$app->github_score} (URL: {$app->github_url})\n";
        echo "LinkedIn Score: {$app->linkedin_score} (URL: {$app->linkedin_url})\n";
        echo "LeetCode Score: {$app->leetcode_score} (URL: {$app->leetcode_url})\n";
        echo "Overall Score: {$app->overall_score}\n";
    } else {
        echo "Failed to retrieve the new application from the database.\n";
    }
} catch (Exception $e) {
    echo "Exception during apply execution: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
