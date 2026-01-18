<?php

namespace App\Models;

use CodeIgniter\Model;

class CoachDetailModel extends Model
{
    protected $table = 'coach_details';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = ['user_id', 'bio', 'specialties', 'certifications', 'experience_years', 'base_salary', 'commission_rate'];

    protected bool $allowEmptyInserts = false;

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = '';
    protected $updatedField = 'updated_at';
}
