<?php
$workspace_root = dirname(__DIR__, 2);
$dir_backend = $workspace_root . '/backend-moodle-plugins/local';
$dir_aurahr = $workspace_root . '/AuraHR/moodle-plugins/local';
$dir_xampp = 'C:/xampp/htdocs/moodle/local';

echo "Smart Sync starting...\n";
echo "Workspace root: $workspace_root\n";
echo "AuraHR Repo folder: $dir_aurahr\n";
echo "XAMPP Live folder: $dir_xampp\n";
echo "Backend folder (untracked): $dir_backend\n\n";

function ensure_dir($path) {
    if (!is_dir($path)) {
        mkdir($path, 0777, true);
    }
}

// 1. Gather all files from both directories
function get_all_files($dir, $base_dir = '') {
    $files = [];
    $path = $dir . ($base_dir ? '/' . $base_dir : '');
    if (!is_dir($path)) return $files;
    
    $items = scandir($path);
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        if ($item === 'node_modules' || $item === '.git' || $item === 'session_data') continue;
        
        // Skip setup/test scripts in Moodle local root that are not actual plugin files
        if ($base_dir === '' && (
            strpos($item, 'aurahr_setup') === 0 || 
            strpos($item, 'test_') === 0 || 
            $item === 'readme.txt' || 
            $item === 'upgrade.txt'
        )) {
            continue;
        }
        
        $rel = $base_dir ? $base_dir . '/' . $item : $item;
        if (is_dir($path . '/' . $item)) {
            $files = array_merge($files, get_all_files($dir, $rel));
        } else {
            $files[] = $rel;
        }
    }
    return $files;
}

$aurahr_files = get_all_files($dir_aurahr);
$xampp_files = get_all_files($dir_xampp);

$all_files = array_unique(array_merge($aurahr_files, $xampp_files));
sort($all_files);

$copied_to_xampp = 0;
$copied_to_repo = 0;

foreach ($all_files as $file) {
    $path_aurahr = $dir_aurahr . '/' . $file;
    $path_xampp = $dir_xampp . '/' . $file;
    $path_backend = $dir_backend . '/' . $file;
    
    $exists_aurahr = file_exists($path_aurahr);
    $exists_xampp = file_exists($path_xampp);
    
    $action = ''; // 'to_xampp', 'to_repo', 'both_exist_identical'
    
    if ($exists_aurahr && !$exists_xampp) {
        $action = 'to_xampp';
        echo "File only in Repo: $file. Copying to XAMPP.\n";
    } elseif (!$exists_aurahr && $exists_xampp) {
        $action = 'to_repo';
        echo "File only in XAMPP: $file. Copying to Repo.\n";
    } else {
        // Both exist. Check contents.
        $c1 = file_get_contents($path_aurahr);
        $c2 = file_get_contents($path_xampp);
        if ($c1 !== $c2) {
            $m1 = filemtime($path_aurahr);
            $m2 = filemtime($path_xampp);
            if ($m1 > $m2) {
                $action = 'to_xampp';
                echo "Repo file is newer: $file (" . date('Y-m-d H:i:s', $m1) . " vs " . date('Y-m-d H:i:s', $m2) . "). Copying to XAMPP.\n";
            } else {
                $action = 'to_repo';
                echo "XAMPP file is newer: $file (" . date('Y-m-d H:i:s', $m2) . " vs " . date('Y-m-d H:i:s', $m1) . "). Copying to Repo.\n";
            }
        } else {
            // Identical. But let's check backend folder.
            if (!file_exists($path_backend) || file_get_contents($path_backend) !== $c1) {
                ensure_dir(dirname($path_backend));
                copy($path_aurahr, $path_backend);
            }
        }
    }
    
    if ($action === 'to_xampp') {
        ensure_dir(dirname($path_xampp));
        copy($path_aurahr, $path_xampp);
        $copied_to_xampp++;
        
        // Keep backend folder in sync
        ensure_dir(dirname($path_backend));
        copy($path_aurahr, $path_backend);
    } elseif ($action === 'to_repo') {
        ensure_dir(dirname($path_aurahr));
        copy($path_xampp, $path_aurahr);
        $copied_to_repo++;
        
        // Keep backend folder in sync
        ensure_dir(dirname($path_backend));
        copy($path_xampp, $path_backend);
    }
}

echo "\nSmart Sync complete!\n";
echo "Copied to XAMPP: $copied_to_xampp\n";
echo "Copied to Repo:  $copied_to_repo\n";
