<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card shadow mb-4">
                <div class="card-header py-3 d-flex justify-content-between align-items-center">
                    <h6 class="m-0 font-weight-bold text-primary">멤버십 플랜 관리</h6>
                    <button class="btn btn-sm btn-primary" data-toggle="modal" data-target="#createPlanModal">
                        <i class="fas fa-plus mr-1"></i>새 플랜 추가
                    </button>
                </div>
                <div class="card-body">
                    <div class="row">
                        <?php if (empty($plans)): ?>
                            <div class="col-12 text-center py-5">
                                <p class="text-muted">등록된 멤버십 플랜이 없습니다.</p>
                            </div>
                        <?php else: ?>
                            <?php foreach ($plans as $plan): ?>
                                <div class="col-xl-3 col-md-6 mb-4">
                                    <div class="card border-left-primary shadow h-100 py-2">
                                        <div class="card-body">
                                            <div class="row no-gutters align-items-center">
                                                <div class="col mr-2">
                                                    <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                                        <?= esc($plan['plan_type']) ?>
                                                    </div>
                                                    <div class="h5 mb-0 font-weight-bold text-gray-800">
                                                        <?= esc($plan['name']) ?></div>
                                                    <div class="mt-2 text-primary font-weight-bold">
                                                        ₩<?= number_format($plan['price']) ?>
                                                    </div>
                                                    <div class="small text-muted mt-1">
                                                        <?= $plan['period_days'] ? esc($plan['period_days']) . '일' : '' ?>
                                                        <?= $plan['total_count'] ? ' / ' . esc($plan['total_count']) . '회' : '' ?>
                                                    </div>
                                                </div>
                                                <div class="col-auto">
                                                    <i class="fas fa-id-card fa-2x text-gray-300"></i>
                                                </div>
                                            </div>
                                            <div class="mt-3 d-flex justify-content-end">
                                                <button class="btn btn-sm btn-outline-secondary mr-2">수정</button>
                                                <button class="btn btn-sm btn-outline-danger">삭제</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Simple Create Modal Placeholder -->
<div class="modal fade" id="createPlanModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">멤버십 플랜 등록</h5>
                <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
            </div>
            <div class="modal-body">
                <p>준비 중인 기능입니다.</p>
            </div>
        </div>
    </div>
</div>
<?= $this->endSection() ?>