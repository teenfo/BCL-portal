<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card shadow mb-4">
                <div class="card-header py-3">
                    <h6 class="m-0 font-weight-bold text-primary">운영 정책 설정</h6>
                </div>
                <div class="card-body">
                    <?php if (session()->getFlashdata('message')): ?>
                        <div class="alert alert-success alert-dismissible fade show" role="alert">
                            <?= session()->getFlashdata('message') ?>
                            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                    <?php endif; ?>

                    <form action="<?= base_url('admin/settings/policies') ?>" method="post">
                        <?= csrf_field() ?>

                        <div class="table-responsive">
                            <table class="table table-bordered">
                                <thead class="bg-light">
                                    <tr>
                                        <th>정책 항목</th>
                                        <th>설정값</th>
                                        <th>단위</th>
                                        <th>설명</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($policies as $policy): ?>
                                        <tr>
                                            <td>
                                                <span class="font-weight-bold"><?= esc($policy['policy_key']) ?></span>
                                            </td>
                                            <td>
                                                <input type="text" name="policies[<?= esc($policy['policy_key']) ?>]"
                                                    class="form-control" value="<?= esc($policy['policy_value']) ?>">
                                            </td>
                                            <td>
                                                <span class="badge badge-secondary"><?= esc($policy['unit']) ?></span>
                                            </td>
                                            <td>
                                                <small class="text-muted"><?= esc($policy['description']) ?></small>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>

                        <div class="mt-4 d-flex justify-content-end">
                            <button type="submit" class="btn btn-primary">정책 저장</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Policy History Card (Optional Implementation) -->
            <div class="card shadow mb-4">
                <div class="card-header py-3">
                    <h6 class="m-0 font-weight-bold text-secondary">정책 변경 이력</h6>
                </div>
                <div class="card-body">
                    <p class="text-center text-muted py-4">최근 변경 이력이 없습니다.</p>
                </div>
            </div>
        </div>
    </div>
</div>
<?= $this->endSection() ?>