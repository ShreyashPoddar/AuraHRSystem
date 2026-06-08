<?php
defined('MOODLE_INTERNAL') || die();

$functions = [
    'local_aurahr_academia_create_assessment' => [
        'classname'    => 'local_aurahr_academia\external\create_assessment',
        'description'  => 'Create an academia round assessment for a job',
        'type'         => 'write',
        'ajax'         => true,
        'capabilities' => 'local/aurahr_academia:manage',
    ],
    'local_aurahr_academia_generate_questions' => [
        'classname'    => 'local_aurahr_academia\external\generate_questions',
        'description'  => 'Generate quiz questions using AI and import into Moodle',
        'type'         => 'write',
        'ajax'         => true,
        'capabilities' => 'local/aurahr_academia:manage',
    ],
    'local_aurahr_academia_schedule_test' => [
        'classname'    => 'local_aurahr_academia\external\schedule_test',
        'description'  => 'Schedule a test window and enroll candidates',
        'type'         => 'write',
        'ajax'         => true,
        'capabilities' => 'local/aurahr_academia:manage',
    ],
    'local_aurahr_academia_get_assessment' => [
        'classname'    => 'local_aurahr_academia\external\get_assessment',
        'description'  => 'Get assessment details including enrolled candidates',
        'type'         => 'read',
        'ajax'         => true,
    ],
    'local_aurahr_academia_get_results' => [
        'classname'    => 'local_aurahr_academia\external\get_results',
        'description'  => 'Fetch results from gradebook and update pipeline',
        'type'         => 'write',
        'ajax'         => true,
        'capabilities' => 'local/aurahr_academia:viewresults',
    ],
    'local_aurahr_academia_get_candidate_test' => [
        'classname'    => 'local_aurahr_academia\external\get_candidate_test',
        'description'  => 'Get test info for the current candidate',
        'type'         => 'read',
        'ajax'         => true,
        'capabilities' => 'local/aurahr_academia:take',
    ],
    'local_aurahr_academia_submit_test' => [
        'classname'    => 'local_aurahr_academia\external\submit_test',
        'description'  => 'Submit an academia test score',
        'type'         => 'write',
        'ajax'         => true,
    ],
    'local_aurahr_academia_log_event' => [
        'classname'    => 'local_aurahr_academia\external\log_event',
        'description'  => 'Log a proctoring violation event',
        'type'         => 'write',
        'ajax'         => true,
    ],
    'local_aurahr_academia_finalize_assessment' => [
        'classname'    => 'local_aurahr_academia\external\finalize_assessment',
        'description'  => 'Finalize assessment round, promote top N candidates to interview and reject the rest',
        'type'         => 'write',
        'ajax'         => true,
        'capabilities' => 'local/aurahr_academia:manage',
    ],
];

$services = [
    'AuraHR Academia API' => [
        'functions'       => array_keys($functions),
        'restrictedusers' => 0,
        'enabled'         => 1,
        'shortname'       => 'aurahr_academia',
    ],
];
