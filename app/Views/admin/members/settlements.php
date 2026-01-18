<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="card shadow mb-4">
        <div class="card-header py-3">
            <h6 class="m-0 font-weight-bold text-primary">환불 및 정산 관리</h6>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>신청 일시</th>
                            <th>회원명</th>
                            <th>환불금액</th>
                            <th>상태</th>
                            <th>ID/번호</th>
                            <th>사유</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($refunds)): ?>
                            <tr>
                                <td colspan="6" class="text-center">현재 처리 중인 환불 내역이 없습니다.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($refunds as $refund): ?>
                                <tr>
                                    <td><?= esc($refund['created_at']) ?></td>
                                    <td><?= esc($refund['member_name']) ?></td>
                                    <td class="text-danger font-weight-bold">-₩<?= number_format($refund['amount']) ?></td>
                                    <td>
                                        <span class="badge badge-warning"><?= esc($refund['status']) ?></span>
                                    </td>
                                    <td><small class="text-muted"><?= esc($refund['transaction_id']) ?></small></td>
                                    <td><?= esc($refund['reason']) ?></td>
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