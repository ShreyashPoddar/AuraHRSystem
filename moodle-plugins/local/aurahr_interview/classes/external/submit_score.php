<?php
namespace local_aurahr_interview\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Submit interviewer score and notes after an interview.
 */
class submit_score extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'interviewid'      => new external_value(PARAM_INT, 'Interview ID'),
            'interviewer_score' => new external_value(PARAM_FLOAT, 'Score 0-100'),
            'interviewer_notes' => new external_value(PARAM_RAW, 'Notes/feedback', VALUE_DEFAULT, ''),
        ]);
    }

    public static function execute(int $interviewid, float $interviewer_score, string $interviewer_notes): array {
        global $DB;

        $params = self::validate_parameters(self::execute_parameters(), [
            'interviewid' => $interviewid, 'interviewer_score' => $interviewer_score,
            'interviewer_notes' => $interviewer_notes,
        ]);

        $context = \context_system::instance();
        require_capability('local/aurahr_interview:conduct', $context);

        $interview = $DB->get_record('local_aurahr_interviews', ['id' => $params['interviewid']], '*', MUST_EXIST);

        $interview->interviewer_score = $params['interviewer_score'];
        $interview->interviewer_notes = $params['interviewer_notes'];
        $interview->status = 'completed';
        $interview->timemodified = time();
        $DB->update_record('local_aurahr_interviews', $interview);

        // Update application's interview score.
        $app = $DB->get_record('local_aurahr_applications', ['id' => $interview->applicationid]);
        if ($app) {
            $app->interview_score = $params['interviewer_score'];
            // Recalculate overall.
            $app->overall_score = \local_aurahr_jobs\util::calculate_overall_score($app);
            $app->timemodified = time();
            $DB->update_record('local_aurahr_applications', $app);
        }

        return ['success' => true, 'status' => 'completed'];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Success'),
            'status'  => new external_value(PARAM_TEXT, 'New status'),
        ]);
    }
}
