<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');

global $DB;
$userid = 4;
$prefs = $DB->get_records('user_preferences', ['userid' => $userid]);
foreach ($prefs as $pref) {
    if (strpos($pref->name, 'aurahr') !== false) {
        echo "Name: {$pref->name}, Value: {$pref->value}\n";
    }
}
