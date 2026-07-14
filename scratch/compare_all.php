<?php
$workspace_root = dirname(__DIR__, 2);
$dir_backend_moodle = $workspace_root . '/backend-moodle-plugins/local';
$dir_aurahr_moodle = $workspace_root . '/AuraHR/moodle-plugins/local';
$dir_xampp_moodle = 'C:/xampp/htdocs/moodle/local';

echo "Workspace root: $workspace_root\n";
echo "Backend moodle plugins: $dir_backend_moodle\n";
echo "AuraHR moodle plugins: $dir_aurahr_moodle\n";
echo "XAMPP moodle: $dir_xampp_moodle\n\n";

function compare_dirs($d1, $d2, $name1, $name2, $sub = '') {
    $path1 = $d1 . ($sub ? '/' . $sub : '');
    $path2 = $d2 . ($sub ? '/' . $sub : '');
    if (!is_dir($path1)) return;
    
    $files = scandir($path1);
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        if ($file === 'node_modules' || $file === '.git' || $file === 'session_data') continue;
        $rel = $sub ? $sub . '/' . $file : $file;
        
        if (is_dir($path1 . '/' . $file)) {
            compare_dirs($d1, $d2, $name1, $name2, $rel);
        } else {
            if (!file_exists($path2 . '/' . $file)) {
                echo "Only in $name1: $rel\n";
            } else {
                $c1 = file_get_contents($path1 . '/' . $file);
                $c2 = file_get_contents($path2 . '/' . $file);
                if ($c1 !== $c2) {
                    $mtime1 = date('Y-m-d H:i:s', filemtime($path1 . '/' . $file));
                    $mtime2 = date('Y-m-d H:i:s', filemtime($path2 . '/' . $file));
                    echo "Different in $name1 vs $name2: $rel\n";
                    echo "  -> $name1: size=" . strlen($c1) . ", mtime=$mtime1\n";
                    echo "  -> $name2: size=" . strlen($c2) . ", mtime=$mtime2\n";
                }
            }
        }
    }
    
    // Check files only in path2
    if (is_dir($path2)) {
        $files2 = scandir($path2);
        foreach ($files2 as $file) {
            if ($file === '.' || $file === '..') continue;
            if ($file === 'node_modules' || $file === '.git' || $file === 'session_data') continue;
            $rel = $sub ? $sub . '/' . $file : $file;
            if (!file_exists($path1 . '/' . $file)) {
                echo "Only in $name2: $rel\n";
            }
        }
    }
}

echo "=== COMPARING AuraHR Moodle vs Backend Moodle ===\n";
compare_dirs($dir_aurahr_moodle, $dir_backend_moodle, 'AuraHR/moodle-plugins', 'backend-moodle-plugins');

echo "\n=== COMPARING AuraHR Moodle vs XAMPP Moodle ===\n";
compare_dirs($dir_aurahr_moodle, $dir_xampp_moodle, 'AuraHR/moodle-plugins', 'XAMPP Moodle');
