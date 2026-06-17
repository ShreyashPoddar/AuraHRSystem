<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');

global $DB;
$apps = $DB->get_records('local_aurahr_applications');
foreach ($apps as $app) {
    echo "ID: {$app->id}, UserID: {$app->userid}, JobID: {$app->jobid}, Stage: {$app->stage}, overall_score: {$app->overall_score}, github: {$app->github_score}, linkedin: {$app->linkedin_score}, leetcode: {$app->leetcode_score}\n";
}
