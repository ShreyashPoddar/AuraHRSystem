<?php
namespace local_aurahr_jobs\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;

defined('MOODLE_INTERNAL') || die();

class get_notifications extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    public static function execute(): array {
        global $DB;
        $context = \context_system::instance();
        self::validate_context($context);
        require_capability('local/aurahr_jobs:viewapplications', $context);

        $notifications = [];

        // 1. Check for jobs with applications in 'Shortlisted' stage (Needs Assessment scheduling).
        $sql1 = "SELECT j.id, j.title, COUNT(a.id) as count, MAX(a.timecreated) as last_time
                 FROM {local_aurahr_jobs} j
                 JOIN {local_aurahr_applications} a ON a.jobid = j.id
                 WHERE a.stage = 'Shortlisted'
                 GROUP BY j.id, j.title";
        $screened_jobs = $DB->get_records_sql($sql1);
        foreach ($screened_jobs as $job) {
            $notifications[] = [
                'id'        => 'screened_' . $job->id,
                'type'      => 'action',
                'title'     => 'Schedule Assessment',
                'message'   => "{$job->title} has {$job->count} screened candidate(s) awaiting tests.",
                'timestamp' => (int)$job->last_time,
                'color'     => 'sage',
            ];
        }

        // 2. Check for jobs with applications in 'Imported' or 'Under AI Screening' stage (Needs screening).
        $sql2 = "SELECT j.id, j.title, COUNT(a.id) as count, MAX(a.timecreated) as last_time
                 FROM {local_aurahr_jobs} j
                 JOIN {local_aurahr_applications} a ON a.jobid = j.id
                 WHERE a.stage = 'Imported' OR a.stage = 'Under AI Screening'
                 GROUP BY j.id, j.title";
        $applied_jobs = $DB->get_records_sql($sql2);
        foreach ($applied_jobs as $job) {
            $notifications[] = [
                'id'        => 'applied_' . $job->id,
                'type'      => 'info',
                'title'     => 'New Applications',
                'message'   => "{$job->count} new application(s) received for {$job->title}.",
                'timestamp' => (int)$job->last_time,
                'color'     => 'gold',
            ];
        }

        // 3. JD Analysis completed (jobs with analysis but no assessments yet).
        $sql3 = "SELECT j.id, j.title, jd.timecreated
                 FROM {local_aurahr_jobs} j
                 JOIN {local_aurahr_jd_analysis} jd ON jd.jobid = j.id
                 LEFT JOIN {local_aurahr_assessments} ass ON ass.jobid = j.id
                 WHERE ass.id IS NULL";
        $jd_jobs = $DB->get_records_sql($sql3);
        foreach ($jd_jobs as $job) {
            $notifications[] = [
                'id'        => 'jd_' . $job->id,
                'type'      => 'success',
                'title'     => 'JD Analysis Complete',
                'message'   => "AI has analyzed the JD for {$job->title}. Ready to generate questions.",
                'timestamp' => (int)$job->timecreated,
                'color'     => 'ink',
            ];
        }

        // Sort by timestamp DESC.
        usort($notifications, function($a, $b) {
            return $b['timestamp'] <=> $a['timestamp'];
        });

        return $notifications;
    }

    public static function execute_returns(): external_multiple_structure {
        return new external_multiple_structure(
            new external_single_structure([
                'id'        => new external_value(PARAM_TEXT, 'Notification ID'),
                'type'      => new external_value(PARAM_TEXT, 'Type (action, info, success)'),
                'title'     => new external_value(PARAM_TEXT, 'Title'),
                'message'   => new external_value(PARAM_TEXT, 'Message content'),
                'timestamp' => new external_value(PARAM_INT, 'UNIX Timestamp'),
                'color'     => new external_value(PARAM_TEXT, 'UI Color hint (sage, gold, ink)'),
            ])
        );
    }
}
