<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');

$script_path = 'C:/xampp/htdocs/moodle/local/aurahr_jobs/scraper/scrape.js';
$node_bin = 'node';
if (file_exists('C:\\Program Files\\nodejs\\node.exe')) {
    $node_bin = '"C:\\Program Files\\nodejs\\node.exe"';
}

$urls = [
    'GitHub' => 'https://github.com/shreyashpoddar',
    'LinkedIn' => 'https://linkedin.com/in/shreyashpoddar',
    'LeetCode' => 'https://leetcode.com/shreyashpoddar'
];

foreach ($urls as $platform => $url) {
    echo "========================================\n";
    echo "SCRAPING $platform: $url\n";
    echo "========================================\n";
    $cmd = $node_bin . ' ' . escapeshellarg($script_path) . ' ' . escapeshellarg($url) . ' 2>&1';
    $output = shell_exec($cmd);
    echo "LENGTH: " . strlen($output) . "\n";
    echo "CONTENT:\n";
    echo substr($output, 0, 4000) . "\n\n";
}
