<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InstallState extends Model
{
    public const SINGLETON_ID = 'deliverops_install_singleton';

    protected $table = 'install_state';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'installed_at',
        'installed_via',
        'installed_by_ip',
        'admin_user_id',
        'app_version',
    ];

    protected $casts = [
        'installed_at' => 'datetime',
    ];

    public function adminUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_user_id');
    }

    public static function isInstalled(): bool
    {
        return static::where('id', self::SINGLETON_ID)->exists();
    }
}
