<?php
namespace local_aurahr_jobs\external;

defined('MOODLE_INTERNAL') || die();

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

class update_user_prefs extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'data' => new external_value(PARAM_RAW, 'JSON string of preferences')
        ]);
    }

    public static function execute(string $data): array {
        global $USER;
        $context = \context_user::instance($USER->id);
        self::validate_context($context);
        
        $params = self::validate_parameters(self::execute_parameters(), ['data' => $data]);

        $chunks = str_split($params['data'], 1300);
        set_user_preference('aurahr_candidate_settings_chunks', count($chunks), $USER->id);
        foreach ($chunks as $index => $chunk) {
            set_user_preference('aurahr_candidate_settings_' . $index, $chunk, $USER->id);
        }

        return [
            'status' => 'success'
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'status' => new external_value(PARAM_TEXT, 'Status')
        ]);
    }
}
