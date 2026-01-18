<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\MemberModel;
use App\Models\AttendanceLogModel;
use App\Models\MembershipPlanModel;
use App\Models\PaymentModel;
use App\Models\RefundModel;

class MembersController extends BaseController
{
    public function index()
    {
        $userModel = new MemberModel();

        // Search & Filter
        $search = $this->request->getGet('search');
        $group = $this->request->getGet('group');
        $status = $this->request->getGet('status'); // 'active', 'inactive'

        if (!empty($search)) {
            $userModel->groupStart()
                ->like('username', $search)
                ->orLike('email', $search)
                ->groupEnd();
        }

        if (!empty($status)) {
            $active = ($status === 'active') ? 1 : 0;
            $userModel->where('active', $active);
        }

        // Note: Filtering by group in Shield is more complex (requires join with auth_groups_users)
        // For simplicity, we filter after query or join if strictly needed. 
        // Here we'll implement simple joining for group filtering if requested.
        if (!empty($group)) {
            // Basic implementation: filtering later or simple join
            // $userModel->join('auth_groups_users', 'auth_groups_users.user_id = users.id')
            //           ->where('auth_groups_users.group', $group);
        }

        $users = $userModel->paginate(10);
        $pager = $userModel->pager;

        // Note: Real data from DB is used now, no mock data injection.
        // The view will automatically use the properties provided by App\Models\UserModel.

        $data = [
            'users' => $users,
            'pager' => $pager,
            'title' => '회원 목록',
            'search' => $search,
            'status' => $status
        ];

        return view('admin/members/index', $data);
    }

    public function create()
    {
        $users = new MemberModel();

        // Validate basic input
        $rules = [
            'username' => 'required|min_length[3]|max_length[30]|is_unique[users.username]',
            'email' => 'required|valid_email|is_unique[auth_identities.secret]',
            'password' => 'required|min_length[8]',
            'group' => 'required',
            'phone' => 'required|max_length(20)'
        ];

        if (!$this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $user = new \CodeIgniter\Shield\Entities\User([
            'username' => $this->request->getPost('username'),
            'email' => $this->request->getPost('email'),
            'password' => $this->request->getPost('password'),
            'phone' => $this->request->getPost('phone'),
            'active' => 1
        ]);

        $users->save($user);

        // Add to group
        $user = $users->findById($users->getInsertID());
        $user->addGroup($this->request->getPost('group'));

        return redirect()->to('/admin/members')->with('message', '회원이 성공적으로 등록되었습니다.');
    }

    public function update($id)
    {
        // Handle Edit Logic (Update username/email?) 
        // Shield users usually update via Identity model for email/password.
        // For simple username update:
        $users = new MemberModel();
        $user = $users->findById($id);

        if ($user) {
            $user->fill($this->request->getPost([
                'username',
                'phone',
                'gender',
                'birthdate',
                'memo',
                'plan_name',
                'remaining_count',
                'membership_start_date',
                'membership_end_date'
            ]));
            $users->save($user);
        }

        return redirect()->back()->with('message', '정보가 수정되었습니다.');
    }

    public function delete($id)
    {
        $users = new MemberModel();
        $users->delete($id);

        return redirect()->to('/admin/members')->with('message', '회원이 삭제되었습니다.');
    }

    public function updateStatus($id)
    {
        $users = new MemberModel();
        $user = $users->findById($id);

        if ($user) {
            $user->active = !$user->active; // Toggle
            $users->save($user);
        }

        return redirect()->back()->with('message', '상태가 변경되었습니다.');
    }

    public function updateRole($id)
    {
        $users = new MemberModel();
        $user = $users->findById($id);

        $newGroup = $this->request->getPost('role');

        if ($user && $newGroup) {
            $user->syncGroups($newGroup);
        }

        return redirect()->back()->with('message', '권한이 변경되었습니다.');
    }

    public function show($id)
    {
        $userModel = new MemberModel();
        $user = $userModel->findById($id);

        if (!$user) {
            return redirect()->to('/admin/members')->with('errors', ['User not found']);
        }

        // Fetch last login from auth_logins
        $db = \Config\Database::connect();
        $lastLogin = $db->table('auth_logins')
            ->where('user_id', $id)
            ->where('success', 1)
            ->orderBy('date', 'DESC')
            ->limit(1)
            ->get()
            ->getRow();

        return view('admin/members/show', [
            'pageTitle' => '회원 상세 Profile',
            'user' => $user,
            'lastLogin' => $lastLogin
        ]);
    }

    public function attendance()
    {
        $attendanceModel = new AttendanceLogModel();

        // Joining with users for display
        $logs = $attendanceModel->select('attendance_logs.*, users.username as member_name')
            ->join('users', 'users.id = attendance_logs.user_id')
            ->orderBy('checkin_at', 'DESC')
            ->findAll(100);

        return view('admin/members/attendance', [
            'pageTitle' => '출결·체크인 로그',
            'logs' => $logs
        ]);
    }

    public function plans()
    {
        $planModel = new MembershipPlanModel();
        $plans = $planModel->findAll();

        return view('admin/members/plans', [
            'pageTitle' => '플랜 관리',
            'plans' => $plans
        ]);
    }

    public function payments()
    {
        $paymentModel = new PaymentModel();
        $payments = $paymentModel->select('payments.*, users.username as member_name, membership_plans.name as plan_name')
            ->join('users', 'users.id = payments.user_id')
            ->join('membership_plans', 'membership_plans.id = payments.plan_id')
            ->orderBy('payments.created_at', 'DESC')
            ->findAll(100);

        return view('admin/members/payments', [
            'pageTitle' => '결제 내역',
            'payments' => $payments
        ]);
    }

    public function settlements()
    {
        $refundModel = new RefundModel();
        $refunds = $refundModel->select('refunds.*, payments.transaction_id, users.username as member_name')
            ->join('payments', 'payments.id = refunds.payment_id')
            ->join('users', 'users.id = payments.user_id')
            ->orderBy('refunds.created_at', 'DESC')
            ->findAll(100);

        return view('admin/members/settlements', [
            'pageTitle' => '환불·정산',
            'refunds' => $refunds
        ]);
    }

    public function updateField($id)
    {
        $request = service('request');
        $field = $request->getPost('field');
        $value = $request->getPost('value');
        $fields = $request->getPost('fields'); // Expecting ['field1' => 'val1', 'field2' => 'val2']

        // Whitelist allowed fields for inline editing
        $allowedFields = [
            'username',
            'phone',
            'gender',
            'birthdate',
            'memo',
            'zipcode',
            'address',
            'detail_address',
            'join_source',
            'marketing_consent'
        ];

        $users = new MemberModel();
        $user = $users->findById($id);

        if (!$user) {
            return $this->response->setJSON(['status' => 'error', 'message' => 'User not found', 'token' => csrf_hash()]);
        }

        $toUpdate = [];

        // Single field mode
        if ($field) {
            if (!in_array($field, $allowedFields)) {
                return $this->response->setJSON(['status' => 'error', 'message' => 'Invalid field', 'token' => csrf_hash()]);
            }
            $toUpdate[$field] = $value;
        }
        // Multi field mode
        elseif (is_array($fields)) {
            foreach ($fields as $f => $v) {
                if (in_array($f, $allowedFields)) {
                    $toUpdate[$f] = $v;
                }
            }
        }

        if (empty($toUpdate)) {
            return $this->response->setJSON(['status' => 'error', 'message' => 'No valid fields provided', 'token' => csrf_hash()]);
        }

        $user->fill($toUpdate);
        if ($users->save($user)) {
            return $this->response->setJSON([
                'status' => 'success',
                'message' => 'Updated successfully',
                'token' => csrf_hash()
            ]);
        }

        $errors = $users->errors();
        $message = !empty($errors) ? implode(', ', $errors) : 'Update failed';

        return $this->response->setJSON([
            'status' => 'error',
            'message' => $message,
            'token' => csrf_hash()
        ]);
    }

    public function uploadAvatar($id)
    {
        $file = $this->request->getFile('avatar');

        if (!$file->isValid()) {
            return $this->response->setJSON(['status' => 'error', 'message' => $file->getErrorString(), 'token' => csrf_hash()]);
        }

        if ($file->hasMoved()) {
            return $this->response->setJSON(['status' => 'error', 'message' => 'File already moved', 'token' => csrf_hash()]);
        }

        // Validate image
        $validationRule = [
            'avatar' => [
                'label' => 'Image File',
                'rules' => [
                    'is_image[avatar]',
                    'mime_in[avatar,image/jpg,image/jpeg,image/gif,image/png,image/webp]',
                    'max_size[avatar,2048]', // 2MB
                ],
            ],
        ];

        if (!$this->validate($validationRule)) {
            return $this->response->setJSON(['status' => 'error', 'message' => $this->validator->getErrors()['avatar'], 'token' => csrf_hash()]);
        }

        $newName = $file->getRandomName();
        $file->move(FCPATH . 'uploads/avatars', $newName);

        $users = new MemberModel();
        $user = $users->findById($id);
        $user->avatar = 'uploads/avatars/' . $newName;
        $users->save($user);

        return $this->response->setJSON([
            'status' => 'success',
            'message' => 'Avatar uploaded',
            'avatar_url' => base_url('uploads/avatars/' . $newName),
            'token' => csrf_hash()
        ]);
    }

    public function roles()
    {
        return view('admin/members/roles', ['pageTitle' => '권한·그룹']);
    }
}
