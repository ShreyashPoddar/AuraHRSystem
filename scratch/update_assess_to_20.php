<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');
global $DB;
$DB->execute('UPDATE {local_aurahr_assessments} SET num_questions = 20 WHERE id = 6');
echo "Successfully updated assessment 6 to 20 questions!\n";
