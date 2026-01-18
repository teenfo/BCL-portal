<?php

namespace App\Models;

use CodeIgniter\Model;

class NotificationTemplateModel extends Model
{
    protected $table = 'notification_templates';
    protected $primaryKey = 'id';
    protected $allowedFields = ['name', 'type', 'subject', 'content', 'is_active'];
    protected $useTimestamps = true;
}
