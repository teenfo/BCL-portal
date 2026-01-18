<?php

namespace App\Controllers\Admin;

use App\Models\NotificationTemplateModel;
use App\Models\NotificationLogModel;

class NotificationsController extends BaseAdminController
{
    public function templates()
    {
        $templateModel = new NotificationTemplateModel();
        $templates = $templateModel->findAll();

        return $this->render('admin/notifications/templates', [
            'pageTitle' => '템플릿 관리',
            'templates' => $templates
        ]);
    }

    public function logs()
    {
        $logModel = new NotificationLogModel();
        $logs = $logModel->select('notification_logs.*, users.username as receiver_name, notification_templates.name as template_name')
            ->join('users', 'users.id = notification_logs.receiver_id')
            ->join('notification_templates', 'notification_templates.id = notification_logs.template_id', 'left')
            ->orderBy('sent_at', 'DESC')
            ->findAll(100);

        return $this->render('admin/notifications/logs', [
            'pageTitle' => '발송 로그',
            'logs' => $logs
        ]);
    }

    public function rules()
    {
        return $this->render('admin/notifications/rules', [
            'pageTitle' => '자동 발송 규칙'
        ]);
    }
}
