<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateContentTables extends Migration
{
    public function up()
    {
        // 1. Notices
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
            'content' => ['type' => 'TEXT'],
            'author_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'is_pinned' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 0,
            ],
            'is_published' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 1,
            ],
            'view_count' => [
                'type' => 'INT',
                'constraint' => 11,
                'default' => 0,
            ],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('notices', true);

        // 2. Banners
        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'title' => [
                'type' => 'VARCHAR',
                'constraint' => '100',
            ],
            'image_url' => [
                'type' => 'VARCHAR',
                'constraint' => '255',
            ],
            'link_url' => [
                'type' => 'VARCHAR',
                'constraint' => '255',
                'null' => true,
            ],
            'position' => [
                'type' => 'VARCHAR',
                'constraint' => '50', // MainTop, Sidebar, etc.
            ],
            'sort_order' => [
                'type' => 'INT',
                'default' => 0,
            ],
            'is_active' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 1,
            ],
            'start_at' => ['type' => 'DATETIME', 'null' => true],
            'end_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('banners', true);

        // 3. Posts (Community)
        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'category' => [
                'type' => 'VARCHAR',
                'constraint' => '50',
            ],
            'title' => [
                'type' => 'VARCHAR',
                'constraint' => '255',
            ],
            'content' => ['type' => 'TEXT'],
            'user_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'is_hidden' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 0,
            ],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('posts', true);
    }

    public function down()
    {
        $this->forge->dropTable('posts', true);
        $this->forge->dropTable('banners', true);
        $this->forge->dropTable('notices', true);
    }
}
