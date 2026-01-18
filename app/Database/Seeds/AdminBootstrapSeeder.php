<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use CodeIgniter\CLI\CLI;

class AdminBootstrapSeeder extends Seeder
{
    public function run()
    {
        $db = \Config\Database::connect();
        $users = auth()->getProvider();

        // 0. Manual SQL cleanup for rogue identities that are NOT associated with a valid user
        // or just clear them to be safe if they match our admin email
        $db->table('auth_identities')->where('secret', 'admin@admin.com')->delete();
        $db->table('users')->where('username', 'admin')->delete();

        // 1. Try to find by email
        $user = $users->findByCredentials(['email' => 'admin@admin.com']);

        // 2. If not found, try by username
        if ($user === null) {
            $user = $users->where('username', 'admin')->first();
        }

        if ($user === null) {
            $user = new \CodeIgniter\Shield\Entities\User([
                'username' => 'admin',
                'email' => 'admin@admin.com',
                'password' => '1234',
                'active' => 1,
            ]);

            try {
                $users->save($user);
                // Fetch the user again to get the ID
                $user = $users->findById($users->getInsertID());
                CLI::write('Created admin user: admin@admin.com / 1234', 'green');
            } catch (\Exception $e) {
                CLI::error('Failed to create user: ' . $e->getMessage());
                return;
            }
        } else {
            // Update email/password if user exists
            $user->email = 'admin@admin.com';
            $user->password = '1234';
            $user->active = 1;
            $users->save($user);
            CLI::write('Updated admin user (admin) password to: 1234', 'green');
        }

        // Ensure in admin group
        if (!$user->inGroup('admin')) {
            $user->addGroup('admin');
            CLI::write('Added admin user to admin group', 'green');
        }
    }
}
