<?php
namespace local_aurahr_jdparser\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;
use local_aurahr_jdparser\ai_client;

/**
 * Parse a job description using AI and produce the 4-box skill analysis:
 *   1. Must-Have skills
 *   2. Good-to-Have skills
 *   3. Future-Proof skills
 *   4. Team Gap skills
 *
 * Results are stored in the local_aurahr_jd_analysis table.
 */
class parse_jd extends external_api {

    /** System prompt for the AI. */
    const SYSTEM_PROMPT = <<<'PROMPT'
You are an expert HR technology analyst. Given a job description, analyze it and extract skills into exactly 4 categories. Return a JSON object with these keys:

1. "must_have": Array of strings — non-negotiable technical/hard skills explicitly required. These are deal-breakers.
2. "good_to_have": Array of strings — preferred skills that strengthen a candidate but aren't mandatory.
3. "future_proof": Array of strings — emerging skills that would future-proof the hire (AI/ML, cloud-native, etc.).
4. "team_gap": Array of strings — complementary skills that could fill typical team gaps (leadership, DevOps, design thinking, etc.).

Also include:
5. "summary": A 2-3 sentence summary of the ideal candidate.
6. "seniority_level": One of "junior", "mid", "senior", "lead", "principal".
7. "recommended_pass_count": Integer (10-50) — recommended number of candidates to shortlist based on the role's complexity and market availability.

Rules:
- Each skill should be a concise 2-5 word phrase.
- Include 5-10 skills per category.
- Be specific (e.g., "React.js" not just "frontend framework").
- Consider the domain and industry context.
PROMPT;

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'jobid'       => new external_value(PARAM_INT, 'Job ID to analyze'),
            'pass_count'  => new external_value(PARAM_INT, 'Override pass count (0 = use AI recommendation)', VALUE_DEFAULT, 0),
        ]);
    }

    public static function execute(int $jobid, int $pass_count): array {
        global $DB;

        $params = self::validate_parameters(self::execute_parameters(), [
            'jobid' => $jobid, 'pass_count' => $pass_count,
        ]);

        $context = \context_system::instance();
        require_capability('local/aurahr_jdparser:parse', $context);

        // Fetch job description.
        $job = $DB->get_record('local_aurahr_jobs', ['id' => $params['jobid']], '*', MUST_EXIST);

        // Call AI.
        $client = new ai_client();
        $analysis = $client->chat_json(
            self::SYSTEM_PROMPT,
            "Job Title: {$job->title}\nDepartment: {$job->department}\n\nJob Description:\n{$job->description}"
        );

        // Determine pass count.
        $finalpasscount = $params['pass_count'] > 0
            ? $params['pass_count']
            : ($analysis['recommended_pass_count'] ?? 10);

        // Store/update in database.
        $existing = $DB->get_record('local_aurahr_jd_analysis', ['jobid' => $params['jobid']]);
        $record = (object)[
            'jobid'        => $params['jobid'],
            'must_have'    => json_encode($analysis['must_have'] ?? []),
            'good_to_have' => json_encode($analysis['good_to_have'] ?? []),
            'future_proof' => json_encode($analysis['future_proof'] ?? []),
            'team_gap'     => json_encode($analysis['team_gap'] ?? []),
            'pass_count'   => $finalpasscount,
            'timecreated'  => time(),
        ];

        if ($existing) {
            $record->id = $existing->id;
            $DB->update_record('local_aurahr_jd_analysis', $record);
        } else {
            $record->id = $DB->insert_record('local_aurahr_jd_analysis', $record);
        }

        return [
            'id'          => (int)$record->id,
            'jobid'       => (int)$params['jobid'],
            'must_have'   => json_encode($analysis['must_have'] ?? []),
            'good_to_have' => json_encode($analysis['good_to_have'] ?? []),
            'future_proof' => json_encode($analysis['future_proof'] ?? []),
            'team_gap'    => json_encode($analysis['team_gap'] ?? []),
            'pass_count'  => $finalpasscount,
            'summary'     => $analysis['summary'] ?? '',
            'seniority'   => $analysis['seniority_level'] ?? 'mid',
            'success'     => true,
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'id'          => new external_value(PARAM_INT, 'Analysis ID'),
            'jobid'       => new external_value(PARAM_INT, 'Job ID'),
            'must_have'   => new external_value(PARAM_RAW, 'JSON array of must-have skills'),
            'good_to_have' => new external_value(PARAM_RAW, 'JSON array of good-to-have skills'),
            'future_proof' => new external_value(PARAM_RAW, 'JSON array of future-proof skills'),
            'team_gap'    => new external_value(PARAM_RAW, 'JSON array of team-gap skills'),
            'pass_count'  => new external_value(PARAM_INT, 'Pass count'),
            'summary'     => new external_value(PARAM_RAW, 'AI summary of ideal candidate'),
            'seniority'   => new external_value(PARAM_TEXT, 'Seniority level'),
            'success'     => new external_value(PARAM_BOOL, 'Success flag'),
        ]);
    }
}
