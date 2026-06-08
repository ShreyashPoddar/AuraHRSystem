<?php
namespace local_aurahr_jobs\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

defined('MOODLE_INTERNAL') || die();

class update_candidate_urls extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'github_url'   => new external_value(PARAM_TEXT, 'Github URL',   VALUE_DEFAULT, ''),
            'linkedin_url' => new external_value(PARAM_TEXT, 'Linkedin URL', VALUE_DEFAULT, ''),
            'leetcode_url' => new external_value(PARAM_TEXT, 'Leetcode URL', VALUE_DEFAULT, ''),
        ]);
    }

    public static function execute(string $github_url, string $linkedin_url, string $leetcode_url): array {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), [
            'github_url'   => $github_url,
            'linkedin_url' => $linkedin_url,
            'leetcode_url' => $leetcode_url,
        ]);

        $context = \context_user::instance($USER->id);
        self::validate_context($context);

        // Update all applications for this user.
        $DB->execute("
            UPDATE {local_aurahr_applications}
            SET github_url = ?, linkedin_url = ?, leetcode_url = ?, timemodified = ?
            WHERE userid = ?
        ", [
            $params['github_url'],
            $params['linkedin_url'],
            $params['leetcode_url'],
            time(),
            $USER->id,
        ]);

        // Also update candidate user preferences for settings parity.
        $count = get_user_preferences('aurahr_candidate_settings_chunks', 0, $USER->id);
        $json = '';
        if ($count > 0) {
            for ($i = 0; $i < $count; $i++) {
                $json .= get_user_preferences('aurahr_candidate_settings_' . $i, '', $USER->id);
            }
        } else {
            $json = get_user_preferences('aurahr_candidate_settings', '{}', $USER->id);
        }
        $prefs = json_decode($json, true) ?: [];
        $prefs['github'] = $params['github_url'];
        $prefs['linkedin'] = $params['linkedin_url'];
        $prefs['leetcode'] = $params['leetcode_url'];

        $new_json = json_encode($prefs);
        $chunks = str_split($new_json, 1300);
        set_user_preference('aurahr_candidate_settings_chunks', count($chunks), $USER->id);
        foreach ($chunks as $index => $chunk) {
            set_user_preference('aurahr_candidate_settings_' . $index, $chunk, $USER->id);
        }

        // Trigger AI Socials Analysis for each application of the candidate.
        $apps = $DB->get_records('local_aurahr_applications', ['userid' => $USER->id]);
        if (!empty($apps)) {
            require_once(__DIR__ . '/analyze_socials.php');
            foreach ($apps as $app) {
                try {
                    \local_aurahr_jobs\external\analyze_socials::execute($app->id);
                } catch (\Exception $e) {
                    debugging('Failed to analyze socials for application ' . $app->id . ': ' . $e->getMessage(), DEBUG_DEVELOPER);
                }
            }
        }

        return ['status' => 'success'];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'status' => new external_value(PARAM_TEXT, 'Success flag'),
        ]);
    }
}
