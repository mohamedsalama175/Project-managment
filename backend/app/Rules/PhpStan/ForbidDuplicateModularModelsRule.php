<?php

namespace App\Rules\PhpStan;

use PhpParser\Node;
use PhpParser\Node\Stmt\Class_;
use PHPStan\Analyser\Scope;
use PHPStan\Rules\Rule;
use PHPStan\Rules\RuleErrorBuilder;

/**
 * Custom PHPStan Rule: ForbidDuplicateModularModelsRule
 * Forbids any class under app/Models/ that duplicates a model class
 * defined within bounded modular contexts under app/Modules/<Module>/Models/.
 */
class ForbidDuplicateModularModelsRule implements Rule
{
    public function getNodeType(): string
    {
        return Class_::class;
    }

    public function processNode(Node $node, Scope $scope): array
    {
        if (!$node instanceof Class_ || $node->name === null) {
            return [];
        }

        $filePath = str_replace('\\', '/', $scope->getFile());
        if (!str_contains($filePath, '/app/Models/')) {
            return [];
        }

        $className = $node->name->toString();
        $modulesBase = dirname(__DIR__, 2) . '/Modules';
        $pattern = $modulesBase . '/*/Models/' . $className . '.php';
        $matches = glob($pattern);

        if (!empty($matches)) {
            $modularPath = str_replace('\\', '/', $matches[0]);
            preg_match('#/Modules/([^/]+)/Models/#', $modularPath, $m);
            $moduleName = $m[1] ?? 'ModularContext';

            return [
                RuleErrorBuilder::message(
                    sprintf(
                        'Class App\Models\%s duplicates modular model App\Modules\%s\Models\%s. Bounded context models must not be placed or wrapped under app/Models/.',
                        $className,
                        $moduleName,
                        $className
                    )
                )->identifier('deliverops.duplicateModularModel')->build(),
            ];
        }

        return [];
    }
}
