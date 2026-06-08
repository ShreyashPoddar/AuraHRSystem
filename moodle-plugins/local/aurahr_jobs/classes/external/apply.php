<?php
namespace local_aurahr_jobs\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Apply to a job posting as the current (candidate) user.
 * Checks for duplicate applications and max-limit enforcement.
 */
class apply extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'jobid' => new external_value(PARAM_INT, 'Job posting ID to apply for'),
        ]);
    }

    public static function execute(int $jobid): array {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), ['jobid' => $jobid]);

        $context = \context_system::instance();
        require_capability('local/aurahr_jobs:apply', $context);

        // Verify job exists and is active.
        $job = $DB->get_record('local_aurahr_jobs', ['id' => $params['jobid']], '*', MUST_EXIST);
        if ($job->status !== 'active') {
            throw new \moodle_exception('jobnotactive', 'local_aurahr_jobs', '', null,
                'This job posting is no longer accepting applications.');
        }

        // Check deadline.
        if (!empty($job->deadline) && time() > $job->deadline) {
            throw new \moodle_exception('deadlinepassed', 'local_aurahr_jobs', '', null,
                'The application deadline has passed.');
        }

        // Check for duplicate application.
        if ($DB->record_exists('local_aurahr_applications', ['userid' => $USER->id, 'jobid' => $params['jobid']])) {
            throw new \moodle_exception('duplicateapplication', 'local_aurahr_jobs', '', null,
                get_string('duplicateapplication', 'local_aurahr_jobs'));
        }

        // Check max limit.
        $currentcount = $DB->count_records('local_aurahr_applications', ['jobid' => $params['jobid']]);
        if ($currentcount >= $job->maxlimit) {
            throw new \moodle_exception('maxlimitreached', 'local_aurahr_jobs', '', null,
                'Maximum number of applications has been reached for this posting.');
        }

        $now = time();

        // Retrieve the latest resume from the user's file area
        $fs = get_file_storage();
        $usercontext = \context_user::instance($USER->id);
        $files = $fs->get_area_files($usercontext->id, 'local_aurahr_jobs', 'resume', 0, 'timecreated DESC', false);
        $resume_skills = '';

        if (!empty($files)) {
            $latest_file = reset($files);
            $content = $latest_file->get_content();
            
            $temp_file = sys_get_temp_dir() . '/resume_apply_' . time() . '_' . rand(1000, 9999) . '.pdf';
            file_put_contents($temp_file, $content);

            $script_path = realpath(__DIR__ . '/../../scraper/parse_pdf.js');
            if ($script_path && file_exists($script_path)) {
                $node_bin = null;
                $where_out = @shell_exec('where.exe node 2>&1');
                if (!empty($where_out) && strpos($where_out, 'Could not find') === false && strpos($where_out, 'is not recognized') === false) {
                    $lines = explode("\n", trim($where_out));
                    $found_path = trim($lines[0]);
                    if (!empty($found_path)) {
                        $node_bin = '"' . $found_path . '"';
                    }
                }
                if (empty($node_bin)) {
                    foreach (['C:\\Program Files\\nodejs\\node.exe', 'C:\\Program Files (x86)\\nodejs\\node.exe'] as $bin) {
                        if (@file_exists($bin)) {
                            $node_bin = '"' . $bin . '"';
                            break;
                        }
                    }
                }
                if (empty($node_bin)) {
                    $node_bin = 'node';
                }
                $cmd = $node_bin . ' ' . escapeshellarg($script_path) . ' ' . escapeshellarg($temp_file);
                $extracted_text = shell_exec($cmd);
                if (!empty($extracted_text)) {
                    $resume_skills = trim($extracted_text);
                }
            }
            if (file_exists($temp_file)) {
                unlink($temp_file);
            }
        }

        // Fetch candidate's social profile URLs from user preferences.
        $chunks_count = $DB->get_field('user_preferences', 'value', [
            'userid' => $USER->id,
            'name'   => 'aurahr_candidate_settings_chunks'
        ]);

        $prefs = [];
        if ($chunks_count) {
            $full_json = '';
            for ($i = 0; $i < (int)$chunks_count; $i++) {
                $full_json .= $DB->get_field('user_preferences', 'value', [
                    'userid' => $USER->id,
                    'name'   => 'aurahr_candidate_settings_' . $i
                ]);
            }
            $prefs = json_decode($full_json, true) ?: [];
        } else {
            $user_prefs_json = $DB->get_field('user_preferences', 'value', [
                'userid' => $USER->id,
                'name'   => 'aurahr_candidate_settings'
            ]);
            $prefs = $user_prefs_json ? (json_decode($user_prefs_json, true) ?: []) : [];
        }
        $github_url   = $prefs['github'] ?? '';
        $linkedin_url = $prefs['linkedin'] ?? '';
        $leetcode_url = $prefs['leetcode'] ?? '';

        // Extract candidate social URLs from resume text if empty.
        if (!empty($resume_skills)) {
            if (empty($github_url)) {
                if (preg_match('/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i', $resume_skills, $matches)) {
                    $github_url = 'https://github.com/' . $matches[1];
                }
            }
            if (empty($leetcode_url)) {
                if (preg_match('/(?:https?:\/\/)?(?:www\.)?leetcode\.com\/(?:u\/)?([a-zA-Z0-9_-]+)/i', $resume_skills, $matches)) {
                    $leetcode_url = 'https://leetcode.com/' . $matches[1];
                }
            }
            if (empty($linkedin_url)) {
                if (preg_match('/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i', $resume_skills, $matches)) {
                    $linkedin_url = 'https://www.linkedin.com/in/' . $matches[1];
                }
            }
        }

        $application = (object)[
            'userid'       => $USER->id,
            'jobid'        => $params['jobid'],
            'stage'        => 'applied',
            'resume_skills'=> $resume_skills,
            'github_url'   => $github_url,
            'linkedin_url' => $linkedin_url,
            'leetcode_url' => $leetcode_url,
            'malpractice'  => 0,
            'jd_score'     => 0.00,
            'timecreated'  => $now,
            'timemodified' => $now,
        ];

        $application->id = $DB->insert_record('local_aurahr_applications', $application);

        // Automatically trigger AI Socials Analysis synchronously.
        try {
            require_once(__DIR__ . '/analyze_socials.php');
            \local_aurahr_jobs\external\analyze_socials::execute($application->id);
        } catch (\Exception $e) {
            debugging('Failed to automatically analyze socials for application ' . $application->id . ': ' . $e->getMessage(), DEBUG_DEVELOPER);
        }

        // Automatically trigger JD Scoring synchronously.
        try {
            require_once(__DIR__ . '/../../../aurahr_jdparser/classes/external/match_candidates.php');
            \local_aurahr_jdparser\external\match_candidates::execute_for_application($application->id);
        } catch (\Exception $e) {
            debugging('Failed to automatically score JD for application ' . $application->id . ': ' . $e->getMessage(), DEBUG_DEVELOPER);
        }

        return [
            'id'          => (int)$application->id,
            'userid'      => (int)$application->userid,
            'jobid'       => (int)$application->jobid,
            'stage'       => $application->stage,
            'timecreated' => (int)$application->timecreated,
            'success'     => true,
            'message'     => get_string('applicationsubmitted', 'local_aurahr_jobs'),
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'id'          => new external_value(PARAM_INT, 'Application ID'),
            'userid'      => new external_value(PARAM_INT, 'Candidate user ID'),
            'jobid'       => new external_value(PARAM_INT, 'Job ID'),
            'stage'       => new external_value(PARAM_TEXT, 'Pipeline stage'),
            'timecreated' => new external_value(PARAM_INT, 'Created timestamp'),
            'success'     => new external_value(PARAM_BOOL, 'Success flag'),
            'message'     => new external_value(PARAM_TEXT, 'Result message'),
        ]);
    }
}
