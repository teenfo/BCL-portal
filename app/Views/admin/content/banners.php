<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card shadow mb-4">
                <div class="card-header py-3 d-flex justify-content-between align-items-center">
                    <h6 class="m-0 font-weight-bold text-primary">배너 및 팝업 설정</h6>
                    <button class="btn btn-sm btn-primary">배너 업로드</button>
                </div>
                <div class="card-body">
                    <div class="row">
                        <?php if (empty($banners)): ?>
                            <div class="col-12 text-center py-5">
                                <p class="text-muted">활성화된 배너가 없습니다.</p>
                            </div>
                        <?php else: ?>
                            <?php foreach ($banners as $banner): ?>
                                <div class="col-md-4 mb-4">
                                    <div class="card h-100 shadow-sm">
                                        <img src="<?= esc($banner['image_url']) ?>" class="card-img-top" alt="Banner Image"
                                            onerror="this.src='https://placehold.co/600x300?text=No+Image'">
                                        <div class="card-body">
                                            <h6 class="font-weight-bold"><?= esc($banner['title']) ?></h6>
                                            <p class="small text-muted mb-1">위치: <?= esc($banner['position']) ?></p>
                                            <p class="small text-muted mb-2">순서: <?= esc($banner['sort_order']) ?></p>
                                            <div class="d-flex justify-content-between align-items-center">
                                                <span class="badge badge-<?= $banner['is_active'] ? 'success' : 'secondary' ?>">
                                                    <?= $banner['is_active'] ? '사용중' : '사용안함' ?>
                                                </span>
                                                <div>
                                                    <button class="btn btn-sm btn-outline-secondary">편집</button>
                                                </div>
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
<?= $this->endSection() ?>