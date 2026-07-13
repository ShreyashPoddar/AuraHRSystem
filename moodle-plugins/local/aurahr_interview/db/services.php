<?php
defined('MOODLE_INTERNAL') || die();

$functions = [
    'local_aurahr_interview_schedule' => [
        'classname' => 'local_aurahr_interview\external\schedule_interview',
        'description' => 'Schedule an interview for a candidate',
        'type' => 'write', 'ajax' => true,
        'capabilities' => 'local/aurahr_interview:manage',
    ],
    'local_aurahr_interview_list' => [
        'classname' => 'local_aurahr_interview\external\list_interviews',
        'description' => 'List interviews for a job or candidate',
        'type' => 'read', 'ajax' => true,
    ],
    'local_aurahr_interview_get_details' => [
        'classname' => 'local_aurahr_interview\external\get_details',
        'description' => 'Get full interview details including questions',
        'type' => 'read', 'ajax' => true,
    ],
    'local_aurahr_interview_submit_score' => [
        'classname' => 'local_aurahr_interview\external\submit_score',
        'description' => 'Submit interviewer score and notes',
        'type' => 'write', 'ajax' => true,
        'capabilities' => 'local/aurahr_interview:conduct',
    ],
    'local_aurahr_interview_ai_evaluate' => [
        'classname' => 'local_aurahr_interview\external\ai_evaluate',
        'description' => 'Run AI evaluation on interview transcript',
        'type' => 'write', 'ajax' => true,
        'capabilities' => 'local/aurahr_interview:manage',
    ],
    'local_aurahr_interview_finalise' => [
        'classname' => 'local_aurahr_interview\external\finalise',
        'description' => 'Finalise interview and update pipeline stage',
        'type' => 'write', 'ajax' => true,
        'capabilities' => 'local/aurahr_interview:manage',
    ],
    // Proctoring functions.
    'local_aurahr_proctor_log_event' => [
        'classname' => 'local_aurahr_interview\external\log_proctor_event',
        'description' => 'Log a proctoring event (tab switch, face detection, etc.)',
        'type' => 'write', 'ajax' => true,
        'capabilities' => 'local/aurahr_interview:proctor',
    ],
    'local_aurahr_proctor_get_report' => [
        'classname' => 'local_aurahr_interview\external\get_proctor_report',
        'description' => 'Get proctoring report for a session',
        'type' => 'read', 'ajax' => true,
        'capabilities' => 'local/aurahr_interview:viewproctor',
    ],
];

$services = [
    'AuraHR Interview API' => [
        'functions'       => array_keys($functions),
        'restrictedusers' => 0,
        'enabled'         => 1,
        'shortname'       => 'aurahr_interview',
    ],
];
