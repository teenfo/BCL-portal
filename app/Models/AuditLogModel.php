<?php

namespace App\Models;

use CodeIgniter\Model;

class AuditLogModel extends Model
{
    protected $table = 'audit_logs';
    protected $primaryKey = 'id';
    protected $allowedFields = ['user_id', 'event', 'table_name', 'target_id', 'old_values', 'new_values', 'ip_address'];
    protected $useTimestamps = true;
    protected $updatedField = '';
}
