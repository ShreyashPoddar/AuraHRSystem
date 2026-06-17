<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');
require_once('C:/xampp/htdocs/moodle/local/aurahr_academia/classes/external/create_assessment.php');
require_once('C:/xampp/htdocs/moodle/local/aurahr_academia/classes/external/generate_questions.php');

global $DB;

// Print all jobs
echo "=== JOBS IN DB ===\n";
$jobs = $DB->get_records('local_aurahr_jobs');
foreach ($jobs as $job) {
    echo "ID: {$job->id} | Title: {$job->title}\n";
}

// Find the latest job or use jobId from CLI/default
$target_job = reset($jobs);
if (!$target_job) {
    echo "No jobs found!\n";
    exit;
}

$jobid = 6;
echo "\nTesting generation for Job ID: {$jobid}\n";

// Set admin user context
$admin = get_admin();
\core\session\manager::set_user($admin);

try {
    echo "1. Creating assessment...\n";
    $createRes = \local_aurahr_academia\external\create_assessment::execute(
        $jobid,
        "Technical Test - Job " . $jobid,
        20, // num_questions
        60, // duration_mins
        60.0, // pass_percentage
        "Focus on React, TypeScript, Next.js"
    );
    echo "Assessment created successfully. ID: " . $createRes['id'] . "\n";
    
    echo "2. Generating questions...\n";
    $genRes = \local_aurahr_academia\external\generate_questions::execute($createRes['id']);
    echo "Questions generated: " . $genRes['questions_count'] . "\n";
    
} catch (Exception $e) {
    echo "Exception Caught: " . $e->getMessage() . "\n";
    if (method_exists($e, 'get_debuginfo')) {
        echo "Debug Info: " . $e->get_debuginfo() . "\n";
    }
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
}
