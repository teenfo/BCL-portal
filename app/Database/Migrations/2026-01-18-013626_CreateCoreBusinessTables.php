<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateCoreBusinessTables extends Migration
{
    public function up()
    {
        // 1. Membership Plans
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
            'price' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'default' => 0.00,
            ],
            'period_days' => [
                'type' => 'INT',
                'constraint' => 11,
                'null' => true,
            ],
            'total_count' => [
                'type' => 'INT',
                'constraint' => 11,
                'null' => true,
            ],
            'plan_type' => [
                'type' => 'ENUM',
                'constraint' => ['Term', 'Count', 'Period'],
                'default' => 'Term',
            ],
            'is_published' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 1,
            ],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('membership_plans', true);

        // 2. Sessions (Classes)
        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'title' => [
                'type' => 'VARCHAR',
                'constraint' => '255',
            ],
            'coach_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'start_at' => ['type' => 'DATETIME'],
            'end_at' => ['type' => 'DATETIME'],
            'capacity' => [
                'type' => 'INT',
                'constraint' => 11,
                'default' => 10,
            ],
            'description' => ['type' => 'TEXT', 'null' => true],
            'status' => [
                'type' => 'VARCHAR',
                'constraint' => '50',
                'default' => 'Scheduled', // Scheduled, Finished, Cancelled
            ],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('sessions', true);

        // 3. Bookings
        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'session_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'user_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'status' => [
                'type' => 'ENUM',
                'constraint' => ['Reserved', 'Waiting', 'Confirmed', 'Cancelled'],
                'default' => 'Reserved',
            ],
            'waiting_order' => [
                'type' => 'INT',
                'constraint' => 11,
                'null' => true,
            ],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('bookings', true);

        // 4. Attendance Logs
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
            'session_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'null' => true,
            ],
            'checkin_at' => ['type' => 'DATETIME'],
            'method' => [
                'type' => 'ENUM',
                'constraint' => ['QR', 'PIN', 'RFID', 'Manual'],
                'default' => 'Manual',
            ],
            'status' => [
                'type' => 'VARCHAR',
                'constraint' => '50',
                'default' => 'Present', // Present, Late, Cancel
            ],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('attendance_logs', true);

        // 5. Payments
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
            'plan_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'amount' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'default' => 0.00,
            ],
            'method' => [
                'type' => 'VARCHAR',
                'constraint' => '50', // Card, Transfer, Cash
            ],
            'status' => [
                'type' => 'VARCHAR',
                'constraint' => '50', // Success, Pending, Failed, Cancelled
            ],
            'transaction_id' => [
                'type' => 'VARCHAR',
                'constraint' => '255',
                'null' => true,
            ],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('payments', true);

        // 6. Refunds
        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'payment_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'amount' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
            ],
            'reason' => ['type' => 'TEXT', 'null' => true],
            'status' => [
                'type' => 'VARCHAR',
                'constraint' => '50', // Requested, Approved, Rejected
                'default' => 'Requested',
            ],
            'processed_by' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'null' => true,
            ],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('refunds', true);

        // 7. Coach Details
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
                'unique' => true,
            ],
            'bio' => ['type' => 'TEXT', 'null' => true],
            'specialties' => ['type' => 'TEXT', 'null' => true], // JSON
            'certifications' => ['type' => 'TEXT', 'null' => true],
            'experience_years' => [
                'type' => 'INT',
                'constraint' => 11,
                'default' => 0,
            ],
            'base_salary' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'default' => 0.00,
            ],
            'commission_rate' => [
                'type' => 'FLOAT',
                'default' => 0.0,
            ],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('coach_details', true);
    }

    public function down()
    {
        $this->forge->dropTable('coach_details', true);
        $this->forge->dropTable('refunds', true);
        $this->forge->dropTable('payments', true);
        $this->forge->dropTable('attendance_logs', true);
        $this->forge->dropTable('bookings', true);
        $this->forge->dropTable('sessions', true);
        $this->forge->dropTable('membership_plans', true);
    }
}
