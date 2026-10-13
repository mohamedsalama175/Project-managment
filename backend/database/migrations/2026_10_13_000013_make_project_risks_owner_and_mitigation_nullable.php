<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('project_risks', function (Blueprint $table) {
            $table->text('mitigation_plan')->nullable()->change();
            $table->char('owner_id', 26)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('project_risks', function (Blueprint $table) {
            $table->text('mitigation_plan')->nullable(false)->change();
            $table->char('owner_id', 26)->nullable()->change();
        });
    }
};
