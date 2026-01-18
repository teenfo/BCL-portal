<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">

    <!-- Page Heading -->
    <div class="d-flex align-items-center justify-content-between mb-4">
        <h1 class="h3 mb-0 text-fg"><?= esc($title) ?></h1>
        <button class="btn btn-primary shadow-sm" data-bs-toggle="modal" data-bs-target="#createMemberModal">
            <i class="fas fa-plus fa-sm text-white-50 me-1"></i> 회원 등록
        </button>
    </div>

    <!-- Flash Messages -->
    <?php if (session()->getFlashdata('message')): ?>
        <div class="alert alert-success"><?= session()->getFlashdata('message') ?></div>
    <?php endif ?>
    <?php if (session()->getFlashdata('errors')): ?>
        <div class="alert alert-danger">
            <ul>
                <?php foreach (session()->getFlashdata('errors') as $error): ?>
                    <li><?= $error ?></li>
                <?php endforeach ?>
            </ul>
        </div>
    <?php endif ?>

    <div class="card mb-4 border-border">
        <div class="card-header bg-surface2">
            <i class="fas fa-filter me-1"></i>
            검색 및 필터
        </div>
        <div class="card-body">
            <form action="<?= base_url('admin/members') ?>" method="get"
                class="row row-cols-lg-auto g-3 align-items-center">
                <div class="col-12">
                    <input type="text" name="search" class="form-control" placeholder="이름 또는 이메일"
                        value="<?= esc($search) ?>">
                </div>
                <div class="col-12">
                    <select name="status" class="form-select">
                        <option value="">상태 전체</option>
                        <option value="active" <?= $status == 'active' ? 'selected' : '' ?>>Active</option>
                        <option value="inactive" <?= $status == 'inactive' ? 'selected' : '' ?>>Inactive</option>
                    </select>
                </div>
                <div class="col-12">
                    <button type="submit" class="btn btn-primary">검색</button>
                    <a href="<?= base_url('admin/members') ?>" class="btn btn-secondary ms-1">초기화</a>
                </div>
            </form>
        </div>
    </div>

    <!-- Content Row -->
    <div class="card mb-4 border-border">
        <div class="card-header bg-surface2">
            <i class="fas fa-table me-1"></i>
            회원 목록
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-hover border-border" id="dataTable" width="100%" cellspacing="0">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>이름</th>
                            <th>연락처</th>
                            <th>이메일</th>
                            <th>플랜</th>
                            <th>잔여횟수</th>
                            <th>상태</th>
                            <th>가입일</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (!empty($users) && is_array($users)): ?>
                            <?php foreach ($users as $user): ?>
                                <tr>
                                    <td><?= esc($user->id) ?></td>
                                    <td><?= esc($user->username) ?></td>
                                    <td><?= esc($user->phone) ?></td>
                                    <td><?= esc($user->email) ?></td>
                                    <td><?= esc($user->plan_name) ?></td>
                                    <td><?= esc($user->remaining_count) ?>회</td>
                                    <td>
                                        <?php if ($user->active): ?>
                                            <span class="badge bg-success">Active</span>
                                        <?php else: ?>
                                            <span class="badge bg-danger">Inactive</span>
                                        <?php endif ?>
                                    </td>
                                    <td><?= esc($user->created_at->format('Y-m-d')) ?></td>
                                    <td>
                                        <div class="btn-group btn-group-sm" role="group">
                                            <!-- Info -->
                                            <a href="/admin/members/<?= esc($user->id) ?>" class="btn btn-outline-info"
                                                title="상세">
                                                <i class="fas fa-info-circle"></i>
                                            </a>

                                            <!-- Edit -->
                                            <button class="btn btn-outline-warning btn-edit" data-id="<?= $user->id ?>"
                                                data-username="<?= esc($user->username) ?>" data-bs-toggle="modal"
                                                data-bs-target="#editMemberModal" title="수정">
                                                <i class="fas fa-edit"></i>
                                            </button>

                                            <!-- Role -->
                                            <button class="btn btn-outline-primary btn-role" data-id="<?= $user->id ?>"
                                                data-bs-toggle="modal" data-bs-target="#roleMemberModal" title="권한 변경">
                                                <i class="fas fa-user-shield"></i>
                                            </button>

                                            <!-- Status Toggle -->
                                            <form action="<?= base_url('admin/members/' . $user->id . '/status') ?>"
                                                method="post" class="d-inline">
                                                <?= csrf_field() ?>
                                                <button type="submit"
                                                    class="btn btn-outline-<?= $user->active ? 'secondary' : 'success' ?>"
                                                    title="<?= $user->active ? '비활성화' : '활성화' ?>">
                                                    <i class="fas fa-<?= $user->active ? 'ban' : 'check' ?>"></i>
                                                </button>
                                            </form>

                                            <!-- Delete -->
                                            <form action="<?= base_url('admin/members/' . $user->id . '/delete') ?>"
                                                method="post" class="d-inline" onsubmit="return confirm('정말 삭제하시겠습니까?');">
                                                <?= csrf_field() ?>
                                                <button type="submit" class="btn btn-outline-danger" title="삭제">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </form>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach ?>
                        <?php else: ?>
                            <tr>
                                <td colspan="9" class="text-center py-4">등록된 회원이 없습니다.</td>
                            </tr>
                        <?php endif ?>
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div class="d-flex justify-content-end mt-4">
                <?= $pager->links() ?>
            </div>
        </div>
    </div>

</div>

<!-- Create Modal -->
<div class="modal fade" id="createMemberModal" tabindex="-1" aria-labelledby="createMemberModalLabel"
    aria-hidden="true">
    <div class="modal-dialog">
        <form action="<?= base_url('admin/members') ?>" method="post">
            <?= csrf_field() ?>
            <div class="modal-content overflow-hidden border-0 shadow-lg">
                <div class="modal-header bg-primary text-white border-0">
                    <h5 class="modal-title fw-bold" id="createMemberModalLabel">회원 등록</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"
                        aria-label="Close"></button>
                </div>
                <div class="modal-body p-4 bg-surface">
                    <div class="mb-3">
                        <label class="form-label fw-bold small text-muted">USERNAME</label>
                        <input type="text" name="username" class="form-control" placeholder="사용자 이름 입력" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-bold small text-muted">EMAIL</label>
                        <input type="email" name="email" class="form-control" placeholder="example@bcl.com" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label fw-bold small text-muted">PASSWORD</label>
                        <input type="password" name="password" class="form-control" placeholder="최소 8자 이상" required>
                    </div>
                    <div class="mb-0">
                        <label class="form-label fw-bold small text-muted">ROLE / GROUP</label>
                        <select name="group" class="form-select">
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="coach">Coach</option>
                            <option value="staff">Staff</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer bg-surface2 border-border p-3">
                    <button type="button" class="btn btn-light" data-bs-dismiss="modal">취소</button>
                    <button type="submit" class="btn btn-primary fw-bold px-4">저장하기</button>
                </div>
            </div>
        </form>
    </div>
</div>

<!-- Edit Modal -->
<div class="modal fade" id="editMemberModal" tabindex="-1" aria-labelledby="editMemberModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <form action="" method="post" id="editMemberForm">
            <?= csrf_field() ?>
            <div class="modal-content overflow-hidden border-0 shadow-lg">
                <div class="modal-header bg-warning text-dark border-0">
                    <h5 class="modal-title fw-bold" id="editMemberModalLabel">회원 정보 수정</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-4 bg-surface">
                    <div class="mb-0">
                        <label class="form-label fw-bold small text-muted">USERNAME</label>
                        <input type="text" name="username" id="edit_username" class="form-control" required>
                    </div>
                </div>
                <div class="modal-footer bg-surface2 border-border p-3">
                    <button type="button" class="btn btn-light" data-bs-dismiss="modal">취소</button>
                    <button type="submit" class="btn btn-warning fw-bold px-4">수정하기</button>
                </div>
            </div>
        </form>
    </div>
</div>

<!-- Role Modal -->
<div class="modal fade" id="roleMemberModal" tabindex="-1" aria-labelledby="roleMemberModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <form action="" method="post" id="roleMemberForm">
            <?= csrf_field() ?>
            <div class="modal-content overflow-hidden border-0 shadow-lg">
                <div class="modal-header bg-primary text-white border-0">
                    <h5 class="modal-title fw-bold" id="roleMemberModalLabel">권한 변경</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"
                        aria-label="Close"></button>
                </div>
                <div class="modal-body p-4 bg-surface text-center">
                    <div class="rounded-circle bg-primarySoft text-primary mx-auto mb-3 d-flex align-items-center justify-content-center"
                        style="width: 64px; height: 64px;">
                        <i class="fas fa-user-shield fs-3"></i>
                    </div>
                    <p class="mb-4 text-muted">변경할 신규 권한을 선택하세요.<br><small>(기존 권한은 모두 대체됩니다)</small></p>
                    <div class="text-start">
                        <label class="form-label fw-bold small text-muted">NEW ROLE</label>
                        <select name="role" class="form-select">
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="coach">Coach</option>
                            <option value="staff">Staff</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer bg-surface2 border-border p-3">
                    <button type="button" class="btn btn-light" data-bs-dismiss="modal">취소</button>
                    <button type="submit" class="btn btn-primary fw-bold px-4">변경하기</button>
                </div>
            </div>
        </form>
    </div>
</div>

<!-- Scripts for Modal Data Binding -->
<script>
    document.addEventListener('DOMContentLoaded', function () {
        // Edit Modal
        $('.btn-edit').on('click', function () {
            var id = $(this).data('id');
            var username = $(this).data('username');
            var email = $(this).data('email'); $('#editMemberForm').attr('action', '/admin/members/' + id + '/update');
            $('#edit_username').val(username);
        });

        // Role Modal
        $('.btn-role').on('click', function () {
            var id = $(this).data('id');
            $('#roleMemberForm').attr('action', '/admin/members/' + id + '/role');
        });
    });
</script>

<?= $this->endSection() ?>