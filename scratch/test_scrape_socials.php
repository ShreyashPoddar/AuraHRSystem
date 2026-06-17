<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');

global $DB, $USER;
$USER = $DB->get_record('user', ['id' => 2]);

$applicationid = isset($argv[1]) ? (int)$argv[1] : 8;
echo "Running analyze_socials for application $applicationid...\n";
try {
    // 1. Get Application
    $app = $DB->get_record('local_aurahr_applications', ['id' => $applicationid], '*', MUST_EXIST);
    
    // 2. Fetch candidate preferences to get URLs.
    $chunks_count = $DB->get_field('user_preferences', 'value', [
        'userid' => $app->userid,
        'name'   => 'aurahr_candidate_settings_chunks'
    ]);

    $prefs = [];
    if ($chunks_count) {
        $full_json = '';
        for ($i = 0; $i < (int)$chunks_count; $i++) {
            $full_json .= $DB->get_field('user_preferences', 'value', [
                'userid' => $app->userid,
                'name'   => 'aurahr_candidate_settings_' . $i
            ]);
        }
        $prefs = json_decode($full_json, true) ?: [];
    } else {
        $user_prefs_json = $DB->get_field('user_preferences', 'value', [
            'userid' => $app->userid,
            'name'   => 'aurahr_candidate_settings'
        ]);
        $prefs = $user_prefs_json ? (json_decode($user_prefs_json, true) ?: []) : [];
    }
    
    $github_url   = $prefs['github'] ?? '';
    $linkedin_url = $prefs['linkedin'] ?? '';
    $leetcode_url = $prefs['leetcode'] ?? '';

    echo "URLs:\n";
    echo "  Github: $github_url\n";
    echo "  Linkedin: $linkedin_url\n";
    echo "  Leetcode: $leetcode_url\n\n";

    // 3. Scrape
    $script_path = realpath(__DIR__ . '/../../backend-moodle-plugins/local/aurahr_jobs/scraper/scrape.js');
    $node_bin = 'node';
    if (file_exists('C:\\Program Files\\nodejs\\node.exe')) {
        $node_bin = '"C:\\Program Files\\nodejs\\node.exe"';
    }

    echo "Scraping GitHub...\n";
    $cmd = $node_bin . ' ' . escapeshellarg($script_path) . ' ' . escapeshellarg($github_url);
    $github_data = trim(shell_exec($cmd) ?: '');
    echo "  Github data length: " . strlen($github_data) . "\n";

    echo "Scraping LinkedIn...\n";
    $cmd = $node_bin . ' ' . escapeshellarg($script_path) . ' ' . escapeshellarg($linkedin_url);
    $linkedin_data = trim(shell_exec($cmd) ?: '');
    echo "  Linkedin data length: " . strlen($linkedin_data) . "\n";

    echo "Scraping LeetCode...\n";
    $cmd = $node_bin . ' ' . escapeshellarg($script_path) . ' ' . escapeshellarg($leetcode_url);
    $leetcode_data = trim(shell_exec($cmd) ?: '');
    echo "  Leetcode data length: " . strlen($leetcode_data) . "\n\n";

    // 4. Call AI
    echo "Calling analyze_socials...\n";
    require_once('C:/xampp/htdocs/moodle/local/aurahr_jobs/classes/external/analyze_socials.php');
    $result = \local_aurahr_jobs\external\analyze_socials::execute($applicationid);
    print_r($result);

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
