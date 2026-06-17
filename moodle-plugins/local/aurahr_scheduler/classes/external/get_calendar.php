<?php
namespace local_aurahr_scheduler\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_multiple_structure;
use core_external\external_value;

/**
 * Get calendar view with scheduled interviews.
 */
class get_calendar extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'start_time' => new external_value(PARAM_INT, 'Start timestamp'),
            'end_time'   => new external_value(PARAM_INT, 'End timestamp'),
        ]);
    }

    public static function execute(int $start_time, int $end_time): array {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), [
            'start_time' => $start_time, 'end_time' => $end_time,
        ]);

        $context = \context_system::instance();
        require_capability('local/aurahr_scheduler:viewcalendar', $context);

        $hasmanage = has_capability('local/aurahr_scheduler:manage', $context);

        if ($hasmanage) {
            $sql = "SELECT i.*, j.title as job_title, u1.firstname as c_first, u1.lastname as c_last, u2.firstname as int_first, u2.lastname as int_last
                    FROM {local_aurahr_interviews} i
                    LEFT JOIN {local_aurahr_jobs} j ON i.jobid = j.id
                    LEFT JOIN {user} u1 ON i.candidateid = u1.id
                    LEFT JOIN {user} u2 ON i.interviewerid = u2.id
                    WHERE i.scheduled_at >= :start AND i.scheduled_at <= :end
                    ORDER BY i.scheduled_at ASC";
            $records = $DB->get_records_sql($sql, [
                'start' => $params['start_time'], 'end' => $params['end_time'],
            ]);
        } else {
            $sql = "SELECT i.*, j.title as job_title, u1.firstname as c_first, u1.lastname as c_last, u2.firstname as int_first, u2.lastname as int_last
                    FROM {local_aurahr_interviews} i
                    LEFT JOIN {local_aurahr_jobs} j ON i.jobid = j.id
                    LEFT JOIN {user} u1 ON i.candidateid = u1.id
                    LEFT JOIN {user} u2 ON i.interviewerid = u2.id
                    WHERE i.scheduled_at >= :start AND i.scheduled_at <= :end
                    AND (i.interviewerid = :uid1 OR i.candidateid = :uid2)
                    ORDER BY i.scheduled_at ASC";
            $records = $DB->get_records_sql($sql, [
                'start' => $params['start_time'], 'end' => $params['end_time'],
                'uid1' => $USER->id, 'uid2' => $USER->id,
            ]);
        }

        $events = [];
        foreach ($records as $r) {
            $c_name = trim(($r->c_first ?? '') . ' ' . ($r->c_last ?? ''));
            $int_name = trim(($r->int_first ?? '') . ' ' . ($r->int_last ?? ''));
            $events[] = [
                'id'            => (int)$r->id,
                'title'         => 'Interview',
                'scheduled_at'  => (int)$r->scheduled_at,
                'duration_mins' => (int)$r->duration_mins,
                'status'        => $r->status,
                'applicationid' => (int)$r->applicationid,
                'jobid'         => (int)$r->jobid,
                'candidateid'   => (int)$r->candidateid,
                'interviewerid' => (int)($r->interviewerid ?? 0),
                'job_title'     => $r->job_title ?? 'Technical Interview',
                'candidate_name'=> $c_name !== '' ? $c_name : 'N/A',
                'interviewer_name' => $int_name !== '' ? $int_name : 'N/A',
            ];
        }

        return ['events' => $events];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'events' => new external_multiple_structure(
                new external_single_structure([
                    'id'            => new external_value(PARAM_INT, 'Interview ID'),
                    'title'         => new external_value(PARAM_TEXT, 'Title'),
                    'scheduled_at'  => new external_value(PARAM_INT, 'Scheduled timestamp'),
                    'duration_mins' => new external_value(PARAM_INT, 'Duration'),
                    'status'        => new external_value(PARAM_TEXT, 'Status'),
                    'applicationid' => new external_value(PARAM_INT, 'Application ID', VALUE_OPTIONAL),
                    'jobid'         => new external_value(PARAM_INT, 'Job ID', VALUE_OPTIONAL),
                    'candidateid'   => new external_value(PARAM_INT, 'Candidate User ID', VALUE_OPTIONAL),
                    'interviewerid' => new external_value(PARAM_INT, 'Interviewer User ID', VALUE_OPTIONAL),
                    'job_title'     => new external_value(PARAM_TEXT, 'Job Title', VALUE_OPTIONAL),
                    'candidate_name'=> new external_value(PARAM_TEXT, 'Candidate Name', VALUE_OPTIONAL),
                    'interviewer_name'=> new external_value(PARAM_TEXT, 'Interviewer Name', VALUE_OPTIONAL),
                ])
            ),
        ]);
    }
}
