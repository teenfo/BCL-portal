<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;

class BaseAdminController extends BaseController
{
    protected $data = [];

    public function initController(\CodeIgniter\HTTP\RequestInterface $request, \CodeIgniter\HTTP\ResponseInterface $response, \Psr\Log\LoggerInterface $logger)
    {
        parent::initController($request, $response, $logger);

        // Common data for all admin views
        $this->data['currentUserName'] = '관리자'; // Placeholder for CI4 Shield integration
        $this->data['title'] = 'BCL Admin';
    }

    protected function render(string $view, array $data = [])
    {
        return view($view, array_merge($this->data, $data));
    }
}
