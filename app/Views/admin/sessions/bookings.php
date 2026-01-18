<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="card shadow mb-4">
        <div class="card-header py-3">
            <h6 class="m-0 font-weight-bold text-primary">예약 및 대기열 관리</h6>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>예약일시</th>
                            <th>수업 정보</th>
                            <th>회원명</th>
                            <th>상태</th>
                            <th>대기순번</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($bookings)): ?>
                            <tr>
                                <td colspan="5" class="text-center">조회된 예약 내역이 없습니다.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($bookings as $booking): ?>
                                <tr>
                                    <td><?= esc($booking['created_at']) ?></td>
                                    <td>
                                        <div class="small font-weight-bold"><?= esc($booking['session_title']) ?></div>
                                        <div class="small text-muted"><?= esc($booking['start_at']) ?></div>
                                    </td>
                                    <td><?= esc($booking['member_name']) ?></td>
                                    <td>
                                        <span class="badge badge-primary"><?= esc($booking['status']) ?></span>
                                    </td>
                                    <td><?= $booking['waiting_order'] ?? '-' ?></td>
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