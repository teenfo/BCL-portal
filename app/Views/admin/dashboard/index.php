<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <!-- Page Heading -->
    <div class="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 class="h3 mb-0 text-gray-800">대시보드</h1>
        <a href="#" class="d-none d-sm-inline-block btn btn-sm btn-primary shadow-sm"><i
                class="fas fa-download fa-sm text-white-50"></i> 리포트 생성</a>
    </div>

    <div class="row">

        <!-- Total Members Card -->
        <div class="col-xl-3 col-md-6 mb-4">
            <div class="card bg-primary text-white h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="me-3">
                            <div class="text-white-50 small uppercase fw-bold">전체 회원 수</div>
                            <div class="text-lg fw-bold"><?= number_format($stats['total_members']) ?>명</div>
                        </div>
                        <i class="fas fa-users fa-2x text-white-50"></i>
                    </div>
                </div>
                <div class="card-footer d-flex align-items-center justify-content-between small">
                    <a class="text-white stretched-link text-decoration-none"
                        href="<?= base_url('/admin/members') ?>">자세히 보기</a>
                    <div class="text-white"><i class="fas fa-angle-right"></i></div>
                </div>
            </div>
        </div>

        <!-- Today's Attendance Card -->
        <div class="col-xl-3 col-md-6 mb-4">
            <div class="card bg-success text-white h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="me-3">
                            <div class="text-white-50 small uppercase fw-bold">오늘 출석 인원</div>
                            <div class="text-lg fw-bold"><?= number_format($stats['today_attendance']) ?>명</div>
                        </div>
                        <i class="fas fa-calendar-check fa-2x text-white-50"></i>
                    </div>
                </div>
                <div class="card-footer d-flex align-items-center justify-content-between small">
                    <a class="text-white stretched-link text-decoration-none"
                        href="<?= base_url('/admin/attendance') ?>">로그 확인</a>
                    <div class="text-white"><i class="fas fa-angle-right"></i></div>
                </div>
            </div>
        </div>

        <!-- Monthly Revenue Card -->
        <div class="col-xl-3 col-md-6 mb-4">
            <div class="card bg-info text-white h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="me-3">
                            <div class="text-white-50 small uppercase fw-bold">이번 달 매출</div>
                            <div class="text-lg fw-bold">₩<?= number_format($stats['monthly_revenue']) ?></div>
                        </div>
                        <i class="fas fa-won-sign fa-2x text-white-50"></i>
                    </div>
                </div>
                <div class="card-footer d-flex align-items-center justify-content-between small">
                    <a class="text-white stretched-link text-decoration-none"
                        href="<?= base_url('/admin/reports/revenue') ?>">매출 리포트</a>
                    <div class="text-white"><i class="fas fa-angle-right"></i></div>
                </div>
            </div>
        </div>

        <!-- Active Sessions Card -->
        <div class="col-xl-3 col-md-6 mb-4">
            <div class="card bg-warning text-white h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="me-3">
                            <div class="text-white-50 small uppercase fw-bold">진행 예정 세션</div>
                            <div class="text-lg fw-bold"><?= $stats['active_sessions'] ?>개</div>
                        </div>
                        <i class="fas fa-clock fa-2x text-white-50"></i>
                    </div>
                </div>
                <div class="card-footer d-flex align-items-center justify-content-between small">
                    <a class="text-white stretched-link text-decoration-none"
                        href="<?= base_url('/admin/sessions/schedule') ?>">스케줄 보기</a>
                    <div class="text-white"><i class="fas fa-angle-right"></i></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Charts Row -->
    <div class="row">
        <!-- Area Chart -->
        <div class="col-xl-6">
            <div class="card mb-4">
                <div class="card-header">
                    <i class="fas fa-chart-area me-1"></i>
                    최근 출석 추이
                </div>
                <div class="card-body">
                    <div class="chart-area"
                        style="height: 300px; display: flex; align-items: center; justify-content: center;">
                        <p class="text-muted small">데이터를 불러오는 중...</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Bar Chart ( 분포 ) -->
        <div class="col-xl-6">
            <div class="card mb-4">
                <div class="card-header">
                    <i class="fas fa-chart-pie me-1"></i>
                    회원 분포
                </div>
                <div class="card-body">
                    <div class="chart-pie"
                        style="height: 300px; display: flex; align-items: center; justify-content: center;">
                        <p class="text-muted small">데이터를 불러오는 중...</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
<?= $this->endSection() ?>