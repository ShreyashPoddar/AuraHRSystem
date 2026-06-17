<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');

global $DB;
$userid = 4;

$chunks_count = $DB->get_field('user_preferences', 'value', [
    'userid' => $userid,
    'name'   => 'aurahr_candidate_settings_chunks'
]);

echo "Chunks count: {$chunks_count}\n";

$full_json = '';
for ($i = 0; $i < (int)$chunks_count; $i++) {
    $val = $DB->get_field('user_preferences', 'value', [
        'userid' => $userid,
        'name'   => 'aurahr_candidate_settings_' . $i
    ]);
    echo "Chunk {$i} length: " . strlen($val) . "\n";
    $full_json .= $val;
}

$prefs = json_decode($full_json, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo "JSON Decode Error: " . json_last_error_msg() . "\n";
} else {
    echo "Decoded successfully!\n";
    echo "github: " . ($prefs['github'] ?? 'not set') . "\n";
    echo "linkedin: " . ($prefs['linkedin'] ?? 'not set') . "\n";
    echo "leetcode: " . ($prefs['leetcode'] ?? 'not set') . "\n";
}
