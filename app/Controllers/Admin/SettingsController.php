<?php

namespace App\Controllers\Admin;

use App\Models\FacilityModel;
use App\Models\OperatingPolicyModel;
use App\Models\MembershipGlobalPolicyModel;
use App\Models\SecurityPolicyModel;

class SettingsController extends BaseAdminController
{
    public function facility()
    {
        $facilityModel = new FacilityModel();
        $facility = $facilityModel->first();

        return $this->render('admin/settings/facility', [
            'pageTitle' => '지점/시설 정보',
            'facility' => $facility
        ]);
    }

    public function policies()
    {
        $policyModel = new OperatingPolicyModel();
        $policies = $policyModel->findAll();

        return $this->render('admin/settings/policies', [
            'pageTitle' => '운영 정책',
            'policies' => $policies
        ]);
    }

    public function memberships()
    {
        $policyModel = new MembershipGlobalPolicyModel();
        $policies = $policyModel->findAll();

        return $this->render('admin/settings/memberships', [
            'pageTitle' => '멤버십 상품 정책',
            'policies' => $policies
        ]);
    }

    public function access()
    {
        $policyModel = new SecurityPolicyModel();
        $policies = $policyModel->findAll();

        return $this->render('admin/settings/access', [
            'pageTitle' => '권한 정책/역할 관리',
            'policies' => $policies
        ]);
    }

    /**
     * Update facility information
     */
    public function updateFacility()
    {
        $facilityModel = new FacilityModel();
        $facilityId = $this->request->getPost('id');

        $data = [
            'name' => $this->request->getPost('name'),
            'business_number' => $this->request->getPost('business_number'),
            'phone' => $this->request->getPost('phone'),
            'address' => $this->request->getPost('address'),
            'latitude' => $this->request->getPost('latitude'),
            'longitude' => $this->request->getPost('longitude'),
            'operating_hours' => json_encode($this->request->getPost('operating_hours')),
        ];

        $facilityModel->update($facilityId, $data);

        return redirect()->back()->with('message', '지점 정보가 수정되었습니다.');
    }

    /**
     * Update operating policies
     */
    public function updatePolicies()
    {
        $policyModel = new OperatingPolicyModel();
        $policies = $this->request->getPost('policies');

        if ($policies) {
            foreach ($policies as $key => $value) {
                $policyModel->update($key, ['policy_value' => $value]);
            }
        }

        return redirect()->back()->with('message', '운영 정책이 수정되었습니다.');
    }

    /**
     * Update membership global policies
     */
    public function updateMemberships()
    {
        $policyModel = new MembershipGlobalPolicyModel();
        $policies = $this->request->getPost('policies');

        if ($policies) {
            foreach ($policies as $key => $value) {
                // Simplified update
                $policyModel->where('policy_key', $key)->set(['policy_value' => $value])->update();
            }
        }

        return redirect()->back()->with('message', '멤버십 전역 정책이 수정되었습니다.');
    }

    /**
     * Update security policies
     */
    public function updateAccess()
    {
        $policyModel = new SecurityPolicyModel();
        $policies = $this->request->getPost('policies');

        if ($policies) {
            foreach ($policies as $id => $enabled) {
                $policyModel->update($id, ['is_enabled' => $enabled]);
            }
        }

        return redirect()->back()->with('message', '보안 정책이 수정되었습니다.');
    }
}
