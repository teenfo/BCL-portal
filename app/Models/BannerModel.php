<?php

namespace App\Models;

use CodeIgniter\Model;

class BannerModel extends Model
{
    protected $table = 'banners';
    protected $primaryKey = 'id';
    protected $allowedFields = ['title', 'image_url', 'link_url', 'position', 'sort_order', 'is_active', 'start_at', 'end_at'];
}
