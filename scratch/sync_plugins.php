<?php
$src = 'c:/Users/shrey/Desktop/AuraHR/backend-moodle-plugins/local';
$dst = 'C:/xampp/htdocs/moodle/local';

function recurse_copy($src, $dst) {
    $dir = opendir($src);
    @mkdir($dst);
    while(false !== ( $file = readdir($dir)) ) {
        if (( $file != '.' ) && ( $file != '..' )) {
            if ( is_dir($src . '/' . $file) ) {
                recurse_copy($src . '/' . $file, $dst . '/' . $file);
            }
            else {
                copy($src . '/' . $file, $dst . '/' . $file);
            }
        }
    }
    closedir($dir);
}

try {
    echo "Syncing plugins from $src to $dst...\n";
    recurse_copy($src, $dst);
    echo "Sync completed successfully!\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
