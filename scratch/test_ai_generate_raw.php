<?php
define('CLI_SCRIPT', true);
require('C:/xampp/htdocs/moodle/config.php');
require_once('C:/xampp/htdocs/moodle/local/aurahr_jdparser/classes/ai_client.php');
require_once('C:/xampp/htdocs/moodle/local/aurahr_academia/classes/external/generate_questions.php');

$client = new \local_aurahr_jdparser\ai_client();
$system = \local_aurahr_academia\external\generate_questions::SYSTEM_PROMPT;
$topic = "Automatically generated based on JD Analysis: Focus on SQL, Python, Pandas, Scikit-learn, Data Modeling, Data Visualization, Tableau, Power BI, R, Big Data.";

echo "System Prompt:\n$system\n\n";
echo "Sending chat request to AI...\n";
try {
    $response = $client->chat($system, "Generate exactly 5 questions for:\n\n$topic", 0.5);
    echo "=== RAW AI RESPONSE ===\n";
    echo $response;
    echo "\n=== END RAW RESPONSE ===\n";
    
    echo "Attempting to parse JSON...\n";
    $parsed = $client->parse_json_response($response);
    echo "Successfully parsed! Questions Count: " . count($parsed['questions'] ?? []) . "\n";
} catch (Exception $e) {
    echo "Exception Caught: " . $e->getMessage() . "\n";
    if (method_exists($e, 'get_debuginfo')) {
        echo "Debug Info: " . $e->get_debuginfo() . "\n";
    }
}
