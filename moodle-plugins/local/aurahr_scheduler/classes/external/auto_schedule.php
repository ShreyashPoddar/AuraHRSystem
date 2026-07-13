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

        // 2. Get applications in the 'Assessment Cleared' or 'Screening Scheduled' stage for this job
        $sql_apps = "SELECT a.* 
                     FROM {local_aurahr_applications} a
                     WHERE a.jobid = :jobid AND a.stage IN ('Assessment Cleared', 'Screening Scheduled', 'interview')";
        $apps = $DB->get_records_sql($sql_apps, ['jobid' => $params['jobid']]);

        $unscheduled = [];

        // Check if each candidate in 'interview' stage has an active scheduled/completed/in_progress/cancelled/no_show interview
        foreach ($apps as $app) {
            $has_interview = $DB->record_exists_select('local_aurahr_interviews',
                "applicationid = ? AND (scheduled_at > 0 OR status IN ('in_progress', 'completed', 'cancelled', 'no_show'))",
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

        // 3. Get all interviewers. Add the job creator as a fallback interviewer.
        $job = $DB->get_record('local_aurahr_jobs', ['id' => $params['jobid']], '*', MUST_EXIST);
        
        $sql_interviewers = "SELECT DISTINCT userid FROM {local_aurahr_availability}";
        $interviewers_recs = $DB->get_records_sql($sql_interviewers);
        
        $interviewer_ids = [];
        foreach ($interviewers_recs as $i) {
            $interviewer_ids[] = (int)$i->userid;
        }
        if (!in_array((int)$job->createdby, $interviewer_ids)) {
            $interviewer_ids[] = (int)$job->createdby;
        }

        $scheduled_count = 0;
        $start_date = strtotime('midnight') + ($rules->buffer_days * 86400);
        $end_date = $start_date + (30 * 86400); // look up to 30 days ahead

        foreach ($unscheduled as $interview) {
            $scheduled = false;
            
            // Loop through potential days
            for ($day = $start_date; $day <= $end_date; $day += 86400) {
                if ($scheduled) break;
                
                $day_of_week = (int)date('w', $day);
                
                // Try each interviewer
                foreach ($interviewer_ids as $interviewerid) {
                    if ($scheduled) break;
                    
                    // Check max per day
                    $day_start = $day;
                    $day_end = $day + 86400 - 1;
                    $daily_count = $DB->count_records_select('local_aurahr_interviews', 
                        "interviewerid = ? AND scheduled_at >= ? AND scheduled_at <= ?", 
                        [$interviewerid, $day_start, $day_end]);
                        
                    if ($daily_count >= $rules->max_per_day) {
                        continue;
                    }

                    // Get availability for interviewer and candidate on this day
                    $interviewer_slots = self::get_user_availability_for_day($interviewerid, $day);
                    $candidate_slots = self::get_user_availability_for_day((int)$interview->candidateid, $day);
                        
                    foreach ($interviewer_slots as $i_slot) {
                        if ($scheduled) break;
                        
                        $i_start = strtotime(date('Y-m-d', $day) . ' ' . $i_slot->start_time);
                        $i_end = strtotime(date('Y-m-d', $day) . ' ' . $i_slot->end_time);
                        
                        foreach ($candidate_slots as $c_slot) {
                            if ($scheduled) break;
                            
                            $c_start = strtotime(date('Y-m-d', $day) . ' ' . $c_slot->start_time);
                            $c_end = strtotime(date('Y-m-d', $day) . ' ' . $c_slot->end_time);
                            
                            // Find overlapping window
                            $overlap_start = max($i_start, $c_start);
                            $overlap_end = min($i_end, $c_end);
                            
                            $duration_seconds = $rules->preferred_duration * 60;
                            $gap_seconds = $rules->min_gap_mins * 60;
                            
                            $current_time = $overlap_start;
                            while ($current_time + $duration_seconds <= $overlap_end) {
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
                                $check_start = $current_time - $gap_seconds;
                                $check_end = $proposed_end + $gap_seconds;
                                
                                $overlap_interview_int = $DB->get_record_sql("
                                    SELECT id FROM {local_aurahr_interviews}
                                    WHERE interviewerid = ? AND scheduled_at > 0 AND status = 'scheduled'
                                    AND id != ?
                                    AND scheduled_at < ? 
                                    AND (scheduled_at + duration_mins * 60) > ?",
                                    [$interviewerid, $interview->id, $check_end, $check_start], IGNORE_MULTIPLE);
                                    
                                if ($overlap_interview_int) {
                                    $current_time += $duration_seconds + $gap_seconds;
                                    continue;
                                }

                                // Check if this time overlaps with candidate's other scheduled interviews
                                $overlap_interview_cand = $DB->get_record_sql("
                                    SELECT id FROM {local_aurahr_interviews}
                                    WHERE candidateid = ? AND scheduled_at > 0 AND status = 'scheduled'
                                    AND id != ?
                                    AND scheduled_at < ? 
                                    AND (scheduled_at + duration_mins * 60) > ?",
                                    [$interview->candidateid, $interview->id, $check_end, $check_start], IGNORE_MULTIPLE);
                                    
                                if ($overlap_interview_cand) {
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
                                    $interview->id = $DB->insert_record('local_aurahr_interviews', $interview);
                                } else {
                                    $interview->jitsi_room = 'aurahr-interview-' . $interview->applicationid . '-' . time();
                                    $DB->update_record('local_aurahr_interviews', $interview);
                                }
                                
                                // Update application stage to Screening Scheduled
                                $app_update = $DB->get_record('local_aurahr_applications', ['id' => $interview->applicationid]);
                                if ($app_update && $app_update->stage !== 'Screening Scheduled') {
                                    $app_update->stage = 'Screening Scheduled';
                                    $app_update->timemodified = time();
                                    $DB->update_record('local_aurahr_applications', $app_update);
                                }

                                $scheduled = true;
                                $scheduled_count++;
                                break;
                            }
                        }
                    }
                }
            }

            // Fallback: If not scheduled, find any random/available weekday slot 9 am to 6 pm in the next 30 days
            if (!$scheduled) {
                for ($day = $start_date; $day <= $end_date; $day += 86400) {
                    if ($scheduled) break;
                    
                    $day_of_week = (int)date('w', $day);
                    if ($day_of_week < 1 || $day_of_week > 5) {
                        continue; // weekdays only
                    }
                    
                    foreach ($interviewer_ids as $interviewerid) {
                        if ($scheduled) break;
                        
                        // Check daily limits
                        $day_start = $day;
                        $day_end = $day + 86400 - 1;
                        $daily_count = $DB->count_records_select('local_aurahr_interviews', 
                            "interviewerid = ? AND scheduled_at >= ? AND scheduled_at <= ?", 
                            [$interviewerid, $day_start, $day_end]);
                            
                        if ($daily_count >= $rules->max_per_day) {
                            continue;
                        }
                        
                        // Default slot: 9 am to 6 pm (09:00 - 18:00)
                        $i_start = strtotime(date('Y-m-d', $day) . ' 09:00');
                        $i_end = strtotime(date('Y-m-d', $day) . ' 18:00');
                        
                        $duration_seconds = $rules->preferred_duration * 60;
                        $gap_seconds = $rules->min_gap_mins * 60;
                        
                        $current_time = $i_start;
                        while ($current_time + $duration_seconds <= $i_end) {
                            $proposed_end = $current_time + $duration_seconds;
                            
                            $overlap_block = $DB->record_exists_select('local_aurahr_blocked_times',
                                "userid = ? AND start_time < ? AND end_time > ?",
                                [$interviewerid, $proposed_end, $current_time]);
                                
                            if ($overlap_block) {
                                $current_time += $duration_seconds + $gap_seconds;
                                continue;
                            }
                            
                            $check_start = $current_time - $gap_seconds;
                            $check_end = $proposed_end + $gap_seconds;
                            
                            $overlap_interview_int = $DB->get_record_sql("
                                SELECT id FROM {local_aurahr_interviews}
                                WHERE interviewerid = ? AND scheduled_at > 0 AND status = 'scheduled'
                                AND id != ?
                                AND scheduled_at < ? 
                                AND (scheduled_at + duration_mins * 60) > ?",
                                [$interviewerid, $interview->id, $check_end, $check_start], IGNORE_MULTIPLE);
                                
                            if ($overlap_interview_int) {
                                $current_time += $duration_seconds + $gap_seconds;
                                continue;
                            }
                            
                            $overlap_interview_cand = $DB->get_record_sql("
                                SELECT id FROM {local_aurahr_interviews}
                                WHERE candidateid = ? AND scheduled_at > 0 AND status = 'scheduled'
                                AND id != ?
                                AND scheduled_at < ? 
                                AND (scheduled_at + duration_mins * 60) > ?",
                                [$interview->candidateid, $interview->id, $check_end, $check_start], IGNORE_MULTIPLE);
                                
                            if ($overlap_interview_cand) {
                                $current_time += $duration_seconds + $gap_seconds;
                                continue;
                            }
                            
                            // Found fallback slot
                            $interview->scheduled_at = $current_time;
                            $interview->duration_mins = $rules->preferred_duration;
                            $interview->interviewerid = $interviewerid;
                            $interview->timemodified = time();
                            
                            if (empty($interview->id)) {
                                    $interview->timecreated = time();
                                    $interview->jitsi_room = 'aurahr-interview-' . $interview->applicationid . '-' . time();
                                    $interview->id = $DB->insert_record('local_aurahr_interviews', $interview);
                            } else {
                                    $interview->jitsi_room = 'aurahr-interview-' . $interview->applicationid . '-' . time();
                                    $DB->update_record('local_aurahr_interviews', $interview);
                            }
                            
                            // Update application stage to Screening Scheduled
                            $app_update = $DB->get_record('local_aurahr_applications', ['id' => $interview->applicationid]);
                            if ($app_update && $app_update->stage !== 'Screening Scheduled') {
                                $app_update->stage = 'Screening Scheduled';
                                $app_update->timemodified = time();
                                $DB->update_record('local_aurahr_applications', $app_update);
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

    /**
     * Helper to get availability slots for a user on a given day.
     * Fallback to Mon-Fri 9 am to 6 pm if not set.
     */
    public static function get_user_availability_for_day(int $userid, int $day): array {
        global $DB;
        
        $day_of_week = (int)date('w', $day); // 0 (Sun) to 6 (Sat)
        $day_midnight = strtotime('midnight', $day);
        
        // Check if user has ANY availability slots defined at all
        $has_any = $DB->record_exists('local_aurahr_availability', ['userid' => $userid]);
        if (!$has_any) {
            // Default free time: Mon-Fri (1-5), 9 am to 6 pm (09:00 to 18:00)
            if ($day_of_week >= 1 && $day_of_week <= 5) {
                return [
                    (object)[
                        'start_time' => '09:00',
                        'end_time' => '18:00',
                        'recurring' => 1,
                        'day_of_week' => $day_of_week,
                        'specific_date' => 0
                    ]
                ];
            } else {
                return [];
            }
        }
        
        // Fetch from database
        $sql = "userid = ? AND (
                    (recurring = 1 AND day_of_week = ?) OR 
                    (recurring = 0 AND specific_date >= ? AND specific_date < ?)
                )";
        $slots = $DB->get_records_select('local_aurahr_availability', $sql, [
            $userid,
            $day_of_week,
            $day_midnight,
            $day_midnight + 86400
        ]);
        
        return $slots ? array_values($slots) : [];
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'success'   => new external_value(PARAM_BOOL, 'Success'),
            'scheduled' => new external_value(PARAM_INT, 'Number of interviews scheduled'),
            'message'   => new external_value(PARAM_TEXT, 'Result message'),
        ]);
    }
}
