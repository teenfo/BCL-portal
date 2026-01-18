<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="card shadow mb-4">
        <div class="card-header py-3">
            <h6 class="m-0 font-weight-bold text-primary">커뮤니티 게시글 관리</h6>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>카테고리</th>
                            <th>제목</th>
                            <th>작성자</th>
                            <th>작성일</th>
                            <th>노출상태</th>
                            <th>작업</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($posts)): ?>
                            <tr>
                                <td colspan="7" class="text-center">등록된 게시글이 없습니다.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($posts as $post): ?>
                                <tr>
                                    <td><?= $post['id'] ?></td>
                                    <td><span class="badge badge-light"><?= esc($post['category']) ?></span></td>
                                    <td><?= esc($post['title']) ?></td>
                                    <td><?= esc($post['username']) ?></td>
                                    <td><?= date('Y-m-d', strtotime($post['created_at'])) ?></td>
                                    <td>
                                        <?php if ($post['is_hidden']): ?>
                                            <span class="text-danger"><i class="fas fa-eye-slash mr-1"></i>숨김</span>
                                        <?php else: ?>
                                            <span class="text-success"><i class="fas fa-eye mr-1"></i>정상</span>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <button class="btn btn-sm btn-outline-danger">숨김처리</button>
                                        <button class="btn btn-sm btn-outline-secondary">조회</button>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
                <div class="d-flex justify-content-center mt-3">
                    <?= $pager->links() ?>
                </div>
            </div>
        </div>
    </div>
</div>
<?= $this->endSection() ?>