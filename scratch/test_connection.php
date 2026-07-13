<?php
$token = '1c62153eb775661d5c9d0134689e597d';
$url = 'http://127.0.0.1:8080/moodle/webservice/rest/server.php';

$query = http_build_query([
    'wstoken' => $token,
    'wsfunction' => 'core_webservice_get_site_info',
    'moodlewsrestformat' => 'json'
]);

echo "Calling Moodle URL: $url?$query\n\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $query);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

if ($response === false) {
    echo "CURL ERROR: " . curl_error($ch) . "\n";
} else {
    echo "Moodle Response:\n";
    $json = json_decode($response, true);
    if ($json === null) {
        echo "RAW RESPONSE (not JSON):\n" . $response . "\n";
    } else {
        print_r($json);
    }
}
