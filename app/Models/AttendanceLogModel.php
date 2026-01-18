<?php

namespace App\Models;

use CodeIgniter\Model;

class AttendanceLogModel extends Model
{
    protected $table = 'attendance_logs';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = ['user_id', 'session_id', 'checkin_at', 'method', 'status'];

    protected bool $allowEmptyInserts = false;

    // Dates
    protected $useTimestamps = false;
}
