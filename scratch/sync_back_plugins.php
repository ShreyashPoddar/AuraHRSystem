<?php
$src = 'C:/xampp/htdocs/moodle/local';
$dst1 = 'c:/Users/shrey/Desktop/AuraHR/backend-moodle-plugins/local';
$dst2 = 'c:/Users/shrey/Desktop/AuraHR/AuraHR/moodle-plugins/local';

function recurse_copy_clean($src, $dst) {
    if (!is_dir($src)) return;
    @mkdir($dst, 0777, true);
    $dir = opendir($src);
    while (false !== ($file = readdir($dir))) {
        if ($file === '.' || $file === '..') continue;
        if ($file === 'node_modules') continue;
        
        // Skip setup/test scripts in Moodle local root that are not actual plugin files
        if ($src === 'C:/xampp/htdocs/moodle/local' && (
            strpos($file, 'aurahr_setup') === 0 || 
            strpos($file, 'test_') === 0 || 
            $file === 'readme.txt' || 
            $file === 'upgrade.txt'
        )) {
            continue;
        }

        $src_file = $src . '/' . $file;
        $dst_file = $dst . '/' . $file;

        if (is_dir($src_file)) {
            recurse_copy_clean($src_file, $dst_file);
        } else {
            copy($src_file, $dst_file);
        }
    }
    closedir($dir);
}

try {
    echo "Syncing plugins back from live Moodle ($src):\n";
    
    echo "  -> Copying to $dst1...\n";
    recurse_copy_clean($src, $dst1);
    
    echo "  -> Copying to $dst2...\n";
    recurse_copy_clean($src, $dst2);
    
    echo "Sync back completed successfully!\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
