<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->get('/', 'Dashboard::index');

service('auth')->routes($routes);

$routes->group('admin', ['namespace' => 'App\Controllers\Admin'], function ($routes) {
    $routes->get('/', 'DashboardController::index');
    $routes->get('dashboard', 'DashboardController::index');

    // Members
    $routes->get('members', 'MembersController::index');
    $routes->post('members', 'MembersController::create'); // Store
    $routes->get('members/(:segment)', 'MembersController::show/$1'); // Show
    $routes->post('members/(:num)/update', 'MembersController::update/$1'); // Update
    $routes->post('members/(:num)/delete', 'MembersController::delete/$1'); // Delete
    $routes->post('members/(:num)/status', 'MembersController::updateStatus/$1'); // Status
    $routes->post('members/(:num)/role', 'MembersController::updateRole/$1'); // Role
    $routes->post('members/(:num)/update_field', 'MembersController::updateField/$1'); // Inline Update
    $routes->post('members/(:num)/upload_avatar', 'MembersController::uploadAvatar/$1'); // Avatar Upload
    $routes->get('attendance', 'MembersController::attendance');
    $routes->get('memberships/plans', 'MembersController::plans');
    $routes->get('billing/payments', 'MembersController::payments');
    $routes->get('billing/settlements', 'MembersController::settlements');
    $routes->get('roles', 'MembersController::roles');

    // Sessions
    $routes->get('sessions/schedule', 'SessionsController::schedule');
    $routes->get('sessions/bookings', 'SessionsController::bookings');
    $routes->get('sessions/checkins', 'SessionsController::checkins');
    $routes->get('sessions/assignments', 'SessionsController::assignments');
    $routes->get('coaches', 'CoachesController::index');
    $routes->get('coaches/(:segment)', 'CoachesController::show/$1');

    // Content
    $routes->get('content/notices', 'ContentController::notices');
    $routes->get('content/banners', 'ContentController::banners');
    $routes->get('content/posts', 'ContentController::posts');
    $routes->get('content/moderation', 'ContentController::moderation');

    // Reports
    $routes->get('reports/attendance', 'ReportsController::attendance');
    $routes->get('reports/sessions', 'ReportsController::sessions');
    $routes->get('reports/revenue', 'ReportsController::revenue');
    $routes->get('reports/coaches', 'ReportsController::coaches');

    // Notifications
    $routes->get('notifications/templates', 'NotificationsController::templates');
    $routes->get('notifications/logs', 'NotificationsController::logs');
    $routes->get('notifications/rules', 'NotificationsController::rules');

    // Integrations
    $routes->get('integrations/payments', 'IntegrationsController::payments');
    $routes->get('integrations/api', 'IntegrationsController::api');
    $routes->get('integrations/data', 'IntegrationsController::data');

    // Settings
    $routes->get('settings/facility', 'SettingsController::facility');
    $routes->post('settings/facility', 'SettingsController::updateFacility');
    $routes->get('settings/policies', 'SettingsController::policies');
    $routes->post('settings/policies', 'SettingsController::updatePolicies');
    $routes->get('settings/memberships', 'SettingsController::memberships');
    $routes->get('settings/access', 'SettingsController::access');

    // Maintenance
    $routes->get('maintenance/audit', 'MaintenanceController::audit');
    $routes->get('maintenance/errors', 'MaintenanceController::errors');
    $routes->get('maintenance/maintenance', 'MaintenanceController::maintenance');
});
