<?php
namespace local_aurahr_jobs\external;

defined('MOODLE_INTERNAL') || die();

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

class upload_resume extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'filename' => new external_value(PARAM_FILE, 'The filename'),
            'base64data' => new external_value(PARAM_RAW, 'Base64 encoded file data')
        ]);
    }

    public static function execute(string $filename, string $base64data): array {
        global $USER, $DB;
        $context = \context_user::instance($USER->id);
        self::validate_context($context);
        
        $params = self::validate_parameters(self::execute_parameters(), [
            'filename' => $filename,
            'base64data' => $base64data
        ]);

        $fs = get_file_storage();
        
        $filerecord = array(
            'contextid' => $context->id,
            'component' => 'local_aurahr_jobs',
            'filearea'  => 'resume',
            'itemid'    => 0,
            'filepath'  => '/',
            'filename'  => $params['filename']
        );

        // Delete existing resume if it exists
        $existingfiles = $fs->get_area_files($context->id, 'local_aurahr_jobs', 'resume', 0, 'id', false);
        foreach ($existingfiles as $file) {
            $file->delete();
        }

        // Remove base64 prefix if exists (e.g., data:application/pdf;base64,)
        $data = $params['base64data'];
        if (strpos($data, ',') !== false) {
            $data = explode(',', $data)[1];
        }
        $decoded_pdf = base64_decode($data);

        $fs->create_file_from_string($filerecord, $decoded_pdf);

        // --- NEW: Parse PDF and update resume_skills ---
        $temp_file = sys_get_temp_dir() . '/resume_' . time() . '_' . rand(1000, 9999) . '.pdf';
        file_put_contents($temp_file, $decoded_pdf);

        $script_path = realpath(__DIR__ . '/../../scraper/parse_pdf.js');
        $extracted_text = '';
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
        }

        // Clean up temp file
        if (file_exists($temp_file)) {
            unlink($temp_file);
        }

        // Save to database
        if (!empty($extracted_text)) {
            $parsed_text = trim($extracted_text);
            
            // Find the most recent application for this user (since resume upload usually happens during/after apply)
            // Or just update all applications for this user
            $applications = $DB->get_records('local_aurahr_applications', ['userid' => $USER->id]);
            foreach ($applications as $app) {
                $app->resume_skills = $parsed_text;
                
                // Extract candidate social URLs from resume text if empty.
                $updated_urls = false;
                if (empty($app->github_url)) {
                    if (preg_match('/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i', $parsed_text, $matches)) {
                        $app->github_url = 'https://github.com/' . $matches[1];
                        $updated_urls = true;
                    }
                }
                if (empty($app->leetcode_url)) {
                    if (preg_match('/(?:https?:\/\/)?(?:www\.)?leetcode\.com\/(?:u\/)?([a-zA-Z0-9_-]+)/i', $parsed_text, $matches)) {
                        $app->leetcode_url = 'https://leetcode.com/' . $matches[1];
                        $updated_urls = true;
                    }
                }
                if (empty($app->linkedin_url)) {
                    if (preg_match('/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i', $parsed_text, $matches)) {
                        $app->linkedin_url = 'https://www.linkedin.com/in/' . $matches[1];
                        $updated_urls = true;
                    }
                }

                $DB->update_record('local_aurahr_applications', $app);
                
                // Trigger AI Socials Analysis if we extracted new URLs.
                if ($updated_urls) {
                    try {
                        require_once(__DIR__ . '/analyze_socials.php');
                        \local_aurahr_jobs\external\analyze_socials::execute($app->id);
                    } catch (\Exception $e) {
                        debugging('Failed to automatically analyze socials after resume upload for application ' . $app->id . ': ' . $e->getMessage(), DEBUG_DEVELOPER);
                    }
                }
                
                // Retrigger JD parser to update the score!
                try {
                    require_once(__DIR__ . '/../../../aurahr_jdparser/classes/external/match_candidates.php');
                    \local_aurahr_jdparser\external\match_candidates::execute_for_application($app->id);
                } catch (\Exception $e) {
                    debugging('Failed to automatically score JD after resume upload for app ' . $app->id . ': ' . $e->getMessage(), DEBUG_DEVELOPER);
                }
            }
        }
        // -----------------------------------------------

        return [
            'status' => 'success'
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'status' => new external_value(PARAM_TEXT, 'Status')
        ]);
    }
}
