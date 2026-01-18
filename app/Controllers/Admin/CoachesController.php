<?php

namespace App\Controllers\Admin;

use App\Models\MemberModel;
use App\Models\CoachDetailModel;

class CoachesController extends BaseAdminController
{
    public function index()
    {
        $userModel = new MemberModel();

        // Fetch users who are in the 'coach' group
        $coaches = $userModel->select('users.*, coach_details.specialties, coach_details.experience_years')
            ->join('coach_details', 'coach_details.user_id = users.id', 'left')
            ->whereIn('users.id', function ($builder) {
                return $builder->select('user_id')->from('auth_groups_users')->where('group', 'coach');
            })->findAll();

        return $this->render('admin/coaches/index', [
            'pageTitle' => '코치 목록',
            'coaches' => $coaches
        ]);
    }

    public function show($id)
    {
        $userModel = new MemberModel();
        $coach = $userModel->findById($id);

        if (!$coach) {
            return redirect()->to('/admin/coaches')->with('errors', ['Coach not found']);
        }

        $detailModel = new CoachDetailModel();
        $details = $detailModel->where('user_id', $id)->first();

        return $this->render('admin/coaches/show', [
            'pageTitle' => '코치 프로필',
            'coach' => $coach,
            'details' => $details
        ]);
    }
}
