<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');

global $DB;
$users = $DB->get_records('user');
foreach ($users as $user) {
    echo "ID: {$user->id} | Username: {$user->username} | Email: {$user->email} | Firstname: {$user->firstname} | Lastname: {$user->lastname}\n";
}
