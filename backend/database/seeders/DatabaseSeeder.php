<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Seeds essential system permissions, standard roles, and system project templates.
     * Creates NO users. InstallationOrchestrator exclusively owns user creation.
     */
    public function run(): void
    {
        $this->call([
            PermissionSeeder::class,
            SystemProjectTemplatesSeeder::class,
            WidgetCatalogSeeder::class,
        ]);
    }
}
