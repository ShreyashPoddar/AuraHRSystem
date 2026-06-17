<?php
namespace local_aurahr_jobs\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_multiple_structure;
use core_external\external_value;

/**
 * Get a single job posting with full details, application count, and JD analysis.
 */
class get_job extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'jobid' => new external_value(PARAM_INT, 'Job posting ID'),
        ]);
    }

    public static function execute(int $jobid): array {
        global $DB;

        $params = self::validate_parameters(self::execute_parameters(), ['jobid' => $jobid]);

        $job = $DB->get_record('local_aurahr_jobs', ['id' => $params['jobid']], '*', MUST_EXIST);
        $appcount = $DB->count_records('local_aurahr_applications', ['jobid' => $params['jobid']]);

        // Get JD analysis if it exists.
        $jd = $DB->get_record('local_aurahr_jd_analysis', ['jobid' => $params['jobid']]);

        // Stage counts for statistics widget.
        $sql = "SELECT stage, COUNT(*) as cnt
                FROM {local_aurahr_applications}
                WHERE jobid = :jobid
                GROUP BY stage";
        $stagecounts = $DB->get_records_sql($sql, ['jobid' => $params['jobid']]);
        $stages = [];
        foreach ($stagecounts as $s) {
            $stages[] = ['stage' => $s->stage, 'count' => (int)$s->cnt];
        }

        $result = [
            'id'                => (int)$job->id,
            'title'             => $job->title,
            'description'       => $job->description,
            'department'        => $job->department ?? '',
            'vacancies'         => (int)$job->vacancies,
            'deadline'          => (int)($job->deadline ?? 0),
            'maxlimit'          => (int)$job->maxlimit,
            'status'            => $job->status,
            'createdby'         => (int)$job->createdby,
            'application_count' => (int)$appcount,
            'timecreated'       => (int)$job->timecreated,
            'timemodified'      => (int)$job->timemodified,
            'stage_counts'      => $stages,
        ];

        if ($jd) {
            $result['jd_analysis'] = [
                'must_have'    => $jd->must_have ?? '[]',
                'good_to_have' => $jd->good_to_have ?? '[]',
                'future_proof' => $jd->future_proof ?? '[]',
                'team_gap'     => $jd->team_gap ?? '[]',
                'pass_count'   => (int)$jd->pass_count,
                'is_finalized' => (bool)($jd->is_finalized ?? 0),
            ];
        }

        return $result;
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'id'                => new external_value(PARAM_INT, 'Job ID'),
            'title'             => new external_value(PARAM_TEXT, 'Job title'),
            'description'       => new external_value(PARAM_RAW, 'Job description'),
            'department'        => new external_value(PARAM_TEXT, 'Department'),
            'vacancies'         => new external_value(PARAM_INT, 'Positions'),
            'deadline'          => new external_value(PARAM_INT, 'Deadline'),
            'maxlimit'          => new external_value(PARAM_INT, 'Max applications'),
            'status'            => new external_value(PARAM_TEXT, 'Status'),
            'createdby'         => new external_value(PARAM_INT, 'Creator'),
            'application_count' => new external_value(PARAM_INT, 'Application count'),
            'timecreated'       => new external_value(PARAM_INT, 'Created'),
            'timemodified'      => new external_value(PARAM_INT, 'Modified'),
            'stage_counts'      => new external_multiple_structure(
                new external_single_structure([
                    'stage' => new external_value(PARAM_TEXT, 'Pipeline stage name'),
                    'count' => new external_value(PARAM_INT, 'Number of candidates in this stage'),
                ])
            ),
            'jd_analysis' => new external_single_structure([
                'must_have'    => new external_value(PARAM_RAW, 'JSON array of must-have skills'),
                'good_to_have' => new external_value(PARAM_RAW, 'JSON array of good-to-have skills'),
                'future_proof' => new external_value(PARAM_RAW, 'JSON array of future-proof skills'),
                'team_gap'     => new external_value(PARAM_RAW, 'JSON array of team gap skills'),
                'pass_count'   => new external_value(PARAM_INT, 'Candidates to pass'),
                'is_finalized' => new external_value(PARAM_BOOL, 'Whether JD round is finalized', VALUE_OPTIONAL),
            ], 'JD analysis data', VALUE_OPTIONAL),
        ]);
    }
}
