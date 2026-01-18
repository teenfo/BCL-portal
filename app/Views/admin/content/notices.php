<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="card shadow mb-4">
        <div class="card-header py-3 d-flex justify-content-between align-items-center">
            <h6 class="m-0 font-weight-bold text-primary">공지사항 관리</h6>
            <button class="btn btn-sm btn-primary"><i class="fas fa-edit mr-1"></i>새 공지 작성</button>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>제목</th>
                            <th>작성자</th>
                            <th>등록일</th>
                            <th>조회수</th>
                            <th>상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($notices)): ?>
                            <tr>
                                <td colspan="6" class="text-center">등록된 공지사항이 없습니다.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($notices as $notice): ?>
                                <tr class="<?= $notice['is_pinned'] ? 'bg-light' : '' ?>">
                                    <td>
                                        <?php if ($notice['is_pinned']): ?>
                                            <i class="fas fa-thumbtack text-primary"></i>
                                        <?php else: ?>
                                            <?= $notice['id'] ?>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <a href="#" class="font-weight-bold text-dark"><?= esc($notice['title']) ?></a>
                                    </td>
                                    <td><?= esc($notice['author_name']) ?></td>
                                    <td><?= date('Y-m-d', strtotime($notice['created_at'])) ?></td>
                                    <td><?= number_format($notice['view_count']) ?></td>
                                    <td>
                                        <span class="badge badge-<?= $notice['is_published'] ? 'success' : 'secondary' ?>">
                                            <?= $notice['is_published'] ? '게시중' : '임시저장' ?>
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