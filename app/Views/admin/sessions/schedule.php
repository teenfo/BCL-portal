<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="card shadow mb-4">
        <div class="card-header py-3 d-flex justify-content-between align-items-center">
            <h6 class="m-0 font-weight-bold text-primary">세션 및 수업 스케줄</h6>
            <button class="btn btn-sm btn-primary"><i class="fas fa-calendar-plus mr-1"></i>일정 등록</button>
        </div>
        <div class="card-body">
            <!-- Simple Table View as placeholder for Calendar -->
            <div class="table-responsive">
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>시작 시각</th>
                            <th>수업명</th>
                            <th>코치</th>
                            <th>인원(예약/정원)</th>
                            <th>상태</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($sessions)): ?>
                            <tr>
                                <td colspan="5" class="text-center">등록된 수업 일정이 없습니다.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($sessions as $session): ?>
                                <tr>
                                    <td><?= esc($session['start_at']) ?></td>
                                    <td class="font-weight-bold text-primary"><?= esc($session['title']) ?></td>
                                    <td><?= esc($session['coach_name']) ?></td>
                                    <td>
                                        <span class="badge badge-light">? / <?= esc($session['capacity']) ?></span>
                                    </td>
                                    <td>
                                        <span class="badge badge-info"><?= esc($session['status']) ?></span>
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