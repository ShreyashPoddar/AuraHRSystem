<?php
namespace local_aurahr_academia\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;
use local_aurahr_jdparser\ai_client;

/**
 * Generate quiz questions using AI based on the JD analysis or custom topic.
 * Creates a Moodle course + quiz and imports the generated questions.
 */
class generate_questions extends external_api {

    const SYSTEM_PROMPT = <<<'PROMPT'
You are an expert technical assessment creator. Generate multiple-choice questions for a job candidate assessment.

Return a JSON object with:
{
  "questions": [
    {
      "text": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Why this answer is correct",
      "difficulty": "easy|medium|hard"
    }
  ]
}

Rules:
- Generate exactly the requested number of questions
- Mix difficulty: 30% easy, 50% medium, 20% hard
- Each question must have exactly 4 options
- "correct" is the 0-based index of the correct option
- Questions should test practical knowledge, not just definitions
- Cover the full range of topics provided
PROMPT;

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'assessmentid' => new external_value(PARAM_INT, 'Assessment ID'),
        ]);
    }

    public static function execute(int $assessmentid): array {
        global $DB, $CFG;

        $params = self::validate_parameters(self::execute_parameters(), ['assessmentid' => $assessmentid]);

        $context = \context_system::instance();
        require_capability('local/aurahr_academia:manage', $context);

        $assessment = $DB->get_record('local_aurahr_assessments', ['id' => $params['assessmentid']], '*', MUST_EXIST);
        $job = $DB->get_record('local_aurahr_jobs', ['id' => $assessment->jobid], '*', MUST_EXIST);

        // Determine topic — use AI topic or fall back to JD analysis.
        $topic = $assessment->ai_topic;
        if (empty($topic)) {
            $jd = $DB->get_record('local_aurahr_jd_analysis', ['jobid' => $job->id]);
            if ($jd) {
                $skills = array_merge(
                    json_decode($jd->must_have, true) ?: [],
                    json_decode($jd->good_to_have, true) ?: []
                );
                $topic = "Skills to test: " . implode(', ', $skills);
            } else {
                $topic = "Job: {$job->title}. Description: " . substr($job->description, 0, 500);
            }
        }

        // Generate questions via AI in chunks of 5 to avoid token limits
        $client = new ai_client();
        $questions = [];
        $total_needed = (int)$assessment->num_questions;
        $chunk_size = 5;

        while ($total_needed > 0) {
            $to_generate = min($chunk_size, $total_needed);
            $data = $client->chat_json(
                self::SYSTEM_PROMPT,
                "Generate exactly {$to_generate} questions for:\n\n{$topic}",
                0.5
            );
            $chunk_questions = $data['questions'] ?? [];
            if (!empty($chunk_questions)) {
                $questions = array_merge($questions, $chunk_questions);
                $total_needed -= count($chunk_questions);
            } else {
                // If it fails to return any questions, break to avoid infinite loop
                break;
            }
        }

        // Create a Moodle course for this assessment if not exists.
        if (empty($assessment->courseid)) {
            require_once($CFG->dirroot . '/course/lib.php');
            $coursedata = (object)[
                'fullname'  => "AuraHR Assessment: {$job->title}",
                'shortname' => 'aurahr_assess_' . $assessment->id . '_' . time(),
                'category'  => 1, // Default category.
                'visible'   => 0, // Hidden from course listing.
            ];
            $course = create_course($coursedata);
            $assessment->courseid = $course->id;
        }

        // Store the generated questions as JSON in the assessment record.
        $assessment->questions = json_encode($questions, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $assessment->quizid = 0; // Will be set when quiz is created in Moodle.
        $assessment->timemodified = time();
        $DB->update_record('local_aurahr_assessments', $assessment);

        return [
            'success'          => true,
            'questions_count'  => count($questions),
            'assessmentid'     => (int)$assessment->id,
            'courseid'         => (int)$assessment->courseid,
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'success'         => new external_value(PARAM_BOOL, 'Success'),
            'questions_count' => new external_value(PARAM_INT, 'Number of questions generated'),
            'assessmentid'    => new external_value(PARAM_INT, 'Assessment ID'),
            'courseid'        => new external_value(PARAM_INT, 'Moodle course ID'),
        ]);
    }
}
