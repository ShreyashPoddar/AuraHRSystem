<?php
namespace local_aurahr_academia\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

class submit_test extends external_api {
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'candidateId' => new external_value(PARAM_INT, 'Candidate ID (User ID)', VALUE_DEFAULT),
            'jobId' => new external_value(PARAM_INT, 'Job ID', VALUE_DEFAULT),
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

            // Find the matching assessment using smart priority (active > scheduled > completed > draft)
            // This matches the same logic used in get_assessment and finalize_assessment.
            $sql = "SELECT a.id FROM {local_aurahr_assessments} a
                    WHERE a.jobid = :jobid
                    ORDER BY
                        CASE a.status
                            WHEN 'active'    THEN 1
                            WHEN 'scheduled' THEN 2
                            WHEN 'completed' THEN 3
                            ELSE 4
                        END ASC,
                        a.id DESC
                    LIMIT 1";
            $best_asmt = $DB->get_record_sql($sql, ['jobid' => $app->jobid]);
            if ($best_asmt) {
                if ($enrol = $DB->get_record('local_aurahr_assess_enrol', ['assessmentid' => $best_asmt->id, 'userid' => $userid])) {
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
