<?php
namespace local_aurahr_academia\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Finalize academia round assessment and pass the top N candidates to the interview stage.
 */
class finalize_assessment extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'jobid'      => new external_value(PARAM_INT, 'Job ID'),
            'pass_count' => new external_value(PARAM_INT, 'Number of candidates to pass to interview'),
        ]);
    }

    public static function execute(int $jobid, int $pass_count): array {
        global $DB;

        $params = self::validate_parameters(self::execute_parameters(), [
            'jobid'      => $jobid,
            'pass_count' => $pass_count,
        ]);

        $context = \context_system::instance();
        require_capability('local/aurahr_academia:manage', $context);

        // Fetch the latest assessment for this job.
        $assessments = $DB->get_records('local_aurahr_assessments', ['jobid' => $params['jobid']], 'id DESC', '*', 0, 1);
        $assessment = $assessments ? reset($assessments) : null;
        if (!$assessment) {
            throw new \moodle_exception('assessmentnotfound', 'local_aurahr_academia');
        }

        // Update assessment status to completed.
        $assessment->status = 'completed';
        $assessment->timemodified = time();
        $DB->update_record('local_aurahr_assessments', $assessment);

        // Fetch all enrolled candidates for this assessment.
        $sql = "SELECT e.*, a.stage as app_stage
                FROM {local_aurahr_assess_enrol} e
                JOIN {local_aurahr_applications} a ON a.id = e.applicationid
                WHERE e.assessmentid = :assessmentid";
        $enrollments = $DB->get_records_sql($sql, ['assessmentid' => $assessment->id]);

        // Sort enrollments: higher scores first, absent/null scores last.
        usort($enrollments, function($a, $b) {
            $scoreA = isset($a->score) ? (float)$a->score : 0.0;
            $scoreB = isset($b->score) ? (float)$b->score : 0.0;
            if ($scoreA != $scoreB) {
                return $scoreB <=> $scoreA; // Descending
            }
            return $a->id <=> $b->id; // Tie-breaker: ascending ID
        });

        $passed_count = 0;
        $rejected_count = 0;
        $now = time();
        $index = 0;

        foreach ($enrollments as $e) {
            $app = $DB->get_record('local_aurahr_applications', ['id' => $e->applicationid]);
            if (!$app) {
                continue;
            }

            $enrol_update = clone $e;

            if ($index < $params['pass_count']) {
                // Promote to interview if currently in academia or screened
                if ($app->stage === 'academia' || $app->stage === 'screened') {
                    $app->stage = 'interview';
                    $app->timemodified = $now;
                    $DB->update_record('local_aurahr_applications', $app);
                }
                $enrol_update->passed = 1;
                $enrol_update->status = 'completed';
                $DB->update_record('local_aurahr_assess_enrol', $enrol_update);
                $passed_count++;
            } else {
                // Reject if currently in academia or screened
                if ($app->stage === 'academia' || $app->stage === 'screened') {
                    $app->stage = 'rejected';
                    $app->timemodified = $now;
                    $DB->update_record('local_aurahr_applications', $app);
                }
                $enrol_update->passed = 0;
                $enrol_update->status = 'completed';
                $DB->update_record('local_aurahr_assess_enrol', $enrol_update);
                $rejected_count++;
            }
            $index++;
        }

        return [
            'success'        => true,
            'passed_count'   => $passed_count,
            'rejected_count' => $rejected_count,
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'success'        => new external_value(PARAM_BOOL, 'Success status'),
            'passed_count'   => new external_value(PARAM_INT, 'Number of candidates passed to interview'),
            'rejected_count' => new external_value(PARAM_INT, 'Number of candidates rejected'),
        ]);
    }
}
