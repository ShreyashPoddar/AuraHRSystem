<?php
namespace local_aurahr_jdparser\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_multiple_structure;
use core_external\external_value;
use local_aurahr_jdparser\ai_client;

/**
 * Score and rank candidates against JD requirements.
 * Uses the JD analysis to evaluate each candidate's resume/profile
 * and update their jd_score in the applications table.
 */
class match_candidates extends external_api {

    const SYSTEM_PROMPT = <<<'PROMPT'
You are an expert recruiter evaluating candidates against a job description.

Given:
- A list of required skills categorized as must_have, good_to_have, future_proof, and team_gap
- A candidate's profile (name, bio/description, resume text)

Score the candidate from 0 to 100 based on:
- Must-have skills match: 50% weight
- Good-to-have match: 20% weight
- Future-proof alignment: 15% weight
- Team-gap coverage: 15% weight

Return a JSON object with:
{
  "score": <number 0-100>,
  "matched_skills": ["skill1", "skill2", ...],
  "missing_skills": ["skill1", "skill2", ...],
  "summary": "1-2 sentence assessment"
}
PROMPT;

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'jobid' => new external_value(PARAM_INT, 'Job ID to match candidates for'),
        ]);
    }

    public static function execute(int $jobid): array {
        $params = self::validate_parameters(self::execute_parameters(), ['jobid' => $jobid]);

        $context = \context_system::instance();
        require_capability('local/aurahr_jdparser:match', $context);

        return self::match_all($params['jobid']);
    }

    public static function match_all(int $jobid): array {
        global $DB, $CFG;

        // Get JD analysis.
        $jd = $DB->get_record('local_aurahr_jd_analysis', ['jobid' => $jobid]);
        if (!$jd) {
            throw new \moodle_exception('noanalysis', 'local_aurahr_jdparser', '', null,
                'No JD analysis exists for this job. Run parse_jd first.');
        }

        // Get all applications for this job that haven't been scored yet (or rescore all).
        $applications = $DB->get_records('local_aurahr_applications', ['jobid' => $jobid]);

        // Allow long execution time and prevent abort on client disconnect.
        \core_php_time_limit::raise(300);
        ignore_user_abort(true);

        if (empty($applications)) {
            return ['matched' => 0, 'results' => []];
        }

        $client = new ai_client();
        $results = [];
        $skills_context = json_encode([
            'must_have'    => json_decode($jd->must_have, true),
            'good_to_have' => json_decode($jd->good_to_have, true),
            'future_proof' => json_decode($jd->future_proof, true),
            'team_gap'     => json_decode($jd->team_gap, true),
        ]);

        foreach ($applications as $app) {
            // Get user profile.
            $user = $DB->get_record('user', ['id' => $app->userid], 'id, firstname, lastname, email, description');
            if (!$user) continue;

            // Trigger socials analysis first.
            try {
                require_once($CFG->dirroot . '/local/aurahr_jobs/classes/external/analyze_socials.php');
                \local_aurahr_jobs\external\analyze_socials::execute($app->id);
                // Re-fetch application to get the updated social URLs and scores
                $app = $DB->get_record('local_aurahr_applications', ['id' => $app->id]);
            } catch (\Exception $e) {
                debugging("Failed to analyze socials for candidate application {$app->id}: " . $e->getMessage(), DEBUG_DEVELOPER);
            }

            $candidate_info = "Name: {$user->firstname} {$user->lastname}\n"
                            . "Email: {$user->email}\n"
                            . "Bio: " . ($user->description ?: 'No bio provided') . "\n"
                            . "Resume Skills/Details: " . ($app->resume_skills ?: 'None provided');

            try {
                $response = $client->chat(
                    self::SYSTEM_PROMPT,
                    "Required Skills:\n{$skills_context}\n\nCandidate:\n{$candidate_info}"
                );
                $result = $client->parse_json_response($response);

                // Update application record.
                $app->jd_score     = (float)($result['score'] ?? 0);
                $app->ai_summary   = $result['summary'] ?? '';
                $app->timemodified = time();

                // Recalculate overall score (weighted average of available scores).
                // Recalculate overall score.
                $app->overall_score = \local_aurahr_jobs\util::calculate_overall_score($app);

                $DB->update_record('local_aurahr_applications', $app);

                $results[] = [
                    'applicationid' => (int)$app->id,
                    'userid'        => (int)$app->userid,
                    'name'          => "{$user->firstname} {$user->lastname}",
                    'score'         => (float)$app->jd_score,
                    'summary'       => $result['summary'] ?? '',
                ];
            } catch (\Exception $e) {
                // Log but don't fail the entire batch.
                debugging("Failed to match candidate {$user->email}: " . $e->getMessage(), DEBUG_DEVELOPER);
            }
        }

        // Sort results by score descending.
        usort($results, fn($a, $b) => $b['score'] <=> $a['score']);

        return [
            'matched' => count($results),
            'results' => $results,
        ];
    }

    public static function execute_for_application(int $appid): bool {
        global $DB, $CFG;

        $app = $DB->get_record('local_aurahr_applications', ['id' => $appid]);
        if (!$app) return false;

        // Trigger socials analysis.
        try {
            require_once($CFG->dirroot . '/local/aurahr_jobs/classes/external/analyze_socials.php');
            \local_aurahr_jobs\external\analyze_socials::execute($app->id);
            // Re-fetch application to get the updated social URLs and scores
            $app = $DB->get_record('local_aurahr_applications', ['id' => $app->id]);
        } catch (\Exception $e) {
            debugging("Failed to analyze socials for application {$app->id}: " . $e->getMessage(), DEBUG_DEVELOPER);
        }

        $jd = $DB->get_record('local_aurahr_jd_analysis', ['jobid' => $app->jobid]);
        if (!$jd) return false;

        $user = $DB->get_record('user', ['id' => $app->userid], 'id, firstname, lastname, email, description');
        if (!$user) return false;

        $client = new ai_client();
        $skills_context = json_encode([
            'must_have'    => json_decode($jd->must_have, true),
            'good_to_have' => json_decode($jd->good_to_have, true),
            'future_proof' => json_decode($jd->future_proof, true),
            'team_gap'     => json_decode($jd->team_gap, true),
        ]);

        $candidate_info = "Name: {$user->firstname} {$user->lastname}\n"
                        . "Email: {$user->email}\n"
                        . "Bio: " . ($user->description ?: 'No bio provided') . "\n"
                        . "Resume Skills/Details: " . ($app->resume_skills ?: 'None provided');

        try {
            $response = $client->chat(
                self::SYSTEM_PROMPT,
                "Required Skills:\n{$skills_context}\n\nCandidate:\n{$candidate_info}"
            );
            $result = $client->parse_json_response($response);

            $app->jd_score     = (float)($result['score'] ?? 0);
            
            // Append JD parser summary to existing AI summary
            $jd_summary = $result['summary'] ?? '';
            if (!empty($jd_summary)) {
                $app->ai_summary = "JD PARSER ANALYSIS:\n" . $jd_summary . "\n\nSOCIALS ANALYSIS:\n" . ($app->ai_summary ?? 'Not analyzed yet.');
            }
            
            $app->timemodified = time();

            // Recalculate overall score.
            $app->overall_score = \local_aurahr_jobs\util::calculate_overall_score($app);

            $DB->update_record('local_aurahr_applications', $app);
            return true;
        } catch (\Exception $e) {
            debugging("Failed to match candidate {$user->email}: " . $e->getMessage(), DEBUG_DEVELOPER);
            return false;
        }
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'matched' => new external_value(PARAM_INT, 'Number of candidates matched'),
            'results' => new external_multiple_structure(
                new external_single_structure([
                    'applicationid' => new external_value(PARAM_INT, 'Application ID'),
                    'userid'        => new external_value(PARAM_INT, 'User ID'),
                    'name'          => new external_value(PARAM_TEXT, 'Candidate name'),
                    'score'         => new external_value(PARAM_FLOAT, 'JD match score'),
                    'summary'       => new external_value(PARAM_RAW, 'AI assessment summary'),
                ])
            ),
        ]);
    }
}
