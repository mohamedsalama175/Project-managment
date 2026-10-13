<?php

namespace App\Modules\Tenancy\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Tenancy\Models\Organization;
use App\Modules\Tenancy\Models\OrganizationInvitation;
use App\Modules\Tenancy\Requests\AcceptInvitationRequest;
use App\Modules\Tenancy\Requests\InviteMemberRequest;
use App\Modules\Tenancy\Resources\OrganizationInvitationResource;
use App\Modules\Tenancy\Resources\OrganizationResource;
use App\Modules\Tenancy\Services\OrganizationInvitationService;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class OrganizationInvitationController extends Controller
{
    public function __construct(
        protected TenantManager $tenantManager,
        protected OrganizationInvitationService $invitationService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenant = $this->tenantManager->getTenant();
        if (!$tenant) {
            return response()->json(['message' => 'No active organization.', 'code' => 'TENANT_CONTEXT_MISSING'], 400);
        }

        $invites = OrganizationInvitation::where('organization_id', $tenant->id)
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'invitations' => OrganizationInvitationResource::collection($invites),
        ]);
    }

    public function invite(InviteMemberRequest $request): JsonResponse
    {
        $tenant = $this->tenantManager->getTenant();
        if (!$tenant) {
            return response()->json(['message' => 'No active organization.', 'code' => 'TENANT_CONTEXT_MISSING'], 400);
        }

        $user = $request->user();
        if (!$user->isOwnerOf($tenant) && !$user->can('users.create')) {
            return response()->json(['message' => 'Forbidden.', 'code' => 'ROLE_FORBIDDEN'], 403);
        }

        $result = $this->invitationService->invite(
            $tenant,
            $user,
            $request->validated('email'),
            $request->validated('role')
        );

        return response()->json([
            'message' => 'Invitation dispatched successfully.',
            'invitation' => new OrganizationInvitationResource($result['invitation']),
            'inviteUrl' => url("/accept-invite?token={$result['plainToken']}"),
            'token' => $result['plainToken'],
        ], 201);
    }

    public function inviteByOrgId(InviteMemberRequest $request, string $id): JsonResponse
    {
        $org = Organization::findOrFail($id);
        $user = $request->user();

        if (!$user->isOwnerOf($org) && !$user->can('users.create')) {
            return response()->json(['message' => 'Forbidden.', 'code' => 'ROLE_FORBIDDEN'], 403);
        }

        $result = $this->invitationService->invite(
            $org,
            $user,
            $request->validated('email'),
            $request->validated('role')
        );

        return response()->json([
            'message' => 'Invitation dispatched successfully.',
            'invitation' => new OrganizationInvitationResource($result['invitation']),
            'inviteUrl' => url("/accept-invite?token={$result['plainToken']}"),
            'token' => $result['plainToken'],
        ], 201);
    }

    public function revoke(Request $request, OrganizationInvitation $invitation): JsonResponse
    {
        $tenant = $this->tenantManager->getTenant();
        if (!$tenant || $invitation->organization_id !== $tenant->id) {
            return response()->json(['message' => 'Not found.', 'code' => 'INVITE_NOT_FOUND'], 404);
        }

        $user = $request->user();
        if (!$user->isOwnerOf($tenant) && !$user->can('users.delete')) {
            return response()->json(['message' => 'Forbidden.', 'code' => 'ROLE_FORBIDDEN'], 403);
        }

        $this->invitationService->revoke($invitation, $user);

        return response()->json([
            'message' => 'Invitation revoked successfully.',
        ]);
    }

    public function resend(Request $request, OrganizationInvitation $invitation): JsonResponse
    {
        $tenant = $this->tenantManager->getTenant();
        if (!$tenant || $invitation->organization_id !== $tenant->id) {
            return response()->json(['message' => 'Not found.', 'code' => 'INVITE_NOT_FOUND'], 404);
        }

        $user = $request->user();
        if (!$user->isOwnerOf($tenant) && !$user->can('users.create')) {
            return response()->json(['message' => 'Forbidden.', 'code' => 'ROLE_FORBIDDEN'], 403);
        }

        $result = $this->invitationService->invite(
            $tenant,
            $user,
            $invitation->email,
            $invitation->role
        );

        return response()->json([
            'message' => 'Invitation resent successfully.',
            'invitation' => new OrganizationInvitationResource($result['invitation']),
            'inviteUrl' => url("/accept-invite?token={$result['plainToken']}"),
            'token' => $result['plainToken'],
        ]);
    }

    public function accept(AcceptInvitationRequest $request): JsonResponse
    {
        return $this->tenantManager->executeWithoutTenantScope(function () use ($request) {
            $user = $request->user();
            $plainToken = $request->validated('token');
            $tokenHash = hash('sha256', $plainToken);

            $org = $this->invitationService->accept($tokenHash, $user);

            return response()->json([
                'message' => "Welcome to {$org->name}! You have joined the organization.",
                'organization' => new OrganizationResource($org),
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'default_organization_id' => $user->default_organization_id,
                ],
            ]);
        });
    }

    public function acceptWithToken(Request $request, string $token): JsonResponse
    {
        return $this->tenantManager->executeWithoutTenantScope(function () use ($request, $token) {
            $tokenHash = hash('sha256', $token);

            $invite = OrganizationInvitation::where('token_hash', $tokenHash)->first();

            if (!$invite) {
                return response()->json([
                    'message' => 'Invitation not found.',
                    'code' => 'INVITE_NOT_FOUND',
                ], 404);
            }

            if ($invite->accepted_at !== null) {
                return response()->json([
                    'message' => 'This invitation has already been accepted.',
                    'code' => 'INVITE_ALREADY_ACCEPTED',
                ], 409);
            }

            if (now()->greaterThan($invite->expires_at)) {
                return response()->json([
                    'message' => 'This invitation has expired.',
                    'code' => 'INVITE_EXPIRED',
                ], 410);
            }

            $user = $request->user();

            if (!$user) {
                $existingUser = User::where('email', $invite->email)->first();

                if ($existingUser) {
                    $user = $existingUser;
                } else {
                    $validated = $request->validate([
                        'name' => ['required', 'string', 'max:255'],
                        'password' => ['required', 'string', 'min:12'],
                    ]);

                    $user = User::create([
                        'id' => (string) Str::ulid(),
                        'name' => $validated['name'],
                        'email' => $invite->email,
                        'password' => Hash::make($validated['password']),
                        'status' => 'active',
                        'default_organization_id' => $invite->organization_id,
                        'email_verified_at' => now(),
                    ]);
                }

                Auth::guard('web')->login($user);
                if ($request->hasSession()) {
                    $request->session()->regenerate();
                }
            }

            $org = $this->invitationService->accept($invite->token_hash, $user);

            return response()->json([
                'message' => "Welcome to {$org->name}! You have joined the organization.",
                'organization' => new OrganizationResource($org),
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'default_organization_id' => $user->default_organization_id,
                ],
            ]);
        });
    }
}
