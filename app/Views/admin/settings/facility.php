<?= $this->extend('admin/layout') ?>

<?= $this->section('content') ?>
<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <div class="card shadow mb-4">
                <div class="card-header py-3 d-flex justify-content-between align-items-center">
                    <h6 class="m-0 font-weight-bold text-primary">지점 정보 관리</h6>
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

                    <form action="<?= base_url('admin/settings/facility') ?>" method="post">
                        <?= csrf_field() ?>
                        <input type="hidden" name="id" value="<?= $facility['id'] ?>">

                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="name">지점 이름</label>
                                    <input type="text" class="form-control" id="name" name="name"
                                        value="<?= esc($facility['name']) ?>" required>
                                </div>
                                <div class="form-group">
                                    <label for="business_number">사업자 등록 번호</label>
                                    <input type="text" class="form-control" id="business_number" name="business_number"
                                        value="<?= esc($facility['business_number']) ?>">
                                </div>
                                <div class="form-group">
                                    <label for="phone">대표 연락처</label>
                                    <input type="text" class="form-control" id="phone" name="phone"
                                        value="<?= esc($facility['phone']) ?>">
                                </div>
                                <div class="form-group">
                                    <label for="address">주소</label>
                                    <div class="input-group">
                                        <input type="text" class="form-control" id="address" name="address"
                                            value="<?= esc($facility['address']) ?>">
                                        <div class="input-group-append">
                                            <button type="button" class="btn btn-outline-secondary"
                                                onclick="openDaumPostcode()">주소 찾기</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label>운영 시간 (JSON)</label>
                                    <?php
                                    $hours = json_decode($facility['operating_hours'], true) ?? [];
                                    ?>
                                    <div class="mb-2">
                                        <label class="small text-muted">평일</label>
                                        <input type="text" class="form-control" name="operating_hours[weekdays]"
                                            value="<?= esc($hours['weekdays'] ?? '') ?>">
                                    </div>
                                    <div class="mb-2">
                                        <label class="small text-muted">토요일</label>
                                        <input type="text" class="form-control" name="operating_hours[saturday]"
                                            value="<?= esc($hours['saturday'] ?? '') ?>">
                                    </div>
                                    <div class="mb-2">
                                        <label class="small text-muted">일요일/공휴일</label>
                                        <input type="text" class="form-control" name="operating_hours[sunday]"
                                            value="<?= esc($hours['sunday'] ?? '') ?>">
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label for="latitude">위도 (Latitude)</label>
                                            <input type="text" class="form-control" id="latitude" name="latitude"
                                                value="<?= esc($facility['latitude']) ?>">
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label for="longitude">경도 (Longitude)</label>
                                            <input type="text" class="form-control" id="longitude" name="longitude"
                                                value="<?= esc($facility['longitude']) ?>">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr>
                        <div class="d-flex justify-content-end">
                            <button type="submit" class="btn btn-primary">저장하기</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>
<?= $this->endSection() ?>

<?= $this->section('scripts') ?>
<script>
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

                document.getElementById('address').value = addr + extraAddr;

                // Immediately save (submit the form)
                document.querySelector('form').submit();
            },
            onclose: function (state) {
                console.log('Postcode popup closed: ' + state);
            }
        }).open();
    }
</script>
<?= $this->endSection() ?>