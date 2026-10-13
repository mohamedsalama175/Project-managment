<?php

namespace App\Modules\Financials\Models;

use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Modules\Collaboration\Models\Attachment;
use App\Modules\Tenancy\Traits\TenantScoped;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Expense extends Model
{
    use HasFactory, HasUlids, SoftDeletes, TenantScoped;

    protected $table = 'expenses';
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:4',
            'expense_date' => 'date',
            'billable' => 'boolean',
            'submitted_at' => 'datetime',
            'approved_at' => 'datetime',
            'reimbursed_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'task_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function receipt(): BelongsTo
    {
        return $this->belongsTo(Attachment::class, 'receipt_attachment_id');
    }
}
