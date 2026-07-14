<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');

global $DB;
$rows = $DB->get_records('local_aurahr_applications');
if (empty($rows)) {
    echo "No applications found in the database.\n";
} else {
    foreach ($rows as $row) {
        echo "ID: {$row->id} | JobID: {$row->jobid} | UserID: {$row->userid} | Stage: {$row->stage}\n";
        echo "  Github: {$row->github_url} (Score: {$row->github_score})\n";
        echo "  Linkedin: {$row->linkedin_url} (Score: {$row->linkedin_score})\n";
        echo "  Leetcode: {$row->leetcode_url} (Score: {$row->leetcode_score})\n";
        echo "  Overall Score: {$row->overall_score}\n\n";
    }
}
