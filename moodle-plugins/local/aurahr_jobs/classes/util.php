<?php
namespace local_aurahr_jobs;

defined('MOODLE_INTERNAL') || die();

class util {

    /**
     * Calculates the dynamically weighted overall score for an application.
     * Weights:
     * JD Resume Score: 15%
     * Socials (GitHub + LeetCode): 15%
     * Assessment (Academia Round): 30%
     * Interview Panel: 40%
     * 
     * If a score is missing (e.g., Interview hasn't happened yet), its weight is redistributed 
     * proportionally among the available scores.
     * 
     * @param object $app The application record
     * @return float The overall score out of 100
     */
    public static function calculate_overall_score(object $app): float {
        $components = [
            'jd' => [
                'score' => !empty($app->jd_score) ? (float)$app->jd_score : null,
                'weight' => 0.15
            ],
            'socials' => [
                'score' => null,
                'weight' => 0.15
            ],
            'academia' => [
                'score' => !empty($app->academia_score) ? (float)$app->academia_score : null,
                'weight' => 0.30
            ],
            'interview' => [
                'score' => !empty($app->interview_score) ? (float)$app->interview_score : null,
                'weight' => 0.40
            ]
        ];

        // Calculate socials score (average of available social scores).
        // NOTE: Use !== null (not !empty) so that a real score of 0 is still counted.
        $social_scores = [];
        if ($app->github_score !== null && $app->github_score !== '') {
            $social_scores[] = (float)$app->github_score;
        }
        if ($app->leetcode_score !== null && $app->leetcode_score !== '') {
            $social_scores[] = (float)$app->leetcode_score;
        }
        
        if (count($social_scores) > 0) {
            $components['socials']['score'] = array_sum($social_scores) / count($social_scores);
        }

        $total_weight_available = 0.0;
        $weighted_sum = 0.0;

        foreach ($components as $key => $data) {
            if ($data['score'] !== null) {
                $total_weight_available += $data['weight'];
                $weighted_sum += ($data['score'] * $data['weight']);
            }
        }

        if ($total_weight_available > 0) {
            // Normalize out of 100 based on available weights
            return round($weighted_sum / $total_weight_available, 2);
        }

        return 0.0;
    }
}
