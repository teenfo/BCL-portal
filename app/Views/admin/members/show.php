<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">

    <!-- Page Heading -->
    <div class="d-flex align-items-center justify-content-between mb-4">
        <h1 class="h3 mb-0 text-fg fw-bold"><?= esc($pageTitle) ?></h1>
        <a href="<?= base_url('admin/members') ?>" class="btn btn-sm btn-outline-secondary rounded-xl shadow-sm">
            <i class="fas fa-arrow-left fa-sm me-1"></i> 목록으로
        </a>
    </div>

    <div class="row">

        <!-- Profile Card -->
        <div class="col-xl-4 col-lg-5">
            <div class="card shadow-card border-border rounded-2xl mb-4 bg-surface">
                <div class="card-body text-center p-4">
                    <div class="position-relative d-inline-block mb-3">
                        <div class="rounded-circle bg-surface2 d-flex align-items-center justify-content-center overflow-hidden border border-border"
                            style="width: 120px; height: 120px;">
                            <?php if ($user->avatar): ?>
                                <img id="userAvatarImg" src="<?= base_url($user->avatar) ?>" alt="Profile"
                                    class="w-100 h-100" style="object-fit: cover;">
                            <?php else: ?>
                                <i id="userAvatarIcon" class="fas fa-user fa-4x text-muted"></i>
                            <?php endif ?>
                        </div>
                        <button
                            class="btn btn-sm btn-primary rounded-circle position-absolute d-flex align-items-center justify-content-center shadow-sm"
                            style="bottom: 0; right: 0; width: 32px; height: 32px;" data-bs-toggle="modal"
                            data-bs-target="#avatarUploadModal">
                            <i class="fas fa-camera fa-xs"></i>
                        </button>
                    </div>

                    <h5 class="fw-bold text-fg editable-text mb-1" data-field="username"
                        data-value="<?= esc($user->username) ?>">
                        <?= esc($user->username) ?>
                        <i class="fas fa-pen text-muted ms-2 text-xs opacity-50"></i>
                    </h5>
                    <p class="text-sm text-subtle mb-3"><?= esc($user->email) ?></p>

                    <div class="d-flex flex-wrap justify-content-center gap-1 mb-3">
                        <?php if ($user->active): ?>
                            <span class="badge bg-successSoft text-success rounded-pill px-3">Active</span>
                        <?php else: ?>
                            <span class="badge bg-dangerSoft text-danger rounded-pill px-3">Inactive</span>
                        <?php endif ?>

                        <?php foreach ($user->getGroups() as $group): ?>
                            <span
                                class="badge bg-surface2 text-muted border border-border rounded-pill px-3 text-xs"><?= esc($group) ?></span>
                        <?php endforeach ?>
                    </div>

                    <hr>

                    <div class="text-left">
                        <p class="text-xs font-weight-bold text-primary text-uppercase mb-1">가입일 / 경로</p>
                        <p class="mb-3 text-sm">
                            <?= esc($user->created_at->format('Y-m-d')) ?>
                            <span class="text-muted">via</span>
                            <span class="editable-text border-bottom border-dashed" data-field="join_source"
                                data-value="<?= esc($user->join_source) ?>">
                                <?= esc($user->join_source ?: 'Unknown') ?>
                            </span>
                        </p>

                        <p class="text-xs font-weight-bold text-primary text-uppercase mb-1">최근 접속</p>
                        <p class="mb-0 text-sm">
                            <?= ($lastLogin && isset($lastLogin->date)) ? esc(date('Y-m-d H:i', strtotime($lastLogin->date))) : '기록 없음' ?>
                        </p>
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="card shadow-card border-border rounded-2xl mb-4 bg-surface">
                <div class="card-header py-3 bg-transparent border-bottom border-border">
                    <h6 class="m-0 fw-bold text-primary">관리 액션</h6>
                </div>
                <div class="card-body">
                    <button class="btn btn-primary w-100 mb-2 text-start rounded-xl shadow-sm" data-bs-toggle="modal"
                        data-bs-target="#roleMemberModal">
                        <i class="fas fa-user-shield me-2"></i> 권한 변경
                    </button>
                    <form action="<?= base_url('admin/members/' . $user->id . '/status') ?>" method="post">
                        <?= csrf_field() ?>
                        <button type="submit"
                            class="btn btn-<?= $user->active ? 'outline-secondary' : 'success' ?> w-100 mb-2 text-start rounded-xl">
                            <i class="fas fa-<?= $user->active ? 'ban' : 'check' ?> me-2"></i>
                            <?= $user->active ? '계정 비활성화' : '계정 활성화' ?>
                        </button>
                    </form>
                    <hr class="border-border opacity-50">
                    <button type="button" class="btn btn-outline-danger w-100 text-start rounded-xl"
                        data-bs-toggle="modal" data-bs-target="#deleteMemberModal">
                        <i class="fas fa-trash me-2"></i> 회원 삭제
                    </button>
                </div>
            </div>
        </div>

        <!-- Details Tabs -->
        <div class="col-xl-8 col-lg-7">
            <div class="card shadow-card border-border rounded-2xl mb-4 bg-surface">
                <div class="card-header py-0 bg-transparent border-bottom border-border">
                    <ul class="nav nav-tabs card-header-tabs border-0" id="memberTabs" role="tablist">
                        <li class="nav-item">
                            <a class="nav-link active py-3 h-100 border-0 text-fg" id="overview-tab"
                                data-bs-toggle="tab" href="#overview" role="tab" aria-selected="true">개요</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link py-3 h-100 border-0 text-fg" id="membership-tab" data-bs-toggle="tab"
                                href="#membership" role="tab" aria-selected="false">이용권 Info</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link py-3 h-100 border-0 text-fg" id="payment-tab" data-bs-toggle="tab"
                                href="#payment" role="tab" aria-selected="false">결제 내역</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link py-3 h-100 border-0 text-fg" id="attendance-tab" data-bs-toggle="tab"
                                href="#attendance" role="tab" aria-selected="false">출석 로그</a>
                        </li>
                    </ul>
                </div>
                <div class="card-body p-4">
                    <div class="tab-content" id="myTabContent">

                        <!-- Overview Tab -->
                        <div class="tab-pane fade show active" id="overview" role="tabpanel">
                            <h6 class="text-xs fw-bold text-primary text-uppercase mb-4">기본 정보 (Click to Edit)</h6>
                            <div class="ps-lg-2">
                                <div class="row">
                                    <div class="col-lg-6">
                                        <div class="form-group mb-4">
                                            <label class="form-label text-subtle small mb-1">사용자 이름</label>
                                            <div class="h5 fw-bold text-fg editable-text border-bottom border-dashed border-border pb-1"
                                                data-field="username" data-value="<?= esc($user->username) ?>">
                                                <?= esc($user->username) ?>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-lg-6">
                                        <div class="form-group mb-4">
                                            <label class="form-label text-subtle small mb-1">이메일 주소</label>
                                            <div class="h5 fw-bold text-fg">
                                                <?= esc($user->email) ?> <span class="text-xs text-muted fw-normal">(ID
                                                    불가변)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-lg-6">
                                        <div class="form-group mb-4">
                                            <label class="form-label text-subtle small mb-1">전화번호</label>
                                            <div class="h5 fw-bold text-fg editable-text border-bottom border-dashed border-border pb-1"
                                                data-field="phone" data-value="<?= esc($user->phone) ?>">
                                                <?= esc($user->phone ?: '입력해주세요') ?>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-lg-6">
                                        <div class="form-group mb-4">
                                            <label class="form-label text-subtle small mb-1">생년월일</label>
                                            <div class="h5 fw-bold text-fg editable-text border-bottom border-dashed border-border pb-1"
                                                data-field="birthdate" data-input-type="date"
                                                data-value="<?= esc($user->birthdate) ?>">
                                                <?= esc($user->birthdate ?: 'YYYY-MM-DD') ?>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-lg-6">
                                        <div class="form-group mb-4">
                                            <label class="form-label text-subtle small mb-1">성별</label>
                                            <div class="h5 fw-bold text-fg editable-select border-bottom border-dashed border-border pb-1"
                                                data-field="gender" data-value="<?= esc($user->gender) ?>"
                                                data-options='{"male":"남성", "female":"여성", "other":"기타"}'>
                                                <?php
                                                $genders = ['male' => '남성', 'female' => '여성', 'other' => '기타'];
                                                echo $genders[$user->gender] ?? ($user->gender ?: '선택해주세요');
                                                ?>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-lg-6">
                                        <div class="form-group mb-4">
                                            <label class="form-label text-subtle small mb-1">마케팅 수신 동의</label>
                                            <div class="form-check form-switch ps-0">
                                                <input type="checkbox" class="form-check-input ajax-toggle ms-0"
                                                    id="marketingCheck" data-field="marketing_consent"
                                                    <?= $user->marketing_consent ? 'checked' : '' ?>>
                                                <label class="form-check-label fw-bold text-fg ms-2"
                                                    for="marketingCheck">
                                                    SMS/Email 수신 동의
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="my-4 border-border opacity-50">

                            <h6 class="text-xs fw-bold text-primary text-uppercase mb-4">주소 정보</h6>
                            <div class="ps-lg-2">
                                <div class="row">
                                    <div class="col-md-4">
                                        <div class="form-group mb-4">
                                            <div class="d-flex align-items-center mb-1">
                                                <label class="form-label text-subtle small mb-0">우편번호</label>
                                                <button type="button"
                                                    class="btn btn-link btn-sm p-0 ms-2 text-xs text-decoration-none"
                                                    onclick="openDaumPostcode()">주소 찾기</button>
                                            </div>
                                            <div id="zipcode-display"
                                                class="h5 fw-bold text-fg pb-1"
                                                data-value="<?= esc($user->zipcode) ?>">
                                                <?= esc($user->zipcode ?: '00000') ?>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-8">
                                        <div class="form-group mb-4">
                                            <label class="form-label text-subtle small mb-1">주소</label>
                                            <div id="address-display"
                                                class="h5 fw-bold text-fg pb-1"
                                                data-value="<?= esc($user->address) ?>">
                                                <?= esc($user->address ?: '주소를 입력해주세요') ?>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-12">
                                        <div class="form-group mb-4">
                                            <label class="form-label text-subtle small mb-1">상세 주소</label>
                                            <div class="h5 fw-bold text-fg editable-text border-bottom border-dashed border-border pb-1"
                                                data-field="detail_address"
                                                data-value="<?= esc($user->detail_address) ?>">
                                                <?= esc($user->detail_address ?: '상세 주소를 입력해주세요') ?>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr class="my-4 border-border opacity-50">

                            <h6 class="text-xs fw-bold text-primary text-uppercase mb-4">관리자 메모</h6>
                            <div class="ps-lg-2">
                                <div class="form-group">
                                    <div class="p-3 bg-surface2 rounded-xl editable-textarea border border-border"
                                        style="min-height: 100px; cursor: pointer;" data-field="memo"
                                        data-value="<?= esc($user->memo) ?>">
                                        <?= nl2br(esc($user->memo)) ?: '<span class="text-subtle italic">메모를 입력하려면 클릭하세요...</span>' ?>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Membership Tab -->
                        <div class="tab-pane fade" id="membership" role="tabpanel">
                            <h6 class="text-xs fw-bold text-primary text-uppercase mb-4">현재 이용중인 플랜</h6>
                            <div class="row mb-4">
                                <div class="col-md-6 mb-3">
                                    <div
                                        class="card border-0 border-start border-primary border-4 shadow-card rounded-2xl h-100 py-2 bg-surface">
                                        <div class="card-body">
                                            <div class="row no-gutters align-items-center">
                                                <div class="col mr-2">
                                                    <div class="text-xs fw-bold text-primary text-uppercase mb-1">
                                                        Plan Name</div>
                                                    <div class="h5 mb-0 fw-bold text-fg">
                                                        <?= esc($user->plan_name) ?>
                                                    </div>
                                                </div>
                                                <div class="col-auto">
                                                    <i class="fas fa-calendar fa-2x text-surface2"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <div
                                        class="card border-0 border-start border-success border-4 shadow-card rounded-2xl h-100 py-2 bg-surface">
                                        <div class="card-body">
                                            <div class="row no-gutters align-items-center">
                                                <div class="col mr-2">
                                                    <div class="text-xs fw-bold text-success text-uppercase mb-1">
                                                        Remaining Count</div>
                                                    <div class="h5 mb-0 fw-bold text-fg">
                                                        <?= esc($user->remaining_count) ?> 회
                                                    </div>
                                                </div>
                                                <div class="col-auto">
                                                    <i class="fas fa-clipboard-list fa-2x text-surface2"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="table-responsive rounded-xl border border-border">
                                <table class="table table-hover mb-0">
                                    <thead class="bg-surface2">
                                        <tr class="text-subtle small">
                                            <th class="border-0">유효기간 시작</th>
                                            <th class="border-0">유효기간 종료</th>
                                            <th class="border-0">유형</th>
                                            <th class="border-0">상태</th>
                                        </tr>
                                    </thead>
                                    <tbody class="text-fg sm">
                                        <tr>
                                            <td class="border-border"><?= esc($user->membership_start_date) ?></td>
                                            <td class="border-border"><?= esc($user->membership_end_date) ?></td>
                                            <td class="border-border"><?= esc($user->membership_type) ?></td>
                                            <td class="border-border"><span
                                                    class="badge bg-successSoft text-success rounded-pill px-3">Active</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Payment Tab (Placeholder) -->
                        <div class="tab-pane fade" id="payment" role="tabpanel">
                            <div class="text-center py-5">
                                <div class="bg-surface2 rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                                    style="width: 80px; height: 80px;">
                                    <i class="fas fa-receipt fa-2x text-subtle"></i>
                                </div>
                                <p class="text-muted">결제 내역이 없습니다.</p>
                            </div>
                        </div>

                        <!-- Attendance Tab (Placeholder) -->
                        <div class="tab-pane fade" id="attendance" role="tabpanel">
                            <div class="text-center py-5">
                                <div class="bg-surface2 rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                                    style="width: 80px; height: 80px;">
                                    <i class="fas fa-history fa-2x text-subtle"></i>
                                </div>
                                <p class="text-muted">출석 기록이 없습니다.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

</div>

<!-- Avatar Upload Modal -->
<div class="modal fade" id="avatarUploadModal" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-sm modal-dialog-centered" role="document">
        <div class="modal-content bg-surface border-border shadow-card rounded-2xl">
            <div class="modal-header border-bottom border-border">
                <h5 class="modal-title h6 fw-bold text-fg">프로필 사진 업로드</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-center p-4">
                <form id="avatarForm">
                    <div class="form-group mb-3">
                        <label for="avatarInput" class="btn btn-outline-primary w-100 rounded-xl">
                            <i class="fas fa-image me-2"></i> 사진 선택
                        </label>
                        <input type="file" name="avatar" id="avatarInput" class="d-none" accept="image/*">
                    </div>
                    <div id="avatarPreview" class="d-none mb-4">
                        <img src="" class="img-fluid rounded-circle border border-border"
                            style="width: 120px; height: 120px; object-fit: cover;">
                    </div>
                    <button type="submit" class="btn btn-primary w-100 rounded-xl shadow-sm" disabled
                        id="btnSaveAvatar">저장하기</button>
                    <div id="uploadStatus" class="mt-2 small text-subtle"></div>
                </form>
            </div>
        </div>
    </div>
</div>

<!-- Role Modal -->
<div class="modal fade" id="roleMemberModal" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <form action="<?= base_url('admin/members/' . $user->id . '/role') ?>" method="post">
            <?= csrf_field() ?>
            <div class="modal-content bg-surface border-border shadow-card rounded-2xl">
                <div class="modal-header border-bottom border-border">
                    <h5 class="modal-title fw-bold text-fg">권한 변경</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-4">
                    <div class="mb-3">
                        <label class="form-label text-subtle small">역할 선택</label>
                        <select name="role" class="form-select rounded-xl bg-surface2 border-border text-fg">
                            <option value="user" <?= $user->inGroup('user') ? 'selected' : '' ?>>User</option>
                            <option value="admin" <?= $user->inGroup('admin') ? 'selected' : '' ?>>Admin</option>
                            <option value="manager" <?= $user->inGroup('manager') ? 'selected' : '' ?>>Manager</option>
                            <option value="coach" <?= $user->inGroup('coach') ? 'selected' : '' ?>>Coach</option>
                            <option value="staff" <?= $user->inGroup('staff') ? 'selected' : '' ?>>Staff</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer border-top border-border">
                    <button type="button" class="btn btn-outline-secondary rounded-xl px-4"
                        data-bs-dismiss="modal">취소</button>
                    <button type="submit" class="btn btn-primary rounded-xl px-4">변경 저장</button>
                </div>
            </div>
        </form>
    </div>
</div>

<!-- Delete Confirmation Modal -->
<div class="modal fade" id="deleteMemberModal" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content bg-surface border-border shadow-card rounded-2xl">
            <div class="modal-header border-bottom border-border bg-dangerSoft">
                <h5 class="modal-title fw-bold text-danger">회원 삭제 확인</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4 text-center">
                <div class="bg-dangerSoft text-danger rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 60px; height: 60px;">
                    <i class="fas fa-exclamation-triangle fa-2x"></i>
                </div>
                <h5 class="fw-bold text-fg mb-2">정말 삭제하시겠습니까?</h5>
                <p class="text-subtle mb-0">회원 정보와 모든 활동 로그가 영구적으로 삭제됩니다.<br>이 작업은 되돌릴 수 없습니다.</p>
            </div>
            <div class="modal-footer border-top border-border">
                <button type="button" class="btn btn-surface2 text-fg rounded-xl px-4" data-bs-dismiss="modal">취소</button>
                <form action="<?= base_url('admin/members/' . $user->id . '/delete') ?>" method="post">
                    <?= csrf_field() ?>
                    <button type="submit" class="btn btn-danger rounded-xl px-4 shadow-sm">네, 삭제하겠습니다</button>
                </form>
            </div>
        </div>
    </div>
</div>

<input type="hidden" id="csrfToken" name="<?= csrf_token() ?>" value="<?= csrf_hash() ?>">

<?= $this->endSection() ?>

<?= $this->section('scripts') ?>
<script>
    var userId = <?= $user->id ?>;
    var uploadUrl = '<?= base_url("admin/members/{$user->id}/upload_avatar") ?>';
    var updateUrl = '<?= base_url("admin/members/{$user->id}/update_field") ?>';

    // Global CSRF Update
    function updateCsrf(token) {
        if (token) {
            $('#csrfToken').val(token);
            $('input[name="<?= csrf_token() ?>"]').val(token);
        }
    }

    // Helper: Save Field
    function saveField(field, value, $el, callback, fields = null) {
        var data = {};
        if (fields) {
            data.fields = fields;
        } else {
            data.field = field;
            data.value = value;
        }
        data[$('#csrfToken').attr('name')] = $('#csrfToken').val();

        $.ajax({
            url: updateUrl,
            type: 'POST',
            data: data,
            success: function (response) {
                updateCsrf(response.token);
                if (response.status === 'success') {
                    // Update all elements with the same data-field on the page
                    if (field) {
                        $('.editable-text[data-field="' + field + '"], .editable-textarea[data-field="' + field + '"]').each(function() {
                            var $item = $(this);
                            $item.data('value', value);
                            if ($item.hasClass('editable-textarea')) {
                                $item.html(value.replace(/\n/g, "<br>") || '<span class="text-muted italic">Click to edit...</span>');
                            } else {
                                $item.text(value || 'Click to edit');
                                // Re-add edit icon for username if it was there
                                if (field === 'username' && $item.find('i.fa-pen').length === 0) {
                                  $item.append('<i class="fas fa-pen text-muted ms-2 text-xs opacity-50"></i>');
                                }
                            }
                        });

                        // Special: If editing CURRENT ADMIN, update Topbar name in real-time
                        // We check if the ID being edited is the same as the one stored in JS global
                        if (field === 'username' && typeof userId !== 'undefined' && userId == <?= auth()->id() ?>) {
                           $('#navbarUserName').text(value);
                        }
                    } else if (fields) {
                        // Bulk update (e.g. address)
                        $.each(fields, function(f, v) {
                            $('[data-field="' + f + '"]').data('value', v).text(v);
                        });
                    }

                    if (callback) callback(true);
                } else {
                    alert('Error: ' + response.message);
                    if (callback) callback(false);
                }
            },
            error: function () {
                alert('Server Error');
                if (callback) callback(false);
            }
        });
    }

    // Daum Postcode Integration
    function openDaumPostcode() {
        new daum.Postcode({
            oncomplete: function (data) {
                var addr = '';
                var extraAddr = '';

                if (data.userSelectedType === 'R') {
                    addr = data.roadAddress;
                } else {
                    addr = data.jibunAddress;
                }

                if (data.userSelectedType === 'R') {
                    if (data.bname !== '' && /[동|로|가]$/g.test(data.bname)) {
                        extraAddr += data.bname;
                    }
                    if (data.buildingName !== '' && data.apartment === 'Y') {
                        extraAddr += (extraAddr !== '' ? ', ' + data.buildingName : data.buildingName);
                    }
                    if (extraAddr !== '') {
                        extraAddr = ' (' + extraAddr + ')';
                    }
                }

                const fullAddr = addr + extraAddr;
                const zip = data.zonecode;

                // 1. Update UI display
                $('#zipcode-display').text(zip).data('value', zip);
                $('#address-display').text(fullAddr).data('value', fullAddr);

                // 2. Save to Server immediately (Bulk Update)
                // Use setTimeout to ensure the postal popup closes immediately
                setTimeout(function() {
                    saveField(null, null, null, function (success) {
                        if (success) {
                            // Optional: show a small toast instead of alert
                            console.log('Address saved successfully');
                        }
                    }, {
                        zipcode: zip,
                        address: fullAddr
                    });
                }, 100);
            },
            onclose: function (state) {
                console.log('Postcode popup closed: ' + state);
            }
        }).open();
    }

    $(document).ready(function () {

        // --- 1. Avatar Upload ---
        $('#avatarInput').on('change', function (e) {
            if (this.files && this.files[0]) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    $('#avatarPreview img').attr('src', e.target.result);
                    $('#avatarPreview').removeClass('d-none');
                    $('#btnSaveAvatar').prop('disabled', false);
                }
                reader.readAsDataURL(this.files[0]);
            }
        });

        $('#avatarForm').on('submit', function (e) {
            e.preventDefault();
            var formData = new FormData(this);
            // Append CSRF
            formData.append($('#csrfToken').attr('name'), $('#csrfToken').val());

            $.ajax({
                url: uploadUrl,
                type: 'POST',
                data: formData,
                contentType: false,
                processData: false,
                success: function (response) {
                    updateCsrf(response.token);
                    if (response.status === 'success') {
                        // Update Main Avatar
                        $('#userAvatarImg').length ?
                            $('#userAvatarImg').attr('src', response.avatar_url) :
                            location.reload(); // If icon was there, reload to show img

                        // Special: If editing CURRENT ADMIN, update Topbar avatar in real-time
                        if (typeof userId !== 'undefined' && userId == <?= auth()->id() ?>) {
                           $('#navbarUserAvatar').html('<img src="' + response.avatar_url + '" alt="Avatar" class="w-100 h-100" style="object-fit: cover;">');
                        }

                        $('#avatarUploadModal').modal('hide');
                        $('#avatarForm')[0].reset();
                        $('#avatarPreview').addClass('d-none');
                        // Optional Toast
                        alert('프로필 사진이 변경되었습니다.');
                    } else {
                        $('#uploadStatus').text(response.message).addClass('text-danger');
                    }
                },
                error: function () {
                    $('#uploadStatus').text('Upload failed').addClass('text-danger');
                }
            });
        });

        // --- 2. Inline Editing (Text inputs) ---
        $('.editable-text, .editable-textarea').on('click', function () {
            var $el = $(this);
            if ($el.find('input, textarea').length > 0) return; // Already editing

            var currentVal = $el.data('value');
            var field = $el.data('field');
            var type = $el.data('input-type') || 'text';
            var isTextarea = $el.hasClass('editable-textarea');

            var $input = isTextarea ?
                $('<textarea class="form-control" rows="4"></textarea>').val(currentVal) :
                $('<input type="' + type + '" class="form-control form-control-sm">').val(currentVal);

            var originalHtml = $el.html();
            $el.html($input);
            $input.focus().select();

            $input.on('blur', function () {
                var newVal = $(this).val();
                if (newVal === String(currentVal)) {
                    $el.html(originalHtml); // Nothing changed
                    return;
                }

                // AJAX Update
                saveField(field, newVal, $el, function (success) {
                    if (!success) {
                        $el.html(originalHtml); // Revert on fail
                    }
                });
            });

            // Handle Enter key for inputs (not textarea)
            if (!isTextarea) {
                $input.on('keypress', function (e) {
                    if (e.which == 13) {
                        $(this).blur();
                    }
                });
            }
        });

        // --- 3. Inline Editing (Select) ---
        $('.editable-select').on('click', function () {
            var $el = $(this);
            if ($el.find('select').length > 0) return;

            var currentVal = $el.data('value');
            var field = $el.data('field');
            var options = $el.data('options'); // JSON object

            var $select = $('<select class="form-control form-control-sm"></select>');
            $.each(options, function (k, v) {
                var selected = k == currentVal ? 'selected' : '';
                $select.append('<option value="' + k + '" ' + selected + '>' + v + '</option>');
            });

            var originalHtml = $el.html();
            $el.html($select);
            $select.focus();

            $select.on('blur change', function (e) {
                if (e.type === 'change') {
                    // trigger blur effectively to save
                    $(this).blur();
                }
            });

            $select.on('blur', function () {
                var newVal = $(this).val();
                if (!newVal || newVal === currentVal) {
                    $el.html(originalHtml);
                    return;
                }

                saveField(field, newVal, $el, function (success) {
                    if (success) {
                        $el.data('value', newVal);
                        $el.text(options[newVal]);
                    } else {
                        $el.html(originalHtml);
                    }
                });
            });
        });

        // --- 4. Toggle Switch (Marketing) ---
        $('.ajax-toggle').on('change', function () {
            var $el = $(this);
            var field = $el.data('field');
            var newVal = $el.is(':checked') ? 1 : 0;

            saveField(field, newVal, null, function (success) {
                if (!success) {
                    // Revert checkbox if failed
                    $el.prop('checked', !newVal);
                }
            });
        });
    });
</script>
<?= $this->endSection() ?>