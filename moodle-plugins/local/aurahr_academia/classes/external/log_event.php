<?php
namespace local_aurahr_academia\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Log a proctoring violation event.
 */
class log_event extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'assessmentid' => new external_value(PARAM_INT, 'Assessment ID'),
            'jobid'        => new external_value(PARAM_INT, 'Job ID'),
            'event_type'   => new external_value(PARAM_TEXT, 'Event type (e.g. fullscreen_exit, multiple_faces)'),
            'details'      => new external_value(PARAM_TEXT, 'Additional details', VALUE_DEFAULT, ''),
        ]);
    }

    public static function execute(int $assessmentid, int $jobid, string $event_type, string $details = ''): array {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), [
            'assessmentid' => $assessmentid, 'jobid' => $jobid, 'event_type' => $event_type, 'details' => $details,
        ]);

        $userid = $USER->id;
        
        // Ensure user is enrolled in the assessment
        if (!$DB->record_exists('local_aurahr_assess_enrol', ['assessmentid' => $params['assessmentid'], 'userid' => $userid])) {
            throw new \moodle_exception('error_notenrolled', 'local_aurahr_academia');
        }

        // We increment the malpractice score in the application.
        $sql = "SELECT * FROM {local_aurahr_applications} WHERE jobid = :jobid AND userid = :userid";
        $app = $DB->get_record_sql($sql, ['jobid' => $params['jobid'], 'userid' => $userid]);

        $flagged = false;
        $violation_count = 0;

        if ($app) {
            if ($event_type !== 'test_start') {
                $app->malpractice = (int)$app->malpractice + 1;
                // Prevent MySQL TINYINT out of range error
                if ($app->malpractice > 127) {
                    $app->malpractice = 127;
                }
                
                // If violation count is 5 or more, automatically disqualify (reject) candidate
                if ($app->malpractice >= 5) {
                    $app->stage = 'rejected';
                    $flagged = true;
                }
                $DB->update_record('local_aurahr_applications', $app);
            } else {
                if ($app->malpractice >= 5) {
                    $flagged = true;
                }
                // When starting the test, set status to active and started_at to time
                if ($enrol = $DB->get_record('local_aurahr_assess_enrol', ['assessmentid' => $params['assessmentid'], 'userid' => $userid])) {
                    $enrol->status = 'active';
                    $enrol->started_at = time();
                    $DB->update_record('local_aurahr_assess_enrol', $enrol);
                }
            }
            $violation_count = $app->malpractice;
        }

        // We could also log this to a detailed `local_aurahr_assess_viol` table here,
        // but for now we rely on the application malpractice counter.

        return [
            'success'         => true,
            'violation_count' => $violation_count,
            'flagged'         => $flagged,
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'success'         => new external_value(PARAM_BOOL, 'Success'),
            'violation_count' => new external_value(PARAM_INT, 'Total violations'),
            'flagged'         => new external_value(PARAM_BOOL, 'Whether the candidate is flagged'),
        ]);
    }
}
