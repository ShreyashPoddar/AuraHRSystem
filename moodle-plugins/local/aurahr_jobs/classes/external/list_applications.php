<?php
namespace local_aurahr_jobs\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_multiple_structure;
use core_external\external_value;

/**
 * List applications for a job with filtering, sorting, search, and pagination.
 * Joins with the user table to include candidate profile data.
 */
class list_applications extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'jobid'      => new external_value(PARAM_INT, 'Job ID (0 = all jobs)'),
            'stage'      => new external_value(PARAM_TEXT, 'Filter by stage (empty = all)', VALUE_DEFAULT, ''),
            'search'     => new external_value(PARAM_TEXT, 'Search by candidate name or email', VALUE_DEFAULT, ''),
            'sort_field' => new external_value(PARAM_TEXT, 'Sort field', VALUE_DEFAULT, 'overall_score'),
            'sort_dir'   => new external_value(PARAM_TEXT, 'Sort direction (ASC/DESC)', VALUE_DEFAULT, 'DESC'),
            'limitfrom'  => new external_value(PARAM_INT, 'Pagination offset', VALUE_DEFAULT, 0),
            'limitnum'   => new external_value(PARAM_INT, 'Pagination limit (0 = all)', VALUE_DEFAULT, 50),
        ]);
    }

    public static function execute(
        int $jobid, string $stage, string $search,
        string $sort_field, string $sort_dir,
        int $limitfrom, int $limitnum
    ): array {
        global $DB;

        $params = self::validate_parameters(self::execute_parameters(), [
            'jobid' => $jobid, 'stage' => $stage, 'search' => $search,
            'sort_field' => $sort_field, 'sort_dir' => $sort_dir,
            'limitfrom' => $limitfrom, 'limitnum' => $limitnum,
        ]);

        $context = \context_system::instance();
        
        if (!has_capability('local/aurahr_jobs:viewapplications', $context)) {
            require_capability('local/aurahr_jobs:viewownapp', $context);
        }

        // Whitelist sortable fields to prevent SQL injection.
        $allowed_sorts = [
            'overall_score', 'jd_score', 'academia_score', 'interview_score',
            'timecreated', 'stage', 'u.firstname', 'u.lastname',
        ];
        $sortfield = in_array($params['sort_field'], $allowed_sorts) ? $params['sort_field'] : 'a.overall_score';
        $sortdir   = strtoupper($params['sort_dir']) === 'ASC' ? 'ASC' : 'DESC';

        // Build WHERE conditions.
        $conditions = [];
        $sqlparams  = [];

        if ($params['jobid'] > 0) {
            $conditions[] = 'a.jobid = :jobid';
            $sqlparams['jobid'] = $params['jobid'];
        }
        if (!empty($params['stage'])) {
            $conditions[] = 'a.stage = :stage';
            $sqlparams['stage'] = $params['stage'];
        }
        if (!empty($params['search'])) {
            $conditions[] = '(' . $DB->sql_like('u.firstname', ':search1', false) .
                            ' OR ' . $DB->sql_like('u.lastname', ':search2', false) .
                            ' OR ' . $DB->sql_like('u.email', ':search3', false) . ')';
            $sqlparams['search1'] = '%' . $params['search'] . '%';
            $sqlparams['search2'] = '%' . $params['search'] . '%';
            $sqlparams['search3'] = '%' . $params['search'] . '%';
        }
        
        global $USER;
        if (!has_capability('local/aurahr_jobs:viewapplications', $context)) {
            $conditions[] = 'a.userid = :ownuserid';
            $sqlparams['ownuserid'] = $USER->id;
        }

        $where = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';

        // Count total for pagination.
        $countsql = "SELECT COUNT(a.id)
                     FROM {local_aurahr_applications} a
                     JOIN {user} u ON u.id = a.userid
                     $where";
        $total = $DB->count_records_sql($countsql, $sqlparams);

        // Fetch records.
        $sql = "SELECT a.*, u.firstname, u.lastname, u.email, u.picture, u.imagealt,
                       j.title AS job_title, j.department AS job_department,
                       COALESCE(jd.is_finalized, 0) as job_is_finalized,
                       asmt.id as assessment_id,
                       asmt.title as assessment_title,
                       asmt.start_time as assessment_start_time,
                       asmt.end_time as assessment_end_time,
                       asmt.status as assessment_status
                FROM {local_aurahr_applications} a
                JOIN {user} u ON u.id = a.userid
                JOIN {local_aurahr_jobs} j ON j.id = a.jobid
                LEFT JOIN {local_aurahr_jd_analysis} jd ON jd.jobid = a.jobid
                LEFT JOIN {local_aurahr_assessments} asmt ON asmt.jobid = a.jobid
                $where
                ORDER BY $sortfield $sortdir";

        $records = $DB->get_records_sql($sql, $sqlparams, $params['limitfrom'], $params['limitnum'] ?: 0);

        $applications = [];
        $rank = $params['limitfrom'] + 1;
        foreach ($records as $r) {
            $applications[] = [
                'rank'              => $rank++,
                'id'                => (int)$r->id,
                'userid'            => (int)$r->userid,
                'jobid'             => (int)$r->jobid,
                'job_title'         => $r->job_title,
                'job_department'    => $r->job_department,
                'firstname'         => $r->firstname,
                'lastname'          => $r->lastname,
                'email'             => $r->email,
                'stage'             => $r->stage,
                'jd_score'          => (float)($r->jd_score ?? 0),
                'academia_score'    => (float)($r->academia_score ?? 0),
                'interview_score'   => (float)($r->interview_score ?? 0),
                'overall_score'     => (float)($r->overall_score ?? 0),
                'github_score'      => $r->github_score !== null ? (float)$r->github_score : null,
                'leetcode_score'    => $r->leetcode_score !== null ? (float)$r->leetcode_score : null,
                'malpractice'       => (int)$r->malpractice,
                'recruiter_rating'  => (float)$r->recruiter_rating ?? 0,
                'timecreated'       => (int)$r->timecreated,
                'timemodified'      => (int)$r->timemodified,
                'job_is_finalized'  => (int)($r->job_is_finalized ?? 0),
                'assessment_id'     => (int)($r->assessment_id ?? 0),
                'assessment_title'  => $r->assessment_title ?? '',
                'assessment_start_time' => (int)($r->assessment_start_time ?? 0),
                'assessment_end_time'   => (int)($r->assessment_end_time ?? 0),
                'assessment_status'     => $r->assessment_status ?? '',
            ];
        }

        return ['applications' => $applications, 'total' => (int)$total];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'applications' => new external_multiple_structure(
                new external_single_structure([
                    'rank'              => new external_value(PARAM_INT, 'Rank in results'),
                    'id'                => new external_value(PARAM_INT, 'Application ID'),
                    'userid'            => new external_value(PARAM_INT, 'Candidate user ID'),
                    'jobid'             => new external_value(PARAM_INT, 'Job ID'),
                    'job_title'         => new external_value(PARAM_TEXT, 'Job Title'),
                    'job_department'    => new external_value(PARAM_TEXT, 'Job Department'),
                    'firstname'         => new external_value(PARAM_TEXT, 'First name'),
                    'lastname'          => new external_value(PARAM_TEXT, 'Last name'),
                    'email'             => new external_value(PARAM_TEXT, 'Email'),
                    'stage'             => new external_value(PARAM_TEXT, 'Pipeline stage'),
                    'jd_score'          => new external_value(PARAM_FLOAT, 'JD Parser score'),
                    'academia_score'    => new external_value(PARAM_FLOAT, 'Academia round score'),
                    'interview_score'   => new external_value(PARAM_FLOAT, 'Interview score'),
                    'overall_score'     => new external_value(PARAM_FLOAT, 'Overall score'),
                    'github_score'      => new external_value(PARAM_FLOAT, 'GitHub score', VALUE_OPTIONAL),
                    'leetcode_score'    => new external_value(PARAM_FLOAT, 'LeetCode score', VALUE_OPTIONAL),
                    'malpractice'       => new external_value(PARAM_INT, 'Malpractice flag'),
                    'recruiter_rating'  => new external_value(PARAM_FLOAT, 'Recruiter rating'),
                    'timecreated'       => new external_value(PARAM_INT, 'Applied date'),
                    'timemodified'      => new external_value(PARAM_INT, 'Last updated'),
                    'job_is_finalized'  => new external_value(PARAM_INT, 'Whether job JD Parser round is finalized', VALUE_OPTIONAL),
                    'assessment_id'     => new external_value(PARAM_INT, 'Assessment ID', VALUE_OPTIONAL),
                    'assessment_title'  => new external_value(PARAM_TEXT, 'Assessment title', VALUE_OPTIONAL),
                    'assessment_start_time' => new external_value(PARAM_INT, 'Assessment start time', VALUE_OPTIONAL),
                    'assessment_end_time'   => new external_value(PARAM_INT, 'Assessment end time', VALUE_OPTIONAL),
                    'assessment_status'     => new external_value(PARAM_TEXT, 'Assessment status', VALUE_OPTIONAL),
                ])
            ),
            'total' => new external_value(PARAM_INT, 'Total matching records'),
        ]);
    }
}
