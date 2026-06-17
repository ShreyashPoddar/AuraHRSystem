<?php
namespace local_aurahr_scheduler\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_multiple_structure;
use core_external\external_value;

class set_availability extends external_api {
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'userid' => new external_value(PARAM_INT, 'User ID'),
            'slots' => new external_multiple_structure(
                new external_single_structure([
                    'day_of_week'   => new external_value(PARAM_INT, '0-6 for Sunday-Saturday'),
                    'start_time'    => new external_value(PARAM_TEXT, 'HH:MM'),
                    'end_time'      => new external_value(PARAM_TEXT, 'HH:MM'),
                    'recurring'     => new external_value(PARAM_INT, '1 for recurring, 0 for specific date'),
                    'specific_date' => new external_value(PARAM_INT, 'Unix timestamp for specific date, 0 if recurring', VALUE_DEFAULT, 0),
                ]),
                'List of slots',
                VALUE_DEFAULT,
                []
            ),
        ]);
    }

    public static function execute(int $userid, array $slots): array {
        global $DB, $USER;
        $params = self::validate_parameters(self::execute_parameters(), ['userid' => $userid, 'slots' => $slots]);
        
        $context = \context_system::instance();
        require_capability('local/aurahr_scheduler:setavailability', $context);
        
        // Ensure user is modifying their own or has manage capability
        if ($params['userid'] != $USER->id) {
            require_capability('local/aurahr_scheduler:manage', $context);
        }

        // Delete existing availability for user
        $DB->delete_records('local_aurahr_availability', ['userid' => $params['userid']]);
        
        $count = 0;
        foreach ($params['slots'] as $slot) {
            $record = new \stdClass();
            $record->userid = $params['userid'];
            $record->day_of_week = $slot['day_of_week'];
            $record->start_time = $slot['start_time'];
            $record->end_time = $slot['end_time'];
            $record->recurring = $slot['recurring'];
            $record->specific_date = $slot['specific_date'];
            $record->timecreated = time();
            $DB->insert_record('local_aurahr_availability', $record);
            $count++;
        }

        return ['success' => true, 'count' => $count];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Success'),
            'count'   => new external_value(PARAM_INT, 'Number of slots inserted'),
        ]);
    }
}
