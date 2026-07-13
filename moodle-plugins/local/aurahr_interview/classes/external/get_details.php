<?php
namespace local_aurahr_interview\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_multiple_structure;
use core_external\external_value;

/**
 * Get full interview details including questions and proctor events.
 */
class get_details extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'applicationid' => new external_value(PARAM_INT, 'Application ID'),
        ]);
    }

    public static function execute(int $applicationid): array {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), [
            'applicationid' => $applicationid,
        ]);

        $application = $DB->get_record('local_aurahr_applications', ['id' => $params['applicationid']], '*', MUST_EXIST);
        $interview = $DB->get_record('local_aurahr_interviews', [
            'candidateid' => $application->userid,
            'jobid' => $application->jobid
        ], '*', MUST_EXIST);
        $job = $DB->get_record('local_aurahr_jobs', ['id' => $interview->jobid], 'title', MUST_EXIST);
        
        $candidate = $DB->get_record('user', ['id' => $interview->candidateid], 'firstname, lastname, email', MUST_EXIST);
        
        $interviewer_name = '';
        if ($interview->interviewerid) {
            $interviewer = $DB->get_record('user', ['id' => $interview->interviewerid], 'firstname, lastname');
            if ($interviewer) {
                $interviewer_name = "{$interviewer->firstname} {$interviewer->lastname}";
            }
        }

        // Get questions
        $q_records = $DB->get_records('local_aurahr_interview_qs', ['interviewid' => $interview->id], 'sortorder ASC');
        $questions = [];
        foreach ($q_records as $q) {
            $questions[] = [
                'id'       => (int)$q->id,
                'question' => $q->question,
                'category' => $q->category ?? '',
                'answer'   => $q->answer ?? '',
                'score'    => (float)($q->score ?? 0),
            ];
        }

        return [
            'id'                => (int)$interview->id,
            'job_title'         => $job->title,
            'candidate_name'    => "{$candidate->firstname} {$candidate->lastname}",
            'candidate_email'   => $candidate->email,
            'interviewer_name'  => $interviewer_name,
            'scheduled_at'      => (int)$interview->scheduled_at,
            'duration_mins'     => (int)$interview->duration_mins,
            'jitsi_room'        => $interview->jitsi_room ?? '',
            'status'            => $interview->status,
            'interviewer_score' => (float)($interview->interviewer_score ?? 0),
            'interviewer_notes' => $interview->interviewer_notes ?? '',
            'ai_score'          => (float)($interview->ai_score ?? 0),
            'ai_evaluation'     => $interview->ai_evaluation ?? '',
            'transcript'        => $interview->transcript ?? '',
            'malpractice'       => (int)$application->malpractice,
            'questions'         => $questions,
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'id'                => new external_value(PARAM_INT, 'Interview ID'),
            'job_title'         => new external_value(PARAM_TEXT, 'Job title'),
            'candidate_name'    => new external_value(PARAM_TEXT, 'Candidate name'),
            'candidate_email'   => new external_value(PARAM_TEXT, 'Candidate email'),
            'interviewer_name'  => new external_value(PARAM_TEXT, 'Interviewer name'),
            'scheduled_at'      => new external_value(PARAM_INT, 'Scheduled timestamp'),
            'duration_mins'     => new external_value(PARAM_INT, 'Duration'),
            'jitsi_room'        => new external_value(PARAM_TEXT, 'Jitsi room'),
            'status'            => new external_value(PARAM_TEXT, 'Status'),
            'interviewer_score' => new external_value(PARAM_FLOAT, 'Interviewer score'),
            'interviewer_notes' => new external_value(PARAM_RAW, 'Interviewer notes'),
            'ai_score'          => new external_value(PARAM_FLOAT, 'AI score'),
            'ai_evaluation'     => new external_value(PARAM_RAW, 'AI evaluation JSON'),
            'transcript'        => new external_value(PARAM_RAW, 'Interview transcript'),
            'malpractice'       => new external_value(PARAM_INT, 'Malpractice status'),
            'questions'         => new external_multiple_structure(
                new external_single_structure([
                    'id'       => new external_value(PARAM_INT, 'Question ID'),
                    'question' => new external_value(PARAM_TEXT, 'Question text'),
                    'category' => new external_value(PARAM_TEXT, 'Category'),
                    'answer'   => new external_value(PARAM_TEXT, 'Answer notes'),
                    'score'    => new external_value(PARAM_FLOAT, 'Question score'),
                ])
            ),
        ]);
    }
}
