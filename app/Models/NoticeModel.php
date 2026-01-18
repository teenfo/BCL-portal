<?php

namespace App\Models;

use CodeIgniter\Model;

class NoticeModel extends Model
{
    protected $table = 'notices';
    protected $primaryKey = 'id';
    protected $allowedFields = ['title', 'content', 'author_id', 'is_pinned', 'is_published', 'view_count'];
    protected $useTimestamps = true;
}
