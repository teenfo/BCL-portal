<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddDetailedProfileFieldsToUsers extends Migration
{
    public function up()
    {
        $fields = [
            'avatar' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'zipcode' => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'address' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'detail_address' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            'marketing_consent' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'join_source' => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
        ];

        $this->forge->addColumn('users', $fields);
    }

    public function down()
    {
        $fields = [
            'avatar',
            'zipcode',
            'address',
            'detail_address',
            'marketing_consent',
            'join_source',
        ];

        $this->forge->dropColumn('users', $fields);
    }
}
