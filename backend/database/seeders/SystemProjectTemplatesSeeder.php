<?php

namespace Database\Seeders;

use App\Modules\Templates\Models\ProjectTemplate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class SystemProjectTemplatesSeeder extends Seeder
{
    /**
     * Seed the 6 system-provided project templates.
     * All system templates have organization_id = null and is_system = true.
     */
    public function run(): void
    {
        $templates = [
            [
                'name' => 'Agile Software Development',
                'slug' => 'agile-software-development',
                'description' => 'Complete sprint-based software lifecycle covering discovery, sprint execution, QA, and deployment.',
                'industry' => 'Technology',
                'category' => 'standard',
                'template_data' => [
                    'tasks' => [
                        ['temp_id' => 'T1', 'wbs_code' => '1.0', 'name' => 'Architecture & System Design', 'duration_days' => 5, 'parent_temp_id' => null, 'order_index' => 1, 'description' => 'Architectural review and DB modeling'],
                        ['temp_id' => 'T2', 'wbs_code' => '1.1', 'name' => 'Core API Development', 'duration_days' => 10, 'parent_temp_id' => 'T1', 'order_index' => 2, 'description' => 'Build domain services and endpoints'],
                        ['temp_id' => 'T3', 'wbs_code' => '1.2', 'name' => 'Frontend Integration', 'duration_days' => 8, 'parent_temp_id' => 'T1', 'order_index' => 3, 'description' => 'Implement client UI and state management'],
                        ['temp_id' => 'T4', 'wbs_code' => '2.0', 'name' => 'Quality Assurance & Automated Testing', 'duration_days' => 5, 'parent_temp_id' => null, 'order_index' => 4, 'description' => 'E2E testing and vulnerability scans'],
                        ['temp_id' => 'T5', 'wbs_code' => '3.0', 'name' => 'Staging & Production Release', 'duration_days' => 3, 'parent_temp_id' => null, 'order_index' => 5, 'description' => 'Canary deployment and monitoring smoke tests'],
                    ],
                    'dependencies' => [
                        ['predecessor_temp_id' => 'T1', 'successor_temp_id' => 'T2', 'dependency_type' => 'finish_to_start', 'lag_days' => 0],
                        ['predecessor_temp_id' => 'T2', 'successor_temp_id' => 'T3', 'dependency_type' => 'finish_to_start', 'lag_days' => 0],
                        ['predecessor_temp_id' => 'T3', 'successor_temp_id' => 'T4', 'dependency_type' => 'finish_to_start', 'lag_days' => 0],
                        ['predecessor_temp_id' => 'T4', 'successor_temp_id' => 'T5', 'dependency_type' => 'finish_to_start', 'lag_days' => 0],
                    ],
                    'risks' => [
                        ['title' => 'Third-party API Breaking Changes', 'description' => 'External dependency version updates could delay integration', 'type' => 'risk', 'severity' => 'medium', 'impact' => 'medium', 'likelihood' => 'medium', 'mitigation_plan' => 'Maintain mock integration adapters'],
                        ['title' => 'Staging Environment Flakiness', 'description' => 'Shared staging resources may cause false-positive test failures', 'type' => 'issue', 'severity' => 'low', 'impact' => 'low', 'likelihood' => 'high', 'mitigation_plan' => 'Use containerized ephemeral test environments'],
                    ],
                ],
            ],
            [
                'name' => 'Cloud Infrastructure Migration',
                'slug' => 'cloud-infrastructure-migration',
                'description' => 'Structured migration blueprint for moving on-premise workloads to modern multi-cloud infrastructure.',
                'industry' => 'IT & Infrastructure',
                'category' => 'standard',
                'template_data' => [
                    'tasks' => [
                        ['temp_id' => 'T1', 'wbs_code' => '1.0', 'name' => 'Inventory & Dependency Mapping', 'duration_days' => 7, 'parent_temp_id' => null, 'order_index' => 1, 'description' => 'Audit virtual machines, databases, and network topologies'],
                        ['temp_id' => 'T2', 'wbs_code' => '2.0', 'name' => 'Landing Zone & IAM Provisioning', 'duration_days' => 5, 'parent_temp_id' => null, 'order_index' => 2, 'description' => 'Configure VPCs, subnet routing, and least-privilege roles'],
                        ['temp_id' => 'T3', 'wbs_code' => '3.0', 'name' => 'Data Re-platforming & Database Sync', 'duration_days' => 10, 'parent_temp_id' => null, 'order_index' => 3, 'description' => 'Replicate data with CDC tools and verify checksums'],
                        ['temp_id' => 'T4', 'wbs_code' => '4.0', 'name' => 'Cutover Window & DNS Propagation', 'duration_days' => 2, 'parent_temp_id' => null, 'order_index' => 4, 'description' => 'Execute low-TTL DNS switchover during off-peak window'],
                    ],
                    'dependencies' => [
                        ['predecessor_temp_id' => 'T1', 'successor_temp_id' => 'T2', 'dependency_type' => 'finish_to_start', 'lag_days' => 0],
                        ['predecessor_temp_id' => 'T2', 'successor_temp_id' => 'T3', 'dependency_type' => 'finish_to_start', 'lag_days' => 0],
                        ['predecessor_temp_id' => 'T3', 'successor_temp_id' => 'T4', 'dependency_type' => 'finish_to_start', 'lag_days' => 0],
                    ],
                    'risks' => [
                        ['title' => 'Data Sync Latency During Cutover', 'description' => 'Large delta sync might overrun planned maintenance window', 'type' => 'risk', 'severity' => 'high', 'impact' => 'high', 'likelihood' => 'medium', 'mitigation_plan' => 'Run 3 dry-run delta migrations beforehand'],
                    ],
                ],
            ],
            [
                'name' => 'Digital Marketing Campaign',
                'slug' => 'digital-marketing-campaign',
                'description' => 'Multi-channel digital marketing plan covering creative asset generation, paid media setup, and conversion tracking.',
                'industry' => 'Marketing',
                'category' => 'standard',
                'template_data' => [
                    'tasks' => [
                        ['temp_id' => 'T1', 'wbs_code' => '1.0', 'name' => 'Audience Persona & Positioning Strategy', 'duration_days' => 4, 'parent_temp_id' => null, 'order_index' => 1, 'description' => 'Define target demographics and core campaign messaging'],
                        ['temp_id' => 'T2', 'wbs_code' => '2.0', 'name' => 'Creative & Copy Production', 'duration_days' => 6, 'parent_temp_id' => null, 'order_index' => 2, 'description' => 'Design ad visual units, video cuts, and landing page copy'],
                        ['temp_id' => 'T3', 'wbs_code' => '3.0', 'name' => 'Channel Attribution & Pixel Setup', 'duration_days' => 3, 'parent_temp_id' => null, 'order_index' => 3, 'description' => 'Configure conversion APIs and UTM tracking parameters'],
                        ['temp_id' => 'T4', 'wbs_code' => '4.0', 'name' => 'Campaign Launch & Real-time Optimization', 'duration_days' => 14, 'parent_temp_id' => null, 'order_index' => 4, 'description' => 'Deploy ad budget and monitor CPA/ROAS metrics'],
                    ],
                    'dependencies' => [
                        ['predecessor_temp_id' => 'T1', 'successor_temp_id' => 'T2', 'dependency_type' => 'finish_to_start', 'lag_days' => 0],
                        ['predecessor_temp_id' => 'T2', 'successor_temp_id' => 'T3', 'dependency_type' => 'finish_to_start', 'lag_days' => 0],
                        ['predecessor_temp_id' => 'T3', 'successor_temp_id' => 'T4', 'dependency_type' => 'finish_to_start', 'lag_days' => 0],
                    ],
                    'risks' => [
                        ['title' => 'Ad Network Policy Review Delays', 'description' => 'Ad creatives might trigger automated policy flag delays', 'type' => 'risk', 'severity' => 'medium', 'impact' => 'medium', 'likelihood' => 'medium', 'mitigation_plan' => 'Submit creatives 72 hours in advance'],
                    ],
                ],
            ],
            [
                'name' => 'Enterprise Client Onboarding',
                'slug' => 'enterprise-client-onboarding',
                'description' => 'High-touch enterprise customer implementation workflow for professional services teams.',
                'industry' => 'Professional Services',
                'category' => 'standard',
                'template_data' => [
                    'tasks' => [
                        ['temp_id' => 'T1', 'wbs_code' => '1.0', 'name' => 'Kickoff & Stakeholder Alignment', 'duration_days' => 3, 'parent_temp_id' => null, 'order_index' => 1, 'description' => 'Executive charter presentation and success metrics review'],
                        ['temp_id' => 'T2', 'wbs_code' => '2.0', 'name' => 'Single Sign-On & Directory Sync', 'duration_days' => 5, 'parent_temp_id' => null, 'order_index' => 2, 'description' => 'Configure SAML/SCIM protocol integrations with customer IdP'],
                        ['temp_id' => 'T3', 'wbs_code' => '3.0', 'name' => 'Historical Data Import & Schema Mapping', 'duration_days' => 7, 'parent_temp_id' => null, 'order_index' => 3, 'description' => 'Cleanse and ingest legacy project spreadsheets'],
                        ['temp_id' => 'T4', 'wbs_code' => '4.0', 'name' => 'Department Training & Champion Enablement', 'duration_days' => 5, 'parent_temp_id' => null, 'order_index' => 4, 'description' => 'Deliver interactive webinars and admin workshop recordings'],
                    ],
                    'dependencies' => [
                        ['predecessor_temp_id' => 'T1', 'successor_temp_id' => 'T2', 'dependency_type' => 'finish_to_start', 'lag_days' => 0],
                        ['predecessor_temp_id' => 'T2', 'successor_temp_id' => 'T3', 'dependency_type' => 'finish_to_start', 'lag_days' => 0],
                        ['predecessor_temp_id' => 'T3', 'successor_temp_id' => 'T4', 'dependency_type' => 'finish_to_start', 'lag_days' => 0],
                    ],
                    'risks' => [
                        ['title' => 'Client IT Security Approval Bottleneck', 'description' => 'Firewall or SSO approvals may stall implementation', 'type' => 'risk', 'severity' => 'high', 'impact' => 'high', 'likelihood' => 'medium', 'mitigation_plan' => 'Provide pre-filled SOC2 compliance package upfront'],
                    ],
                ],
            ],
            [
                'name' => 'Product Go-To-Market Launch',
                'slug' => 'product-go-to-market-launch',
                'description' => 'Cross-functional launch timeline orchestrating product readiness, sales collateral, and PR distribution.',
                'industry' => 'General',
                'category' => 'standard',
                'template_data' => [
                    'tasks' => [
                        ['temp_id' => 'T1', 'wbs_code' => '1.0', 'name' => 'Product Feature Freeze & Bug Bash', 'duration_days' => 5, 'parent_temp_id' => null, 'order_index' => 1, 'description' => 'Lock code and complete critical triage across team'],
                        ['temp_id' => 'T2', 'wbs_code' => '2.0', 'name' => 'Sales Battle Cards & Pricing Tiers', 'duration_days' => 4, 'parent_temp_id' => null, 'order_index' => 2, 'description' => 'Distribute one-pagers, pricing calculators, and talk tracks'],
                        ['temp_id' => 'T3', 'wbs_code' => '3.0', 'name' => 'Press Release & Analyst Briefings', 'duration_days' => 5, 'parent_temp_id' => null, 'order_index' => 3, 'description' => 'Draft embargoed releases and brief key industry journalists'],
                        ['temp_id' => 'T4', 'wbs_code' => '4.0', 'name' => 'Global Public Launch & Webcast', 'duration_days' => 2, 'parent_temp_id' => null, 'order_index' => 4, 'description' => 'Publish landing pages, live broadcast, and social campaign'],
                    ],
                    'dependencies' => [
                        ['predecessor_temp_id' => 'T1', 'successor_temp_id' => 'T2', 'dependency_type' => 'finish_to_start', 'lag_days' => 0],
                        ['predecessor_temp_id' => 'T2', 'successor_temp_id' => 'T3', 'dependency_type' => 'finish_to_start', 'lag_days' => 0],
                        ['predecessor_temp_id' => 'T3', 'successor_temp_id' => 'T4', 'dependency_type' => 'finish_to_start', 'lag_days' => 0],
                    ],
                    'risks' => [
                        ['title' => 'Spike in Unplanned Inbound Support Volume', 'description' => 'Launch traffic may surge first-response wait times', 'type' => 'risk', 'severity' => 'medium', 'impact' => 'medium', 'likelihood' => 'high', 'mitigation_plan' => 'Staff tier-2 on-call rotations during launch week'],
                    ],
                ],
            ],
            [
                'name' => 'Corporate Facilities Fitout',
                'slug' => 'corporate-facilities-fitout',
                'description' => 'Facilities expansion blueprint covering architectural design, construction permits, mechanical fitout, and inspection.',
                'industry' => 'Construction / Operations',
                'category' => 'standard',
                'template_data' => [
                    'tasks' => [
                        ['temp_id' => 'T1', 'wbs_code' => '1.0', 'name' => 'Architectural Floor Plans & Permitting', 'duration_days' => 15, 'parent_temp_id' => null, 'order_index' => 1, 'description' => 'Submit structural layouts and obtain municipal permits'],
                        ['temp_id' => 'T2', 'wbs_code' => '2.0', 'name' => 'HVAC & Electrical Rough-in', 'duration_days' => 12, 'parent_temp_id' => null, 'order_index' => 2, 'description' => 'Install conduit, air circulation ductwork, and primary panels'],
                        ['temp_id' => 'T3', 'wbs_code' => '3.0', 'name' => 'Drywall, Acoustic Ceilings & Finishes', 'duration_days' => 10, 'parent_temp_id' => null, 'order_index' => 3, 'description' => 'Hang drywall, apply paint, and install acoustic dampeners'],
                        ['temp_id' => 'T4', 'wbs_code' => '4.0', 'name' => 'IT Cabling & Server Rack Installation', 'duration_days' => 6, 'parent_temp_id' => null, 'order_index' => 4, 'description' => 'Run Cat6A lines, fiber links, and mount patch panels'],
                        ['temp_id' => 'T5', 'wbs_code' => '5.0', 'name' => 'Final Safety Inspection & Certificate of Occupancy', 'duration_days' => 4, 'parent_temp_id' => null, 'order_index' => 5, 'description' => 'Fire marshal walkthrough and formal occupancy sign-off'],
                    ],
                    'dependencies' => [
                        ['predecessor_temp_id' => 'T1', 'successor_temp_id' => 'T2', 'dependency_type' => 'finish_to_start', 'lag_days' => 0],
                        ['predecessor_temp_id' => 'T2', 'successor_temp_id' => 'T3', 'dependency_type' => 'finish_to_start', 'lag_days' => 0],
                        ['predecessor_temp_id' => 'T3', 'successor_temp_id' => 'T4', 'dependency_type' => 'finish_to_start', 'lag_days' => 0],
                        ['predecessor_temp_id' => 'T4', 'successor_temp_id' => 'T5', 'dependency_type' => 'finish_to_start', 'lag_days' => 0],
                    ],
                    'risks' => [
                        ['title' => 'Municipal Permit Issuance Delays', 'description' => 'City regulatory department backlogs can suspend work start', 'type' => 'risk', 'severity' => 'high', 'impact' => 'high', 'likelihood' => 'medium', 'mitigation_plan' => 'Retain local expediter to fast-track submissions'],
                    ],
                ],
            ],
        ];

        foreach ($templates as $data) {
            ProjectTemplate::updateOrCreate(
                [
                    'is_system' => true,
                    'slug' => $data['slug'],
                    'version' => 1,
                ],
                [
                    'id' => (string) Str::ulid(),
                    'organization_id' => null,
                    'name' => $data['name'],
                    'description' => $data['description'],
                    'industry' => $data['industry'],
                    'category' => $data['category'],
                    'template_data' => $data['template_data'],
                    'created_by_id' => null,
                ]
            );
        }
    }
}
