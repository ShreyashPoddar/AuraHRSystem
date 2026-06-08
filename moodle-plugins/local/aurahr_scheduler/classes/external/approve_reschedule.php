<?php
namespace local_aurahr_scheduler\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

class approve_reschedule extends external_api {
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'id'                    => new external_value(PARAM_INT, 'Reschedule request ID'),
            'action'                => new external_value(PARAM_TEXT, 'approve, reject, or ai_reschedule'),
            'new_time'              => new external_value(PARAM_INT, 'Override new time', VALUE_DEFAULT, 0),
            'force_reschedule_both' => new external_value(PARAM_BOOL, 'Force rescheduling both clashing candidates', VALUE_DEFAULT, false),
            'force_approve'         => new external_value(PARAM_BOOL, 'Force approval ignoring clashes', VALUE_DEFAULT, false),
        ]);
    }

    public static function execute(int $id, string $action, int $new_time, bool $force_reschedule_both, bool $force_approve = false): array {
        global $DB;
        $params = self::validate_parameters(self::execute_parameters(), [
            'id' => $id, 'action' => $action, 'new_time' => $new_time, 'force_reschedule_both' => $force_reschedule_both, 'force_approve' => $force_approve
        ]);
        
        $context = \context_system::instance();
        require_capability('local/aurahr_scheduler:manage', $context);
        
        $request = $DB->get_record('local_aurahr_reschedule', ['id' => $params['id']], '*', MUST_EXIST);
        $interview = $DB->get_record('local_aurahr_interviews', ['id' => $request->interviewid], '*', MUST_EXIST);

        if (!in_array($params['action'], ['approve', 'reject', 'ai_reschedule'])) {
            throw new \invalid_parameter_exception('Invalid action');
        }

        if ($params['action'] === 'reject') {
            $request->status = 'reject';
            $request->timemodified = time();
            $DB->update_record('local_aurahr_reschedule', $request);
            return ['success' => true];
        }

        // Fetch scheduler rules
        $rules = $DB->get_record('local_aurahr_sched_rules', ['jobid' => $interview->jobid]);
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

        $duration_seconds = $rules->preferred_duration * 60;
        $gap_seconds = $rules->min_gap_mins * 60;
        $interviewerid = $interview->interviewerid > 0 ? $interview->interviewerid : (int)$DB->get_field('local_aurahr_jobs', 'createdby', ['id' => $interview->jobid]);

        $target_time = 0;
        if ($params['action'] === 'approve') {
            $target_time = $params['new_time'] > 0 ? $params['new_time'] : $request->new_time;
        } else if ($params['action'] === 'ai_reschedule') {
            // Find a perfect slot using AI
            $target_time = self::find_ai_reschedule_slot($interview, $interviewerid, $rules, [$interview->id]);
        }

        if ($target_time <= 0) {
            return ['success' => false, 'message' => 'Could not find any available slot for AI rescheduling.'];
        }

        // Check if there is a clash at target_time with another scheduled interview
        $proposed_end = $target_time + $duration_seconds;
        $check_start = $target_time - $gap_seconds;
        $check_end = $proposed_end + $gap_seconds;

        $clash_record = $DB->get_record_sql("
            SELECT i.*, u.firstname, u.lastname
            FROM {local_aurahr_interviews} i
            JOIN {user} u ON i.candidateid = u.id
            WHERE i.interviewerid = ? AND i.scheduled_at > 0 AND i.status = 'scheduled'
            AND i.id != ?
            AND i.scheduled_at < ? 
            AND (i.scheduled_at + i.duration_mins * 60) > ?",
            [$interviewerid, $interview->id, $check_end, $check_start], IGNORE_MULTIPLE);

        if ($clash_record && !$params['force_approve']) {
            if (!$params['force_reschedule_both']) {
                // Return clash warning details
                return [
                    'success' => false,
                    'clash' => true,
                    'clashed_candidate_name' => trim($clash_record->firstname . ' ' . $clash_record->lastname),
                    'clashed_interview_id' => (int)$clash_record->id,
                    'clashed_time' => (int)$clash_record->scheduled_at,
                    'proposed_time' => (int)$target_time,
                ];
            } else {
                // Force rescheduling BOTH candidates
                // 1. Find new slot for Candidate A (excluding clash candidate's current slot)
                $new_time_a = self::find_ai_reschedule_slot($interview, $interviewerid, $rules, [$interview->id, $clash_record->id]);
                if ($new_time_a <= 0) {
                    return ['success' => false, 'message' => 'Failed to find slot for first candidate.'];
                }
                
                // Temporarily update Candidate A's scheduled time to prevent clashing with B
                $interview->scheduled_at = $new_time_a;
                $DB->update_record('local_aurahr_interviews', $interview);

                // 2. Find new slot for Candidate B (clashed candidate)
                $new_time_b = self::find_ai_reschedule_slot($clash_record, $interviewerid, $rules, [$clash_record->id]);
                if ($new_time_b <= 0) {
                    // Revert Candidate A time and fail
                    $interview->scheduled_at = 0;
                    $DB->update_record('local_aurahr_interviews', $interview);
                    return ['success' => false, 'message' => 'Failed to find slot for clashed candidate.'];
                }

                // Update B to new time
                $clash_record->scheduled_at = $new_time_b;
                $clash_record->timemodified = time();
                $DB->update_record('local_aurahr_interviews', $clash_record);

                // Update request
                $request->status = 'approve';
                $request->timemodified = time();
                $DB->update_record('local_aurahr_reschedule', $request);

                return ['success' => true];
            }
        }

        // No clash detected, proceed to update interview time
        $interview->scheduled_at = $target_time;
        $interview->timemodified = time();
        $DB->update_record('local_aurahr_interviews', $interview);

        $request->status = 'approve';
        $request->timemodified = time();
        $DB->update_record('local_aurahr_reschedule', $request);

        return ['success' => true];
    }

    private static function find_ai_reschedule_slot($interview, $interviewerid, $rules, $exclude_interview_ids = []) {
        global $DB;
        $start_date = strtotime('midnight') + ($rules->buffer_days * 86400);
        $end_date = $start_date + (30 * 86400); // 30 days window
        
        $duration_seconds = $rules->preferred_duration * 60;
        $gap_seconds = $rules->min_gap_mins * 60;
        
        // Try availability overlap first
        for ($day = $start_date; $day <= $end_date; $day += 86400) {
            $day_of_week = (int)date('w', $day);
            
            // Check daily limit
            $day_start = $day;
            $day_end = $day + 86400 - 1;
            $daily_count = $DB->count_records_select('local_aurahr_interviews', 
                "interviewerid = ? AND id NOT IN (" . implode(',', array_merge([0], $exclude_interview_ids)) . ") AND scheduled_at >= ? AND scheduled_at <= ?", 
                [$interviewerid, $day_start, $day_end]);
                
            if ($daily_count >= $rules->max_per_day) {
                continue;
            }
            
            $interviewer_slots = \local_aurahr_scheduler\external\auto_schedule::get_user_availability_for_day($interviewerid, $day);
            $candidate_slots = \local_aurahr_scheduler\external\auto_schedule::get_user_availability_for_day((int)$interview->candidateid, $day);
            
            foreach ($interviewer_slots as $i_slot) {
                $i_start = strtotime(date('Y-m-d', $day) . ' ' . $i_slot->start_time);
                $i_end = strtotime(date('Y-m-d', $day) . ' ' . $i_slot->end_time);
                
                foreach ($candidate_slots as $c_slot) {
                    $c_start = strtotime(date('Y-m-d', $day) . ' ' . $c_slot->start_time);
                    $c_end = strtotime(date('Y-m-d', $day) . ' ' . $c_slot->end_time);
                    
                    $overlap_start = max($i_start, $c_start);
                    $overlap_end = min($i_end, $c_end);
                    
                    $current_time = $overlap_start;
                    while ($current_time + $duration_seconds <= $overlap_end) {
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
                            AND id != ? AND id NOT IN (" . implode(',', array_merge([0], $exclude_interview_ids)) . ")
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
                            AND id != ? AND id NOT IN (" . implode(',', array_merge([0], $exclude_interview_ids)) . ")
                            AND scheduled_at < ? 
                            AND (scheduled_at + duration_mins * 60) > ?",
                            [$interview->candidateid, $interview->id, $check_end, $check_start], IGNORE_MULTIPLE);
                            
                        if ($overlap_interview_cand) {
                            $current_time += $duration_seconds + $gap_seconds;
                            continue;
                        }
                        
                        return $current_time;
                    }
                }
            }
        }
        
        // Try fallback weekday slot 9 am to 6 pm
        for ($day = $start_date; $day <= $end_date; $day += 86400) {
            $day_of_week = (int)date('w', $day);
            if ($day_of_week < 1 || $day_of_week > 5) {
                continue;
            }
            
            // Check daily limit
            $day_start = $day;
            $day_end = $day + 86400 - 1;
            $daily_count = $DB->count_records_select('local_aurahr_interviews', 
                "interviewerid = ? AND id NOT IN (" . implode(',', array_merge([0], $exclude_interview_ids)) . ") AND scheduled_at >= ? AND scheduled_at <= ?", 
                [$interviewerid, $day_start, $day_end]);
                
            if ($daily_count >= $rules->max_per_day) {
                continue;
            }
            
            $i_start = strtotime(date('Y-m-d', $day) . ' 09:00');
            $i_end = strtotime(date('Y-m-d', $day) . ' 18:00');
            
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
                    AND id != ? AND id NOT IN (" . implode(',', array_merge([0], $exclude_interview_ids)) . ")
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
                    AND id != ? AND id NOT IN (" . implode(',', array_merge([0], $exclude_interview_ids)) . ")
                    AND scheduled_at < ? 
                    AND (scheduled_at + duration_mins * 60) > ?",
                    [$interview->candidateid, $interview->id, $check_end, $check_start], IGNORE_MULTIPLE);
                
                if ($overlap_interview_cand) {
                    $current_time += $duration_seconds + $gap_seconds;
                    continue;
                }
                
                return $current_time;
            }
        }
        
        return 0;
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'success'                => new external_value(PARAM_BOOL, 'Success'),
            'clash'                  => new external_value(PARAM_BOOL, 'Whether there was a timing clash', VALUE_OPTIONAL),
            'clashed_candidate_name' => new external_value(PARAM_TEXT, 'Name of candidate clashed with', VALUE_OPTIONAL),
            'clashed_interview_id'   => new external_value(PARAM_INT, 'ID of the clashed interview', VALUE_OPTIONAL),
            'clashed_time'           => new external_value(PARAM_INT, 'Time of clashed interview', VALUE_OPTIONAL),
            'proposed_time'          => new external_value(PARAM_INT, 'Target time for reschedule', VALUE_OPTIONAL),
            'message'                => new external_value(PARAM_TEXT, 'Error or success message', VALUE_OPTIONAL),
        ]);
    }
}
