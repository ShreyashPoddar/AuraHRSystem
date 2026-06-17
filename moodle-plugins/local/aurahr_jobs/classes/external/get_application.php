<?php
namespace local_aurahr_jobs\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Get full details for a single application including user profile.
 */
class get_application extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'applicationid' => new external_value(PARAM_INT, 'Application ID'),
        ]);
    }

    public static function execute(int $applicationid): array {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), ['applicationid' => $applicationid]);

        $context = \context_system::instance();

        $sql = "SELECT a.*, u.firstname, u.lastname, u.email, u.phone1, u.phone2,
                       u.city, u.country, u.description as user_bio, u.picture, u.imagealt,
                       j.title as job_title, j.department as job_department
                FROM {local_aurahr_applications} a
                JOIN {user} u ON u.id = a.userid
                JOIN {local_aurahr_jobs} j ON j.id = a.jobid
                WHERE a.id = :appid";
        $record = $DB->get_record_sql($sql, ['appid' => $params['applicationid']], MUST_EXIST);

        // Permission check: managers can view all, candidates can only view their own.
        if ((int)$record->userid !== $USER->id) {
            require_capability('local/aurahr_jobs:viewapplications', $context);
        }

        // Fetch candidate preferences to get URLs.
        // Reconstruct chunked preference if it exists
        $chunks_count = $DB->get_field('user_preferences', 'value', [
            'userid' => $record->userid,
            'name'   => 'aurahr_candidate_settings_chunks'
        ]);

        $prefs = [];
        if ($chunks_count) {
            $full_json = '';
            for ($i = 0; $i < (int)$chunks_count; $i++) {
                $full_json .= $DB->get_field('user_preferences', 'value', [
                    'userid' => $record->userid,
                    'name'   => 'aurahr_candidate_settings_' . $i
                ]);
            }
            $prefs = json_decode($full_json, true) ?: [];
        } else {
            $user_prefs_json = $DB->get_field('user_preferences', 'value', [
                'userid' => $record->userid,
                'name'   => 'aurahr_candidate_settings'
            ]);
            $prefs = $user_prefs_json ? (json_decode($user_prefs_json, true) ?: []) : [];
        }

        return [
            'id'                 => (int)$record->id,
            'userid'             => (int)$record->userid,
            'jobid'              => (int)$record->jobid,
            'job_title'          => $record->job_title,
            'job_department'     => $record->job_department ?? '',
            'firstname'          => $record->firstname,
            'lastname'           => $record->lastname,
            'email'              => $record->email,
            'phone'              => $record->phone1 ?? $record->phone2 ?? '',
            'city'               => $record->city ?? '',
            'country'            => $record->country ?? '',
            'bio'                => $record->user_bio ?? '',
            'stage'              => $record->stage,
            'jd_score'           => (float)($record->jd_score ?? 0),
            'academia_score'     => (float)($record->academia_score ?? 0),
            'interview_score'    => (float)($record->interview_score ?? 0),
            'overall_score'      => (float)($record->overall_score ?? 0),
            'malpractice'        => (int)$record->malpractice,
            'age'                => $record->age !== null ? (int)$record->age : null,
            'gender'             => $record->gender ?? '',
            'role'               => $record->role ?? '',
            'education_details'  => $record->education_details ?? '',
            'resume_skills'      => $record->resume_skills ?? '',
            'github_score'       => $record->github_score !== null ? (float)$record->github_score : null,
            'leetcode_score'     => $record->leetcode_score !== null ? (float)$record->leetcode_score : null,
            'github_url'         => $record->github_url ?? '',
            'leetcode_url'       => $record->leetcode_url ?? '',
            'matched_skills'     => $record->matched_skills ?? '',
            'recruiter_rating'   => (float)($record->recruiter_rating ?? 0),
            'recruiter_feedback' => $record->recruiter_feedback ?? '',
            'ai_summary'         => $record->ai_summary ?? '',
            'timecreated'        => (int)$record->timecreated,
            'timemodified'       => (int)$record->timemodified,
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'id'                 => new external_value(PARAM_INT, 'Application ID'),
            'userid'             => new external_value(PARAM_INT, 'User ID'),
            'jobid'              => new external_value(PARAM_INT, 'Job ID'),
            'job_title'          => new external_value(PARAM_TEXT, 'Job title'),
            'job_department'     => new external_value(PARAM_TEXT, 'Job department'),
            'firstname'          => new external_value(PARAM_TEXT, 'First name'),
            'lastname'           => new external_value(PARAM_TEXT, 'Last name'),
            'email'              => new external_value(PARAM_TEXT, 'Email'),
            'phone'              => new external_value(PARAM_TEXT, 'Phone'),
            'city'               => new external_value(PARAM_TEXT, 'City'),
            'country'            => new external_value(PARAM_TEXT, 'Country'),
            'bio'                => new external_value(PARAM_RAW, 'Bio'),
            'stage'              => new external_value(PARAM_TEXT, 'Pipeline stage'),
            'jd_score'           => new external_value(PARAM_FLOAT, 'JD score'),
            'academia_score'     => new external_value(PARAM_FLOAT, 'Academia score'),
            'interview_score'    => new external_value(PARAM_FLOAT, 'Interview score'),
            'overall_score'      => new external_value(PARAM_FLOAT, 'Overall score'),
            'malpractice'        => new external_value(PARAM_INT, 'Malpractice flag'),
            'age'                => new external_value(PARAM_INT, 'Age', VALUE_OPTIONAL),
            'gender'             => new external_value(PARAM_TEXT, 'Gender'),
            'role'               => new external_value(PARAM_TEXT, 'Role'),
            'education_details'  => new external_value(PARAM_RAW, 'Education details'),
            'resume_skills'      => new external_value(PARAM_RAW, 'Resume skills'),
            'github_score'       => new external_value(PARAM_FLOAT, 'Github score', VALUE_OPTIONAL),
            'leetcode_score'     => new external_value(PARAM_FLOAT, 'Leetcode score', VALUE_OPTIONAL),
            'github_url'         => new external_value(PARAM_TEXT, 'Github URL', VALUE_OPTIONAL),
            'leetcode_url'       => new external_value(PARAM_TEXT, 'Leetcode URL', VALUE_OPTIONAL),
            'matched_skills'     => new external_value(PARAM_RAW, 'Matched skills'),
            'recruiter_rating'   => new external_value(PARAM_FLOAT, 'Recruiter rating'),
            'recruiter_feedback' => new external_value(PARAM_RAW, 'Recruiter feedback'),
            'ai_summary'         => new external_value(PARAM_RAW, 'AI summary'),
            'timecreated'        => new external_value(PARAM_INT, 'Created'),
            'timemodified'       => new external_value(PARAM_INT, 'Modified'),
        ]);
    }
}
