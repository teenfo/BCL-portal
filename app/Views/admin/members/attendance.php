<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="card shadow mb-4">
        <div class="card-header py-3 d-flex justify-content-between align-items-center">
            <h6 class="m-0 font-weight-bold text-primary">출결 및 체크인 로그</h6>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-bordered" width="100%" cellspacing="0">
                    <thead>
                        <tr>
                            <th>일시</th>
                            <th>수행자(회원)</th>
                            <th>체크인 방식</th>
                            <th>상태</th>
                            <th>관련 세션</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($logs)): ?>
                            <tr>
                                <td colspan="5" class="text-center">조회된 내역이 없습니다.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($logs as $log): ?>
                                <tr>
                                    <td><?= esc($log['checkin_at']) ?></td>
                                    <td><?= esc($log['member_name']) ?></td>
                                    <td>
                                        <span class="badge badge-info"><?= esc($log['method']) ?></span>
                                    </td>
                                    <td>
                                        <?php if ($log['status'] === 'Present'): ?>
                                            <span class="text-success"><i class="fas fa-check-circle mr-1"></i>출석</span>
                                        <?php else: ?>
                                            <span class="text-warning"><?= esc($log['status']) ?></span>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <?= $log['session_id'] ? '세션 ID: ' . $log['session_id'] : '자율 이용' ?>
                                    </td>
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