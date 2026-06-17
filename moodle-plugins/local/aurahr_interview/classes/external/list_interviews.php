<?php
namespace local_aurahr_interview\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_multiple_structure;
use core_external\external_value;

/**
 * List interviews for a job or candidate.
 */
class list_interviews extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'jobid'       => new external_value(PARAM_INT, 'Job ID (0 = all)', VALUE_DEFAULT, 0),
            'candidateid' => new external_value(PARAM_INT, 'Candidate user ID (0 = all)', VALUE_DEFAULT, 0),
            'status'      => new external_value(PARAM_TEXT, 'Filter by status', VALUE_DEFAULT, ''),
        ]);
    }

    public static function execute(int $jobid, int $candidateid, string $status): array {
        global $DB;

        $params = self::validate_parameters(self::execute_parameters(), [
            'jobid' => $jobid, 'candidateid' => $candidateid, 'status' => $status,
        ]);

        $where = [];
        $sqlparams = [];

        if ($params['jobid'] > 0) {
            $where[] = 'i.jobid = :jobid';
            $sqlparams['jobid'] = $params['jobid'];
        }
        if ($params['candidateid'] > 0) {
            $where[] = 'i.candidateid = :candidateid';
            $sqlparams['candidateid'] = $params['candidateid'];
        }
        if (!empty($params['status'])) {
            $where[] = 'i.status = :status';
            $sqlparams['status'] = $params['status'];
        }

        $whereclause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        $sql = "SELECT i.*, c.firstname AS candidate_firstname, c.lastname AS candidate_lastname,
                       c.email AS candidate_email,
                       iv.firstname AS interviewer_firstname, iv.lastname AS interviewer_lastname,
                       j.title AS job_title
                FROM {local_aurahr_interviews} i
                JOIN {user} c ON c.id = i.candidateid
                LEFT JOIN {user} iv ON iv.id = i.interviewerid
                JOIN {local_aurahr_jobs} j ON j.id = i.jobid
                {$whereclause}
                ORDER BY i.scheduled_at DESC";

        $records = $DB->get_records_sql($sql, $sqlparams);
        $interviews = [];

        foreach ($records as $r) {
            $interviews[] = [
                'id'                   => (int)$r->id,
                'jobid'                => (int)$r->jobid,
                'applicationid'        => (int)$r->applicationid,
                'job_title'            => $r->job_title,
                'candidateid'          => (int)$r->candidateid,
                'candidate_name'       => "{$r->candidate_firstname} {$r->candidate_lastname}",
                'candidate_email'      => $r->candidate_email,
                'interviewer_name'     => $r->interviewer_firstname
                    ? "{$r->interviewer_firstname} {$r->interviewer_lastname}" : '',
                'scheduled_at'         => (int)$r->scheduled_at,
                'duration_mins'        => (int)$r->duration_mins,
                'jitsi_room'           => $r->jitsi_room ?? '',
                'status'               => $r->status,
                'interviewer_score'    => (float)($r->interviewer_score ?? 0),
                'ai_score'             => (float)($r->ai_score ?? 0),
            ];
        }

        return ['interviews' => $interviews, 'total' => count($interviews)];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'interviews' => new external_multiple_structure(
                new external_single_structure([
                    'id'                => new external_value(PARAM_INT, 'Interview ID'),
                    'jobid'             => new external_value(PARAM_INT, 'Job ID'),
                    'applicationid'     => new external_value(PARAM_INT, 'Application ID'),
                    'job_title'         => new external_value(PARAM_TEXT, 'Job title'),
                    'candidateid'       => new external_value(PARAM_INT, 'Candidate user ID'),
                    'candidate_name'    => new external_value(PARAM_TEXT, 'Candidate name'),
                    'candidate_email'   => new external_value(PARAM_TEXT, 'Candidate email'),
                    'interviewer_name'  => new external_value(PARAM_TEXT, 'Interviewer name'),
                    'scheduled_at'      => new external_value(PARAM_INT, 'Scheduled timestamp'),
                    'duration_mins'     => new external_value(PARAM_INT, 'Duration'),
                    'jitsi_room'        => new external_value(PARAM_TEXT, 'Jitsi room'),
                    'status'            => new external_value(PARAM_TEXT, 'Status'),
                    'interviewer_score' => new external_value(PARAM_FLOAT, 'Interviewer score'),
                    'ai_score'          => new external_value(PARAM_FLOAT, 'AI score'),
                ])
            ),
            'total' => new external_value(PARAM_INT, 'Total count'),
        ]);
    }
}
