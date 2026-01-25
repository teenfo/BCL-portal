<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateSettingsTables extends Migration
{
    public function up()
    {
        // 1. Facilities
        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'name' => [
                'type' => 'VARCHAR',
                'constraint' => '255',
            ],
            'business_number' => [
                'type' => 'VARCHAR',
                'constraint' => '50',
                'null' => true,
            ],
            'phone' => [
                'type' => 'VARCHAR',
                'constraint' => '20',
                'null' => true,
            ],
            'address' => [
                'type' => 'VARCHAR',
                'constraint' => '255',
                'null' => true,
            ],
            'latitude' => [
                'type' => 'DECIMAL',
                'constraint' => '10,8',
                'null' => true,
            ],
            'longitude' => [
                'type' => 'DECIMAL',
                'constraint' => '11,8',
                'null' => true,
            ],
            'operating_hours' => [
                'type' => 'TEXT', // JSON
                'null' => true,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('facilities', true);

        // 2. Operating Policies
        $this->forge->addField([
            'policy_key' => [
                'type' => 'VARCHAR',
                'constraint' => '100',
            ],
            'policy_value' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'unit' => [
                'type' => 'VARCHAR',
                'constraint' => '50',
                'null' => true,
            ],
            'description' => [
                'type' => 'VARCHAR',
                'constraint' => '255',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);
        $this->forge->addKey('policy_key', true);
        $this->forge->createTable('operating_policies', true);

        // 3. Policy Histories
        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'policy_key' => [
                'type' => 'VARCHAR',
                'constraint' => '100',
            ],
            'old_value' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'new_value' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'changed_by' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('policy_histories', true);

        // 4. Membership Global Policies
        $this->forge->addField([
            'policy_key' => [
                'type' => 'VARCHAR',
                'constraint' => '100',
            ],
            'policy_value' => [
                'type' => 'VARCHAR',
                'constraint' => '255',
            ],
            'is_active' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 1,
            ],
        ]);
        $this->forge->addKey('policy_key', true);
        $this->forge->createTable('membership_global_policies', true);

        // 5. Membership Hold Logs
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
            ],
            'start_date' => [
                'type' => 'DATE',
            ],
            'end_date' => [
                'type' => 'DATE',
            ],
            'reason' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('membership_hold_logs', true);

        // 6. Security Policies
        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'policy_name' => [
                'type' => 'VARCHAR',
                'constraint' => '100',
            ],
            'policy_value' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'is_enabled' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 1,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('security_policies', true);

        // Insert default facility
        // Insert default facility if none exists
        if ($this->db->table('facilities')->countAllResults() === 0) {
            $this->db->table('facilities')->insert([
                'name' => 'BCL Pilates 센터',
                'business_number' => '123-45-67890',
                'phone' => '02-123-4567',
                'address' => '서울특별시 서초구 서초대로 123',
                'operating_hours' => json_encode([
                    'weekdays' => '09:00 - 22:00',
                    'saturday' => '10:00 - 18:00',
                    'sunday' => 'Closed'
                ]),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
        }

        // Insert default operating policies
        // Insert default operating policies if none exist
        if ($this->db->table('operating_policies')->countAllResults() === 0) {
            $this->db->table('operating_policies')->insertBatch([
                [
                    'policy_key' => 'CANCEL_TIME_LIMIT',
                    'policy_value' => '6',
                    'unit' => 'Hours',
                    'description' => '수업 시작 몇 시간 전까지 취소가 가능한지 설정합니다.',
                    'updated_at' => date('Y-m-d H:i:s'),
                ],
                [
                    'policy_key' => 'REFUND_FEE_RATE',
                    'policy_value' => '10',
                    'unit' => 'Percent',
                    'description' => '환불 시 발생하는 위약금 비율입니다.',
                    'updated_at' => date('Y-m-d H:i:s'),
                ],
                [
                    'policy_key' => 'NOSHOW_PENALTY',
                    'policy_value' => '1',
                    'unit' => 'Count',
                    'description' => '출석하지 않았을 때 차감되는 횟수입니다.',
                    'updated_at' => date('Y-m-d H:i:s'),
                ],
            ]);
        }
    }

    public function down()
    {
        $this->forge->dropTable('facilities', true);
        $this->forge->dropTable('operating_policies', true);
        $this->forge->dropTable('policy_histories', true);
        $this->forge->dropTable('membership_global_policies', true);
        $this->forge->dropTable('membership_hold_logs', true);
        $this->forge->dropTable('security_policies', true);
    }
}
