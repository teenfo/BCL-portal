<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="card shadow mb-4">
        <div class="card-header py-3 d-flex justify-content-between align-items-center">
            <h6 class="m-0 font-weight-bold text-primary">Open API 관리</h6>
            <button class="btn btn-sm btn-primary">새 API 키 생성</button>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>명칭</th>
                            <th>API Key</th>
                            <th>만료일</th>
                            <th>상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($apiKeys)): ?>
                            <tr>
                                <td colspan="4" class="text-center">생성된 API 키가 없습니다.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($apiKeys as $key): ?>
                                <tr>
                                    <td><?= esc($key['name']) ?></td>
                                    <td><code><?= esc($key['api_key']) ?></code></td>
                                    <td><?= esc($key['expires_at'] ?? '무기한') ?></td>
                                    <td>
                                        <span class="badge badge-<?= $key['is_active'] ? 'success' : 'secondary' ?>">
                                            <?= $key['is_active'] ? '활성' : '만료' ?>
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