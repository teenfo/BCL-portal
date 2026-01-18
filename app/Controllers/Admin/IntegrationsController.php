<?php

namespace App\Controllers\Admin;

use App\Models\ApiKeyModel;

class IntegrationsController extends BaseAdminController
{
    public function payments()
    {
        return $this->render('admin/integrations/payments', [
            'pageTitle' => '결제 연동 설정'
        ]);
    }

    public function api()
    {
        $keyModel = new ApiKeyModel();
        $apiKeys = $keyModel->findAll();

        return $this->render('admin/integrations/api', [
            'pageTitle' => '외부 시스템 연동',
            'apiKeys' => $apiKeys
        ]);
    }

    public function data()
    {
        return $this->render('admin/integrations/data', [
            'pageTitle' => '데이터 내보내기/가져오기'
        ]);
    }
}
