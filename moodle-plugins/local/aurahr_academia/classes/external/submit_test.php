<?php
namespace local_aurahr_academia\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

class submit_test extends external_api {
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'candidateId' => new external_value(PARAM_INT, 'Candidate ID (User ID)', VALUE_OPTIONAL),
            'jobId' => new external_value(PARAM_INT, 'Job ID', VALUE_OPTIONAL),
            'score' => new external_value(PARAM_FLOAT, 'Test Score'),
        ]);
    }

    public static function execute($candidateId, $jobId, $score): array {
        global $DB, $USER;
        $params = self::validate_parameters(self::execute_parameters(), [
            'candidateId' => $candidateId,
            'jobId' => $jobId,
            'score' => $score,
        ]);

        $userid = $params['candidateId'] ?: $USER->id;

        // Find the application
        if ($params['jobId']) {
            $app = $DB->get_record('local_aurahr_applications', ['userid' => $userid, 'jobid' => $params['jobId']]);
        } else {
            $apps = $DB->get_records('local_aurahr_applications', ['userid' => $userid], 'id DESC', '*', 0, 1);
            $app = reset($apps);
        }

        if ($app) {
            $app->academia_score = $params['score'];
            
            // Recalculate overall score.
            $app->overall_score = \local_aurahr_jobs\util::calculate_overall_score($app);
            
            $app->timemodified = time();
            $DB->update_record('local_aurahr_applications', $app);

            // Update local_aurahr_assess_enrol record.
            $assessments = $DB->get_records('local_aurahr_assessments', ['jobid' => $app->jobid], 'id DESC', '*', 0, 1);
            if ($assessments) {
                $assessment = reset($assessments);
                if ($enrol = $DB->get_record('local_aurahr_assess_enrol', ['assessmentid' => $assessment->id, 'userid' => $userid])) {
                    $enrol->status = 'completed';
                    $enrol->score = $params['score'];
                    $enrol->completed_at = time();
                    $DB->update_record('local_aurahr_assess_enrol', $enrol);
                }
            }

            return ['success' => true];
        }

        return ['success' => false];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Status'),
        ]);
    }
}
