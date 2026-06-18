<?php
namespace local_aurahr_jobs\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Move a candidate to a different pipeline stage.
 * Validates allowed stage transitions.
 */
class update_stage extends external_api {

    /** Valid pipeline stages in order. */
    const VALID_STAGES = [
        'Imported', 'Under AI Screening', 'Shortlisted', 'Screening Scheduled',
        'Screening Cleared', 'Assessment Invited', 'Assessment In Progress',
        'Assessment Completed', 'Assessment Cleared', 'Rejected', 'On Hold',
        'Hired / Offer stage'
    ];

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'applicationid' => new external_value(PARAM_INT, 'Application ID'),
            'stage'         => new external_value(PARAM_TEXT, 'New pipeline stage'),
        ]);
    }

    public static function execute(int $applicationid, string $stage): array {
        global $DB;

        $params = self::validate_parameters(self::execute_parameters(), [
            'applicationid' => $applicationid, 'stage' => $stage,
        ]);

        $context = \context_system::instance();
        require_capability('local/aurahr_jobs:managejobs', $context);

        // Validate stage value.
        if (!in_array($params['stage'], self::VALID_STAGES)) {
            throw new \invalid_parameter_exception(
                get_string('invalidstage', 'local_aurahr_jobs') .
                ' Valid stages: ' . implode(', ', self::VALID_STAGES)
            );
        }

        $app = $DB->get_record('local_aurahr_applications', ['id' => $params['applicationid']], '*', MUST_EXIST);

        $app->stage        = $params['stage'];
        $app->timemodified = time();
        $DB->update_record('local_aurahr_applications', $app);

        return [
            'id'           => (int)$app->id,
            'stage'        => $app->stage,
            'timemodified' => (int)$app->timemodified,
            'success'      => true,
            'message'      => get_string('stagesupdated', 'local_aurahr_jobs'),
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'id'           => new external_value(PARAM_INT, 'Application ID'),
            'stage'        => new external_value(PARAM_TEXT, 'New stage'),
            'timemodified' => new external_value(PARAM_INT, 'Modified timestamp'),
            'success'      => new external_value(PARAM_BOOL, 'Success'),
            'message'      => new external_value(PARAM_TEXT, 'Message'),
        ]);
    }
}
