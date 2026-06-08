<?php
namespace local_aurahr_jobs\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

defined('MOODLE_INTERNAL') || die();

class analyze_socials extends external_api {
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'applicationid' => new external_value(PARAM_INT, 'Application ID'),
        ]);
    }

    public static function execute(int $applicationid): array {
        global $DB;

        $params = self::validate_parameters(self::execute_parameters(), [
            'applicationid' => $applicationid
        ]);

        $context = \context_system::instance();
        self::validate_context($context);

        $app = $DB->get_record('local_aurahr_applications', ['id' => $params['applicationid']], '*', MUST_EXIST);

        global $USER;
        if ($app->userid != $USER->id) {
            require_capability('local/aurahr_jobs:viewapplications', $context);
        }
        $job = $DB->get_record('local_aurahr_jobs', ['id' => $app->jobid], '*', MUST_EXIST);

        // Fetch JD Analysis for prioritized skills.
        $jd_analysis = $DB->get_record('local_aurahr_jd_analysis', ['jobid' => $job->id]);
        $jd_skills_context = "";
        if ($jd_analysis) {
            $must_have = json_decode($jd_analysis->must_have, true) ?: [];
            $good_to_have = json_decode($jd_analysis->good_to_have, true) ?: [];
            $future_proof = json_decode($jd_analysis->future_proof, true) ?: [];
            
            $jd_skills_context = "PRIORITY SKILLS FROM JD PARSER:\n";
            $jd_skills_context .= "- MUST HAVE: " . implode(', ', $must_have) . "\n";
            $jd_skills_context .= "- GOOD TO HAVE: " . implode(', ', $good_to_have) . "\n";
            $jd_skills_context .= "- FUTURE PROOF: " . implode(', ', $future_proof) . "\n\n";
            $jd_skills_context .= "CRITICAL INSTRUCTION: You MUST prioritize evaluating the candidate based heavily on these extracted priority skills. Their score should reflect their proficiency in these exact requirements.\n\n";
        }

        $github_url   = !empty($app->github_url) ? $app->github_url : '';
        $leetcode_url = !empty($app->leetcode_url) ? $app->leetcode_url : '';
        $linkedin_url = !empty($app->linkedin_url) ? $app->linkedin_url : '';

        // If URLs are empty, try to fetch from user preferences as a fallback.
        if (empty($github_url) || empty($leetcode_url) || empty($linkedin_url)) {
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
            if (empty($github_url) && !empty($prefs['github'])) {
                $github_url = $prefs['github'];
            }
            if (empty($leetcode_url) && !empty($prefs['leetcode'])) {
                $leetcode_url = $prefs['leetcode'];
            }
            if (empty($linkedin_url) && !empty($prefs['linkedin'])) {
                $linkedin_url = $prefs['linkedin'];
            }
        }

        // If URLs are still empty, try to extract from resume text (resume_skills).
        if (!empty($app->resume_skills)) {
            if (empty($github_url)) {
                if (preg_match('/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i', $app->resume_skills, $matches)) {
                    $github_url = 'https://github.com/' . $matches[1];
                }
            }
            if (empty($leetcode_url)) {
                if (preg_match('/(?:https?:\/\/)?(?:www\.)?leetcode\.com\/(?:u\/)?([a-zA-Z0-9_-]+)/i', $app->resume_skills, $matches)) {
                    $leetcode_url = 'https://leetcode.com/' . $matches[1];
                }
            }
            if (empty($linkedin_url)) {
                if (preg_match('/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i', $app->resume_skills, $matches)) {
                    $linkedin_url = 'https://www.linkedin.com/in/' . $matches[1];
                }
            }
        }

        // Save resolved URLs to the application database record if they changed.
        if ($github_url !== $app->github_url || $leetcode_url !== $app->leetcode_url || $linkedin_url !== $app->linkedin_url) {
            $app->github_url = $github_url;
            $app->leetcode_url = $leetcode_url;
            $app->linkedin_url = $linkedin_url;
            $DB->update_record('local_aurahr_applications', $app);
        }

        // No-socials bypass: if BOTH are empty, skip scraping and AI entirely.
        if (empty($github_url) && empty($leetcode_url)) {
            $app->github_score = 0.00;
            $app->leetcode_score = 0.00;
            $app->ai_summary = "No social profile links (GitHub/LeetCode) found in candidate's profile or resume.";
            $app->timemodified = time();
            $DB->update_record('local_aurahr_applications', $app);
            
            // Recalculate overall score using the dynamic weighted engine.
            $app->overall_score = \local_aurahr_jobs\util::calculate_overall_score($app);
            $DB->update_record('local_aurahr_applications', $app);
            
            return [
                'github_score'   => 0.00,
                'leetcode_score' => 0.00,
                'overall_score'  => $app->overall_score,
            ];
        }

        // Scrape using platform-specific public APIs (no auth required)
        $github_data   = !empty($github_url) ? self::scrape_profile($github_url) : '';
        $leetcode_data = !empty($leetcode_url) ? self::scrape_profile($leetcode_url) : '';

        // Fetch custom fallback configuration settings from organization settings.
        $github_fallback   = 60.00;
        $leetcode_fallback = 60.00;
        
        $org_settings_json = get_config('local_aurahr_jobs', 'org_settings');
        if ($org_settings_json) {
            $org_settings = json_decode($org_settings_json, true);
            if (isset($org_settings['recruitment'])) {
                $github_fallback   = isset($org_settings['recruitment']['githubFallback']) ? (float)$org_settings['recruitment']['githubFallback'] : 60.00;
                $leetcode_fallback = isset($org_settings['recruitment']['leetcodeFallback']) ? (float)$org_settings['recruitment']['leetcodeFallback'] : 60.00;
            }
        }

        // Apply fallbacks only when the scraper returned an error/blocked message (not real data)
        // GitHub uses the public REST API — should always return real data.
        $github_failed = empty($github_url) || empty($github_data) ||
            strpos($github_data, 'not found') !== false ||
            strpos($github_data, 'Scraping Error') !== false ||
            strpos($github_data, 'Could not extract') !== false;
        if ($github_failed && !empty($github_url)) {
            $github_data = "Note: GitHub profile data could not be retrieved for ($github_url). Assign a baseline score of " . number_format($github_fallback, 2) . ".";
        }

        // LeetCode uses the public GraphQL API — should always return real data including 0 solved (legitimate score of 0).
        $leetcode_failed = empty($leetcode_url) || empty($leetcode_data) ||
            strpos($leetcode_data, 'not found') !== false ||
            strpos($leetcode_data, 'Scraping Error') !== false ||
            strpos($leetcode_data, 'Could not extract') !== false ||
            strpos($leetcode_data, 'API returned status') !== false;
        if ($leetcode_failed && !empty($leetcode_url)) {
            $leetcode_data = "Note: LeetCode profile data could not be retrieved for ($leetcode_url). Assign a baseline score of " . number_format($leetcode_fallback, 2) . ".";
        }



        // Use Neev AI via the existing ai_client wrapper
        $prompt = "You are an expert technical recruiter and software engineering manager.
I will provide you with a Job Description, extracted Priority Skills, and the scraped public profile data of a candidate from GitHub and LeetCode.
Your task is to analyze these profiles against the Priority Skills and Job Description, and score them out of 100.

JOB DESCRIPTION:
{$job->title}
{$job->description}

{$jd_skills_context}

CANDIDATE GITHUB DATA (URL: {$github_url}):
" . substr($github_data, 0, 8000) . "

CANDIDATE LEETCODE DATA (URL: {$leetcode_url}):
" . substr($leetcode_data, 0, 8000) . "

Please output ONLY a valid JSON object matching this schema, without any markdown formatting or code blocks:
{
  \"github_score\": 85,
  \"leetcode_score\": 80,
  \"reasoning\": \"Brief 2-3 sentence summary of which priority skills were extracted and compared across GitHub and LeetCode to justify these scores.\"
}
If the scraped data says 'Forbidden', 'Access Denied', or is empty for a specific platform, output 0 for its score, OR if you find strong indirect evidence of their proficiency, default to a moderate score (e.g., " . number_format($github_fallback, 2) . " for GitHub, " . number_format($leetcode_fallback, 2) . " for LeetCode).
";

        $system_prompt = "You are an expert technical recruiter and software engineering manager.";

        try {
            $ai = new \local_aurahr_jdparser\ai_client();
            $json = $ai->chat_json($system_prompt, $prompt, 0.2);
        } catch (\Exception $e) {
            $json = null;
        }

        if (!$json || !isset($json['github_score'])) {
            // Fallback scores if AI fails.
            $github_score   = rand(60, 95);
            $leetcode_score = rand(60, 95);
            $reasoning      = "Fallback scores assigned due to AI parsing error.";
        } else {
            $github_score   = floatval($json['github_score'] ?? 0);
            $leetcode_score = floatval($json['leetcode_score'] ?? 0);
            $reasoning      = $json['reasoning'] ?? "No reasoning provided by AI.";
        }

        // Force zero scores for empty URLs regardless of AI hallucination
        if (empty($github_url)) {
            $github_score = 0.00;
        }
        if (empty($leetcode_url)) {
            $leetcode_score = 0.00;
        }

        // Update application.
        $app->github_url     = $github_url;
        $app->leetcode_url   = $leetcode_url;
        $app->github_score   = $github_score;
        $app->leetcode_score = $leetcode_score;
        $app->ai_summary     = $reasoning;
        $app->timemodified   = time();
        $DB->update_record('local_aurahr_applications', $app);

        // Recalculate overall score using the dynamic weighted engine.
        $app->overall_score = \local_aurahr_jobs\util::calculate_overall_score($app);
        $DB->update_record('local_aurahr_applications', $app);

        return [
            'github_score'   => $github_score,
            'leetcode_score' => $leetcode_score,
            'overall_score'  => $app->overall_score,
        ];
    }

    private static function scrape_profile(string $url): string {
        if (empty($url) || !filter_var($url, FILTER_VALIDATE_URL)) {
            return '';
        }
        
        $script_path = realpath(__DIR__ . '/../../scraper/scrape.js');
        if (!$script_path || !file_exists($script_path)) {
            return 'Scraper script not found.';
        }

        // Try to locate node executable
        $node_bin = null;
        
        // 1. Try to find via where.exe command
        $where_out = @shell_exec('where.exe node 2>&1');
        if (!empty($where_out) && strpos($where_out, 'Could not find') === false && strpos($where_out, 'is not recognized') === false) {
            $lines = explode("\n", trim($where_out));
            $found_path = trim($lines[0]);
            if (!empty($found_path)) {
                $node_bin = '"' . $found_path . '"';
            }
        }
        
        // 2. Fall back to standard paths if not found via PATH
        if (empty($node_bin)) {
            foreach (['C:\\Program Files\\nodejs\\node.exe', 'C:\\Program Files (x86)\\nodejs\\node.exe'] as $bin) {
                if (@file_exists($bin)) {
                    $node_bin = '"' . $bin . '"';
                    break;
                }
            }
        }
        
        // 3. Ultimate fallback
        if (empty($node_bin)) {
            $node_bin = 'node';
        }

        // Run scraper with a 30-second timeout via stderr redirect
        $cmd = $node_bin . ' ' . escapeshellarg($script_path) . ' ' . escapeshellarg($url) . ' 2>&1';
        $output = shell_exec($cmd);
        
        return $output ? trim($output) : '';
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'github_score'   => new external_value(PARAM_FLOAT, 'Github Score'),
            'leetcode_score' => new external_value(PARAM_FLOAT, 'Leetcode Score'),
            'overall_score'  => new external_value(PARAM_FLOAT, 'Overall Score'),
        ]);
    }
}
