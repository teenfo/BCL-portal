<?php

namespace App\Models;

use CodeIgniter\Model;

class ApiKeyModel extends Model
{
    protected $table = 'api_keys';
    protected $primaryKey = 'id';
    protected $allowedFields = ['name', 'api_key', 'expires_at', 'is_active'];
    protected $useTimestamps = true;
}
