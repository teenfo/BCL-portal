<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="card shadow mb-4 border-left-danger">
        <div class="card-header py-3">
            <h6 class="m-0 font-weight-bold text-danger">시스템 에러 로그</h6>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>시간</th>
                            <th>위험도</th>
                            <th>메시지</th>
                            <th>URL</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($errors)): ?>
                            <tr>
                                <td colspan="4" class="text-center py-4">현재 기록된 에러가 없습니다.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($errors as $error): ?>
                                <tr>
                                    <td><small><?= esc($error['created_at']) ?></small></td>
                                    <td><span class="badge badge-danger"><?= esc($error['severity']) ?></span></td>
                                    <td class="text-truncate" style="max-width: 300px;"><?= esc($error['message']) ?></td>
                                    <td><small class="text-muted"><?= esc($error['url']) ?></small></td>
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