<?php
namespace local_aurahr_jobs\external;

defined('MOODLE_INTERNAL') || die();

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

class get_photo extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    public static function execute(): array {
        global $USER, $DB;
        $context = \context_user::instance($USER->id);
        self::validate_context($context);

        $fs = get_file_storage();
        
        $files = $fs->get_area_files($context->id, 'local_aurahr_jobs', 'profile_photo', 0, 'id DESC', false);
        
        if (empty($files)) {
            return [
                'status' => 'not_found',
                'base64data' => ''
            ];
        }

        $file = reset($files);
        $content = $file->get_content();

        // Detect mime type or just default to jpeg
        $mime = $file->get_mimetype();
        $base64 = 'data:' . $mime . ';base64,' . base64_encode($content);

        return [
            'status' => 'success',
            'base64data' => $base64
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'status' => new external_value(PARAM_TEXT, 'Status'),
            'base64data' => new external_value(PARAM_RAW, 'Base64 encoded file data')
        ]);
    }
}
