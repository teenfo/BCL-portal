<?php

namespace App\Controllers\Admin;

use App\Models\MemberModel;
use App\Models\AttendanceLogModel;
use App\Models\PaymentModel;

class DashboardController extends BaseAdminController
{
    public function index()
    {
        $memberModel = new MemberModel();
        $attendanceModel = new AttendanceLogModel();
        $paymentModel = new PaymentModel();

        $today = date('Y-m-d');

        $data = [
            'pageTitle' => '대시보드',
            'stats' => [
                'total_members' => $memberModel->countAllResults(),
                'today_attendance' => $attendanceModel->where('DATE(checkin_at)', $today)->countAllResults(),
                'monthly_revenue' => $paymentModel->where('status', 'Success')
                    ->where('MONTH(created_at)', date('m'))
                    ->selectSum('amount')
                    ->first()['amount'] ?? 0,
                'active_sessions' => 0 // Placeholder
            ]
        ];

        return $this->render('admin/dashboard/index', $data);
    }
}
