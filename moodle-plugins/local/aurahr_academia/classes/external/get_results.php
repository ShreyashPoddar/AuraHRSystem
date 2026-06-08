<?php
namespace local_aurahr_academia\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Fetch results from gradebook/quiz and update pipeline.
 */
class get_results extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'assessmentid' => new external_value(PARAM_INT, 'Assessment ID'),
        ]);
    }

    public static function execute(int $assessmentid): array {
        global $DB;

        $params = self::validate_parameters(self::execute_parameters(), [
            'assessmentid' => $assessmentid,
        ]);

        $context = \context_system::instance();
        require_capability('local/aurahr_academia:viewresults', $context);

        $assessment = $DB->get_record('local_aurahr_assessments', ['id' => $params['assessmentid']], '*', MUST_EXIST);

        // In a real Moodle environment with a Quiz, we would use gradebook API here.
        // For the headless Next.js prototype, we assume scores are updated directly 
        // by the frontend candidate testing interface into our enrol table.

        // Update the application's academia_score based on the enrol table.
        $enrollments = $DB->get_records('local_aurahr_assess_enrol', ['assessmentid' => $assessment->id]);
        $updated_count = 0;
        
        foreach ($enrollments as $enrol) {
            if ($enrol->status === 'completed' && $enrol->score !== null) {
                $app = $DB->get_record('local_aurahr_applications', ['id' => $enrol->applicationid]);
                if ($app) {
                    $app->academia_score = $enrol->score;
                    
                    // Recalculate overall score.
                    $app->overall_score = \local_aurahr_jobs\util::calculate_overall_score($app);
                    
                    $app->timemodified = time();
                    $DB->update_record('local_aurahr_applications', $app);
                    $updated_count++;
                }
            }
        }
        
        // Mark assessment completed if end time has passed.
        if (time() > $assessment->end_time && $assessment->status !== 'completed') {
            $assessment->status = 'completed';
            $assessment->timemodified = time();
            $DB->update_record('local_aurahr_assessments', $assessment);
        }

        return [
            'success'       => true,
            'updated_count' => $updated_count,
            'status'        => $assessment->status
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'success'       => new external_value(PARAM_BOOL, 'Success'),
            'updated_count' => new external_value(PARAM_INT, 'Number of scores updated'),
            'status'        => new external_value(PARAM_TEXT, 'Assessment status'),
        ]);
    }
}
