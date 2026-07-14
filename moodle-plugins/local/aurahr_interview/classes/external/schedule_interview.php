<?php
namespace local_aurahr_interview\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Schedule an interview for a candidate.
 */
class schedule_interview extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'applicationid' => new external_value(PARAM_INT, 'Application ID'),
            'interviewerid' => new external_value(PARAM_INT, 'Interviewer user ID', VALUE_DEFAULT, 0),
            'scheduled_at'  => new external_value(PARAM_INT, 'Unix timestamp for interview'),
            'duration_mins' => new external_value(PARAM_INT, 'Duration in minutes', VALUE_DEFAULT, 30),
        ]);
    }

    public static function execute(int $applicationid, int $interviewerid, int $scheduled_at, int $duration_mins): array {
        global $DB;

        $params = self::validate_parameters(self::execute_parameters(), [
            'applicationid' => $applicationid, 'interviewerid' => $interviewerid,
            'scheduled_at' => $scheduled_at, 'duration_mins' => $duration_mins,
        ]);

        $context = \context_system::instance();
        require_capability('local/aurahr_interview:manage', $context);

        // Get application details.
        $app = $DB->get_record('local_aurahr_applications', ['id' => $params['applicationid']], '*', MUST_EXIST);

        // Generate Jitsi room name.
        $roomname = 'aurahr-interview-' . $app->id . '-' . time();

        $now = time();
        $record = (object)[
            'applicationid' => $params['applicationid'],
            'jobid'         => $app->jobid,
            'candidateid'   => $app->userid,
            'interviewerid' => $params['interviewerid'] ?: null,
            'scheduled_at'  => $params['scheduled_at'],
            'duration_mins' => $params['duration_mins'],
            'jitsi_room'    => $roomname,
            'status'        => 'scheduled',
            'timecreated'   => $now,
            'timemodified'  => $now,
        ];

        $record->id = $DB->insert_record('local_aurahr_interviews', $record);

        // Update application stage to 'Screening Scheduled'.
        $app->stage = 'Screening Scheduled';
        $app->timemodified = $now;
        $DB->update_record('local_aurahr_applications', $app);

        return [
            'id'           => (int)$record->id,
            'jitsi_room'   => $roomname,
            'scheduled_at' => $params['scheduled_at'],
            'status'       => 'scheduled',
            'success'      => true,
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'id'           => new external_value(PARAM_INT, 'Interview ID'),
            'jitsi_room'   => new external_value(PARAM_TEXT, 'Jitsi room name'),
            'scheduled_at' => new external_value(PARAM_INT, 'Scheduled timestamp'),
            'status'       => new external_value(PARAM_TEXT, 'Status'),
            'success'      => new external_value(PARAM_BOOL, 'Success'),
        ]);
    }
}
