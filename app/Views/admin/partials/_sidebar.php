<?php
$current_uri = uri_string();
function is_active($path)
{
    $current = uri_string();
    $path = ltrim($path, '/');
    if ($path === 'admin' && ($current === 'admin' || $current === 'admin/dashboard'))
        return 'active';

    if (strpos($current, $path) === 0) {
        $rest = substr($current, strlen($path));
        if ($rest === '' || $rest[0] === '/') {
            return 'active';
        }
    }
    return '';
}

/**
 * Checks if ANY of the provided paths are active.
 * Used for keeping collapse sections open.
 */
function is_section_active(array $paths)
{
    foreach ($paths as $path) {
        if (is_active($path) === 'active') {
            return true;
        }
    }
    return false;
}
?>

<nav class="sb-sidenav accordion sb-sidenav-light border-end border-border" id="sidenavAccordion">
    <div class="sb-sidenav-menu">
        <div class="nav">
            <div class="sb-sidenav-menu-heading text-xs uppercase opacity-50">Core</div>
            <a class="nav-link text-fg" href="<?= base_url('/') ?>">
                <div class="sb-nav-link-icon text-muted"><i class="fas fa-home"></i></div>
                HOME
            </a>
            <a class="nav-link text-fg <?= is_active('/admin/dashboard') ?>" href="<?= base_url('/admin/dashboard') ?>">
                <div class="sb-nav-link-icon text-primary"><i class="fas fa-tachometer-alt"></i></div>
                대시보드
            </a>

            <div class="sb-sidenav-menu-heading text-xs uppercase opacity-50">회원관리</div>
            <a class="nav-link text-fg <?= is_active('/admin/members') ?>" href="<?= base_url('/admin/members') ?>">
                <div class="sb-nav-link-icon text-muted"><i class="fas fa-users"></i></div>
                회원 목록
            </a>
            <a class="nav-link text-fg <?= is_active('/admin/attendance') ?>"
                href="<?= base_url('/admin/attendance') ?>">
                <div class="sb-nav-link-icon text-muted"><i class="fas fa-clipboard-check"></i></div>
                출결·체크인 로그
            </a>

            <?php $billingActive = is_section_active(['/admin/billing', '/admin/memberships']); ?>
            <a class="nav-link text-fg <?= $billingActive ? '' : 'collapsed' ?>" href="#" data-bs-toggle="collapse"
                data-bs-target="#collapseBilling" aria-expanded="<?= $billingActive ? 'true' : 'false' ?>"
                aria-controls="collapseBilling">
                <div class="sb-nav-link-icon text-muted"><i class="fas fa-credit-card"></i></div>
                멤버십·결제
                <div class="sb-sidenav-collapse-arrow"><i class="fas fa-angle-down"></i></div>
            </a>
            <div class="collapse <?= $billingActive ? 'show' : '' ?>" id="collapseBilling"
                aria-labelledby="headingBilling" data-bs-parent="#sidenavAccordion">
                <nav class="sb-sidenav-menu-nested nav">
                    <a class="nav-link text-fg <?= is_active('/admin/memberships/plans') ?>"
                        href="<?= base_url('/admin/memberships/plans') ?>">플랜 관리</a>
                    <a class="nav-link text-fg <?= is_active('/admin/billing/payments') ?>"
                        href="<?= base_url('/admin/billing/payments') ?>">결제 내역</a>
                    <a class="nav-link text-fg <?= is_active('/admin/billing/settlements') ?>"
                        href="<?= base_url('/admin/billing/settlements') ?>">환불·정산</a>
                </nav>
            </div>

            <a class="nav-link text-fg <?= is_active('/admin/roles') ?>" href="<?= base_url('/admin/roles') ?>">
                <div class="sb-nav-link-icon text-muted"><i class="fas fa-user-shield"></i></div>
                권한·그룹
            </a>

            <div class="sb-sidenav-menu-heading text-xs uppercase opacity-50">시설·세션 운영</div>
            <?php $sessionsActive = is_section_active(['/admin/sessions']); ?>
            <a class="nav-link text-fg <?= $sessionsActive ? '' : 'collapsed' ?>" href="#" data-bs-toggle="collapse"
                data-bs-target="#collapseSessions" aria-expanded="<?= $sessionsActive ? 'true' : 'false' ?>"
                aria-controls="collapseSessions">
                <div class="sb-nav-link-icon text-muted"><i class="fas fa-calendar-alt"></i></div>
                세션 운영
                <div class="sb-sidenav-collapse-arrow"><i class="fas fa-angle-down"></i></div>
            </a>
            <div class="collapse <?= $sessionsActive ? 'show' : '' ?>" id="collapseSessions"
                aria-labelledby="headingSessions" data-bs-parent="#sidenavAccordion">
                <nav class="sb-sidenav-menu-nested nav">
                    <a class="nav-link text-fg <?= is_active('/admin/sessions/schedule') ?>"
                        href="<?= base_url('/admin/sessions/schedule') ?>">세션·수업 스케줄</a>
                    <a class="nav-link text-fg <?= is_active('/admin/sessions/bookings') ?>"
                        href="<?= base_url('/admin/sessions/bookings') ?>">예약·대기열 관리</a>
                    <a class="nav-link text-fg <?= is_active('/admin/sessions/checkins') ?>"
                        href="<?= base_url('/admin/sessions/checkins') ?>">체크인 현황</a>
                    <a class="nav-link text-fg <?= is_active('/admin/sessions/assignments') ?>"
                        href="<?= base_url('/admin/sessions/assignments') ?>">코치 배정·교체</a>
                </nav>
            </div>

            <?php $coachesActive = is_section_active(['/admin/coaches']); ?>
            <a class="nav-link text-fg <?= $coachesActive ? '' : 'collapsed' ?>" href="#" data-bs-toggle="collapse"
                data-bs-target="#collapseCoaches" aria-expanded="<?= $coachesActive ? 'true' : 'false' ?>"
                aria-controls="collapseCoaches">
                <div class="sb-nav-link-icon text-muted"><i class="fas fa-user-tie"></i></div>
                코치 관리
                <div class="sb-sidenav-collapse-arrow"><i class="fas fa-angle-down"></i></div>
            </a>
            <div class="collapse <?= $coachesActive ? 'show' : '' ?>" id="collapseCoaches"
                data-bs-parent="#sidenavAccordion">
                <nav class="sb-sidenav-menu-nested nav">
                    <a class="nav-link text-fg <?= is_active('/admin/coaches') ?>"
                        href="<?= base_url('/admin/coaches') ?>">코치 목록</a>
                </nav>
            </div>

            <div class="sb-sidenav-menu-heading text-xs uppercase opacity-50">콘텐츠·보고서</div>
            <?php $contentActive = is_section_active(['/admin/content']); ?>
            <a class="nav-link text-fg <?= $contentActive ? '' : 'collapsed' ?>" href="#" data-bs-toggle="collapse"
                data-bs-target="#collapseContent" aria-expanded="<?= $contentActive ? 'true' : 'false' ?>"
                aria-controls="collapseContent">
                <div class="sb-nav-link-icon text-muted"><i class="fas fa-edit"></i></div>
                콘텐츠 관리
                <div class="sb-sidenav-collapse-arrow"><i class="fas fa-angle-down"></i></div>
            </a>
            <div class="collapse <?= $contentActive ? 'show' : '' ?>" id="collapseContent"
                data-bs-parent="#sidenavAccordion">
                <nav class="sb-sidenav-menu-nested nav">
                    <a class="nav-link text-fg <?= is_active('/admin/content/notices') ?>"
                        href="<?= base_url('/admin/content/notices') ?>">공지사항</a>
                    <a class="nav-link text-fg <?= is_active('/admin/content/banners') ?>"
                        href="<?= base_url('/admin/content/banners') ?>">운영 공지/배너</a>
                    <a class="nav-link text-fg <?= is_active('/admin/content/posts') ?>"
                        href="<?= base_url('/admin/content/posts') ?>">게시글 관리</a>
                    <a class="nav-link text-fg <?= is_active('/admin/content/moderation') ?>"
                        href="<?= base_url('/admin/content/moderation') ?>">댓글/신고 관리</a>
                </nav>
            </div>

            <?php $reportsActive = is_section_active(['/admin/reports']); ?>
            <a class="nav-link text-fg <?= $reportsActive ? '' : 'collapsed' ?>" href="#" data-bs-toggle="collapse"
                data-bs-target="#collapseReports" aria-expanded="<?= $reportsActive ? 'true' : 'false' ?>"
                aria-controls="collapseReports">
                <div class="sb-nav-link-icon text-muted"><i class="fas fa-chart-bar"></i></div>
                리포트
                <div class="sb-sidenav-collapse-arrow"><i class="fas fa-angle-down"></i></div>
            </a>
            <div class="collapse <?= $reportsActive ? 'show' : '' ?>" id="collapseReports"
                data-bs-parent="#sidenavAccordion">
                <nav class="sb-sidenav-menu-nested nav">
                    <a class="nav-link text-fg <?= is_active('/admin/reports/attendance') ?>"
                        href="<?= base_url('/admin/reports/attendance') ?>">출석 리포트</a>
                    <a class="nav-link text-fg <?= is_active('/admin/reports/sessions') ?>"
                        href="<?= base_url('/admin/reports/sessions') ?>">세션 운영 리포트</a>
                    <a class="nav-link text-fg <?= is_active('/admin/reports/revenue') ?>"
                        href="<?= base_url('/admin/reports/revenue') ?>">매출·정산 리포트</a>
                    <a class="nav-link text-fg <?= is_active('/admin/reports/coaches') ?>"
                        href="<?= base_url('/admin/reports/coaches') ?>">코치 성과 리포트</a>
                </nav>
            </div>

            <div class="sb-sidenav-menu-heading text-xs uppercase opacity-50">시스템 관리</div>
            <?php $notifActive = is_section_active(['/admin/notifications']); ?>
            <a class="nav-link text-fg <?= $notifActive ? '' : 'collapsed' ?>" href="#" data-bs-toggle="collapse"
                data-bs-target="#collapseNotifications" aria-expanded="<?= $notifActive ? 'true' : 'false' ?>"
                aria-controls="collapseNotifications">
                <div class="sb-nav-link-icon text-muted"><i class="fas fa-envelope"></i></div>
                알림·메시지
                <div class="sb-sidenav-collapse-arrow"><i class="fas fa-angle-down"></i></div>
            </a>
            <div class="collapse <?= $notifActive ? 'show' : '' ?>" id="collapseNotifications"
                data-bs-parent="#sidenavAccordion">
                <nav class="sb-sidenav-menu-nested nav">
                    <a class="nav-link text-fg <?= is_active('/admin/notifications/templates') ?>"
                        href="<?= base_url('/admin/notifications/templates') ?>">템플릿 관리</a>
                    <a class="nav-link text-fg <?= is_active('/admin/notifications/logs') ?>"
                        href="<?= base_url('/admin/notifications/logs') ?>">발송 로그</a>
                    <a class="nav-link text-fg <?= is_active('/admin/notifications/rules') ?>"
                        href="<?= base_url('/admin/notifications/rules') ?>">자동 발송 규칙</a>
                </nav>
            </div>

            <div class="sb-sidenav-menu-heading text-xs uppercase opacity-50">통합·연동</div>
            <?php $integrationsActive = is_section_active(['/admin/integrations']); ?>
            <a class="nav-link text-fg <?= $integrationsActive ? '' : 'collapsed' ?>" href="#" data-bs-toggle="collapse"
                data-bs-target="#collapseIntegrations" aria-expanded="<?= $integrationsActive ? 'true' : 'false' ?>"
                aria-controls="collapseIntegrations">
                <div class="sb-nav-link-icon text-muted"><i class="fas fa-plug"></i></div>
                통합·연동
                <div class="sb-sidenav-collapse-arrow"><i class="fas fa-angle-down"></i></div>
            </a>
            <div class="collapse <?= $integrationsActive ? 'show' : '' ?>" id="collapseIntegrations"
                data-bs-parent="#sidenavAccordion">
                <nav class="sb-sidenav-menu-nested nav">
                    <a class="nav-link text-fg <?= is_active('/admin/integrations/payments') ?>"
                        href="<?= base_url('/admin/integrations/payments') ?>">결제 연동 설정</a>
                    <a class="nav-link text-fg <?= is_active('/admin/integrations/api') ?>"
                        href="<?= base_url('/admin/integrations/api') ?>">외부 시스템 연동</a>
                    <a class="nav-link text-fg <?= is_active('/admin/integrations/data') ?>"
                        href="<?= base_url('/admin/integrations/data') ?>">데이터 내보내기/가져오기</a>
                </nav>
            </div>

            <?php $settingsActive = is_section_active(['/admin/settings']); ?>
            <a class="nav-link text-fg <?= $settingsActive ? '' : 'collapsed' ?>" href="#" data-bs-toggle="collapse"
                data-bs-target="#collapseSettings" aria-expanded="<?= $settingsActive ? 'true' : 'false' ?>"
                aria-controls="collapseSettings">
                <div class="sb-nav-link-icon text-muted"><i class="fas fa-cogs"></i></div>
                설정
                <div class="sb-sidenav-collapse-arrow"><i class="fas fa-angle-down"></i></div>
            </a>
            <div class="collapse <?= $settingsActive ? 'show' : '' ?>" id="collapseSettings"
                data-bs-parent="#sidenavAccordion">
                <nav class="sb-sidenav-menu-nested nav">
                    <a class="nav-link text-fg <?= is_active('/admin/settings/facility') ?>"
                        href="<?= base_url('/admin/settings/facility') ?>">지점/시설 정보</a>
                    <a class="nav-link text-fg <?= is_active('/admin/settings/policies') ?>"
                        href="<?= base_url('/admin/settings/policies') ?>">운영 정책</a>
                    <a class="nav-link text-fg <?= is_active('/admin/settings/memberships') ?>"
                        href="<?= base_url('/admin/settings/memberships') ?>">멤버십 상품 정책</a>
                    <a class="nav-link text-fg <?= is_active('/admin/settings/access') ?>"
                        href="<?= base_url('/admin/settings/access') ?>">권한 정책</a>
                </nav>
            </div>

            <?php $maintenanceActive = is_section_active(['/admin/maintenance']); ?>
            <a class="nav-link text-fg <?= $maintenanceActive ? '' : 'collapsed' ?>" href="#" data-bs-toggle="collapse"
                data-bs-target="#collapseMaintenance" aria-expanded="<?= $maintenanceActive ? 'true' : 'false' ?>"
                aria-controls="collapseMaintenance">
                <div class="sb-nav-link-icon text-muted"><i class="fas fa-tools"></i></div>
                유지보수
                <div class="sb-sidenav-collapse-arrow"><i class="fas fa-angle-down"></i></div>
            </a>
            <div class="collapse <?= $maintenanceActive ? 'show' : '' ?>" id="collapseMaintenance"
                data-bs-parent="#sidenavAccordion">
                <nav class="sb-sidenav-menu-nested nav">
                    <a class="nav-link text-fg <?= is_active('/admin/maintenance/audit') ?>"
                        href="<?= base_url('/admin/maintenance/audit') ?>">액션 로그</a>
                    <a class="nav-link text-fg <?= is_active('/admin/maintenance/errors') ?>"
                        href="<?= base_url('/admin/maintenance/errors') ?>">에러 로그</a>
                    <a class="nav-link text-fg <?= is_active('/admin/maintenance/maintenance') ?>"
                        href="<?= base_url('/admin/maintenance/maintenance') ?>">점검 이력</a>
                </nav>
            </div>
        </div>
    </div>
    <div class="sb-sidenav-footer">
        <div class="small">Logged in as:</div>
        <?= esc($currentUserName ?? '관리자') ?>
    </div>
</nav>