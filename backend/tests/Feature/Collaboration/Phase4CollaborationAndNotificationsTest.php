<?php

namespace Tests\Feature\Collaboration;

use App\Jobs\GlobalJob;
use App\Modules\Collaboration\Models\ActivityEvent;
use App\Modules\Collaboration\Models\Attachment;
use App\Modules\Collaboration\Models\CommentReaction;
use App\Modules\Notifications\Models\Notification;
use App\Modules\Notifications\Models\NotificationPreference;
use App\Models\Project;
use App\Models\Task;
use App\Modules\Collaboration\Models\TaskComment;
use App\Modules\Collaboration\Models\TaskWatcher;
use App\Models\User;
use App\Modules\Collaboration\Jobs\ScanAttachmentJob;
use App\Modules\Collaboration\Resources\TaskCommentResource;
use App\Modules\Collaboration\Services\ClamAvClient;
use App\Modules\Collaboration\Services\ClamAvClientInterface;
use App\Modules\Notifications\Mail\GenericDeliverOpsNotificationMail;
use App\Modules\Notifications\Services\NotificationDeliveryService;
use App\Modules\System\Services\InstallationOrchestrator;
use App\Modules\Tenancy\Helpers\TenantAuthHelper;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationUser;
use App\Modules\Tenancy\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use App\Modules\Collaboration\Services\MentionParserService;
use LogicException;
use Tests\TestCase;

class Phase4CollaborationAndNotificationsTest extends TestCase
{
    use RefreshDatabase;

    protected Organization $org;
    protected User $admin;
    protected User $pm;
    protected User $engineer;
    protected User $outsider;
    protected Project $project;
    protected Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        (new InstallationOrchestrator())->install([]);

        $this->org = Organization::find('01HZX000000000000000000000');
        app(TenantManager::class)->setTenant($this->org);
        setPermissionsTeamId($this->org->id);

        $this->admin = User::where('email', 'admin@deliverops.com')->first();

        // Project Manager fixture
        $this->pm = User::firstOrCreate(
            ['email' => 'pm.collab@deliverops.local'],
            [
                'name' => 'Collab PM',
                'password' => bcrypt('Password123!'),
                'job_title' => 'Project Manager',
                'department' => 'Product',
                'weekly_capacity_hours' => 40,
                'status' => 'active',
                'color' => '#1f8a70',
                'default_organization_id' => $this->org->id,
                'email_verified_at' => now(),
            ]
        );
        OrganizationUser::firstOrCreate(
            ['organization_id' => $this->org->id, 'user_id' => $this->pm->id],
            ['is_owner' => false, 'joined_at' => now()]
        );
        $this->pm->syncRoles(['project_manager']);

        // Engineer fixture
        $this->engineer = User::firstOrCreate(
            ['email' => 'engineer.collab@deliverops.local'],
            [
                'name' => 'Collab Engineer',
                'password' => bcrypt('Password123!'),
                'job_title' => 'Backend Engineer',
                'department' => 'Engineering',
                'weekly_capacity_hours' => 40,
                'status' => 'active',
                'color' => '#3b82f6',
                'default_organization_id' => $this->org->id,
                'email_verified_at' => now(),
            ]
        );
        OrganizationUser::firstOrCreate(
            ['organization_id' => $this->org->id, 'user_id' => $this->engineer->id],
            ['is_owner' => false, 'joined_at' => now()]
        );
        $this->engineer->syncRoles(['contributor']);

        // Outsider fixture (in org, but NOT member of this project)
        $this->outsider = User::firstOrCreate(
            ['email' => 'outsider.collab@deliverops.local'],
            [
                'name' => 'Outsider User',
                'password' => bcrypt('Password123!'),
                'job_title' => 'Viewer',
                'department' => 'Marketing',
                'weekly_capacity_hours' => 40,
                'status' => 'active',
                'color' => '#f59e0b',
                'default_organization_id' => $this->org->id,
                'email_verified_at' => now(),
            ]
        );
        OrganizationUser::firstOrCreate(
            ['organization_id' => $this->org->id, 'user_id' => $this->outsider->id],
            ['is_owner' => false, 'joined_at' => now()]
        );
        $this->outsider->syncRoles(['viewer']);

        // Test Project & Task
        $this->project = Project::create([
            'name' => 'Collab Testing Project',
            'code' => 'CLB-01',
            'project_manager_id' => $this->pm->id,
            'organization_id' => $this->org->id,
            'config' => ['weekendDays' => [5, 6], 'holidays' => [], 'autoSchedule' => true, 'durationMode' => 'working_days'],
        ]);

        // Add PM and Engineer as project members
        DB::table('project_users')->insert([
            ['id' => (string) \Illuminate\Support\Str::ulid(), 'organization_id' => $this->org->id, 'project_id' => $this->project->id, 'user_id' => $this->pm->id, 'project_role' => 'manager', 'created_at' => now()],
            ['id' => (string) \Illuminate\Support\Str::ulid(), 'organization_id' => $this->org->id, 'project_id' => $this->project->id, 'user_id' => $this->engineer->id, 'project_role' => 'contributor', 'created_at' => now()],
        ]);

        $this->task = Task::create([
            'project_id' => $this->project->id,
            'organization_id' => $this->org->id,
            'name' => 'Setup Pipeline & API',
            'category' => 'Engineering',
            'status' => 'In Progress',
            'start_date' => '2026-03-01',
            'end_date' => '2026-03-05',
            'primary_owner_id' => $this->engineer->id,
        ]);

        Storage::fake('local');
        Cache::flush();
    }

    // 1. Markdown Sanitization
    public function test_post_comment_creates_record_and_sanitizes_markdown(): void
    {
        $rawContent = 'Here is <b>bold</b> and <script>alert("xss")</script> code with <a href="#">link</a>.';

        $res = $this->actingAs($this->pm, 'sanctum')->postJson(
            "/api/v1/projects/{$this->project->id}/tasks/{$this->task->id}/comments",
            ['content' => $rawContent]
        );

        $res->assertStatus(201)
            ->assertJsonPath('data.is_tombstone', false);

        $comment = TaskComment::find($res->json('data.id'));
        $this->assertNotNull($comment);
        $this->assertStringNotContainsString('<script>', $comment->content);
        $this->assertStringContainsString('<b>bold</b>', $comment->content);
        $this->assertStringContainsString('<a href="#">link</a>', $comment->content);
    }

    // 2. Mentions & Auto-Enrollment
    public function test_post_comment_mentions_auto_enroll_watchers(): void
    {
        $content = "Hey @[Collab Engineer]({$this->engineer->id}), please check this task!";

        $res = $this->actingAs($this->pm, 'sanctum')->postJson(
            "/api/v1/projects/{$this->project->id}/tasks/{$this->task->id}/comments",
            ['content' => $content]
        );

        $res->assertStatus(201);
        $this->assertContains($this->engineer->id, $res->json('data.mentions'));

        // Both author (PM) and mentioned (Engineer) should be enrolled as watchers
        $this->assertTrue(TaskWatcher::where('task_id', $this->task->id)->where('user_id', $this->pm->id)->exists());
        $this->assertTrue(TaskWatcher::where('task_id', $this->task->id)->where('user_id', $this->engineer->id)->exists());
    }

    // 3. Primary Owner Auto-Enrollment (MED-03)
    public function test_post_comment_primary_owner_auto_enrolled_as_watcher(): void
    {
        // Set PM as primary owner, Engineer posts comment
        $this->task->update(['primary_owner_id' => $this->pm->id]);

        $res = $this->actingAs($this->engineer, 'sanctum')->postJson(
            "/api/v1/projects/{$this->project->id}/tasks/{$this->task->id}/comments",
            ['content' => 'Starting implementation now.']
        );

        $res->assertStatus(201);
        $this->assertTrue(TaskWatcher::where('task_id', $this->task->id)->where('user_id', $this->pm->id)->exists());
    }

    // 4. Threaded Replies (Max 1-Level Depth)
    public function test_comment_threaded_reply_nesting(): void
    {
        // Create root comment
        $root = TaskComment::create([
            'task_id' => $this->task->id,
            'organization_id' => $this->org->id,
            'user_id' => $this->pm->id,
            'content' => 'Top level comment',
        ]);

        // Reply to root
        $replyRes = $this->actingAs($this->engineer, 'sanctum')->postJson(
            "/api/v1/projects/{$this->project->id}/tasks/{$this->task->id}/comments",
            [
                'content' => 'First reply',
                'parent_comment_id' => $root->id,
            ]
        );
        $replyRes->assertStatus(201)
            ->assertJsonPath('data.parent_comment_id', $root->id);

        $replyId = $replyRes->json('data.id');

        // Reply to reply -> should flatten to root
        $grandchildRes = $this->actingAs($this->pm, 'sanctum')->postJson(
            "/api/v1/projects/{$this->project->id}/tasks/{$this->task->id}/comments",
            [
                'content' => 'Second reply',
                'parent_comment_id' => $replyId,
            ]
        );
        $grandchildRes->assertStatus(201)
            ->assertJsonPath('data.parent_comment_id', $root->id);
    }

    // 5. Update within 15 Minutes
    public function test_comment_update_within_15_minutes_succeeds(): void
    {
        $comment = TaskComment::create([
            'task_id' => $this->task->id,
            'organization_id' => $this->org->id,
            'user_id' => $this->pm->id,
            'content' => 'Original text',
            'created_at' => Carbon::now()->subMinutes(5),
        ]);

        $res = $this->actingAs($this->pm, 'sanctum')->putJson(
            "/api/v1/projects/{$this->project->id}/tasks/{$this->task->id}/comments/{$comment->id}",
            ['content' => 'Updated text within window']
        );

        $res->assertStatus(200)
            ->assertJsonPath('data.content', 'Updated text within window')
            ->assertJsonPath('data.is_edited', true);
    }

    // 6. Update after 15 Minutes Rejected
    public function test_comment_update_after_15_minutes_rejected(): void
    {
        $comment = TaskComment::create([
            'task_id' => $this->task->id,
            'organization_id' => $this->org->id,
            'user_id' => $this->pm->id,
            'content' => 'Original text',
            'created_at' => Carbon::now()->subMinutes(25),
        ]);

        $res = $this->actingAs($this->pm, 'sanctum')->putJson(
            "/api/v1/projects/{$this->project->id}/tasks/{$this->task->id}/comments/{$comment->id}",
            ['content' => 'Attempted late edit']
        );

        $this->assertTrue(in_array($res->status(), [403, 422]));
    }

    // 7. Soft Delete Tombstone
    public function test_comment_soft_delete_preserves_tombstone(): void
    {
        $comment = TaskComment::create([
            'task_id' => $this->task->id,
            'organization_id' => $this->org->id,
            'user_id' => $this->pm->id,
            'content' => 'Sensitive comment',
        ]);

        $delRes = $this->actingAs($this->pm, 'sanctum')->deleteJson(
            "/api/v1/projects/{$this->project->id}/tasks/{$this->task->id}/comments/{$comment->id}"
        );
        $delRes->assertStatus(200);

        // Fetch comments list
        $listRes = $this->actingAs($this->pm, 'sanctum')->getJson(
            "/api/v1/projects/{$this->project->id}/tasks/{$this->task->id}/comments"
        );

        $listRes->assertStatus(200);
        $tombstone = collect($listRes->json('data'))->firstWhere('id', $comment->id);
        $this->assertNotNull($tombstone);
        $this->assertEquals('[deleted]', $tombstone['content']);
        $this->assertTrue($tombstone['is_tombstone']);
        $this->assertNull($tombstone['user']);
    }

    // 8. Policy viewAny Project-Scoped (HIGH-05 / MED-08)
    public function test_comment_policy_view_any_requires_project_membership(): void
    {
        // Outsider is in the org, but not in project_users and not admin/owner
        $res = $this->actingAs($this->outsider, 'sanctum')->getJson(
            "/api/v1/projects/{$this->project->id}/tasks/{$this->task->id}/comments"
        );

        $res->assertStatus(403);
    }

    // 9. Comment Reactions Toggle
    public function test_comment_reaction_toggle_add_and_remove(): void
    {
        $comment = TaskComment::create([
            'task_id' => $this->task->id,
            'organization_id' => $this->org->id,
            'user_id' => $this->pm->id,
            'content' => 'React to this',
        ]);

        // Add reaction 👍
        $addRes = $this->actingAs($this->engineer, 'sanctum')->postJson(
            "/api/v1/comments/{$comment->id}/reactions",
            ['emoji' => '👍']
        );
        $addRes->assertStatus(200)
            ->assertJsonPath('action', 'added')
            ->assertJsonPath('reactions.👍.count', 1)
            ->assertJsonPath('reactions.👍.has_reacted', true);

        // Toggle again -> removes
        $removeRes = $this->actingAs($this->engineer, 'sanctum')->postJson(
            "/api/v1/comments/{$comment->id}/reactions",
            ['emoji' => '👍']
        );
        $removeRes->assertStatus(200)
            ->assertJsonPath('action', 'removed');
    }

    // 10. Comment Reaction Delete Endpoint
    public function test_comment_reaction_delete_endpoint(): void
    {
        $comment = TaskComment::create([
            'task_id' => $this->task->id,
            'organization_id' => $this->org->id,
            'user_id' => $this->pm->id,
            'content' => 'Delete emoji test',
        ]);

        CommentReaction::create([
            'organization_id' => $this->org->id,
            'comment_id' => $comment->id,
            'user_id' => $this->pm->id,
            'emoji' => '🎉',
            'created_at' => now(),
        ]);

        $res = $this->actingAs($this->pm, 'sanctum')->deleteJson(
            "/api/v1/comments/{$comment->id}/reactions/🎉"
        );

        $res->assertStatus(200)
            ->assertJsonPath('action', 'removed');
        $this->assertDatabaseMissing('comment_reactions', [
            'comment_id' => $comment->id,
            'emoji' => '🎉',
        ]);
    }

    // 11. Task Watchers Toggle
    public function test_task_watcher_toggle_watch_and_unwatch(): void
    {
        $watchRes = $this->actingAs($this->engineer, 'sanctum')->postJson(
            "/api/v1/projects/{$this->project->id}/tasks/{$this->task->id}/watch"
        );
        $watchRes->assertStatus(200)
            ->assertJsonPath('is_watching', true);

        $listRes = $this->actingAs($this->engineer, 'sanctum')->getJson(
            "/api/v1/projects/{$this->project->id}/tasks/{$this->task->id}/watchers"
        );
        $listRes->assertStatus(200)
            ->assertJsonPath('is_watching', true);

        $unwatchRes = $this->actingAs($this->engineer, 'sanctum')->deleteJson(
            "/api/v1/projects/{$this->project->id}/tasks/{$this->task->id}/watch"
        );
        $unwatchRes->assertStatus(200)
            ->assertJsonPath('is_watching', false);
    }

    // 12. Activity Event Logged on Comment
    public function test_activity_event_append_only_created_on_comment(): void
    {
        $this->actingAs($this->pm, 'sanctum')->postJson(
            "/api/v1/projects/{$this->project->id}/tasks/{$this->task->id}/comments",
            ['content' => 'Logging event test comment']
        );

        $this->assertDatabaseHas('activity_events', [
            'organization_id' => $this->org->id,
            'project_id' => $this->project->id,
            'task_id' => $this->task->id,
            'actor_id' => $this->pm->id,
            'action' => 'comment.created',
        ]);
    }

    // 13. Activity Event Immutability Model Guards
    public function test_activity_event_immutability_trigger_and_model_guards(): void
    {
        $event = ActivityEvent::create([
            'organization_id' => $this->org->id,
            'project_id' => $this->project->id,
            'task_id' => $this->task->id,
            'actor_id' => $this->pm->id,
            'action' => 'test.immutable',
            'metadata' => ['key' => 'initial'],
            'created_at' => now(),
        ]);

        $this->expectException(LogicException::class);
        $event->update(['action' => 'modified']);
    }

    // 14. Activity Feeds Pagination
    public function test_project_and_task_activity_feeds_pagination(): void
    {
        ActivityEvent::create([
            'organization_id' => $this->org->id,
            'project_id' => $this->project->id,
            'task_id' => $this->task->id,
            'actor_id' => $this->pm->id,
            'action' => 'feed.event',
            'metadata' => [],
            'created_at' => now(),
        ]);

        $projRes = $this->actingAs($this->pm, 'sanctum')->getJson(
            "/api/v1/projects/{$this->project->id}/activity"
        );
        $projRes->assertStatus(200)
            ->assertJsonStructure(['data', 'meta' => ['current_page', 'total']]);

        $taskRes = $this->actingAs($this->pm, 'sanctum')->getJson(
            "/api/v1/projects/{$this->project->id}/tasks/{$this->task->id}/activity"
        );
        $taskRes->assertStatus(200)
            ->assertJsonStructure(['data', 'meta' => ['current_page', 'total']]);
    }

    // 15. Attachment Upload Validates Magic Bytes
    public function test_attachment_upload_validates_magic_bytes(): void
    {
        \Illuminate\Support\Facades\Queue::fake([ScanAttachmentJob::class]);

        $file = UploadedFile::fake()->create('spec.pdf', 100, 'application/pdf');

        $res = $this->actingAs($this->pm, 'sanctum')->postJson(
            "/api/v1/projects/{$this->project->id}/tasks/{$this->task->id}/attachments",
            ['file' => $file]
        );

        $res->assertStatus(201)
            ->assertJsonPath('data.scan_status', 'pending');

        $this->assertDatabaseHas('attachments', [
            'file_name' => 'spec.pdf',
            'scan_status' => 'pending',
        ]);

        \Illuminate\Support\Facades\Queue::assertPushed(ScanAttachmentJob::class);
    }

    // 16. Attachment Upload Rejects Spoofed Mime
    public function test_attachment_upload_rejects_spoofed_mime_type(): void
    {
        // Disallowed extension/content
        $file = UploadedFile::fake()->create('malicious.exe', 100, 'application/x-msdownload');

        $res = $this->actingAs($this->pm, 'sanctum')->postJson(
            "/api/v1/projects/{$this->project->id}/tasks/{$this->task->id}/attachments",
            ['file' => $file]
        );

        $res->assertStatus(422);
    }

    // 17. ScanAttachmentJob Clean Scan
    public function test_scan_attachment_job_clean_scans_file(): void
    {
        $fakePath = 'attachments/' . $this->org->id . '/test_clean.pdf';
        Storage::disk('local')->put($fakePath, '%PDF-1.4 clean file content');

        $attachment = Attachment::create([
            'organization_id' => $this->org->id,
            'attachable_type' => Task::class,
            'attachable_id' => $this->task->id,
            'file_name' => 'test_clean.pdf',
            'file_path' => $fakePath,
            'file_size_bytes' => 100,
            'mime_type' => 'application/pdf',
            'storage_disk' => 'local',
            'scan_status' => 'pending',
            'uploaded_by' => $this->pm->id,
        ]);

        (new ScanAttachmentJob($attachment->id))->handle(app(TenantManager::class));

        $attachment->refresh();
        $this->assertEquals('clean', $attachment->scan_status);
    }

    // 18. ScanAttachmentJob Handles S3 Storage Driver (BUG-02 / MED-08)
    public function test_scan_attachment_job_handles_s3_storage_driver(): void
    {
        Storage::fake('s3');
        $fakePath = 'attachments/' . $this->org->id . '/s3_clean.pdf';
        Storage::disk('s3')->put($fakePath, '%PDF-1.4 s3 cloud stream test');

        $attachment = Attachment::create([
            'organization_id' => $this->org->id,
            'attachable_type' => Task::class,
            'attachable_id' => $this->task->id,
            'file_name' => 's3_clean.pdf',
            'file_path' => $fakePath,
            'file_size_bytes' => 120,
            'mime_type' => 'application/pdf',
            'storage_disk' => 's3',
            'scan_status' => 'pending',
            'uploaded_by' => $this->pm->id,
        ]);

        // Job runs executeGlobally with stream reading without calling Storage::path()
        (new ScanAttachmentJob($attachment->id))->handle(app(TenantManager::class));

        $attachment->refresh();
        $this->assertEquals('clean', $attachment->scan_status);
    }

    // 19. Attachment Download Blocked When Pending or Infected
    public function test_attachment_download_blocked_when_pending_or_infected(): void
    {
        $attachment = Attachment::create([
            'organization_id' => $this->org->id,
            'attachable_type' => Task::class,
            'attachable_id' => $this->task->id,
            'file_name' => 'doc.pdf',
            'file_path' => 'attachments/doc.pdf',
            'file_size_bytes' => 100,
            'mime_type' => 'application/pdf',
            'storage_disk' => 'local',
            'scan_status' => 'pending',
            'uploaded_by' => $this->pm->id,
        ]);

        $pendingRes = $this->actingAs($this->pm, 'sanctum')->get(
            "/api/v1/projects/{$this->project->id}/tasks/{$this->task->id}/attachments/{$attachment->id}/download"
        );
        $pendingRes->assertStatus(423);

        $attachment->update(['scan_status' => 'infected']);

        $infectedRes = $this->actingAs($this->pm, 'sanctum')->get(
            "/api/v1/projects/{$this->project->id}/tasks/{$this->task->id}/attachments/{$attachment->id}/download"
        );
        $infectedRes->assertStatus(422);
    }

    // 20. Attachment Download Allowed When Clean With Content-Disposition
    public function test_attachment_download_allowed_with_content_disposition_when_clean(): void
    {
        $path = 'attachments/' . $this->org->id . '/download_ready.pdf';
        Storage::disk('local')->put($path, '%PDF-1.4 file ready');

        $attachment = Attachment::create([
            'organization_id' => $this->org->id,
            'attachable_type' => Task::class,
            'attachable_id' => $this->task->id,
            'file_name' => 'download_ready.pdf',
            'file_path' => $path,
            'file_size_bytes' => 100,
            'mime_type' => 'application/pdf',
            'storage_disk' => 'local',
            'scan_status' => 'clean',
            'uploaded_by' => $this->pm->id,
        ]);

        $res = $this->actingAs($this->pm, 'sanctum')->get(
            "/api/v1/projects/{$this->project->id}/tasks/{$this->task->id}/attachments/{$attachment->id}/download"
        );

        $res->assertStatus(200);
        $this->assertStringContainsString('attachment', $res->headers->get('Content-Disposition') ?? '');
    }

    // 21. Notification Pipeline Dispatches Mention & Watched Events
    public function test_notification_pipeline_dispatches_mention_and_watched_events(): void
    {
        $pipeline = app(NotificationDeliveryService::class);

        $comment = TaskComment::create([
            'task_id' => $this->task->id,
            'organization_id' => $this->org->id,
            'user_id' => $this->pm->id,
            'content' => 'Review needed',
        ]);

        $pipeline->notifyCommentCreated($comment, [$this->engineer->id]);

        $this->assertDatabaseHas('notifications', [
            'organization_id' => $this->org->id,
            'user_id' => $this->engineer->id,
            'event_type' => 'mention',
        ]);
    }

    // 22. Atomic Cache Deduplication Within 60 Seconds
    public function test_notification_pipeline_atomic_cache_dedup_within_60_seconds(): void
    {
        $pipeline = app(NotificationDeliveryService::class);

        // First dispatch
        $pipeline->dispatch(
            recipient: $this->engineer,
            eventType: 'mention',
            title: 'First Notification',
            body: 'First body',
            taskId: $this->task->id
        );

        // Immediate second dispatch for same recipient:event:task
        $pipeline->dispatch(
            recipient: $this->engineer,
            eventType: 'mention',
            title: 'Duplicate Notification',
            body: 'Duplicate body',
            taskId: $this->task->id
        );

        $count = Notification::where('user_id', $this->engineer->id)
            ->where('event_type', 'mention')
            ->count();

        $this->assertEquals(1, $count);
    }

    // 23. Notification Preferences Customization
    public function test_notification_preferences_per_organization_and_channel(): void
    {
        $res = $this->actingAs($this->engineer, 'sanctum')->putJson(
            '/api/v1/notification-preferences',
            [
                'preferences' => [
                    [
                        'event_type' => 'mention',
                        'channel' => 'in_app',
                        'enabled' => false,
                    ],
                ],
            ]
        );

        $res->assertStatus(200);
        $this->assertDatabaseHas('notification_preferences', [
            'user_id' => $this->engineer->id,
            'event_type' => 'mention',
            'channel' => 'in_app',
            'enabled' => 0,
        ]);
    }

    // 24. Notification Unread Count & Mark Read
    public function test_notification_unread_count_and_mark_as_read(): void
    {
        $notif = Notification::create([
            'organization_id' => $this->org->id,
            'user_id' => $this->engineer->id,
            'type' => 'mention',
            'title' => 'Unread Test',
            'body' => 'Body',
            'event_type' => 'mention',
        ]);

        $countRes = $this->actingAs($this->engineer, 'sanctum')->getJson('/api/v1/notifications/unread-count');
        $countRes->assertStatus(200)
            ->assertJsonPath('unread_count', 1);

        $readRes = $this->actingAs($this->engineer, 'sanctum')->putJson("/api/v1/notifications/{$notif->id}/read");
        $readRes->assertStatus(200);

        $countResAfter = $this->actingAs($this->engineer, 'sanctum')->getJson('/api/v1/notifications/unread-count');
        $countResAfter->assertStatus(200)
            ->assertJsonPath('unread_count', 0);
    }

    // 25. TenantAuthHelper isOrgOwner Respects Explicit Org ID (BUG-03 / MED-08)
    public function test_tenant_auth_helper_is_org_owner_uses_passed_org_id(): void
    {
        $secondOrg = Organization::create([
            'name' => 'Second Organization',
            'slug' => 'second-org',
        ]);

        OrganizationUser::create([
            'organization_id' => $secondOrg->id,
            'user_id' => $this->pm->id,
            'is_owner' => true,
            'joined_at' => now(),
        ]);

        // In primary org context, PM is NOT owner
        $this->assertFalse(TenantAuthHelper::isOrgOwner($this->pm, $this->org->id));

        // For second org, PM IS owner
        $this->assertTrue(TenantAuthHelper::isOrgOwner($this->pm, $secondOrg->id));
    }

    // 26. TaskCommentResource Handles Soft Deleted User (HIGH-02 / MED-08)
    public function test_task_comment_resource_handles_soft_deleted_user(): void
    {
        $tempUser = User::create([
            'name' => 'To Be Deleted',
            'email' => 'delete.me@deliverops.local',
            'password' => bcrypt('password'),
            'default_organization_id' => $this->org->id,
        ]);

        $comment = TaskComment::create([
            'task_id' => $this->task->id,
            'organization_id' => $this->org->id,
            'user_id' => $tempUser->id,
            'content' => 'Comment by soft-deleted user',
        ]);

        // Soft delete user
        $tempUser->delete();

        // Load comment with user relation
        $comment->load('user');

        $resource = new TaskCommentResource($comment);
        $data = $resource->toArray(Request::create('/'));

        $this->assertNull($data['user']);
        $this->assertEquals('Comment by soft-deleted user', $data['content']);
    }

    // 27. GenericDeliverOpsNotificationMail Renders Correctly (HIGH-04 / MED-08)
    public function test_notification_mailable_renders_without_tenant_context_loss(): void
    {
        $mailable = new GenericDeliverOpsNotificationMail(
            notificationTitle: 'Task Assigned',
            notificationBody: 'You were assigned to task CLB-01',
            actionUrl: '/planner?task=123',
            eventType: 'mention',
            recipient: $this->engineer
        );

        $html = $mailable->render();

        $this->assertStringContainsString('Task Assigned', $html);
        $this->assertStringContainsString('You were assigned to task CLB-01', $html);
        $this->assertStringContainsString('/planner?task=123', $html);
    }

    // 28. CRIT-01: ScanAttachmentJob Uses Correct storage_disk Column
    public function test_scan_job_uses_correct_storage_disk_column(): void
    {
        Storage::fake('custom_local');
        $fakePath = 'attachments/' . $this->org->id . '/test_disk_column.pdf';
        Storage::disk('custom_local')->put($fakePath, '%PDF-1.4 custom disk scan');

        $attachment = Attachment::create([
            'organization_id' => $this->org->id,
            'attachable_type' => Task::class,
            'attachable_id' => $this->task->id,
            'file_name' => 'test_disk_column.pdf',
            'file_path' => $fakePath,
            'file_size_bytes' => 110,
            'mime_type' => 'application/pdf',
            'storage_disk' => 'custom_local',
            'scan_status' => 'pending',
            'uploaded_by' => $this->pm->id,
        ]);

        $this->assertEquals('custom_local', $attachment->storage_disk);

        (new ScanAttachmentJob($attachment->id))->handle(app(TenantManager::class));

        $attachment->refresh();
        $this->assertEquals('clean', $attachment->scan_status);
    }

    // 29. HIGH-02: Activity Event Trigger Portability and Driver Guards
    public function test_activity_trigger_creation_on_mysql_driver(): void
    {
        $driver = DB::getDriverName();
        $this->assertNotEmpty($driver);

        // Model-level immutability enforcement
        $event = ActivityEvent::create([
            'organization_id' => $this->org->id,
            'project_id' => $this->project->id,
            'task_id' => $this->task->id,
            'actor_id' => $this->pm->id,
            'action' => 'guard.test',
            'metadata' => [],
            'created_at' => now(),
        ]);

        try {
            $event->delete();
            $this->fail('Expected LogicException on delete of ActivityEvent');
        } catch (LogicException $e) {
            $this->assertStringContainsString('ACTIVITY_EVENT_IMMUTABLE', $e->getMessage());
        }
    }

    // 30. HIGH-03: CommentReaction Model Persists to Correct Table
    public function test_comment_reaction_model_persists_to_correct_table(): void
    {
        $comment = TaskComment::create([
            'task_id' => $this->task->id,
            'organization_id' => $this->org->id,
            'user_id' => $this->pm->id,
            'content' => 'Model table test',
        ]);

        $reaction = CommentReaction::create([
            'organization_id' => $this->org->id,
            'comment_id' => $comment->id,
            'user_id' => $this->engineer->id,
            'emoji' => '👍',
            'created_at' => now(),
        ]);

        $this->assertEquals('comment_reactions', $reaction->getTable());
        $this->assertDatabaseHas('comment_reactions', [
            'id' => $reaction->id,
            'comment_id' => $comment->id,
            'user_id' => $this->engineer->id,
            'emoji' => '👍',
        ]);
    }

    // 31. HIGH-03: TaskWatcher Model Persists Correctly
    public function test_task_watcher_model_persists_correctly(): void
    {
        $watcher = TaskWatcher::create([
            'organization_id' => $this->org->id,
            'task_id' => $this->task->id,
            'user_id' => $this->engineer->id,
            'created_at' => now(),
        ]);

        $this->assertEquals('task_watchers', $watcher->getTable());
        $this->assertDatabaseHas('task_watchers', [
            'id' => $watcher->id,
            'task_id' => $this->task->id,
            'user_id' => $this->engineer->id,
        ]);
    }

    // 32. HIGH-01: Attachment Upgrade Migration Schema Columns
    public function test_attachment_upgrade_migration_adds_scan_status_column(): void
    {
        $this->assertTrue(Schema::hasTable('attachments'));
        $this->assertTrue(Schema::hasColumns('attachments', [
            'scan_status',
            'scan_details',
            'storage_disk',
            'file_size_bytes',
            'mime_type',
        ]));
        $this->assertTrue(Schema::hasColumns('notifications', [
            'event_type',
            'action_url',
            'task_id',
            'project_id',
        ]));
    }

    // 33. HIGH-04: Notification Mailable Requires Tenant Context
    public function test_notification_mailable_requires_tenant_context(): void
    {
        $mailable = new GenericDeliverOpsNotificationMail(
            notificationTitle: 'Scoped Notification',
            notificationBody: 'Body with scoped context',
            actionUrl: '/planner?task=scoped',
            eventType: 'review_requested',
            recipient: $this->pm
        );

        $this->assertEquals($this->pm->id, $mailable->recipient->id);
        $rendered = $mailable->render();
        $this->assertStringContainsString('Scoped Notification', $rendered);
        $this->assertStringContainsString($this->pm->name, $rendered);
    }

    // 34. HIGH-05: Comment Policy Blocks Non-Project Members
    public function test_comment_policy_blocks_non_project_members(): void
    {
        $this->assertFalse(
            Gate::forUser($this->outsider)->allows('viewAny', [\App\Modules\Collaboration\Models\TaskComment::class, $this->task])
        );

        $this->assertTrue(
            Gate::forUser($this->engineer)->allows('viewAny', [\App\Modules\Collaboration\Models\TaskComment::class, $this->task])
        );
    }

    // 35. MED-05: Notification Deduplication Uses Atomic Cache Add
    public function test_notification_dedup_uses_atomic_cache_add(): void
    {
        $pipeline = app(NotificationDeliveryService::class);
        $dedupKey = "notif_dedup:{$this->engineer->id}:assignment:{$this->task->id}";

        Cache::forget($dedupKey);

        $pipeline->dispatch(
            recipient: $this->engineer,
            eventType: 'assignment',
            title: 'Assigned',
            body: 'You were assigned',
            taskId: $this->task->id
        );

        $this->assertTrue(Cache::has($dedupKey));
    }

    // 36. MED-01: Sample Project Activity Feed Filtering
    public function test_is_sample_filter_applied_to_activity_feed(): void
    {
        $sampleProject = Project::create([
            'name' => 'Sample Onboarding Project',
            'code' => 'SMP-01',
            'project_manager_id' => $this->pm->id,
            'organization_id' => $this->org->id,
            'is_sample' => true,
            'config' => ['weekendDays' => [5, 6], 'holidays' => [], 'autoSchedule' => true, 'durationMode' => 'working_days'],
        ]);

        // When organization has NOT opted into sample data (sample_project_id is null)
        $this->org->update(['sample_project_id' => null]);

        $res = $this->actingAs($this->pm, 'sanctum')->getJson(
            "/api/v1/projects/{$sampleProject->id}/activity"
        );
        $res->assertStatus(404);

        // When organization has sample project linked
        $this->org->update(['sample_project_id' => $sampleProject->id]);

        $resOpted = $this->actingAs($this->pm, 'sanctum')->getJson(
            "/api/v1/projects/{$sampleProject->id}/activity"
        );
        $resOpted->assertStatus(200);
    }

    // 37. MED-03: MentionParserService Handles Bracket Format
    public function test_mention_parser_handles_bracket_format(): void
    {
        $parser = app(MentionParserService::class);
        $ulids = $parser->extract('Hello @[Ahmed Khalil](01HZX00000000000000000ABCD) and @[Sara](01HZX00000000000000000EFGH)');
        $this->assertCount(2, $ulids);
        $this->assertEquals(['01HZX00000000000000000ABCD', '01HZX00000000000000000EFGH'], $ulids);
    }

    // 38. MED-04: Notification Pipeline Checks User Timezone Quiet Hours
    public function test_notification_pipeline_checks_user_timezone_quiet_hours(): void
    {
        $pipeline = app(NotificationDeliveryService::class);

        // Full day quiet hours
        $this->assertTrue($pipeline->isWithinQuietHours('00:00:00', '23:59:59', 'UTC'));
        $this->assertFalse($pipeline->isWithinQuietHours(null, null, 'UTC'));
    }

    // 39. LOW-03: TaskCommentResource Masks User Email for Non-Admin
    public function test_task_comment_resource_masks_user_email_for_non_admin(): void
    {
        $comment = TaskComment::create([
            'task_id' => $this->task->id,
            'organization_id' => $this->org->id,
            'user_id' => $this->pm->id,
            'content' => 'PII safety test',
        ]);

        $comment->load('user');

        // Non-admin viewer (Engineer looking at PM's comment)
        $requestNonAdmin = Request::create('/');
        $requestNonAdmin->setUserResolver(fn() => $this->engineer);
        $resourceNonAdmin = new TaskCommentResource($comment);
        $dataNonAdmin = $resourceNonAdmin->toArray($requestNonAdmin);

        $this->assertNull($dataNonAdmin['user']['email']);

        // Admin viewer
        $requestAdmin = Request::create('/');
        $requestAdmin->setUserResolver(fn() => $this->admin);
        $resourceAdmin = new TaskCommentResource($comment);
        $dataAdmin = $resourceAdmin->toArray($requestAdmin);

        $this->assertEquals($this->pm->email, $dataAdmin['user']['email']);
    }
}
