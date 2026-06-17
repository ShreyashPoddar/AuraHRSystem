<?php
namespace local_aurahr_jobs\external;

defined('MOODLE_INTERNAL') || die();

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

class get_user_prefs extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    public static function execute(): array {
        global $USER;
        $context = \context_user::instance($USER->id);
        self::validate_context($context);

        $count = get_user_preferences('aurahr_candidate_settings_chunks', 0, $USER->id);
        $json = '';
        if ($count > 0) {
            for ($i = 0; $i < $count; $i++) {
                $json .= get_user_preferences('aurahr_candidate_settings_' . $i, '', $USER->id);
            }
        } else {
            // Fallback for legacy data before chunking was implemented
            $json = get_user_preferences('aurahr_candidate_settings', '{}', $USER->id);
        }

        return [
            'status' => 'success',
            'data' => $json
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'status' => new external_value(PARAM_TEXT, 'Status'),
            'data'   => new external_value(PARAM_RAW, 'JSON string of preferences')
        ]);
    }
}
