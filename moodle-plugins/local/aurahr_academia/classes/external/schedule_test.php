<?php
namespace local_aurahr_academia\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Schedule a test window and enroll candidates.
 */
class schedule_test extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'assessmentid' => new external_value(PARAM_INT, 'Assessment ID'),
            'start_time'   => new external_value(PARAM_INT, 'Start time timestamp'),
            'end_time'     => new external_value(PARAM_INT, 'End time timestamp'),
            'auto_start'   => new external_value(PARAM_BOOL, 'Auto start test', VALUE_DEFAULT, false),
        ]);
    }

    public static function execute(int $assessmentid, int $start_time, int $end_time, bool $auto_start = false): array {
        global $DB;

        $params = self::validate_parameters(self::execute_parameters(), [
            'assessmentid' => $assessmentid, 'start_time' => $start_time, 'end_time' => $end_time, 'auto_start' => $auto_start,
        ]);

        $context = \context_system::instance();
        require_capability('local/aurahr_academia:manage', $context);

        $assessment = $DB->get_record('local_aurahr_assessments', ['id' => $params['assessmentid']], '*', MUST_EXIST);

        // Update assessment window.
        $assessment->start_time = $params['start_time'];
        $assessment->end_time = $params['end_time'];
        $assessment->auto_start = $params['auto_start'] ? 1 : 0;
        $assessment->status = 'scheduled';
        $assessment->timemodified = time();
        $DB->update_record('local_aurahr_assessments', $assessment);

        // Reset status for any existing enrolled candidates so they can restart/take the test.
        $existing_enrols = $DB->get_records('local_aurahr_assess_enrol', ['assessmentid' => $assessment->id]);
        $now = time();
        foreach ($existing_enrols as $enrol) {
            $enrol->status = 'pending';
            $enrol->score = null;
            $enrol->completed_at = null;
            $enrol->started_at = null;
            $DB->update_record('local_aurahr_assess_enrol', $enrol);

            // Reset the candidate's application record (reset malpractice, set stage to academia, clear score)
            $app = $DB->get_record('local_aurahr_applications', ['id' => $enrol->applicationid]);
            if ($app) {
                $app->stage = 'academia';
                $app->malpractice = 0;
                $app->academia_score = null;
                $app->overall_score = \local_aurahr_jobs\util::calculate_overall_score($app);
                $app->timemodified = $now;
                $DB->update_record('local_aurahr_applications', $app);
            }
        }

        // Enroll all candidates currently in the 'screened' stage.
        // We look for applications to the related job that have stage = 'screened'.
        $sql = "SELECT a.id, a.userid
                FROM {local_aurahr_applications} a
                WHERE a.jobid = :jobid AND a.stage = 'screened'";
        $applications = $DB->get_records_sql($sql, ['jobid' => $assessment->jobid]);

        $enrolled_count = 0;
        foreach ($applications as $app) {
            // Check if already enrolled to avoid duplicates.
            if (!$DB->record_exists('local_aurahr_assess_enrol', ['assessmentid' => $assessment->id, 'userid' => $app->userid])) {
                $enrol = (object)[
                    'assessmentid'  => $assessment->id,
                    'userid'        => $app->userid,
                    'applicationid' => $app->id,
                    'status'        => 'pending',
                    'timecreated'   => $now,
                ];
                $DB->insert_record('local_aurahr_assess_enrol', $enrol);
                
                // Update application stage to academia.
                $app_update = clone $app;
                $app_update->stage = 'academia';
                $app_update->timemodified = $now;
                $DB->update_record('local_aurahr_applications', $app_update);
                
                $enrolled_count++;
            }
        }

        return [
            'success'        => true,
            'enrolled_count' => $enrolled_count,
            'status'         => 'scheduled'
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'success'        => new external_value(PARAM_BOOL, 'Success'),
            'enrolled_count' => new external_value(PARAM_INT, 'Number of candidates enrolled'),
            'status'         => new external_value(PARAM_TEXT, 'New assessment status'),
        ]);
    }
}
