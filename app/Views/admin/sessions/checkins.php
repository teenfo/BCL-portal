<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="row">
        <div class="col-lg-12">
            <div class="card shadow mb-4">
                <div class="card-header py-3 d-flex justify-content-between align-items-center">
                    <h6 class="m-0 font-weight-bold text-primary">오늘의 실시간 체크인 현황</h6>
                    <span class="badge badge-danger blink">Live</span>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-bordered">
                            <thead>
                                <tr>
                                    <th>시간</th>
                                    <th>회원명</th>
                                    <th>수업/활동</th>
                                    <th>인증 방식</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (empty($checkins)): ?>
                                    <tr>
                                        <td colspan="4" class="text-center py-4">오늘 입장 기록이 아직 없습니다.</td>
                                    </tr>
                                <?php else: ?>
                                    <?php foreach ($checkins as $checkin): ?>
                                        <tr>
                                            <td><?= date('H:i:s', strtotime($checkin['checkin_at'])) ?></td>
                                            <td class="font-weight-bold"><?= esc($checkin['member_name']) ?></td>
                                            <td><?= $checkin['session_title'] ? esc($checkin['session_title']) : '자율 입장' ?></td>
                                            <td><span class="badge badge-light"><?= esc($checkin['method']) ?></span></td>
                                        </tr>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .blink {
        animation: blinker 1.5s linear infinite;
    }

    @keyframes blinker {
        50% {
            opacity: 0;
        }
    }
</style>
<?= $this->endSection() ?>