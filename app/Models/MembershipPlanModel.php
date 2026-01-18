<?php

namespace App\Models;

use CodeIgniter\Model;

class MembershipPlanModel extends Model
{
    protected $table = 'membership_plans';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = ['name', 'price', 'period_days', 'total_count', 'plan_type', 'is_published'];

    protected bool $allowEmptyInserts = false;

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
