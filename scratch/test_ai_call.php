<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');
require_once('C:/xampp/htdocs/moodle/local/aurahr_jdparser/classes/ai_client.php');

try {
    $client = new \local_aurahr_jdparser\ai_client();
    echo "AI Client initialized.\n";
    echo "API URL: " . get_config('local_aurahr_jdparser', 'apiurl') . "\n";
    echo "API Key prefix: " . substr(get_config('local_aurahr_jdparser', 'apikey'), 0, 10) . "...\n";
    echo "Model: " . get_config('local_aurahr_jdparser', 'model') . "\n";
    
    echo "Sending request to AI...\n";
    $response = $client->chat("You are a helpful assistant.", "Say hello!", 0.3);
    echo "Response: " . $response . "\n";
} catch (Exception $e) {
    echo "Exception: " . $e->getMessage() . "\n";
    if (method_exists($e, 'get_debuginfo')) {
        echo "Debug info: " . $e->get_debuginfo() . "\n";
    }
}
