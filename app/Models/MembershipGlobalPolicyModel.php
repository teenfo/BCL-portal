<?php

namespace App\Models;

use CodeIgniter\Model;

class MembershipGlobalPolicyModel extends Model
{
    protected $table = 'membership_global_policies';
    protected $primaryKey = 'policy_key';
    protected $useAutoIncrement = false;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'policy_key',
        'policy_value',
        'is_active'
    ];
}
