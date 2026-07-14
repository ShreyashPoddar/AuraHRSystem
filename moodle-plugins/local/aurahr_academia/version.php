<?php
defined('MOODLE_INTERNAL') || die();

$plugin->component = 'local_aurahr_academia';
$plugin->version   = 2026062305; // Bumped version to force DB upgrade
$plugin->requires  = 2024042200;
$plugin->maturity  = MATURITY_ALPHA;
$plugin->release   = '1.0.0';
$plugin->dependencies = [
    'local_aurahr_jobs' => 2026052200,
];