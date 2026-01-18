<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="card shadow mb-4">
        <div class="card-header py-3">
            <h6 class="m-0 font-weight-bold text-primary">코치별 성과 지표</h6>
        </div>
        <div class="card-body text-center py-5">
            <i class="fas fa-user-tie fa-4x text-gray-200 mb-3"></i>
            <h5>코치별 수업 횟수 및 회원 평점 분석</h5>
            <p class="text-muted">상세 성과 지표는 세션 종료 후 설문 데이터 수집 시 활성화됩니다.</p>
        </div>
    </div>
</div>
<?= $this->endSection() ?>