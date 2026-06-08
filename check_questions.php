<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');
global $DB;

$a = $DB->get_record('local_aurahr_assessments', ['id' => 16]);
if ($a) {
    echo "Questions JSON:\n";
    echo $a->questions . "\n";
} else {
    echo "Assessment 16 not found!\n";
}
