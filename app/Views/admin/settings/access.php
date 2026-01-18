<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card shadow mb-4">
                <div class="card-header py-3 d-flex justify-content-between align-items-center">
                    <h6 class="m-0 font-weight-bold text-primary">보안 및 권한 정책 관리</h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-8">
                            <h5>시스템 보안 설정</h5>
                            <p class="text-muted small">로그인 제한, 비밀번호 정책 등 시스템 전반의 보안 수준을 설정합니다.</p>

                            <hr>

                            <?php if (empty($policies)): ?>
                                <div class="card bg-light border-0 py-4 text-center">
                                    <p class="mb-0 text-muted">구성된 보안 정책이 없습니다.</p>
                                </div>
                            <?php else: ?>
                                <?php foreach ($policies as $policy): ?>
                                    <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                                        <div>
                                            <h6 class="mb-1"><?= esc($policy['policy_name']) ?></h6>
                                            <small class="text-muted">현재 값: <b><?= esc($policy['policy_value']) ?></b></small>
                                        </div>
                                        <div class="custom-control custom-switch">
                                            <input type="checkbox" class="custom-control-input" id="policy_<?= $policy['id'] ?>"
                                                <?= $policy['is_enabled'] ? 'checked' : '' ?>>
                                            <label class="custom-control-label" for="policy_<?= $policy['id'] ?>"></label>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            <?php endif; ?>

                            <div class="mt-4">
                                <h5>권한 매트릭스 (관리자 그룹)</h5>
                                <p class="text-muted small">각 그룹별 접근 가능한 메뉴 및 액션을 설정합니다.</p>
                                <a href="<?= base_url('admin/roles') ?>" class="btn btn-sm btn-outline-secondary">
                                    <i class="fas fa-user-shield mr-1"></i> 권한 관리 페이지로 이동
                                </a>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="card bg-light border-0">
                                <div class="card-body">
                                    <h6 class="font-weight-bold"><i class="fas fa-shield-alt mr-2 text-warning"></i>보안
                                        상태 요약</h6>
                                    <ul class="list-unstyled mt-3 small">
                                        <li class="mb-2"><i class="fas fa-check-circle text-success mr-2"></i> 2차
                                            인증(2FA) 적용 가능</li>
                                        <li class="mb-2"><i class="fas fa-exclamation-triangle text-info mr-2"></i> 비밀번호
                                            변경 주기 미설정</li>
                                        <li class="mb-2"><i class="fas fa-check-circle text-success mr-2"></i> 관리자 IP
                                            화이트리스트 기능 대기</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
<?= $this->endSection() ?>