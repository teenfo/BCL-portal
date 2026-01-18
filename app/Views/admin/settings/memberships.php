<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card shadow mb-4">
                <div class="card-header py-3">
                    <h6 class="m-0 font-weight-bold text-primary">멤버십 상품 전역 정책</h6>
                </div>
                <div class="card-body">
                    <div class="alert alert-info py-3 mb-4">
                        <i class="fas fa-info-circle mr-2"></i> 이 설정은 시스템 전체의 모든 이용권에 공통으로 적용되는 규칙입니다.
                    </div>

                    <?php if (empty($policies)): ?>
                        <div class="text-center py-5">
                            <i class="fas fa-tags fa-3x text-gray-300 mb-3"></i>
                            <p class="text-gray-500">등록된 전역 정책이 없습니다.</p>
                            <button class="btn btn-sm btn-outline-primary mt-2">기본 정책 생성</button>
                        </div>
                    <?php else: ?>
                        <form action="<?= base_url('admin/settings/memberships') ?>" method="post">
                            <?= csrf_field() ?>
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>항목</th>
                                            <th>설정값</th>
                                            <th>활성화</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($policies as $policy): ?>
                                            <tr>
                                                <td><?= esc($policy['policy_key']) ?></td>
                                                <td>
                                                    <input type="text" name="policies[<?= esc($policy['policy_key']) ?>]"
                                                        class="form-control form-control-sm"
                                                        value="<?= esc($policy['policy_value']) ?>">
                                                </td>
                                                <td>
                                                    <div class="custom-control custom-switch">
                                                        <input type="checkbox" class="custom-control-input"
                                                            id="switch_<?= esc($policy['policy_key']) ?>"
                                                            <?= $policy['is_active'] ? 'checked' : '' ?>>
                                                        <label class="custom-control-label"
                                                            for="switch_<?= esc($policy['policy_key']) ?>"></label>
                                                    </div>
                                                </td>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>
                            <div class="d-flex justify-content-end mt-3">
                                <button type="submit" class="btn btn-primary">저장하기</button>
                            </div>
                        </form>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
</div>
<?= $this->endSection() ?>