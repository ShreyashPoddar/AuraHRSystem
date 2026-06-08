<?php
namespace local_aurahr_academia\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_multiple_structure;
use core_external\external_value;

/**
 * Get assessment details including enrolled candidates and their scores.
 */
class get_assessment extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'assessmentid' => new external_value(PARAM_INT, 'Assessment ID (0 = get by jobid)'),
            'jobid'        => new external_value(PARAM_INT, 'Job ID (used if assessmentid is 0)', VALUE_DEFAULT, 0),
        ]);
    }

    public static function execute(int $assessmentid, int $jobid): array {
        global $DB;

        $params = self::validate_parameters(self::execute_parameters(), [
            'assessmentid' => $assessmentid, 'jobid' => $jobid,
        ]);

        if ($params['assessmentid'] > 0) {
            $assessment = $DB->get_record('local_aurahr_assessments', ['id' => $params['assessmentid']], '*', MUST_EXIST);
        } elseif ($params['jobid'] > 0) {
            $assessments = $DB->get_records('local_aurahr_assessments', ['jobid' => $params['jobid']], 'id DESC', '*', 0, 1);
            $assessment = $assessments ? reset($assessments) : null;
            if (!$assessment) {
                return ['exists' => false, 'id' => 0, 'title' => '', 'status' => '', 'candidates' => []];
            }
        } else {
            throw new \invalid_parameter_exception('Either assessmentid or jobid is required');
        }

        // Dynamic status check for auto_start
        $current_status = $assessment->status;
        if ($current_status === 'scheduled' && !empty($assessment->auto_start) && !empty($assessment->start_time)) {
            if (time() >= $assessment->start_time) {
                $current_status = 'active';
            }
        }

        // Get enrolled candidates.
        $sql = "SELECT e.*, u.firstname, u.lastname, u.email
                FROM {local_aurahr_assess_enrol} e
                JOIN {user} u ON u.id = e.userid
                WHERE e.assessmentid = :aid
                ORDER BY e.score DESC";
        $enrollments = $DB->get_records_sql($sql, ['aid' => $assessment->id]);

        $candidates = [];
        foreach ($enrollments as $e) {
            $candidates[] = [
                'id'           => (int)$e->id,
                'userid'       => (int)$e->userid,
                'firstname'    => $e->firstname,
                'lastname'     => $e->lastname,
                'email'        => $e->email,
                'status'       => $e->status,
                'score'        => (float)($e->score ?? 0),
                'passed'       => (int)$e->passed,
                'started_at'   => (int)($e->started_at ?? 0),
                'completed_at' => (int)($e->completed_at ?? 0),
            ];
        }

        // Get questions
        $questions = [];
        if (!empty($assessment->questions)) {
            $questions_decoded = json_decode($assessment->questions, true);
            if (is_array($questions_decoded)) {
                foreach ($questions_decoded as $q) {
                    $questions[] = [
                        'text'        => (string)($q['text'] ?? ''),
                        'options'     => array_map('strval', $q['options'] ?? []),
                        'correct'     => (int)($q['correct'] ?? 0),
                        'explanation' => (string)($q['explanation'] ?? ''),
                        'difficulty'  => (string)($q['difficulty'] ?? 'medium'),
                    ];
                }
            }
        }

        // Fetch stage, malpractice, and status for the current candidate
        global $USER;
        $user_stage = '';
        $user_malpractice = 0;
        $user_status = '';

        $app = $DB->get_record('local_aurahr_applications', ['userid' => $USER->id, 'jobid' => $assessment->jobid]);
        if ($app) {
            $user_stage = $app->stage;
            $user_malpractice = (int)$app->malpractice;
        }

        if ($enrol = $DB->get_record('local_aurahr_assess_enrol', ['assessmentid' => $assessment->id, 'userid' => $USER->id])) {
            $user_status = $enrol->status;
        }

        // Hide other candidates if the user does not have manage permissions
        $has_manage = has_capability('local/aurahr_academia:manage', \context_system::instance());
        if (!$has_manage) {
            $candidates = [];
        }

        return [
            'exists'          => true,
            'id'              => (int)$assessment->id,
            'jobid'           => (int)$assessment->jobid,
            'title'           => $assessment->title,
            'num_questions'   => (int)$assessment->num_questions,
            'duration_mins'   => (int)$assessment->duration_mins,
            'pass_percentage' => (float)$assessment->pass_percentage,
            'start_time'      => (int)($assessment->start_time ?? 0),
            'end_time'        => (int)($assessment->end_time ?? 0),
            'auto_start'      => (bool)($assessment->auto_start ?? false),
            'status'          => $current_status,
            'quizid'          => (int)($assessment->quizid ?? 0),
            'candidates'      => $candidates,
            'questions'       => $questions,
            'user_stage'      => $user_stage,
            'user_malpractice'=> $user_malpractice,
            'user_status'     => $user_status,
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'exists'          => new external_value(PARAM_BOOL, 'Whether assessment exists'),
            'id'              => new external_value(PARAM_INT, 'Assessment ID'),
            'jobid'           => new external_value(PARAM_INT, 'Job ID', VALUE_OPTIONAL),
            'title'           => new external_value(PARAM_TEXT, 'Title'),
            'num_questions'   => new external_value(PARAM_INT, 'Questions count', VALUE_OPTIONAL),
            'duration_mins'   => new external_value(PARAM_INT, 'Duration', VALUE_OPTIONAL),
            'pass_percentage' => new external_value(PARAM_FLOAT, 'Pass %', VALUE_OPTIONAL),
            'start_time'      => new external_value(PARAM_INT, 'Start time', VALUE_OPTIONAL),
            'end_time'        => new external_value(PARAM_INT, 'End time', VALUE_OPTIONAL),
            'auto_start'      => new external_value(PARAM_BOOL, 'Auto start test', VALUE_OPTIONAL),
            'status'          => new external_value(PARAM_TEXT, 'Status'),
            'quizid'          => new external_value(PARAM_INT, 'Moodle quiz ID', VALUE_OPTIONAL),
            'candidates'      => new external_multiple_structure(
                new external_single_structure([
                    'id'           => new external_value(PARAM_INT, 'Enrollment ID'),
                    'userid'       => new external_value(PARAM_INT, 'User ID'),
                    'firstname'    => new external_value(PARAM_TEXT, 'First name'),
                    'lastname'     => new external_value(PARAM_TEXT, 'Last name'),
                    'email'        => new external_value(PARAM_TEXT, 'Email'),
                    'status'       => new external_value(PARAM_TEXT, 'Test status'),
                    'score'        => new external_value(PARAM_FLOAT, 'Score'),
                    'passed'       => new external_value(PARAM_INT, 'Passed flag'),
                    'started_at'   => new external_value(PARAM_INT, 'Started at'),
                    'completed_at' => new external_value(PARAM_INT, 'Completed at'),
                ])
            ),
            'questions'       => new external_multiple_structure(
                new external_single_structure([
                    'text'        => new external_value(PARAM_RAW, 'Question text'),
                    'options'     => new external_multiple_structure(
                        new external_value(PARAM_RAW, 'Option text')
                    ),
                    'correct'     => new external_value(PARAM_INT, 'Index of correct option'),
                    'explanation' => new external_value(PARAM_RAW, 'Explanation text', VALUE_OPTIONAL),
                    'difficulty'  => new external_value(PARAM_TEXT, 'easy|medium|hard', VALUE_OPTIONAL),
                ]),
                'Generated questions list',
                VALUE_OPTIONAL
            ),
            'user_stage'      => new external_value(PARAM_TEXT, 'User stage', VALUE_OPTIONAL),
            'user_malpractice'=> new external_value(PARAM_INT, 'User malpractice count', VALUE_OPTIONAL),
            'user_status'     => new external_value(PARAM_TEXT, 'User enrollment status', VALUE_OPTIONAL),
        ]);
    }
}
