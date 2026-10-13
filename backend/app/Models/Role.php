<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Spatie\Permission\Models\Role as SpatieRole;

class Role extends SpatieRole
{
    use HasUlids;

    protected $guarded = [];

    protected string $guard_name = 'web';

    protected $casts = [
        'is_system' => 'boolean',
    ];
}
