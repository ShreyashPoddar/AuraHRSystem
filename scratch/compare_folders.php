<?php
$dir1 = 'c:/Users/shrey/Desktop/AuraHR/backend-moodle-plugins/local';
$dir2 = 'C:/xampp/htdocs/moodle/local';

function compare_dirs($d1, $d2, $sub = '') {
    $path1 = $d1 . ($sub ? '/' . $sub : '');
    $path2 = $d2 . ($sub ? '/' . $sub : '');
    if (!is_dir($path1)) return;
    
    $files = scandir($path1);
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        if ($file === 'node_modules') continue;
        $rel = $sub ? $sub . '/' . $file : $file;
        
        if (is_dir($path1 . '/' . $file)) {
            compare_dirs($d1, $d2, $rel);
        } else {
            if (!file_exists($path2 . '/' . $file)) {
                echo "Only in dir1: $rel\n";
            } else {
                $c1 = file_get_contents($path1 . '/' . $file);
                $c2 = file_get_contents($path2 . '/' . $file);
                if ($c1 !== $c2) {
                    echo "Different: $rel\n";
                }
            }
        }
    }
    
    // Check files only in dir2
    if (is_dir($path2)) {
        $files2 = scandir($path2);
        foreach ($files2 as $file) {
            if ($file === '.' || $file === '..') continue;
            $rel = $sub ? $sub . '/' . $file : $file;
            if (!file_exists($path1 . '/' . $file)) {
                echo "Only in dir2: $rel\n";
            }
        }
    }
}

compare_dirs($dir1, $dir2);
