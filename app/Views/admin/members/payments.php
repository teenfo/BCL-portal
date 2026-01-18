<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="card shadow mb-4">
        <div class="card-header py-3">
            <h6 class="m-0 font-weight-bold text-primary">전체 결제 내역</h6>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-hover" width="100%" cellspacing="0">
                    <thead>
                        <tr>
                            <th>결제 일시</th>
                            <th>회원명</th>
                            <th>상품명</th>
                            <th>결제 금액</th>
                            <th>수단</th>
                            <th>상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($payments)): ?>
                            <tr>
                                <td colspan="6" class="text-center">결제 내역이 없습니다.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($payments as $payment): ?>
                                <tr>
                                    <td><?= esc($payment['created_at']) ?></td>
                                    <td><?= esc($payment['member_name']) ?></td>
                                    <td><?= esc($payment['plan_name']) ?></td>
                                    <td class="font-weight-bold">₩<?= number_format($payment['amount']) ?></td>
                                    <td><?= esc($payment['method']) ?></td>
                                    <td>
                                        <?php if ($payment['status'] === 'Success'): ?>
                                            <span class="badge badge-success">결제완료</span>
                                        <?php else: ?>
                                            <span class="badge badge-secondary"><?= esc($payment['status']) ?></span>
                                        <?php endif; ?>
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