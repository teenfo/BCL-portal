<?php

namespace App\Models;

use CodeIgniter\Shield\Models\UserModel as ShieldUserModel;

class MemberModel extends ShieldUserModel
{
    protected function initialize(): void
    {
        parent::initialize();

        $this->allowedFields = [
            ...$this->allowedFields,
            'phone',
            'plan_name',
            'remaining_count',
            'membership_start_date',
            'membership_end_date',
            'membership_type',
            'gender',
            'birthdate',
            'memo',
            'last_visit_at',
            'avatar',
            'zipcode',
            'address',
            'detail_address',
            'marketing_consent',
            'join_source',
        ];
    }
}
