<?php
namespace local_aurahr_academia\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Create an academia round assessment configuration for a job.
 */
class create_assessment extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'jobid'          => new external_value(PARAM_INT, 'Job ID'),
            'title'          => new external_value(PARAM_TEXT, 'Assessment title'),
            'num_questions'  => new external_value(PARAM_INT, 'Number of questions', VALUE_DEFAULT, 20),
            'duration_mins'  => new external_value(PARAM_INT, 'Duration in minutes', VALUE_DEFAULT, 60),
            'pass_percentage' => new external_value(PARAM_FLOAT, 'Pass percentage', VALUE_DEFAULT, 60.0),
            'ai_topic'       => new external_value(PARAM_RAW, 'Topic/skills for AI question generation', VALUE_DEFAULT, ''),
            'questions_json' => new external_value(PARAM_RAW, 'JSON array of questions to inject', VALUE_DEFAULT, ''),
        ]);
    }

    public static function execute(
        int $jobid, string $title, int $num_questions,
        int $duration_mins, float $pass_percentage, string $ai_topic, string $questions_json = ''
    ): array {
        global $DB;

        $params = self::validate_parameters(self::execute_parameters(), [
            'jobid' => $jobid, 'title' => $title, 'num_questions' => $num_questions,
            'duration_mins' => $duration_mins, 'pass_percentage' => $pass_percentage,
            'ai_topic' => $ai_topic, 'questions_json' => $questions_json,
        ]);

        $context = \context_system::instance();
        require_capability('local/aurahr_academia:manage', $context);

        // Verify job exists.
        $DB->get_record('local_aurahr_jobs', ['id' => $params['jobid']], 'id', MUST_EXIST);

        $now = time();

        // Delete any pre-existing DRAFT assessments for this job to avoid orphaned shadows.
        // Completed/active/scheduled assessments are kept untouched so historical scores are preserved.
        $DB->delete_records_select(
            'local_aurahr_assessments',
            "jobid = :jobid AND status = 'draft'",
            ['jobid' => $params['jobid']]
        );

        $record = (object)[
            'jobid'          => $params['jobid'],
            'title'          => $params['title'],
            'num_questions'  => $params['num_questions'],
            'duration_mins'  => $params['duration_mins'],
            'pass_percentage' => $params['pass_percentage'],
            'status'         => 'draft',
            'ai_topic'       => $params['ai_topic'],
            'questions'      => $params['questions_json'],
            'timecreated'    => $now,
            'timemodified'   => $now,
        ];

        $record->id = $DB->insert_record('local_aurahr_assessments', $record);

        return [
            'id'      => (int)$record->id,
            'jobid'   => (int)$record->jobid,
            'title'   => $record->title,
            'status'  => $record->status,
            'success' => true,
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'id'      => new external_value(PARAM_INT, 'Assessment ID'),
            'jobid'   => new external_value(PARAM_INT, 'Job ID'),
            'title'   => new external_value(PARAM_TEXT, 'Title'),
            'status'  => new external_value(PARAM_TEXT, 'Status'),
            'success' => new external_value(PARAM_BOOL, 'Success'),
        ]);
    }
}
