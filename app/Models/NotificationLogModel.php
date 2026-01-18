<?php

namespace App\Models;

use CodeIgniter\Model;

class NotificationLogModel extends Model
{
    protected $table = 'notification_logs';
    protected $primaryKey = 'id';
    protected $allowedFields = ['template_id', 'receiver_id', 'sent_at', 'status', 'response'];
}
