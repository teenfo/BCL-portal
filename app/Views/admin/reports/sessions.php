<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="row">
        <div class="col-lg-6">
            <div class="card shadow mb-4">
                <div class="card-header py-3">
                    <h6 class="m-0 font-weight-bold text-primary">세션 상태별 요약</h6>
                </div>
                <div class="card-body">
                    <ul class="list-group list-group-flush">
                        <?php if (empty($summary)): ?>
                            <li class="list-group-item text-center text-muted">데이터 없음</li>
                        <?php else: ?>
                            <?php foreach ($summary as $item): ?>
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    <?= esc($item['status']) ?>
                                    <span class="badge badge-primary badge-pill"><?= $item['count'] ?>건</span>
                                </li>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </ul>
                </div>
            </div>
        </div>
        <div class="col-lg-6">
            <div class="card shadow mb-4">
                <div class="card-header py-3">
                    <h6 class="m-0 font-weight-bold text-secondary">인기 수업 순위</h6>
                </div>
                <div class="card-body">
                    <p class="text-center text-muted py-4">예약 데이터를 바탕으로 분석 중입니다...</p>
                </div>
            </div>
        </div>
    </div>
</div>
<?= $this->endSection() ?>