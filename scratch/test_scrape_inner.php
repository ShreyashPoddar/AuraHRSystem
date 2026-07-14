<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');

$script_path = 'C:/xampp/htdocs/moodle/local/aurahr_jobs/scraper/scrape.js';
$url = 'https://github.com/shreyashpoddar';

$node_bin = 'node';
if (file_exists('C:\\Program Files\\nodejs\\node.exe')) {
    $node_bin = '"C:\\Program Files\\nodejs\\node.exe"';
}
$cmd = $node_bin . ' ' . escapeshellarg($script_path) . ' ' . escapeshellarg($url);
echo "Executing: $cmd\n";

$output = shell_exec($cmd . ' 2>&1'); // redirect stderr
echo "Raw Output:\n";
echo $output . "\n";
