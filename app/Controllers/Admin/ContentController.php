<?php

namespace App\Controllers\Admin;

use App\Models\NoticeModel;
use App\Models\BannerModel;
use App\Models\PostModel;

class ContentController extends BaseAdminController
{
    public function notices()
    {
        $noticeModel = new NoticeModel();
        $notices = $noticeModel->select('notices.*, users.username as author_name')
            ->join('users', 'users.id = notices.author_id')
            ->orderBy('is_pinned', 'DESC')
            ->orderBy('created_at', 'DESC')
            ->findAll();

        return $this->render('admin/content/notices', [
            'pageTitle' => '공지사항',
            'notices' => $notices
        ]);
    }

    public function banners()
    {
        $bannerModel = new BannerModel();
        $banners = $bannerModel->orderBy('sort_order', 'ASC')->findAll();

        return $this->render('admin/content/banners', [
            'pageTitle' => '운영 공지/배너',
            'banners' => $banners
        ]);
    }

    public function posts()
    {
        $postModel = new PostModel();
        $posts = $postModel->select('posts.*, users.username')
            ->join('users', 'users.id = posts.user_id')
            ->orderBy('created_at', 'DESC')
            ->paginate(15);

        return $this->render('admin/content/posts', [
            'pageTitle' => '게시글 관리',
            'posts' => $posts,
            'pager' => $postModel->pager
        ]);
    }

    public function moderation()
    {
        return $this->render('admin/content/moderation', [
            'pageTitle' => '댓글/신고 관리'
        ]);
    }
}
