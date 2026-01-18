<?php

namespace App\Controllers\Admin;

use App\Models\AuditLogModel;
use App\Models\ErrorLogModel;

class MaintenanceController extends BaseAdminController
{
    public function audit()
    {
        $auditModel = new AuditLogModel();
        $logs = $auditModel->select('audit_logs.*, users.username')
            ->join('users', 'users.id = audit_logs.user_id', 'left')
            ->orderBy('audit_logs.created_at', 'DESC')
            ->findAll(100);

        return $this->render('admin/maintenance/audit', [
            'pageTitle' => '관리자 액션 로그',
            'logs' => $logs
        ]);
    }

    public function errors()
    {
        $errorModel = new ErrorLogModel();
        $errors = $errorModel->orderBy('created_at', 'DESC')->findAll(100);

        return $this->render('admin/maintenance/errors', [
            'pageTitle' => '에러 로그',
            'errors' => $errors
        ]);
    }

    public function maintenance()
    {
        return $this->render('admin/maintenance/maintenance', [
            'pageTitle' => '공지/점검 이력'
        ]);
    }
}
