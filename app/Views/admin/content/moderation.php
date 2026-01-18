<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="row">
        <div class="col-lg-6">
            <div class="card shadow mb-4">
                <div class="card-header py-3">
                    <h6 class="m-0 font-weight-bold text-primary">미처리 신고 내역</h6>
                </div>
                <div class="card-body">
                    <p class="text-center text-muted py-5">현재 대기 중인 신고 사항이 없습니다.</p>
                </div>
            </div>
        </div>
        <div class="col-lg-6">
            <div class="card shadow mb-4">
                <div class="card-header py-3">
                    <h6 class="m-0 font-weight-bold text-secondary">최근 댓글 현황</h6>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table small">
                            <thead>
                                <tr>
                                    <th>댓글 내용</th>
                                    <th>작성자</th>
                                    <th>작업</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colspan="3" class="text-center">댓글 내역이 없습니다.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
<?= $this->endSection() ?>