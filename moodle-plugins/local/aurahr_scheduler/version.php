<?php
defined('MOODLE_INTERNAL') || die();
$plugin->component = 'local_aurahr_scheduler';
$plugin->version   = 2026060400;
$plugin->requires  = 2024042200;
$plugin->maturity  = MATURITY_ALPHA;
$plugin->release   = '1.0.0';
$plugin->dependencies = ['local_aurahr_jobs' => 2026052200, 'local_aurahr_interview' => 2026052200];
