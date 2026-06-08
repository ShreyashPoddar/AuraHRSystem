<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');
global $DB;
$analyses = $DB->get_records('local_aurahr_jd_analysis');
foreach ($analyses as $id => $an) {
    echo "ID: $id | JobID: {$an->jobid} | IsFinalized: {$an->is_finalized} | PassCount: {$an->pass_count}\n";
}
