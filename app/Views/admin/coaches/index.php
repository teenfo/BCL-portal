<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="card shadow mb-4">
        <div class="card-header py-3 d-flex justify-content-between align-items-center">
            <h6 class="m-0 font-weight-bold text-primary">코치진 명단</h6>
            <a href="<?= base_url('admin/members') ?>" class="btn btn-sm btn-outline-secondary">
                <i class="fas fa-users mr-1"></i>회원 관리에서 코치 등록
            </a>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-hover" id="coachesTable" width="100%" cellspacing="0">
                    <thead>
                        <tr>
                            <th>성명</th>
                            <th>연락처</th>
                            <th>전문 분야</th>
                            <th>경력</th>
                            <th>상태</th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($coaches)): ?>
                            <tr>
                                <td colspan="6" class="text-center">등록된 코치가 없습니다.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($coaches as $coach): ?>
                                <tr>
                                    <td>
                                        <div class="d-flex align-items-center">
                                            <div class="avatar-sm mr-2"
                                                style="width: 30px; height: 30px; background: #eee; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">
                                                <?= strtoupper(substr($coach->username, 0, 1)) ?>
                                            </div>
                                            <span class="font-weight-bold"><?= esc($coach->username) ?></span>
                                        </div>
                                    </td>
                                    <td><?= esc($coach->phone) ?></td>
                                    <td>
                                        <?php
                                        $specialties = json_decode($coach->specialties ?? '[]', true);
                                        foreach ($specialties as $s)
                                            echo '<span class="badge badge-light mr-1">' . esc($s) . '</span>';
                                        ?>
                                    </td>
                                    <td><?= $coach->experience_years ?? 0 ?>년</td>
                                    <td>
                                        <span class="badge badge-<?= $coach->active ? 'success' : 'secondary' ?>">
                                            <?= $coach->active ? '활동중' : '중지' ?>
                                        </span>
                                    </td>
                                    <td>
                                        <a href="<?= base_url('admin/coaches/' . $coach->id) ?>"
                                            class="btn btn-sm btn-primary">프로필</a>
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