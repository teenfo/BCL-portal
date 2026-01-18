<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="row">
        <!-- Coach Info Card -->
        <div class="col-xl-4 col-lg-5">
            <div class="card shadow mb-4">
                <div class="card-body text-center">
                    <div class="mb-3">
                        <img class="img-profile rounded-circle"
                            src="<?= base_url($coach->avatar ?? 'assets/img/undraw_profile.svg') ?>"
                            style="width: 150px; height: 150px; object-fit: cover;">
                    </div>
                    <h4 class="font-weight-bold"><?= esc($coach->username) ?></h4>
                    <p class="text-muted"><?= esc($coach->email) ?></p>
                    <div class="d-flex justify-content-center mb-2">
                        <span class="badge badge-success px-3 py-2">Coach</span>
                    </div>
                    <hr>
                    <div class="text-left small">
                        <p class="mb-1"><strong>연락처:</strong> <?= esc($coach->phone) ?></p>
                        <p class="mb-1"><strong>성별:</strong>
                            <?= esc($coach->gender === 'M' ? '남성' : ($coach->gender === 'F' ? '여성' : '미설정')) ?></p>
                        <p class="mb-1"><strong>생년월일:</strong> <?= esc($coach->birthdate ?? '-') ?></p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Coach Details Card -->
        <div class="col-xl-8 col-lg-7">
            <div class="card shadow mb-4">
                <div class="card-header py-3 d-flex justify-content-between align-items-center">
                    <h6 class="m-0 font-weight-bold text-primary">전문 분야 및 경력 사항</h6>
                    <button class="btn btn-sm btn-primary">상세 수정</button>
                </div>
                <div class="card-body">
                    <div class="mb-4">
                        <label class="font-weight-bold text-dark">전문 분야</label>
                        <div>
                            <?php
                            $specialties = json_decode($details['specialties'] ?? '[]', true);
                            if (empty($specialties))
                                echo '<p class="text-muted small">등록된 정보가 없습니다.</p>';
                            foreach ($specialties as $s)
                                echo '<span class="badge badge-info mr-2 px-3 py-2">' . esc($s) . '</span>';
                            ?>
                        </div>
                    </div>

                    <div class="mb-4">
                        <label class="font-weight-bold text-dark">자기소개 / 약력</label>
                        <div class="p-3 bg-light rounded border">
                            <?= nl2br(esc($details['bio'] ?? '입력된 정보가 없습니다.')) ?>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-6">
                            <label class="font-weight-bold text-dark">자격 사항</label>
                            <p class="small"><?= esc($details['certifications'] ?? '-') ?></p>
                        </div>
                        <div class="col-6">
                            <label class="font-weight-bold text-dark">총 경력</label>
                            <p class="small"><?= $details['experience_years'] ?? 0 ?>년</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Sessions table placeholder -->
            <div class="card shadow mb-4">
                <div class="card-header py-3">
                    <h6 class="m-0 font-weight-bold text-secondary">담당 수업 이력</h6>
                </div>
                <div class="card-body">
                    <p class="text-center text-muted py-4">최근 진행한 수업이 없습니다.</p>
                </div>
            </div>
        </div>
    </div>
</div>
<?= $this->endSection() ?>