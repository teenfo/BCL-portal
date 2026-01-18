<?php

namespace App\Controllers\Admin;

use App\Models\SessionModel;
use App\Models\BookingModel;
use App\Models\AttendanceLogModel;
use App\Models\MemberModel;

class SessionsController extends BaseAdminController
{
    public function schedule()
    {
        $sessionModel = new SessionModel();

        // Fetch sessions with coach info (coach info is in users table)
        $sessions = $sessionModel->select('sessions.*, users.username as coach_name')
            ->join('users', 'users.id = sessions.coach_id')
            ->orderBy('start_at', 'ASC')
            ->findAll();

        return $this->render('admin/sessions/schedule', [
            'pageTitle' => '세션·수업 스케줄',
            'sessions' => $sessions
        ]);
    }

    public function bookings()
    {
        $bookingModel = new BookingModel();

        $bookings = $bookingModel->select('bookings.*, users.username as member_name, sessions.title as session_title, sessions.start_at')
            ->join('users', 'users.id = bookings.user_id')
            ->join('sessions', 'sessions.id = bookings.session_id')
            ->orderBy('bookings.created_at', 'DESC')
            ->findAll(100);

        return $this->render('admin/sessions/bookings', [
            'pageTitle' => '예약·대기열 관리',
            'bookings' => $bookings
        ]);
    }

    public function checkins()
    {
        $attendanceModel = new AttendanceLogModel();

        $checkins = $attendanceModel->select('attendance_logs.*, users.username as member_name, sessions.title as session_title')
            ->join('users', 'users.id = attendance_logs.user_id')
            ->join('sessions', 'sessions.id = attendance_logs.session_id', 'left')
            ->where('DATE(checkin_at)', date('Y-m-d'))
            ->orderBy('checkin_at', 'DESC')
            ->findAll();

        return $this->render('admin/sessions/checkins', [
            'pageTitle' => '체크인 현황(실시간)',
            'checkins' => $checkins
        ]);
    }

    public function assignments()
    {
        // Fetch coaches (users with coach group)
        $userModel = new MemberModel();
        $coaches = $userModel->whereIn('id', function ($builder) {
            return $builder->select('user_id')->from('auth_groups_users')->where('group', 'coach');
        })->findAll();

        return $this->render('admin/sessions/assignments', [
            'pageTitle' => '코치 배정·교체',
            'coaches' => $coaches
        ]);
    }
}
