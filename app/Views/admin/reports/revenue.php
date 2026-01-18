<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="card shadow mb-4">
        <div class="card-header py-3">
            <h6 class="m-0 font-weight-bold text-primary">월별 매출 통계 (<?= date('Y') ?>년)</h6>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>월</th>
                            <th>총 매출액</th>
                            <th>상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($revenue)): ?>
                            <tr>
                                <td colspan="3" class="text-center">조회된 매출 데이터가 없습니다.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($revenue as $rev): ?>
                                <tr>
                                    <td><?= $rev['month'] ?>월</td>
                                    <td class="font-weight-bold text-success">₩<?= number_format($rev['total']) ?></td>
                                    <td><span class="badge badge-success">정상</span></td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
<?= $this->endSection() ?>