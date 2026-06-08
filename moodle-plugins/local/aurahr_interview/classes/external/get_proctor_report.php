<?php
namespace local_aurahr_interview\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_multiple_structure;
use core_external\external_value;

/**
 * Get proctoring report for a session.
 */
class get_proctor_report extends external_api {

    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'sessiontype' => new external_value(PARAM_TEXT, 'academia or interview'),
            'sessionid'   => new external_value(PARAM_INT, 'Session ID'),
        ]);
    }

    public static function execute(string $sessiontype, int $sessionid): array {
        global $DB;

        $params = self::validate_parameters(self::execute_parameters(), [
            'sessiontype' => $sessiontype, 'sessionid' => $sessionid,
        ]);

        $context = \context_system::instance();
        $hascap = has_capability('local/aurahr_interview:viewproctor', $context);

        $isowner = false;
        global $USER;
        if ($params['sessiontype'] === 'interview') {
            $interview = $DB->get_record('local_aurahr_interviews', ['id' => $params['sessionid']], '*', IGNORE_MISSING);
            if ($interview && $interview->candidateid == $USER->id) {
                $isowner = true;
            }
        } else if ($params['sessiontype'] === 'academia') {
            $enrol = $DB->get_record('local_aurahr_assess_enrol', ['id' => $params['sessionid']], '*', IGNORE_MISSING);
            if ($enrol && $enrol->userid == $USER->id) {
                $isowner = true;
            }
        }

        if (!$hascap && !$isowner) {
            require_capability('local/aurahr_interview:viewproctor', $context);
        }

        $records = $DB->get_records('local_aurahr_proctor_events', [
            'sessiontype' => $params['sessiontype'],
            'sessionid'   => $params['sessionid']
        ], 'timecreated ASC');

        $events = [];
        $critical_count = 0;
        $warning_count = 0;

        foreach ($records as $r) {
            $events[] = [
                'id'          => (int)$r->id,
                'event_type'  => $r->event_type,
                'severity'    => $r->severity,
                'details'     => $r->details ?? '',
                'timecreated' => (int)$r->timecreated,
            ];
            if ($r->severity === 'critical') $critical_count++;
            if ($r->severity === 'warning') $warning_count++;
        }

        return [
            'events'         => $events,
            'total_events'   => count($events),
            'critical_count' => $critical_count,
            'warning_count'  => $warning_count,
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'events' => new external_multiple_structure(
                new external_single_structure([
                    'id'          => new external_value(PARAM_INT, 'Event ID'),
                    'event_type'  => new external_value(PARAM_TEXT, 'Event type'),
                    'severity'    => new external_value(PARAM_TEXT, 'Severity'),
                    'details'     => new external_value(PARAM_TEXT, 'Details'),
                    'timecreated' => new external_value(PARAM_INT, 'Time'),
                ])
            ),
            'total_events'   => new external_value(PARAM_INT, 'Total events'),
            'critical_count' => new external_value(PARAM_INT, 'Critical events'),
            'warning_count'  => new external_value(PARAM_INT, 'Warning events'),
        ]);
    }
}
