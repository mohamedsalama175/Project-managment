<?php

namespace App\Modules\Templates\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectTemplateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $tasks = $this->template_data['tasks'] ?? [];
        $dependencies = $this->template_data['dependencies'] ?? [];
        $risks = $this->template_data['risks'] ?? [];

        return [
            'id' => $this->id,
            'organization_id' => $this->organization_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'industry' => $this->industry,
            'category' => $this->category,
            'is_system' => (bool) $this->is_system,
            'version' => (int) $this->version,
            'tasks_count' => count($tasks),
            'dependencies_count' => count($dependencies),
            'risks_count' => count($risks),
            'template_data' => $this->template_data,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
