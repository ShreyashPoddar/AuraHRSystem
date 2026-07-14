<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');
global $DB;
$tokens = $DB->get_records('external_tokens');
foreach ($tokens as $t) {
    echo "Token: {$t->token} | User ID: {$t->userid} | Creator: {$t->creatorid}\n";
}
