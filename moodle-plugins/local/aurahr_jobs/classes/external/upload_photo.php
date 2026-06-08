<?php
namespace local_aurahr_jobs\external;

defined('MOODLE_INTERNAL') || die();

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

class upload_photo extends external_api {

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
            'filearea'  => 'profile_photo',
            'itemid'    => 0,
            'filepath'  => '/',
            'filename'  => 'photo.jpg' // we can just fix the name or use provided
        );

        // Delete existing photo if it exists
        $existingfiles = $fs->get_area_files($context->id, 'local_aurahr_jobs', 'profile_photo', 0, 'id', false);
        foreach ($existingfiles as $file) {
            $file->delete();
        }

        // Remove base64 prefix if exists (e.g., data:image/jpeg;base64,)
        $data = $params['base64data'];
        if (strpos($data, ',') !== false) {
            $data = explode(',', $data)[1];
        }

        $fs->create_file_from_string($filerecord, base64_decode($data));

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
