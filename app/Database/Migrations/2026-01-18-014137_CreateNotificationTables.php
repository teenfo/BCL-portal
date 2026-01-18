<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateNotificationTables extends Migration
{
    public function up()
    {
        // 1. Notification Templates
        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'name' => [
                'type' => 'VARCHAR',
                'constraint' => '100',
            ],
            'type' => [
                'type' => 'ENUM',
                'constraint' => ['SMS', 'Email', 'Push', 'Talk'],
                'default' => 'Push',
            ],
            'subject' => [
                'type' => 'VARCHAR',
                'constraint' => '255',
                'null' => true,
            ],
            'content' => ['type' => 'TEXT'],
            'is_active' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 1,
            ],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('notification_templates');

        // 2. Notification Logs
        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'template_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'null' => true,
            ],
            'receiver_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'sent_at' => ['type' => 'DATETIME'],
            'status' => [
                'type' => 'VARCHAR',
                'constraint' => '50', // Sent, Delivered, Failed
                'default' => 'Sent',
            ],
            'response' => ['type' => 'TEXT', 'null' => true], // API response
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('notification_logs');
    }

    public function down()
    {
        $this->forge->dropTable('notification_logs', true);
        $this->forge->dropTable('notification_templates', true);
    }
}
