<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');
require_once('C:/xampp/htdocs/moodle/local/aurahr_academia/classes/external/finalize_assessment.php');

global $DB;
$admin = get_admin();
\core\session\manager::set_user($admin);

// Print all assessments
echo "--- ALL ASSESSMENTS ---\n";
$assessments = $DB->get_records('local_aurahr_assessments');
foreach ($assessments as $assess) {
    echo "ID: {$assess->id}, JobID: {$assess->jobid}, Title: {$assess->title}, Status: {$assess->status}\n";
}

// Print all enrollments
echo "\n--- ENROLLMENTS ---\n";
$enrollments = $DB->get_records('local_aurahr_assess_enrol');
foreach ($enrollments as $enrol) {
    echo "ID: {$enrol->id}, AssessmentID: {$enrol->assessmentid}, UserID: {$enrol->userid}, Score: {$enrol->score}, Status: {$enrol->status}\n";
}

// Print all jobs
echo "\n--- ALL JOBS ---\n";
$jobs = $DB->get_records('local_aurahr_jobs');
foreach ($jobs as $job) {
    echo "ID: {$job->id}, Title: {$job->title}\n";
}

// Run finalize for Job 9 specifically
echo "\nTrying to finalize assessment for JobID 9 with pass_count 10...\n";
try {
    $res = \local_aurahr_academia\external\finalize_assessment::execute(9, 10);
    print_r($res);
} catch (Exception $e) {
    echo "Exception Caught: " . $e->getMessage() . "\n";
    if (method_exists($e, 'get_debuginfo')) {
        echo "Debug Info: " . $e->get_debuginfo() . "\n";
    }
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
}


