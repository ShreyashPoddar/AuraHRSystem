<?php
namespace local_aurahr_academia\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Finalize academia round assessment and pass the top N candidates to the interview stage.
 */
class finalize_assessment extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'jobid'      => new external_value(PARAM_INT, 'Job ID'),
            'pass_count' => new external_value(PARAM_INT, 'Number of candidates to pass to interview'),
        ]);
    }

    public static function execute(int $jobid, int $pass_count): array {
        global $DB;

        $params = self::validate_parameters(self::execute_parameters(), [
            'jobid'      => $jobid,
            'pass_count' => $pass_count,
        ]);

        $context = \context_system::instance();
        require_capability('local/aurahr_academia:manage', $context);

        // Smart selection: prefer active/scheduled assessments over draft ones.
        // This prevents finalizing an empty draft when a real completed assessment exists.
        $sql = "SELECT a.*, COUNT(e.id) as enrol_count
                FROM {local_aurahr_assessments} a
                LEFT JOIN {local_aurahr_assess_enrol} e ON e.assessmentid = a.id
                WHERE a.jobid = :jobid
                GROUP BY a.id
                ORDER BY
                    CASE a.status
                        WHEN 'active'    THEN 1
                        WHEN 'scheduled' THEN 2
                        WHEN 'completed' THEN 3
                        ELSE 4
                    END ASC,
                    COUNT(e.id) DESC,
                    a.id DESC";
        $assessments = $DB->get_records_sql($sql, ['jobid' => $params['jobid']], 0, 1);
        $assessment = $assessments ? reset($assessments) : null;
        if (!$assessment) {
            throw new \moodle_exception('assessmentnotfound', 'local_aurahr_academia');
        }

        // Update assessment status to completed.
        $assessment->status = 'completed';
        $assessment->timemodified = time();
        $DB->update_record('local_aurahr_assessments', $assessment);

        // Fetch all enrolled candidates for this assessment.
        $sql = "SELECT e.*, a.stage as app_stage
                FROM {local_aurahr_assess_enrol} e
                JOIN {local_aurahr_applications} a ON a.id = e.applicationid
                WHERE e.assessmentid = :assessmentid";
        $enrollments = $DB->get_records_sql($sql, ['assessmentid' => $assessment->id]);

<<<<<<< HEAD
        // Sort enrollments: higher scores first, candidates who never submitted last.
        usort($enrollments, function($a, $b) {
            $aHasScore = ($a->score !== null && $a->score !== '');
            $bHasScore = ($b->score !== null && $b->score !== '');
            // Push candidates with no score to the end
            if ($aHasScore !== $bHasScore) {
                return $aHasScore ? -1 : 1;
            }
            $scoreA = $aHasScore ? (float)$a->score : 0.0;
            $scoreB = $bHasScore ? (float)$b->score : 0.0;
=======
        // Sort enrollments: higher scores first, absent/null scores last.
        usort($enrollments, function($a, $b) {
            $scoreA = isset($a->score) ? (float)$a->score : 0.0;
            $scoreB = isset($b->score) ? (float)$b->score : 0.0;
>>>>>>> main
            if ($scoreA != $scoreB) {
                return $scoreB <=> $scoreA; // Descending
            }
            return $a->id <=> $b->id; // Tie-breaker: ascending ID
        });

        $passed_count = 0;
        $rejected_count = 0;
        $now = time();
        $index = 0;

        foreach ($enrollments as $e) {
            $app = $DB->get_record('local_aurahr_applications', ['id' => $e->applicationid]);
            if (!$app) {
                continue;
            }

            $enrol_update = clone $e;

<<<<<<< HEAD
            // Sync academia_score to the application table only if the candidate submitted.
            // Candidates who never submitted keep academia_score = NULL so the ranked table
            // shows '—' rather than a misleading 0. (Moodle's REST layer also strips 0.0
            // for VALUE_OPTIONAL PARAM_FLOAT fields, making it indistinguishable from no score.)
            if ($e->score !== null && $e->score !== '') {
                $app->academia_score = (float)$e->score;
            }
            // else: leave $app->academia_score as-is (NULL for non-submitters)
            $app->overall_score  = \local_aurahr_jobs\util::calculate_overall_score($app);

            if ($index < $params['pass_count']) {
                // Promote to interview if currently in assessment or legacy stages
                if (in_array($app->stage, ['academia', 'screened', 'Assessment Invited', 'Assessment In Progress', 'Assessment Completed'])) {
                    $app->stage = 'Assessment Cleared';
=======
            if ($index < $params['pass_count']) {
                // Promote to interview if currently in academia or screened
                if ($app->stage === 'academia' || $app->stage === 'screened') {
                    $app->stage = 'interview';
                    $app->timemodified = $now;
                    $DB->update_record('local_aurahr_applications', $app);
>>>>>>> main
                }
                $enrol_update->passed = 1;
                $enrol_update->status = 'completed';
                $DB->update_record('local_aurahr_assess_enrol', $enrol_update);
                $passed_count++;
            } else {
<<<<<<< HEAD
                // Reject if currently in assessment or legacy stages
                if (in_array($app->stage, ['academia', 'screened', 'Assessment Invited', 'Assessment In Progress', 'Assessment Completed'])) {
                    $app->stage = 'Rejected';
=======
                // Reject if currently in academia or screened
                if ($app->stage === 'academia' || $app->stage === 'screened') {
                    $app->stage = 'rejected';
                    $app->timemodified = $now;
                    $DB->update_record('local_aurahr_applications', $app);
>>>>>>> main
                }
                $enrol_update->passed = 0;
                $enrol_update->status = 'completed';
                $DB->update_record('local_aurahr_assess_enrol', $enrol_update);
                $rejected_count++;
            }
<<<<<<< HEAD

            // Persist all application changes (stage + score) in one update.
            $app->timemodified = $now;
            $DB->update_record('local_aurahr_applications', $app);
            $index++;
        }

        // Auto-schedule passed candidates immediately.
        if ($passed_count > 0) {
            try {
                \local_aurahr_scheduler\external\auto_schedule::execute($params['jobid']);
            } catch (\Exception $e) {
                // Ignore or log error to prevent finalization failing if auto schedule has configuration issues.
            }
        }

=======
            $index++;
        }

>>>>>>> main
        return [
            'success'        => true,
            'passed_count'   => $passed_count,
            'rejected_count' => $rejected_count,
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'success'        => new external_value(PARAM_BOOL, 'Success status'),
            'passed_count'   => new external_value(PARAM_INT, 'Number of candidates passed to interview'),
            'rejected_count' => new external_value(PARAM_INT, 'Number of candidates rejected'),
        ]);
    }
}
