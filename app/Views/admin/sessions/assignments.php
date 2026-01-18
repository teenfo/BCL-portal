<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card shadow mb-4">
                <div class="card-header py-3">
                    <h6 class="m-0 font-weight-bold text-primary">코치 배정 및 관리</h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        <?php if (empty($coaches)): ?>
                            <div class="col-12 text-center py-4">
                                <p class="text-muted">등록된 코치가 없습니다. 회원 관리에서 역할(Role)을 'coach'로 변경해 주세요.</p>
                            </div>
                        <?php else: ?>
                            <?php foreach ($coaches as $coach): ?>
                                <div class="col-md-4 mb-4">
                                    <div class="card shadow-sm border-left-success">
                                        <div class="card-body">
                                            <div class="d-flex align-items-center">
                                                <div class="avatar-circle mr-3">
                                                    <?= strtoupper(substr($coach->username, 0, 1)) ?>
                                                </div>
                                                <div>
                                                    <h6 class="font-weight-bold mb-0"><?= esc($coach->username) ?></h6>
                                                    <small class="text-muted"><?= esc($coach->phone) ?></small>
                                                </div>
                                            </div>
                                            <div class="mt-3">
                                                <button class="btn btn-sm btn-block btn-outline-primary">배정 세션 보기</button>
                                                <button class="btn btn-sm btn-block btn-outline-secondary">근무 일정 관리</button>
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

<style>
    .avatar-circle {
        width: 45px;
        height: 45px;
        background-color: #1cc88a;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 1.2rem;
    }
</style>
<?= $this->endSection() ?>