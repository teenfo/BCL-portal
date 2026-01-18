<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateIntegrationMaintenanceTables extends Migration
{
    public function up()
    {
        // 1. Audit Logs (Already mentioned in docs)
        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'user_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'null' => true,
            ],
            'event' => [
                'type' => 'VARCHAR',
                'constraint' => '50',
            ],
            'table_name' => [
                'type' => 'VARCHAR',
                'constraint' => '100',
            ],
            'target_id' => [
                'type' => 'INT',
                'unsigned' => true,
            ],
            'old_values' => ['type' => 'TEXT', 'null' => true],
            'new_values' => ['type' => 'TEXT', 'null' => true],
            'ip_address' => ['type' => 'VARCHAR', 'constraint' => '50'],
            'created_at' => ['type' => 'DATETIME'],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('audit_logs');

        // 2. Error Logs
        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'severity' => ['type' => 'VARCHAR', 'constraint' => '20'],
            'message' => ['type' => 'TEXT'],
            'stack_trace' => ['type' => 'LONGTEXT', 'null' => true],
            'url' => ['type' => 'VARCHAR', 'constraint' => '255', 'null' => true],
            'created_at' => ['type' => 'DATETIME'],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('error_logs');

        // 3. API Keys
        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'name' => ['type' => 'VARCHAR', 'constraint' => '100'],
            'api_key' => ['type' => 'VARCHAR', 'constraint' => '255', 'unique' => true],
            'expires_at' => ['type' => 'DATETIME', 'null' => true],
            'is_active' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1],
            'created_at' => ['type' => 'DATETIME'],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('api_keys');
    }

    public function down()
    {
        $this->forge->dropTable('api_keys', true);
        $this->forge->dropTable('error_logs', true);
        $this->forge->dropTable('audit_logs', true);
    }
}
