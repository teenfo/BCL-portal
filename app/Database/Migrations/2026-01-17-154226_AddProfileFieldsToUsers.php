<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddProfileFieldsToUsers extends Migration
{
    public function up()
    {
        $fields = [
            'phone' => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'plan_name' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'remaining_count' => ['type' => 'INT', 'default' => 0],
            'membership_start_date' => ['type' => 'DATE', 'null' => true],
            'membership_end_date' => ['type' => 'DATE', 'null' => true],
            'membership_type' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'gender' => ['type' => 'VARCHAR', 'constraint' => 10, 'null' => true],
            'birthdate' => ['type' => 'DATE', 'null' => true],
            'memo' => ['type' => 'TEXT', 'null' => true],
            'last_visit_at' => ['type' => 'DATETIME', 'null' => true],
        ];

        if (!$this->db->columnExists('phone', 'users')) {
            $this->forge->addColumn('users', $fields);
        }
    }

    public function down()
    {
        $fields = [
            'phone',
            'plan_name',
            'remaining_count',
            'membership_start_date',
            'membership_end_date',
            'membership_type',
            'gender',
            'birthdate',
            'memo',
            'last_visit_at'
        ];

        $this->forge->dropColumn('users', $fields);
    }
}
