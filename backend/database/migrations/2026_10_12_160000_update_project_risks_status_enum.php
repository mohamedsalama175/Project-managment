<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE project_risks MODIFY COLUMN status ENUM('open', 'investigating', 'mitigating', 'mitigated', 'resolved', 'closed') NOT NULL DEFAULT 'open'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE project_risks MODIFY COLUMN status ENUM('open', 'investigating', 'mitigating', 'resolved') NOT NULL DEFAULT 'open'");
        }
    }
};
