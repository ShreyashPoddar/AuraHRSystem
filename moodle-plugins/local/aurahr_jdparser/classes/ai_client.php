<?php
namespace local_aurahr_jdparser;

/**
 * AI API Client — makes HTTP requests to OpenAI-compatible endpoints.
 *
 * Reads config from Moodle admin settings:
 *   - local_aurahr_jdparser/apiurl
 *   - local_aurahr_jdparser/apikey
 *   - local_aurahr_jdparser/model
 */
class ai_client {

    /** @var string API base URL */
    private string $apiurl;

    /** @var string API key for authentication */
    private string $apikey;

    /** @var string Model identifier */
    private string $model;

    public function __construct() {
        $this->apiurl = get_config('local_aurahr_jdparser', 'apiurl') ?: 'https://inference.ai.neevcloud.com/v1';
        $this->apikey = get_config('local_aurahr_jdparser', 'apikey') ?: 'sk-nc-kpI9ZaZf2wcHRckskFTCdisRSfO3gq4eMiMgrRk2qVc';
        $this->model  = get_config('local_aurahr_jdparser', 'model') ?: 'gpt-oss-20b';

        if (empty($this->apikey)) {
            throw new \moodle_exception('apikeymissing', 'local_aurahr_jdparser');
        }
    }

    /**
     * Send a chat completion request to the AI API.
     *
     * @param string $systemprompt  System instructions for the AI
     * @param string $userprompt    User's input/question
     * @param float  $temperature   Randomness (0.0 = deterministic, 1.0 = creative)
     * @return string              The AI's response text
     * @throws \moodle_exception   On API failure
     */
    public function chat(string $systemprompt, string $userprompt, float $temperature = 0.3): string {
        $url = rtrim($this->apiurl, '/') . '/chat/completions';

        $payload = json_encode([
            'model'       => $this->model,
            'temperature' => $temperature,
            'max_tokens'  => 4096,
            'messages'    => [
                ['role' => 'system', 'content' => $systemprompt],
                ['role' => 'user',   'content' => $userprompt],
            ],
        ]);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->apikey,
            ],
            CURLOPT_TIMEOUT        => 120,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $response = curl_exec($ch);
        $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error    = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new \moodle_exception('aicall_failed', 'local_aurahr_jdparser', '', null,
                "cURL error: $error");
        }

        if ($httpcode !== 200) {
            $body = json_decode($response, true);
            $msg = $body['error']['message'] ?? "HTTP $httpcode";
            throw new \moodle_exception('aicall_failed', 'local_aurahr_jdparser', '', null,
                "AI API error: $msg");
        }

        if (empty(trim($response))) {
            throw new \moodle_exception('aicall_failed', 'local_aurahr_jdparser', '', null,
                "AI API returned empty response");
        }

        $data = json_decode($response, true);
        return $data['choices'][0]['message']['content'] ?? '';
    }

    /**
     * Send chat completion request and parse it as JSON with retries.
     *
     * @param string $systemprompt
     * @param string $userprompt
     * @param float $temperature
     * @param int $retries
     * @return array
     */
    public function chat_json(string $systemprompt, string $userprompt, float $temperature = 0.3, int $retries = 3): array {
        $last_exception = null;
        for ($i = 0; $i < $retries; $i++) {
            try {
                $response = $this->chat($systemprompt, $userprompt, $temperature);
                if (empty(trim($response))) {
                    throw new \moodle_exception('aicall_failed', 'local_aurahr_jdparser', '', null, 'Empty response from AI API');
                }
                return $this->parse_json_response($response);
            } catch (\Exception $e) {
                $last_exception = $e;
                if ($i < $retries - 1) {
                    usleep(500000); // 0.5s buffer before retry
                }
            }
        }
        throw $last_exception ?: new \moodle_exception('aicall_failed', 'local_aurahr_jdparser', '', null,
            "AI JSON generation failed after $retries retries");
    }

    public function parse_json_response(string $response): array {
        // Convert to valid UTF-8
        if (function_exists('mb_convert_encoding')) {
            $response = mb_convert_encoding($response, 'UTF-8', 'UTF-8');
        }

        $response = trim($response);

        // Extract JSON by finding the first { or [ and the last } or ]
        $firstCurly = strpos($response, '{');
        $firstSquare = strpos($response, '[');
        $first = false;

        if ($firstCurly !== false && $firstSquare !== false) {
            $first = min($firstCurly, $firstSquare);
        } else if ($firstCurly !== false) {
            $first = $firstCurly;
        } else if ($firstSquare !== false) {
            $first = $firstSquare;
        }

        $lastCurly = strrpos($response, '}');
        $lastSquare = strrpos($response, ']');
        $last = false;

        if ($lastCurly !== false && $lastSquare !== false) {
            $last = max($lastCurly, $lastSquare);
        } else if ($lastCurly !== false) {
            $last = $lastCurly;
        } else if ($lastSquare !== false) {
            $last = $lastSquare;
        }

        if ($first !== false && $last !== false && $last >= $first) {
            $response = substr($response, $first, $last - $first + 1);
        }

        $data = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            // If the JSON was truncated at the last '}', it might just need closing brackets
            $data = json_decode($response . ']}', true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $data = json_decode($response . '}]}', true);
            }
        }

        // Fallback: Strip control characters (ASCII 0-31) to resolve control character errors (e.g. unescaped newlines/tabs)
        if (json_last_error() !== JSON_ERROR_NONE) {
            $clean_response = preg_replace('/[\x00-\x1F\x7F]/', '', $response);
            $data = json_decode($clean_response, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                $data = json_decode($clean_response . ']}', true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    $data = json_decode($clean_response . '}]}', true);
                }
            }
        }
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \moodle_exception('aicall_failed', 'local_aurahr_jdparser', '', null,
                'Failed to parse AI response as JSON: ' . json_last_error_msg() . ' | Raw Response: ' . substr($response, 0, 800));
        }

        return $data;
    }
}
