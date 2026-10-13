<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserController extends Controller
{
    public function __construct(
        protected UserService $userService
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', User::class);

        $query = User::with('roles');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('department', 'like', "%{$search}%")
                  ->orWhere('job_title', 'like', "%{$search}%");
            });
        }

        $dept = $request->query('dept') ?? $request->query('department');
        if ($dept && $dept !== 'all') {
            $query->where('department', $dept);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($role = $request->query('role')) {
            $query->role($role);
        }

        return UserResource::collection(
            $query->orderBy('name')->paginate($request->integer('per_page', 25))
        );
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->userService->createUser(
            $request->validated(),
            $request->file('avatar'),
            $request->user()
        );

        return (new UserResource($user->load('roles')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(User $user): JsonResponse
    {
        $this->authorize('view', $user);

        return response()->json([
            'data' => new UserResource($user->load('roles.permissions')),
            'workloadSummary' => [
                'activeTasksCount' => $user->primaryTasks()->whereNotIn('status', ['Completed'])->count(),
                'weeklyCapacityHours' => (float) $user->weekly_capacity_hours,
            ],
        ]);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $updated = $this->userService->updateUser(
            $user,
            $request->validated(),
            $request->file('avatar'),
            $request->user()
        );

        return response()->json([
            'message' => 'User updated successfully',
            'data' => new UserResource($updated->load('roles')),
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        $this->userService->deactivateOrDeleteUser($user, $request->user());

        return response()->json(['message' => 'User deactivated successfully.']);
    }
}
