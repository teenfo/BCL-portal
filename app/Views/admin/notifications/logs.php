<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="card shadow mb-4">
        <div class="card-header py-3">
            <h6 class="m-0 font-weight-bold text-primary">메시지 발송 이력</h6>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>발송 일시</th>
                            <th>수신자</th>
                            <th>템플릿/제목</th>
                            <th>상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($logs)): ?>
                            <tr>
                                <td colspan="4" class="text-center">발송 기록이 없습니다.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($logs as $log): ?>
                                <tr>
                                    <td><?= esc($log['sent_at']) ?></td>
                                    <td><?= esc($log['receiver_name']) ?></td>
                                    <td><?= esc($log['template_name'] ?? '커스텀 메시지') ?></td>
                                    <td>
                                        <span
                                            class="badge badge-<?= $log['status'] === 'Delivered' ? 'success' : 'secondary' ?>">
                                            <?= esc($log['status']) ?>
                                        </span>
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