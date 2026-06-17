<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');
require_once('C:/xampp/htdocs/moodle/local/aurahr_academia/classes/external/generate_questions.php');

global $DB;
$admin = get_admin();
\core\session\manager::set_user($admin);

try {
    echo "Executing generate_questions for assessment 13...\n";
    $res = \local_aurahr_academia\external\generate_questions::execute(13);
    print_r($res);
} catch (Exception $e) {
    echo "Exception Caught: " . $e->getMessage() . "\n";
    if (method_exists($e, 'get_debuginfo')) {
        echo "Debug Info: " . $e->get_debuginfo() . "\n";
    }
    echo "Trace:\n" . $e->getTraceAsString() . "\n";
}
