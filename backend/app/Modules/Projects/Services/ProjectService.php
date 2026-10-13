<?php

namespace App\Modules\Projects\Services;

use App\Models\Project;
use App\Models\User;
use App\Services\DeliverOpsAuditService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class ProjectService
{
    public function __construct(
        protected DeliverOpsAuditService $auditService
    ) {}

    public function listProjects(User $user, array $filters = []): LengthAwarePaginator
    {
        $query = Project::query()
            ->with(['projectManager'])
            ->withCount(['tasks', 'risks', 'members']);

        if (!$user->hasRole('admin')) {
            $query->where(function (Builder $q) use ($user) {
                $q->where('project_manager_id', $user->id)
                    ->orWhereHas('members', fn (Builder $mq) => $mq->where('user_id', $user->id));
            });
        }

        if (isset($filters['is_archived'])) {
            $isArchived = filter_var($filters['is_archived'], FILTER_VALIDATE_BOOLEAN);
            $query->where('is_archived', $isArchived);
        } else {
            $query->where('is_archived', false);
        }

        if (!empty($filters['search'])) {
            $search = '%' . $filters['search'] . '%';
            $query->where(function (Builder $q) use ($search) {
                $q->where('name', 'like', $search)
                    ->orWhere('description', 'like', $search);
            });
        }

        return $query->orderByDesc('updated_at')->paginate($filters['per_page'] ?? 20);
    }

    public function createProject(array $data, User $actor): Project
    {
        $tenantManager = app(\App\Modules\Tenancy\Services\TenantManager::class);
        if ($tenant = $tenantManager->getTenant()) {
            app(\App\Modules\Tenancy\Services\PlanLimitService::class)->checkProjectCreationLimit($tenant);
        }

        return DB::transaction(function () use ($data, $actor) {
            $projectManagerId = $data['project_manager_id'] ?? $actor->id;
            $code = !empty($data['code']) ? $data['code'] : ('PRJ-' . strtoupper(\Illuminate\Support\Str::random(6)));

            $project = Project::create([
                'name' => $data['name'],
                'code' => $code,
                'description' => $data['description'] ?? null,
                'client_name' => $data['client_name'] ?? null,
                'project_type' => $data['project_type'] ?? 'unclassified',
                'project_manager_id' => $projectManagerId,
                'config' => $data['config'] ?? [
                    'weekendDays' => [5, 6],
                    'holidays' => [],
                    'autoSchedule' => true,
                    'durationMode' => 'working_days',
                ],
                'has_locked_baseline' => false,
                'is_archived' => false,
                'tree_version' => 1,
            ]);

            // Ensure PM is attached as project member
            $project->members()->syncWithoutDetaching([
                $projectManagerId => ['project_role' => 'lead'],
            ]);

            $this->auditService->log(
                entity: $project,
                action: 'project.created',
                actor: $actor,
                newValue: $project->toArray()
            );

            return $project;
        });
    }

    public function updateProject(Project $project, array $data, User $actor): Project
    {
        return DB::transaction(function () use ($project, $data, $actor) {
            $oldValues = $project->toArray();

            $project->update(array_filter([
                'name' => $data['name'] ?? $project->name,
                'description' => array_key_exists('description', $data) ? $data['description'] : $project->description,
                'project_manager_id' => $data['project_manager_id'] ?? $project->project_manager_id,
                'config' => $data['config'] ?? $project->config,
            ], fn ($val) => $val !== null));

            if (isset($data['project_manager_id']) && $data['project_manager_id'] !== $oldValues['project_manager_id']) {
                $project->members()->syncWithoutDetaching([
                    $data['project_manager_id'] => ['project_role' => 'lead'],
                ]);
            }

            $this->auditService->log(
                entity: $project,
                action: 'project.updated',
                actor: $actor,
                oldValue: $oldValues,
                newValue: $project->fresh()->toArray()
            );

            return $project->fresh(['projectManager']);
        });
    }

    public function archiveProject(Project $project, User $actor): Project
    {
        return DB::transaction(function () use ($project, $actor) {
            $oldValues = $project->toArray();
            $project->update(['is_archived' => true]);

            $this->auditService->log(
                entity: $project,
                action: 'project.archived',
                actor: $actor,
                oldValue: $oldValues,
                newValue: $project->toArray()
            );

            return $project;
        });
    }

    public function restoreProject(Project $project, User $actor): Project
    {
        return DB::transaction(function () use ($project, $actor) {
            $oldValues = $project->toArray();
            $project->update(['is_archived' => false]);

            $this->auditService->log(
                entity: $project,
                action: 'project.restored',
                actor: $actor,
                oldValue: $oldValues,
                newValue: $project->toArray()
            );

            return $project;
        });
    }

    public function addMember(Project $project, User $targetUser, string $role, User $actor): void
    {
        $project->members()->syncWithoutDetaching([
            $targetUser->id => ['project_role' => $role],
        ]);

        $this->auditService->log(
            entity: $project,
            action: 'project.member_added',
            actor: $actor,
            newValue: ['user_id' => $targetUser->id, 'role' => $role]
        );
    }

    public function removeMember(Project $project, User $targetUser, User $actor): void
    {
        if ($project->project_manager_id === $targetUser->id) {
            abort(422, 'Cannot remove the primary project manager from the project membership.');
        }

        $project->members()->detach($targetUser->id);

        $this->auditService->log(
            entity: $project,
            action: 'project.member_removed',
            actor: $actor,
            oldValue: ['user_id' => $targetUser->id]
        );
    }
}
