<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="card shadow mb-4">
        <div class="card-header py-3 d-flex justify-content-between align-items-center">
            <h6 class="m-0 font-weight-bold text-primary">메시지 및 알림 템플릿</h6>
            <button class="btn btn-sm btn-primary">새 템플릿 추가</button>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>템플릿명</th>
                            <th>발송 유형</th>
                            <th>설정 상태</th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($templates)): ?>
                            <tr>
                                <td colspan="4" class="text-center">등록된 템플릿이 없습니다.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($templates as $template): ?>
                                <tr>
                                    <td class="font-weight-bold"><?= esc($template['name']) ?></td>
                                    <td>
                                        <span class="badge badge-info"><?= esc($template['type']) ?></span>
                                    </td>
                                    <td>
                                        <span class="badge badge-<?= $template['is_active'] ? 'success' : 'secondary' ?>">
                                            <?= $template['is_active'] ? '활성' : '비활성' ?>
                                        </span>
                                    </td>
                                    <td>
                                        <button class="btn btn-sm btn-outline-secondary">수정</button>
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