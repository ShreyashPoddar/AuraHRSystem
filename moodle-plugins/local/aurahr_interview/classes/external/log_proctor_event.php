<?php
namespace local_aurahr_interview\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Log a proctoring event (tab switch, no face, multiple faces, etc.).
 */
class log_proctor_event extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'sessiontype' => new external_value(PARAM_TEXT, 'academia or interview'),
            'sessionid'   => new external_value(PARAM_INT, 'Assessment enrollment ID or interview ID'),
            'event_type'  => new external_value(PARAM_TEXT, 'Event type: tab_switch, face_away, multiple_faces, no_face, audio_anomaly, copy_paste, screen_share_off'),
            'severity'    => new external_value(PARAM_TEXT, 'info, warning, or critical', VALUE_DEFAULT, 'warning'),
            'details'     => new external_value(PARAM_RAW, 'Additional details', VALUE_DEFAULT, ''),
        ]);
    }

    public static function execute(string $sessiontype, int $sessionid, string $event_type, string $severity, string $details): array {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), [
            'sessiontype' => $sessiontype, 'sessionid' => $sessionid,
            'event_type' => $event_type, 'severity' => $severity, 'details' => $details,
        ]);

        // Validate session type.
        $validtypes = ['academia', 'interview'];
        if (!in_array($params['sessiontype'], $validtypes)) {
            throw new \invalid_parameter_exception('Invalid session type');
        }

        // Validate severity.
        $validseverity = ['info', 'warning', 'critical'];
        if (!in_array($params['severity'], $validseverity)) {
            $params['severity'] = 'warning';
        }

        $record = (object)[
            'userid'      => $USER->id,
            'sessiontype' => $params['sessiontype'],
            'sessionid'   => $params['sessionid'],
            'event_type'  => $params['event_type'],
            'severity'    => $params['severity'],
            'details'     => $params['details'],
            'timecreated' => time(),
        ];

        $record->id = $DB->insert_record('local_aurahr_proctor_events', $record);

        // If critical event, flag malpractice on the application.
        if ($params['severity'] === 'critical') {
            $critical_count = $DB->count_records('local_aurahr_proctor_events', [
                'sessiontype' => $params['sessiontype'],
                'sessionid'   => $params['sessionid'],
                'severity'    => 'critical'
            ]);

            if ($critical_count >= 5) {
                if ($params['sessiontype'] === 'interview') {
                    // Do not automatically disqualify/reject candidate during interview round
                } elseif ($params['sessiontype'] === 'academia') {
                    $enrol = $DB->get_record('local_aurahr_assess_enrol', ['id' => $params['sessionid']]);
                    if ($enrol) {
                        $app = $DB->get_record('local_aurahr_applications', ['id' => $enrol->applicationid]);
                        if ($app) {
                            $app->malpractice = 1;
                            $app->stage = 'Rejected';
                            $app->timemodified = time();
                            $DB->update_record('local_aurahr_applications', $app);
                        }
                    }
                }
            }
        }

        return ['id' => (int)$record->id, 'logged' => true];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'id'     => new external_value(PARAM_INT, 'Event ID'),
            'logged' => new external_value(PARAM_BOOL, 'Event logged'),
        ]);
    }
}
