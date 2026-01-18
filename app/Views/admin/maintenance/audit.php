<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="card shadow mb-4">
        <div class="card-header py-3">
            <h6 class="m-0 font-weight-bold text-primary">관리자 액션 로그(Audit)</h6>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-bordered small">
                    <thead>
                        <tr>
                            <th>시간</th>
                            <th>수행자</th>
                            <th>이벤트</th>
                            <th>대상 테이블</th>
                            <th>대상 ID</th>
                            <th>IP 주소</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($logs)): ?>
                            <tr>
                                <td colspan="6" class="text-center">기록된 로그가 없습니다.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($logs as $log): ?>
                                <tr>
                                    <td><?= esc($log['created_at']) ?></td>
                                    <td><?= esc($log['username'] ?? 'System') ?></td>
                                    <td><span class="badge badge-light"><?= esc($log['event']) ?></span></td>
                                    <td><?= esc($log['table_name']) ?></td>
                                    <td><?= esc($log['target_id']) ?></td>
                                    <td><?= esc($log['ip_address']) ?></td>
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