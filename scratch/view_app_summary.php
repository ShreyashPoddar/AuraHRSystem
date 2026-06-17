<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');

global $DB;
$row = $DB->get_record('local_aurahr_applications', ['id' => 8]);
echo "AI Summary for application 8:\n";
echo $row->ai_summary . "\n";
