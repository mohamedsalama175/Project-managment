<?php

namespace App\Modules\Identity\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Identity\Services\ScimService;
use App\Modules\Tenancy\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScimController extends Controller
{
    public function __construct(
        protected ScimService $scimService,
        protected TenantManager $tenantManager
    ) {}

    public function getUsers(Request $request): JsonResponse
    {
        $orgId = $this->tenantManager->getTenantId();
        $filter = $request->query('filter');
        $startIndex = (int) $request->query('startIndex', 1);
        $count = (int) $request->query('count', 100);

        $res = $this->scimService->listUsers($orgId, $filter, $startIndex, $count);

        return response()->json($res, 200, ['Content-Type' => 'application/scim+json']);
    }

    public function createUser(Request $request): JsonResponse
    {
        $orgId = $this->tenantManager->getTenantId();
        $res = $this->scimService->createUser($orgId, $request->all());

        return response()->json($res, 201, ['Content-Type' => 'application/scim+json']);
    }

    public function getUser(string $id): JsonResponse
    {
        $orgId = $this->tenantManager->getTenantId();
        $res = $this->scimService->getUser($orgId, $id);

        return response()->json($res, 200, ['Content-Type' => 'application/scim+json']);
    }

    public function patchUser(Request $request, string $id): JsonResponse
    {
        $orgId = $this->tenantManager->getTenantId();
        $operations = $request->input('Operations', []);
        $res = $this->scimService->patchUser($orgId, $id, $operations);

        return response()->json($res, 200, ['Content-Type' => 'application/scim+json']);
    }

    public function deleteUser(string $id): JsonResponse
    {
        $orgId = $this->tenantManager->getTenantId();
        $this->scimService->deleteUser($orgId, $id);

        return response()->json(null, 204);
    }

    public function getGroups(): JsonResponse
    {
        $orgId = $this->tenantManager->getTenantId();
        $res = $this->scimService->listGroups($orgId);

        return response()->json($res, 200, ['Content-Type' => 'application/scim+json']);
    }
}
