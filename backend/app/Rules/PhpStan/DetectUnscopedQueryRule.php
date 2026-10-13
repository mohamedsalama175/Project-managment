<?php

namespace App\Rules\PhpStan;

use PhpParser\Node;
use PhpParser\Node\Expr\ClassConstFetch;
use PhpParser\Node\Expr\MethodCall;
use PhpParser\Node\Identifier;
use PhpParser\Node\Name;
use PhpParser\Node\Scalar\String_;
use PHPStan\Analyser\Scope;
use PHPStan\Rules\Rule;
use PHPStan\Rules\RuleErrorBuilder;

/**
 * Custom PHPStan Rule: DetectUnscopedQueryRule
 * Analyzes AST to detect illegal removal or bypassing of BelongsToOrganization
 * global scopes on tenant-scoped Eloquent models.
 * Flags withoutGlobalScope(BelongsToOrganization::class) and warns on withoutGlobalScopes().
 */
class DetectUnscopedQueryRule implements Rule
{
    protected const TENANT_SCOPED_MODELS = [
        'App\Models\Project',
        'App\Models\Task',
        'App\Models\ProjectRisk',
        'App\Modules\Collaboration\Models\TaskComment',
        'App\Models\AuditLog',
        'App\Models\TaskDependency',
        'App\Models\TaskEffortAllocation',
    ];

    public function getNodeType(): string
    {
        return MethodCall::class;
    }

    public function processNode(Node $node, Scope $scope): array
    {
        if (!$node instanceof MethodCall) {
            return [];
        }

        if (!$node->name instanceof Identifier) {
            return [];
        }

        $methodName = $node->name->toString();
        if (!in_array($methodName, ['withoutGlobalScopes', 'withoutGlobalScope'], true)) {
            return [];
        }

        $calledOnType = $scope->getType($node->var);
        $classNames = $calledOnType->getObjectClassNames();

        $isTenantModel = false;
        $matchedClass = null;
        foreach ($classNames as $className) {
            if (in_array($className, static::TENANT_SCOPED_MODELS, true)) {
                $isTenantModel = true;
                $matchedClass = $className;
                break;
            }
        }

        if (!$isTenantModel) {
            return [];
        }

        $args = $node->getArgs();

        // 1. withoutGlobalScope(BelongsToOrganization::class)
        if ($methodName === 'withoutGlobalScope') {
            if (empty($args)) {
                return [];
            }

            $argValue = $args[0]->value;
            $isBelongsToOrg = false;

            if ($argValue instanceof ClassConstFetch) {
                if ($argValue->class instanceof Name) {
                    $target = $argValue->class->toString();
                    if (in_array($target, ['BelongsToOrganization', 'App\Modules\Tenancy\Scopes\BelongsToOrganization', '\App\Modules\Tenancy\Scopes\BelongsToOrganization'], true)) {
                        $isBelongsToOrg = true;
                    }
                }
            } elseif ($argValue instanceof String_) {
                if (str_contains($argValue->value, 'BelongsToOrganization')) {
                    $isBelongsToOrg = true;
                }
            }

            if ($isBelongsToOrg) {
                return [
                    RuleErrorBuilder::message(
                        sprintf(
                            'Prohibited unscoped query: [%s::withoutGlobalScope(BelongsToOrganization::class)] illegally removes BelongsToOrganization tenant scope.',
                            $matchedClass
                        )
                    )->identifier('deliverops.unscopedQuery')->build(),
                ];
            }
        }

        // 2. withoutGlobalScopes() with no arguments (Warning)
        if ($methodName === 'withoutGlobalScopes' && empty($args)) {
            return [
                RuleErrorBuilder::message(
                    sprintf(
                        'Warning: [%s::withoutGlobalScopes()] removes all global scopes including BelongsToOrganization without arguments.',
                        $matchedClass
                    )
                )->identifier('deliverops.unscopedQueryWarning')->build(),
            ];
        }

        return [];
    }
}
