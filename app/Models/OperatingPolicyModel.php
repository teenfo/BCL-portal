<?php

namespace App\Models;

use CodeIgniter\Model;

class OperatingPolicyModel extends Model
{
    protected $table = 'operating_policies';
    protected $primaryKey = 'policy_key';
    protected $useAutoIncrement = false;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'policy_key',
        'policy_value',
        'unit',
        'description'
    ];

    protected bool $allowEmptyInserts = false;

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = '';
    protected $updatedField = 'updated_at';
}
