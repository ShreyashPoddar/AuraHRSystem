<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');

global $DB;
$sql = "SELECT a.*, u.firstname, u.lastname, u.email, j.title as job_title 
        FROM {local_aurahr_applications} a
        JOIN {user} u ON u.id = a.userid
        JOIN {local_aurahr_jobs} j ON j.id = a.jobid
        WHERE u.firstname = 'Shreyash' AND u.lastname = 'Poddar'";
$records = $DB->get_records_sql($sql);

if (empty($records)) {
    echo "No applications found for Shreyash Poddar.\n";
} else {
    foreach ($records as $r) {
        echo "========================================================================\n";
        echo "Application ID: {$r->id} | Job: {$r->job_title}\n";
        echo "========================================================================\n";
        echo "Stage: {$r->stage}\n";
        echo "Scores:\n";
        echo "  - JD Match Score:      " . ($r->jd_score ?? '—') . "%\n";
        echo "  - GitHub Score:        " . ($r->github_score ?? '—') . "%\n";
        echo "  - LinkedIn Score:      " . ($r->linkedin_score ?? '—') . "%\n";
        echo "  - LeetCode Score:      " . ($r->leetcode_score ?? '—') . "%\n";
        echo "  - Academia Score:      " . ($r->academia_score ?? '—') . "%\n";
        echo "  - Interview Score:     " . ($r->interview_score ?? '—') . "%\n";
        echo "  - Overall Score:       " . ($r->overall_score ?? '—') . "%\n";
        echo "\nAI Socials Summary & Reasoning:\n";
        echo $r->ai_summary . "\n";
        echo "------------------------------------------------------------------------\n\n";
    }
}
