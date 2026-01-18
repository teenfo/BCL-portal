<?= $this->extend("admin/layout") ?>

<?= $this->section("content") ?>
<div class="card bg-surface border-border shadow-card p-4">
    <h1 class="h3 mb-4 text-fg"><?= esc($pageTitle) ?></h1>
    <p class="text-muted">이곳은 <?= esc($pageTitle) ?> 페이지입니다. (스캐폴드 상태)</p>
    <div class="mt-4 p-5 border-2 border-dashed border-border rounded-xl text-center">
        <i class="fas fa-tools fa-3x text-subtle mb-3"></i>
        <p class="text-subtle">컨텐츠가 준비 중입니다.</p>
    </div>
</div>
<?= $this->endSection() ?>
