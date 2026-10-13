<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $pivotRole = $columnNames['role_pivot_key'] ?? 'role_id';
        $pivotPermission = $columnNames['permission_pivot_key'] ?? 'permission_id';
        $morphKey = $columnNames['model_morph_key'] ?? 'model_id';
        $systemOrgId = '01HZX000000000000000000000';

        if (!Schema::hasColumn($tableNames['model_has_permissions'], 'team_id')) {
            Schema::table($tableNames['model_has_permissions'], function (Blueprint $table) use ($tableNames, $pivotPermission, $morphKey, $systemOrgId) {
                $this->dropForeignKeyIfExists($tableNames['model_has_permissions'], "{$tableNames['model_has_permissions']}_{$pivotPermission}_foreign");
                $this->dropPrimaryKeyIfExists($tableNames['model_has_permissions']);

                $table->char('team_id', 26)->default($systemOrgId)->after($pivotPermission);

                $table->primary([$pivotPermission, $morphKey, 'model_type', 'team_id'], 'model_has_permissions_primary');
                $table->index('team_id', 'idx_model_has_permissions_team');

                $table->foreign($pivotPermission)
                    ->references('id')
                    ->on($tableNames['permissions'])
                    ->onDelete('cascade');
            });
        }

        if (!Schema::hasColumn($tableNames['roles'], 'team_id')) {
            Schema::table($tableNames['roles'], function (Blueprint $table) {
                $table->char('team_id', 26)->nullable()->after('guard_name');
                $table->index('team_id', 'idx_roles_team_id');
            });
        }

        if (!Schema::hasColumn($tableNames['model_has_roles'], 'team_id')) {
            Schema::table($tableNames['model_has_roles'], function (Blueprint $table) use ($tableNames, $pivotRole, $morphKey, $systemOrgId) {
                $this->dropForeignKeyIfExists($tableNames['model_has_roles'], "{$tableNames['model_has_roles']}_{$pivotRole}_foreign");
                $this->dropPrimaryKeyIfExists($tableNames['model_has_roles']);

                $table->char('team_id', 26)->default($systemOrgId)->after($pivotRole);

                $table->primary([$pivotRole, $morphKey, 'model_type', 'team_id'], 'model_has_roles_primary');
                $table->index('team_id', 'idx_model_has_roles_team');

                $table->foreign($pivotRole)
                    ->references('id')
                    ->on($tableNames['roles'])
                    ->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $pivotRole = $columnNames['role_pivot_key'] ?? 'role_id';
        $pivotPermission = $columnNames['permission_pivot_key'] ?? 'permission_id';
        $morphKey = $columnNames['model_morph_key'] ?? 'model_id';

        if (Schema::hasColumn($tableNames['roles'], 'team_id')) {
            Schema::table($tableNames['roles'], function (Blueprint $table) {
                $table->dropIndex('idx_roles_team_id');
                $table->dropColumn('team_id');
            });
        }

        if (Schema::hasColumn($tableNames['model_has_roles'], 'team_id')) {
            $this->dropForeignKeyIfExists($tableNames['model_has_roles'], "{$tableNames['model_has_roles']}_{$pivotRole}_foreign");
            $this->dropPrimaryKeyIfExists($tableNames['model_has_roles']);

            Schema::table($tableNames['model_has_roles'], function (Blueprint $table) use ($tableNames, $pivotRole, $morphKey) {
                if (Schema::hasColumn($tableNames['model_has_roles'], 'team_id')) {
                    $table->dropIndex('idx_model_has_roles_team');
                    $table->dropColumn('team_id');
                }
                $table->primary([$pivotRole, $morphKey, 'model_type'], 'model_has_roles_role_model_type_primary');
                $table->foreign($pivotRole)
                    ->references('id')
                    ->on($tableNames['roles'])
                    ->onDelete('cascade');
            });
        }

        if (Schema::hasColumn($tableNames['model_has_permissions'], 'team_id')) {
            $this->dropForeignKeyIfExists($tableNames['model_has_permissions'], "{$tableNames['model_has_permissions']}_{$pivotPermission}_foreign");
            $this->dropPrimaryKeyIfExists($tableNames['model_has_permissions']);

            Schema::table($tableNames['model_has_permissions'], function (Blueprint $table) use ($tableNames, $pivotPermission, $morphKey) {
                if (Schema::hasColumn($tableNames['model_has_permissions'], 'team_id')) {
                    $table->dropIndex('idx_model_has_permissions_team');
                    $table->dropColumn('team_id');
                }
                $table->primary([$pivotPermission, $morphKey, 'model_type'], 'model_has_permissions_permission_model_type_primary');
                $table->foreign($pivotPermission)
                    ->references('id')
                    ->on($tableNames['permissions'])
                    ->onDelete('cascade');
            });
        }
    }

    protected function dropForeignKeyIfExists(string $tableName, string $fkName): void
    {
        if (DB::getDriverName() === 'mysql') {
            $exists = DB::select("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'", [$tableName, $fkName]);
            if (!empty($exists)) {
                DB::statement("ALTER TABLE `{$tableName}` DROP FOREIGN KEY `{$fkName}`");
            }
        }
    }

    protected function dropPrimaryKeyIfExists(string $tableName): void
    {
        if (DB::getDriverName() === 'mysql') {
            $exists = DB::select("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_TYPE = 'PRIMARY KEY'", [$tableName]);
            if (!empty($exists)) {
                DB::statement("ALTER TABLE `{$tableName}` DROP PRIMARY KEY");
            }
        }
    }
};
