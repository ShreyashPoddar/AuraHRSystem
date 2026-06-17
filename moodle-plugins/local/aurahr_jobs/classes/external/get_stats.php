<?php
namespace local_aurahr_jobs\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_multiple_structure;
use core_external\external_value;

/**
 * Get pipeline statistics — counts per stage, totals, averages.
 * If jobid is provided, stats for that job only; otherwise aggregate.
 */
class get_stats extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'jobid' => new external_value(PARAM_INT, 'Job ID (0 = aggregate all jobs)', VALUE_DEFAULT, 0),
        ]);
    }

    public static function execute(int $jobid): array {
        global $DB;

        $params = self::validate_parameters(self::execute_parameters(), ['jobid' => $jobid]);

        $context = \context_system::instance();
        require_capability('local/aurahr_jobs:viewapplications', $context);

        // Build WHERE clause.
        $where = '';
        $sqlparams = [];
        if ($params['jobid'] > 0) {
            $where = 'WHERE a.jobid = :jobid';
            $sqlparams['jobid'] = $params['jobid'];
        }

        // Stage counts.
        $sql = "SELECT a.stage, COUNT(*) as cnt
                FROM {local_aurahr_applications} a
                $where
                GROUP BY a.stage";
        $stagecounts = $DB->get_records_sql($sql, $sqlparams);

        $stages = [];
        $total = 0;
        foreach ($stagecounts as $s) {
            $stages[] = ['stage' => $s->stage, 'count' => (int)$s->cnt];
            $total += (int)$s->cnt;
        }

        // Average scores.
        $sql = "SELECT
                    AVG(a.jd_score) as avg_jd,
                    AVG(a.academia_score) as avg_academia,
                    AVG(a.interview_score) as avg_interview,
                    AVG(a.overall_score) as avg_overall
                FROM {local_aurahr_applications} a
                $where";
        $avgs = $DB->get_record_sql($sql, $sqlparams);

        // Active jobs count.
        $active_jobs = $DB->count_records('local_aurahr_jobs', ['status' => 'active']);

        // Malpractice count.
        $malpractice_where = $where ? "$where AND a.malpractice = 1" : 'WHERE a.malpractice = 1';
        $malpractice_count = $DB->count_records_sql(
            "SELECT COUNT(*) FROM {local_aurahr_applications} a $malpractice_where",
            $sqlparams
        );

        // Fetch all team gaps from active jobs
        $sql_gaps = "SELECT jda.team_gap 
                     FROM {local_aurahr_jd_analysis} jda
                     JOIN {local_aurahr_jobs} j ON j.id = jda.jobid
                     WHERE j.status = 'active'";
        $gap_records = $DB->get_records_sql($sql_gaps);
        $team_gaps = [];
        foreach ($gap_records as $r) {
            if (!empty($r->team_gap)) {
                $skills = json_decode($r->team_gap, true);
                if (is_array($skills)) {
                    foreach ($skills as $s) {
                        if (!empty($s)) {
                            $team_gaps[] = trim($s);
                        }
                    }
                }
            }
        }
        $team_gaps = array_values(array_unique($team_gaps));

        return [
            'total_applications' => $total,
            'active_jobs'        => (int)$active_jobs,
            'malpractice_count'  => (int)$malpractice_count,
            'avg_jd_score'       => round((float)($avgs->avg_jd ?? 0), 2),
            'avg_academia_score' => round((float)($avgs->avg_academia ?? 0), 2),
            'avg_interview_score' => round((float)($avgs->avg_interview ?? 0), 2),
            'avg_overall_score'  => round((float)($avgs->avg_overall ?? 0), 2),
            'stage_counts'       => $stages,
            'team_gaps'          => $team_gaps,
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'total_applications'  => new external_value(PARAM_INT, 'Total applications'),
            'active_jobs'         => new external_value(PARAM_INT, 'Active job count'),
            'malpractice_count'   => new external_value(PARAM_INT, 'Malpractice flagged count'),
            'avg_jd_score'        => new external_value(PARAM_FLOAT, 'Average JD score'),
            'avg_academia_score'  => new external_value(PARAM_FLOAT, 'Average academia score'),
            'avg_interview_score' => new external_value(PARAM_FLOAT, 'Average interview score'),
            'avg_overall_score'   => new external_value(PARAM_FLOAT, 'Average overall score'),
            'stage_counts'        => new external_multiple_structure(
                new external_single_structure([
                    'stage' => new external_value(PARAM_TEXT, 'Stage name'),
                    'count' => new external_value(PARAM_INT, 'Count'),
                ])
            ),
            'team_gaps'           => new external_multiple_structure(
                new external_value(PARAM_TEXT, 'Skill name'),
                'Aggregated team gaps',
                VALUE_OPTIONAL
            ),
        ]);
    }
}
