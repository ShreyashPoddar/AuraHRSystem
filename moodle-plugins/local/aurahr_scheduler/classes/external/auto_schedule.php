<?php
namespace local_aurahr_scheduler\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

class auto_schedule extends external_api {
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'jobid' => new external_value(PARAM_INT, 'Job ID'),
        ]);
    }

    public static function execute(int $jobid): array {
        global $DB;
        $params = self::validate_parameters(self::execute_parameters(), ['jobid' => $jobid]);
        
        $context = \context_system::instance();
        require_capability('local/aurahr_scheduler:manage', $context);
        
        // 1. Get scheduling rules for this job
        $rules = $DB->get_record('local_aurahr_sched_rules', ['jobid' => $params['jobid']]);
        if (!$rules) {
            $rules = $DB->get_record('local_aurahr_sched_rules', ['jobid' => 0]);
        }
        if (!$rules) {
            $rules = (object)[
                'min_gap_mins' => 15,
                'max_per_day' => 8,
                'preferred_duration' => 30,
                'buffer_days' => 1,
            ];
        }

        // 2. Get applications in the 'interview' stage for this job
        $sql_apps = "SELECT a.* 
                     FROM {local_aurahr_applications} a
                     WHERE a.jobid = :jobid AND a.stage = 'interview'";
        $apps = $DB->get_records_sql($sql_apps, ['jobid' => $params['jobid']]);

        $unscheduled = [];

        // Check if each candidate in 'interview' stage has an active scheduled/completed/in_progress interview
        foreach ($apps as $app) {
            $has_interview = $DB->record_exists_select('local_aurahr_interviews',
                "applicationid = ? AND status IN ('scheduled', 'in_progress', 'completed')",
                [$app->id]);
            if (!$has_interview) {
                // Check if there is an existing placeholder interview record with scheduled_at = 0
                $placeholder = $DB->get_record('local_aurahr_interviews', [
                    'applicationid' => $app->id,
                    'status' => 'scheduled',
                    'scheduled_at' => 0
                ]);
                if ($placeholder) {
                    $unscheduled[] = $placeholder;
                } else {
                    $unscheduled[] = (object)[
                        'id' => 0, // indicates it needs to be inserted
                        'applicationid' => $app->id,
                        'jobid' => $app->jobid,
                        'candidateid' => $app->userid,
                        'status' => 'scheduled',
                    ];
                }
            }
        }

        // Also fetch any other database entries in local_aurahr_interviews that are explicitly unscheduled
        $sql_db_unscheduled = "SELECT * FROM {local_aurahr_interviews} 
                               WHERE jobid = :jobid AND (scheduled_at IS NULL OR scheduled_at = 0) 
                               AND status = 'scheduled'";
        $db_unscheduled = $DB->get_records_sql($sql_db_unscheduled, ['jobid' => $params['jobid']]);
        foreach ($db_unscheduled as $inv) {
            // Avoid adding duplicates if already added via the application loop
            $exists = false;
            foreach ($unscheduled as $u) {
                if ($u->id !== 0 && $u->id === $inv->id) {
                    $exists = true;
                    break;
                }
            }
            if (!$exists) {
                $unscheduled[] = $inv;
            }
        }
        
        if (empty($unscheduled)) {
            return ['success' => true, 'scheduled' => 0, 'message' => 'No unscheduled interviews found.'];
        }

        // 3. Get all interviewers. For simplicity, we fetch users with the 'manager' archetype role 
        // or just use the job creator. In a real app we might have a specific interviewer list per job.
        // For now, we will fetch users who already have availability slots.
        $sql_interviewers = "SELECT DISTINCT userid FROM {local_aurahr_availability}";
        $interviewers = $DB->get_records_sql($sql_interviewers);
        if (empty($interviewers)) {
            return ['success' => false, 'scheduled' => 0, 'message' => 'No interviewers have set their availability.'];
        }

        $scheduled_count = 0;
        $start_date = strtotime('midnight') + ($rules->buffer_days * 86400);
        $end_date = $start_date + (30 * 86400); // look up to 30 days ahead

        foreach ($unscheduled as $interview) {
            $scheduled = false;
            
            // Loop through potential days
            for ($day = $start_date; $day <= $end_date; $day += 86400) {
                if ($scheduled) break;
                
                $day_of_week = date('w', $day); // 0 (Sun) to 6 (Sat)
                
                // Try each interviewer
                foreach ($interviewers as $i) {
                    if ($scheduled) break;
                    $interviewerid = $i->userid;
                    
                    // Check max per day
                    $day_start = $day;
                    $day_end = $day + 86400 - 1;
                    $daily_count = $DB->count_records_select('local_aurahr_interviews', 
                        "interviewerid = ? AND scheduled_at >= ? AND scheduled_at <= ?", 
                        [$interviewerid, $day_start, $day_end]);
                        
                    if ($daily_count >= $rules->max_per_day) {
                        continue;
                    }

                    // Get availability for this day of week
                    $slots = $DB->get_records_select('local_aurahr_availability', 
                        "userid = ? AND day_of_week = ? AND recurring = 1", 
                        [$interviewerid, $day_of_week]);
                        
                    foreach ($slots as $slot) {
                        if ($scheduled) break;
                        
                        $slot_start_time = strtotime(date('Y-m-d', $day) . ' ' . $slot->start_time);
                        $slot_end_time = strtotime(date('Y-m-d', $day) . ' ' . $slot->end_time);
                        
                        // Try to find a fitting time in this slot
                        $current_time = $slot_start_time;
                        $duration_seconds = $rules->preferred_duration * 60;
                        $gap_seconds = $rules->min_gap_mins * 60;
                        
                        while ($current_time + $duration_seconds <= $slot_end_time) {
                            $proposed_end = $current_time + $duration_seconds;
                            
                            // Check if this specific time overlaps with any blocked times
                            $overlap_block = $DB->record_exists_select('local_aurahr_blocked_times',
                                "userid = ? AND start_time < ? AND end_time > ?",
                                [$interviewerid, $proposed_end, $current_time]);
                                
                            if ($overlap_block) {
                                $current_time += $duration_seconds + $gap_seconds;
                                continue;
                            }
                            
                            // Check if this time overlaps with any existing interviews for this interviewer
                            // Account for min gap on both sides
                            $check_start = $current_time - $gap_seconds;
                            $check_end = $proposed_end + $gap_seconds;
                            
                            // existing interview start_time is scheduled_at, end_time is scheduled_at + duration_mins*60
                            $overlap_interview = $DB->get_record_sql("
                                SELECT id FROM {local_aurahr_interviews}
                                WHERE interviewerid = ? AND scheduled_at > 0 
                                AND scheduled_at < ? 
                                AND (scheduled_at + duration_mins * 60) > ?",
                                [$interviewerid, $check_end, $check_start], IGNORE_MULTIPLE);
                                
                            if ($overlap_interview) {
                                $current_time += $duration_seconds + $gap_seconds;
                                continue;
                            }
                            
                             // We found a slot!
                             $interview->scheduled_at = $current_time;
                             $interview->duration_mins = $rules->preferred_duration;
                             $interview->interviewerid = $interviewerid;
                             $interview->timemodified = time();
                             
                             if (empty($interview->id)) {
                                 $interview->timecreated = time();
                                 $interview->jitsi_room = 'aurahr-interview-' . $interview->applicationid . '-' . time();
                                 $DB->insert_record('local_aurahr_interviews', $interview);
                             } else {
                                 $interview->jitsi_room = 'aurahr-interview-' . $interview->applicationid . '-' . time();
                                 $DB->update_record('local_aurahr_interviews', $interview);
                             }
                             $scheduled = true;
                             $scheduled_count++;
                             break;
                        }
                    }
                }
            }
        }

        return [
            'success' => true, 
            'scheduled' => $scheduled_count, 
            'message' => "Successfully auto-scheduled $scheduled_count interviews."
        ];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'success'   => new external_value(PARAM_BOOL, 'Success'),
            'scheduled' => new external_value(PARAM_INT, 'Number of interviews scheduled'),
            'message'   => new external_value(PARAM_TEXT, 'Result message'),
        ]);
    }
}
