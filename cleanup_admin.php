<?php

require __DIR__ . '/app/Config/Paths.php';
require rtrim(realpath((new Config\Paths())->systemDirectory), '/\\') . '/Boot.php';
CodeIgniter\Boot::bootWeb(new Config\Paths());

$db = \Config\Database::connect();

// 1. Delete matching identities
$db->table('auth_identities')
    ->where('secret', 'admin@admin.com')
    ->delete();

// 2. Delete matching user by username
$db->table('users')
    ->where('username', 'admin')
    ->delete();

echo "Cleaned up rogue user and identity for 'admin'.\n";
