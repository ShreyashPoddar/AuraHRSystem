<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');

$script_path = realpath(__DIR__ . '/../../backend-moodle-plugins/local/aurahr_jobs/scraper/scrape.js');
echo "Script path: $script_path\n";
if (!$script_path || !file_exists($script_path)) {
    die("Error: Scraper script not found.\n");
}

$url = 'https://github.com/';
$cmd = 'node ' . escapeshellarg($script_path) . ' ' . escapeshellarg($url);
echo "Running command: $cmd\n";

$output = shell_exec($cmd);
if ($output === null) {
    echo "Result: shell_exec returned null (failed to run command).\n";
} else {
    echo "Result length: " . strlen($output) . "\n";
    echo "First 200 chars of output:\n";
    echo substr($output, 0, 200) . "\n";
}
