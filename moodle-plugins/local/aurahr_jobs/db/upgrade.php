<?php
// This file is part of AuraHR - https://aurahr.com
//
// AuraHR is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * AuraHR Jobs plugin upgrade script.
 */

defined('MOODLE_INTERNAL') || die();

function xmldb_local_aurahr_jobs_upgrade($oldversion) {
    global $DB;
    $dbman = $DB->get_manager();

    if ($oldversion < 2026052201) {
        // Define table local_aurahr_applications to be updated.
        $table = new xmldb_table('local_aurahr_applications');

        // Define the fields to add.
        $fields = [
            new xmldb_field('age', XMLDB_TYPE_INTEGER, '3', null, null, null, null, 'ai_summary'),
            new xmldb_field('gender', XMLDB_TYPE_CHAR, '20', null, null, null, null, 'age'),
            new xmldb_field('role', XMLDB_TYPE_CHAR, '255', null, null, null, null, 'gender'),
            new xmldb_field('education_details', XMLDB_TYPE_TEXT, null, null, null, null, null, 'role'),
            new xmldb_field('resume_skills', XMLDB_TYPE_TEXT, null, null, null, null, null, 'education_details'),
            new xmldb_field('github_score', XMLDB_TYPE_NUMBER, '10, 2', null, null, null, null, 'resume_skills'),
            new xmldb_field('leetcode_score', XMLDB_TYPE_NUMBER, '10, 2', null, null, null, null, 'github_score'),
            new xmldb_field('linkedin_score', XMLDB_TYPE_NUMBER, '10, 2', null, null, null, null, 'leetcode_score'),
            new xmldb_field('matched_skills', XMLDB_TYPE_TEXT, null, null, null, null, null, 'linkedin_score'),
        ];

        foreach ($fields as $field) {
            if (!$dbman->field_exists($table, $field)) {
                $dbman->add_field($table, $field);
            }
        }

        // Savepoint reached.
        upgrade_plugin_savepoint(true, 2026052201, 'local', 'aurahr_jobs');
    }

    if ($oldversion < 2026060400) {
        $table = new xmldb_table('local_aurahr_applications');
        $index = new xmldb_index('ix_stage', XMLDB_INDEX_NOTUNIQUE, ['stage']);

        // 1. Drop the dependency index first.
        if ($dbman->index_exists($table, $index)) {
            $dbman->drop_index($table, $index);
        }

        // 2. Perform the column modification (changing precision as defined in install.xml).
        $field = new xmldb_field('stage', XMLDB_TYPE_CHAR, '30', null, XMLDB_NOTNULL, null, 'applied', 'jobid');
        $dbman->change_field_precision($table, $field);

        // 3. Restore the index.
        if (!$dbman->index_exists($table, $index)) {
            $dbman->add_index($table, $index);
        }

        // Savepoint reached.
        upgrade_plugin_savepoint(true, 2026060400, 'local', 'aurahr_jobs');
    }

    return true;
}
