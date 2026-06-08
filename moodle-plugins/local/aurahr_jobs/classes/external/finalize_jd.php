<?php
namespace local_aurahr_jobs\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Finalize JD parser round by passing the top N candidates to the screened stage.
 */
class finalize_jd extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'jobid'      => new external_value(PARAM_INT, 'Job ID'),
            'pass_count' => new external_value(PARAM_INT, 'Number of top candidates to pass to screened'),
        ]);
    }

    public static function execute(int $jobid, int $pass_count): array {
        global $DB;

        $params = self::validate_parameters(self::execute_parameters(), [
            'jobid' => $jobid, 'pass_count' => $pass_count,
        ]);

        $context = \context_system::instance();
        require_capability('local/aurahr_jobs:managejobs', $context);

        $job = $DB->get_record('local_aurahr_jobs', ['id' => $params['jobid']], '*', MUST_EXIST);

        // Fetch all applications for this job in 'applied' or 'screened' stage, ordered by jd_score DESC.
        $sql = "SELECT id, stage, jd_score 
                FROM {local_aurahr_applications} 
                WHERE jobid = :jobid AND (stage = 'applied' OR stage = 'screened')
                ORDER BY jd_score DESC";
        $applications = $DB->get_records_sql($sql, ['jobid' => $job->id]);

        $passed_count = 0;
        $rejected_count = 0;
        $now = time();

        $index = 0;
        foreach ($applications as $app) {
            $app_update = clone $app;
            if ($index < $params['pass_count']) {
                // Shortlist them (set stage to 'screened' so Academia schedule_test picks them up)
                if ($app->stage !== 'screened') {
                    $app_update->stage = 'screened';
                    $app_update->timemodified = $now;
                    $DB->update_record('local_aurahr_applications', $app_update);
                }
                $passed_count++;
            } else {
                // Reject the rest
                if ($app->stage !== 'rejected') {
                    $app_update->stage = 'rejected';
                    $app_update->timemodified = $now;
                    $DB->update_record('local_aurahr_applications', $app_update);
                }
                $rejected_count++;
            }
            $index++;
        }

        // Also save the pass count to the jd_analysis table and set is_finalized
        if ($analysis = $DB->get_record('local_aurahr_jd_analysis', ['jobid' => $job->id])) {
            $analysis->pass_count = $params['pass_count'];
            $analysis->is_finalized = 1;
            $DB->update_record('local_aurahr_jd_analysis', $analysis);
        } else {
            $new_analysis = (object)[
                'jobid' => $job->id,
                'pass_count' => $params['pass_count'],
                'is_finalized' => 1,
                'timecreated' => $now,
            ];
            $DB->insert_record('local_aurahr_jd_analysis', $new_analysis);
        }

        return [
            'success'        => true,
            'passed_count'   => $passed_count,
            'rejected_count' => $rejected_count,
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'success'        => new external_value(PARAM_BOOL, 'Success'),
            'passed_count'   => new external_value(PARAM_INT, 'Number of candidates passed to screened stage'),
            'rejected_count' => new external_value(PARAM_INT, 'Number of candidates rejected'),
        ]);
    }
}
