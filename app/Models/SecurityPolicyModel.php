<?php

namespace App\Models;

use CodeIgniter\Model;

class SecurityPolicyModel extends Model
{
    protected $table = 'security_policies';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'policy_name',
        'policy_value',
        'is_enabled'
    ];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = '';
    protected $updatedField = 'updated_at';
}
