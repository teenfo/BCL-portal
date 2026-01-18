<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="card shadow mb-4">
        <div class="card-header py-3">
            <h6 class="m-0 font-weight-bold text-primary">일별 출석 통계 (최근 7일)</h6>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>날짜</th>
                            <th>출석 횟수</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($dailyStats)): ?>
                            <tr>
                                <td colspan="2" class="text-center">통계 데이터가 없습니다.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($dailyStats as $stat): ?>
                                <tr>
                                    <td><?= esc($stat['date']) ?></td>
                                    <td class="font-weight-bold text-primary"><?= number_format($stat['count']) ?>회</td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
            <div class="mt-4 p-5 bg-light text-center rounded border">
                <i class="fas fa-chart-line fa-3x text-gray-300 mb-3"></i>
                <p class="text-muted">추가적인 시각화 차트는 Chart.js 연동 후 제공될 예정입니다.</p>
            </div>
        </div>
    </div>
</div>
<?= $this->endSection() ?>