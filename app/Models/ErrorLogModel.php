<?php

namespace App\Models;

use CodeIgniter\Model;

class ErrorLogModel extends Model
{
    protected $table = 'error_logs';
    protected $primaryKey = 'id';
    protected $allowedFields = ['severity', 'message', 'stack_trace', 'url'];
    protected $useTimestamps = true;
    protected $updatedField = '';
}
