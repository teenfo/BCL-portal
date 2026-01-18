<?php

namespace App\Controllers\Admin;

use App\Models\AttendanceLogModel;
use App\Models\SessionModel;
use App\Models\PaymentModel;
use App\Models\MemberModel;

class ReportsController extends BaseAdminController
{
    public function attendance()
    {
        $attendanceModel = new AttendanceLogModel();

        // Basic daily counts for the last 7 days
        $startDate = date('Y-m-d', strtotime('-7 days'));
        $dailyStats = $attendanceModel->select('DATE(checkin_at) as date, COUNT(*) as count')
            ->where('checkin_at >=', $startDate)
            ->groupBy('DATE(checkin_at)')
            ->orderBy('date', 'ASC')
            ->findAll();

        return $this->render('admin/reports/attendance', [
            'pageTitle' => '출석 리포트',
            'dailyStats' => $dailyStats
        ]);
    }

    public function sessions()
    {
        $sessionModel = new SessionModel();
        $summary = $sessionModel->select('status, COUNT(*) as count')
            ->groupBy('status')
            ->findAll();

        return $this->render('admin/reports/sessions', [
            'pageTitle' => '세션 운영 리포트',
            'summary' => $summary
        ]);
    }

    public function revenue()
    {
        $paymentModel = new PaymentModel();
        $revenue = $paymentModel->select('MONTH(created_at) as month, SUM(amount) as total')
            ->where('status', 'Success')
            ->where('YEAR(created_at)', date('Y'))
            ->groupBy('MONTH(created_at)')
            ->findAll();

        return $this->render('admin/reports/revenue', [
            'pageTitle' => '매출·정산 리포트',
            'revenue' => $revenue
        ]);
    }

    public function coaches()
    {
        return $this->render('admin/reports/coaches', [
            'pageTitle' => '코치 성과 리포트'
        ]);
    }
}
