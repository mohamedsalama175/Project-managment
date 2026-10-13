<?php

namespace App\Modules\Tenancy\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Audit\Services\AuditLoggerService;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationUser;
use App\Modules\Tenancy\Requests\StoreOrganizationRequest;
use App\Modules\Tenancy\Requests\UpdateOrganizationRequest;
use App\Modules\Tenancy\Resources\OrganizationResource;
use App\Modules\Tenancy\Services\TenantManager;
use App\Modules\Tenancy\Services\TransferOwnershipService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrganizationController extends Controller
{
    public function __construct(
        protected TenantManager $tenantManager,
        protected AuditLoggerService $auditLogger
    ) {}

    public function current(Request $request): JsonResponse
    {
        $tenant = $this->tenantManager->getTenant();

        if (!$tenant) {
            return response()->json([
                'message' => 'No active organization selected.',
                'code' => 'TENANT_CONTEXT_MISSING',
            ], 400);
        }

        return response()->json([
            'organization' => new OrganizationResource($tenant),
        ]);
    }

    public function store(StoreOrganizationRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        $org = $this->tenantManager->executeWithoutTenantScope(function () use ($validated, $user) {
            return DB::transaction(function () use ($validated, $user) {
                $baseSlug = Str::slug($validated['name']);
                $slug = $baseSlug;
                $counter = 1;

                while (Organization::where('slug', $slug)->exists()) {
                    if ($counter > 10) {
                        throw new \RuntimeException('Failed to generate unique organization slug after 10 attempts.');
                    }
                    $slug = $baseSlug . '-' . Str::lower(Str::random(4)) . "-{$counter}";
                    $counter++;
                }

                    $organization = Organization::create([
                        'id' => (string) Str::ulid(),
                        'name' => $validated['name'],
                        'slug' => $slug,
                        'industry' => $validated['industry'] ?? null,
                        'region' => $validated['region'] ?? 'MENA',
                        'plan' => 'free',
                        'trial_ends_at' => now()->addDays(14),
                        'billing_email' => $user->email,
                        'timezone' => $validated['timezone'] ?? 'UTC',
                        'default_calendar' => $validated['default_calendar'] ?? 'standard_5d_40h',
                        'status' => 'trialing',
                    ]);

                    OrganizationUser::create([
                        'id' => (string) Str::ulid(),
                        'organization_id' => $organization->id,
                        'user_id' => $user->id,
                        'is_owner' => true,
                        'joined_at' => now(),
                    ]);

                    setPermissionsTeamId($organization->id);
                    $user->assignRole('admin');

                    $user->update(['default_organization_id' => $organization->id]);

                    return $organization;
                });
            });

            return response()->json([
                'message' => 'Organization created successfully.',
                'organization' => new OrganizationResource($org),
            ], 201);
        }

        public function update(UpdateOrganizationRequest $request): JsonResponse
        {
            $tenant = $this->tenantManager->getTenant();
            $user = $request->user();

            if (!$tenant) {
                return response()->json(['message' => 'No active organization.', 'code' => 'TENANT_CONTEXT_MISSING'], 400);
            }

            if (!$user->isOwnerOf($tenant) && !$user->can('roles.manage')) {
                return response()->json(['message' => 'Forbidden.', 'code' => 'ROLE_FORBIDDEN'], 403);
            }

            $oldValues = $tenant->only(['name', 'industry', 'region', 'timezone', 'billing_email', 'logo_path', 'default_calendar']);
            $data = $request->validated();
            if (isset($data['logo'])) {
                $data['logo_path'] = $data['logo'];
                unset($data['logo']);
            }
            if (isset($data['default_calendar'])) {
                $data['default_calendar'] = $data['default_calendar'];
            }
            $tenant->update($data);

            $this->auditLogger->log(
                action: 'org.updated',
                auditableType: Organization::class,
                auditableId: $tenant->id,
                projectId: null,
                organizationId: $tenant->id,
                oldValues: $oldValues,
                newValues: $request->validated()
            );

            return response()->json([
                'message' => 'Organization updated successfully.',
                'organization' => new OrganizationResource($tenant->fresh()),
            ]);
        }

        public function switch(Request $request): JsonResponse
        {
            return $this->switchAuthOrg($request);
        }

        public function switchAuthOrg(Request $request): JsonResponse
        {
            $validated = $request->validate([
                'organization_id' => ['required', 'string'],
            ]);

            $user = $request->user();
            $targetOrg = $user->organizations()
                ->where('organizations.id', $validated['organization_id'])
                ->whereIn('organizations.status', ['active', 'trialing'])
                ->first();

            if (!$targetOrg) {
                $isMember = OrganizationUser::where('organization_id', $validated['organization_id'])
                    ->where('user_id', $user->id)
                    ->exists();

                if ($isMember) {
                    $targetOrg = Organization::where('id', $validated['organization_id'])
                        ->whereIn('status', ['active', 'trialing'])
                        ->first();
                }
            }

            if (!$targetOrg) {
                return response()->json([
                    'message' => 'Access denied to target organization.',
                    'code' => 'TENANT_ACCESS_DENIED',
                ], 403);
            }

            $user->update([
                'default_organization_id' => $targetOrg->id,
            ]);
            $this->tenantManager->setTenant($targetOrg);
            setPermissionsTeamId($targetOrg->id);

            if ($request->hasSession()) {
                $request->session()->put('current_organization_id', $targetOrg->id);
                $request->session()->put('organization_id', $targetOrg->id);
            }

            return response()->json([
                'message' => "Switched active organization to {$targetOrg->name}.",
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'default_organization_id' => $targetOrg->id,
                ],
                'organization' => new OrganizationResource($targetOrg),
                'permissions' => $user->getAllPermissions()->pluck('name')->values()->toArray(),
            ]);
        }

    public function transferOwnership(Request $request, TransferOwnershipService $service): JsonResponse
    {
        $validated = $request->validate([
            'new_owner_id' => ['required', 'string', 'exists:users,id'],
        ]);

        $tenant = $this->tenantManager->getTenant();
        if (!$tenant) {
            return response()->json(['message' => 'No active organization.', 'code' => 'TENANT_CONTEXT_MISSING'], 400);
        }

        $currentOwner = $request->user();
        $newOwner = User::findOrFail($validated['new_owner_id']);

        $service->transfer($tenant, $currentOwner, $newOwner);

        return response()->json([
            'message' => "Organization ownership transferred successfully to {$newOwner->name}.",
        ]);
    }
}
