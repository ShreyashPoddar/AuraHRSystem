<?php
// Web service function declarations for local_aurahr_jobs.
// Each function maps to a class in classes/external/.
defined('MOODLE_INTERNAL') || die();

$functions = [

    // ── Job CRUD ─────────────────────────────────────────────────

    'local_aurahr_jobs_create_job' => [
        'classname'   => 'local_aurahr_jobs\external\create_job',
        'description' => 'Create a new job posting',
        'type'        => 'write',
        'ajax'        => true,
        'capabilities' => 'local/aurahr_jobs:managejobs',
    ],

    'local_aurahr_jobs_list_jobs' => [
        'classname'   => 'local_aurahr_jobs\external\list_jobs',
        'description' => 'List job postings with optional status filter',
        'type'        => 'read',
        'ajax'        => true,
    ],

    'local_aurahr_jobs_get_job' => [
        'classname'   => 'local_aurahr_jobs\external\get_job',
        'description' => 'Get a single job posting with full details',
        'type'        => 'read',
        'ajax'        => true,
    ],

    'local_aurahr_jobs_update_job' => [
        'classname'   => 'local_aurahr_jobs\external\update_job',
        'description' => 'Update an existing job posting',
        'type'        => 'write',
        'ajax'        => true,
        'capabilities' => 'local/aurahr_jobs:managejobs',
    ],

    'local_aurahr_jobs_delete_job' => [
        'classname'   => 'local_aurahr_jobs\external\delete_job',
        'description' => 'Archive (soft-delete) a job posting',
        'type'        => 'write',
        'ajax'        => true,
        'capabilities' => 'local/aurahr_jobs:managejobs',
    ],

    // ── Applications ─────────────────────────────────────────────

    'local_aurahr_jobs_apply' => [
        'classname'   => 'local_aurahr_jobs\external\apply',
        'description' => 'Apply to a job posting as a candidate',
        'type'        => 'write',
        'ajax'        => true,
        'capabilities' => 'local/aurahr_jobs:apply',
    ],

    'local_aurahr_jobs_list_applications' => [
        'classname'   => 'local_aurahr_jobs\external\list_applications',
        'description' => 'List applications for a job with filtering, sorting, pagination',
        'type'        => 'read',
        'ajax'        => true,
        'capabilities' => 'local/aurahr_jobs:viewapplications',
    ],

    'local_aurahr_jobs_finalize_jd' => [
        'classname'   => 'local_aurahr_jobs\external\finalize_jd',
        'description' => 'Finalize JD parsing and pass top candidates to screened',
        'type'        => 'write',
        'ajax'        => true,
        'capabilities' => 'local/aurahr_jobs:managejobs',
    ],

    'local_aurahr_jobs_get_application' => [
        'classname'   => 'local_aurahr_jobs\external\get_application',
        'description' => 'Get full details for a single application',
        'type'        => 'read',
        'ajax'        => true,
    ],

    'local_aurahr_jobs_update_stage' => [
        'classname'   => 'local_aurahr_jobs\external\update_stage',
        'description' => 'Move a candidate to a different pipeline stage',
        'type'        => 'write',
        'ajax'        => true,
        'capabilities' => 'local/aurahr_jobs:managejobs',
    ],

    // ── Statistics ────────────────────────────────────────────────

    'local_aurahr_jobs_get_stats' => [
        'classname'   => 'local_aurahr_jobs\external\get_stats',
        'description' => 'Get pipeline statistics (counts per stage, averages)',
        'type'        => 'read',
        'ajax'        => true,
        'capabilities' => 'local/aurahr_jobs:viewapplications',
    ],

    // ── Settings & Preferences ───────────────────────────────────

    'local_aurahr_jobs_get_org_config' => [
        'classname'   => 'local_aurahr_jobs\external\get_org_config',
        'description' => 'Get global organization settings',
        'type'        => 'read',
        'ajax'        => true,
    ],

    'local_aurahr_jobs_update_org_config' => [
        'classname'   => 'local_aurahr_jobs\external\update_org_config',
        'description' => 'Update global organization settings',
        'type'        => 'write',
        'ajax'        => true,
    ],

    'local_aurahr_jobs_get_user_prefs' => [
        'classname'   => 'local_aurahr_jobs\external\get_user_prefs',
        'description' => 'Get user specific preferences',
        'type'        => 'read',
        'ajax'        => true,
    ],

    'local_aurahr_jobs_update_user_prefs' => [
        'classname'   => 'local_aurahr_jobs\external\update_user_prefs',
        'description' => 'Update user specific preferences',
        'type'        => 'write',
        'ajax'        => true,
    ],

    'local_aurahr_jobs_delete_account' => [
        'classname'   => 'local_aurahr_jobs\external\delete_account',
        'description' => 'Delete authenticated user account',
        'type'        => 'write',
        'ajax'        => true,
    ],

    'local_aurahr_jobs_upload_photo' => [
        'classname'   => 'local_aurahr_jobs\external\upload_photo',
        'description' => 'Upload candidate profile photo',
        'type'        => 'write',
        'ajax'        => true,
    ],

    'local_aurahr_jobs_upload_resume' => [
        'classname'   => 'local_aurahr_jobs\external\upload_resume',
        'description' => 'Upload candidate resume file',
        'type'        => 'write',
        'ajax'        => true,
    ],

    'local_aurahr_jobs_get_photo' => [
        'classname'   => 'local_aurahr_jobs\external\get_photo',
        'description' => 'Get candidate profile photo',
        'type'        => 'read',
        'ajax'        => true,
    ],

    'local_aurahr_jobs_change_password' => [
        'classname'   => 'local_aurahr_jobs\external\change_password',
        'description' => 'Change user password',
        'type'        => 'write',
        'ajax'        => true,
    ],

    // ── Social / Notifications ────────────────────────────────

    'local_aurahr_jobs_analyze_socials' => [
        'classname'   => 'local_aurahr_jobs\external\analyze_socials',
        'description' => 'Scrape and score candidate GitHub/LinkedIn/LeetCode profiles using AI',
        'type'        => 'write',
        'ajax'        => true,
        'capabilities' => 'local/aurahr_jobs:viewapplications',
    ],

    'local_aurahr_jobs_get_notifications' => [
        'classname'   => 'local_aurahr_jobs\external\get_notifications',
        'description' => 'Get recruiter notifications (pending screens, assessments, JD ready)',
        'type'        => 'read',
        'ajax'        => true,
        'capabilities' => 'local/aurahr_jobs:viewapplications',
    ],

    'local_aurahr_jobs_update_candidate_urls' => [
        'classname'   => 'local_aurahr_jobs\external\update_candidate_urls',
        'description' => 'Update candidate social profile URLs (GitHub, LinkedIn, LeetCode)',
        'type'        => 'write',
        'ajax'        => true,
    ],
];

// Group all functions into a single external service.
$services = [
    'AuraHR Jobs API' => [
        'functions'       => array_merge(array_keys($functions), [
            'local_aurahr_jdparser_parse',
            'local_aurahr_jdparser_match_candidates',
            'local_aurahr_jdparser_get_analysis',
            'local_aurahr_jdparser_update_config',
            'local_aurahr_jobs_upload_photo',
            'local_aurahr_jobs_upload_resume',
            
            'local_aurahr_interview_schedule',
            'local_aurahr_interview_list',
            'local_aurahr_interview_get_details',
            'local_aurahr_interview_submit_score',
            'local_aurahr_interview_ai_evaluate',
            'local_aurahr_interview_finalise',
            'local_aurahr_proctor_log_event',
            'local_aurahr_proctor_get_report',
            
            'local_aurahr_academia_create_assessment',
            'local_aurahr_academia_generate_questions',
            'local_aurahr_academia_schedule_test',
            'local_aurahr_academia_get_assessment',
            'local_aurahr_academia_get_results',
            'local_aurahr_academia_get_candidate_test',
            'local_aurahr_academia_submit_test',
            'local_aurahr_academia_finalize_assessment',
            'local_aurahr_academia_log_event',

            'local_aurahr_scheduler_set_availability',
            'local_aurahr_scheduler_get_availability',
            'local_aurahr_scheduler_block_time',
            'local_aurahr_scheduler_auto_schedule',
            'local_aurahr_scheduler_get_calendar',
            'local_aurahr_scheduler_request_reschedule',
            'local_aurahr_scheduler_approve_reschedule',
            'local_aurahr_scheduler_get_blocked_times',
            'local_aurahr_scheduler_delete_blocked_time',
            'local_aurahr_scheduler_get_pending_requests',
            'local_aurahr_scheduler_update_rules',
            'local_aurahr_scheduler_get_rules',
            'local_aurahr_scheduler_cancel_interview',
            'local_aurahr_scheduler_override_slot',
        ]),
        'restrictedusers' => 0,
        'enabled'         => 1,
        'shortname'       => 'aurahr_jobs',
    ],
];
