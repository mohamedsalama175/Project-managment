<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('attachments', function (Blueprint $table) {
            // BUG-01: Safely standardize column name to file_name
            if (Schema::hasColumn('attachments', 'filename') && !Schema::hasColumn('attachments', 'file_name')) {
                $table->renameColumn('filename', 'file_name');
            }

            if (!Schema::hasColumn('attachments', 'storage_disk')) {
                $table->string('storage_disk', 50)->default('local')->after('file_path');
            }

            if (!Schema::hasColumn('attachments', 'scan_status')) {
                $table->string('scan_status', 32)->default('pending')->after('mime_type');
            }

            if (!Schema::hasColumn('attachments', 'scan_details')) {
                $table->string('scan_details', 255)->nullable()->after('scan_status');
            }

            if (!Schema::hasColumn('attachments', 'deleted_at')) {
                $table->softDeletes();
            }

            $table->index(['attachable_type', 'attachable_id', 'scan_status'], 'idx_attachable_scan');
            $table->index(['organization_id', 'created_at'], 'idx_attachments_org_created');
        });
    }

    public function down(): void
    {
        Schema::table('attachments', function (Blueprint $table) {
            $table->dropIndex('idx_attachable_scan');
            $table->dropIndex('idx_attachments_org_created');
            if (Schema::hasColumn('attachments', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
            if (Schema::hasColumn('attachments', 'scan_details')) {
                $table->dropColumn('scan_details');
            }
            if (Schema::hasColumn('attachments', 'scan_status')) {
                $table->dropColumn('scan_status');
            }
            if (Schema::hasColumn('attachments', 'storage_disk')) {
                $table->dropColumn('storage_disk');
            }
            if (Schema::hasColumn('attachments', 'file_name') && !Schema::hasColumn('attachments', 'filename')) {
                $table->renameColumn('file_name', 'filename');
            }
        });
    }
};
