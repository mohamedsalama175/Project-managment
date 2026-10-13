<?php

namespace App\Modules\Tenancy\Middleware;

use Closure;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailIsVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || ($user instanceof MustVerifyEmail && !$user->hasVerifiedEmail()) || (property_exists($user, 'email_verified_at') && !$user->email_verified_at)) {
            return response()->json([
                'message' => 'Your email address is not verified.',
                'code' => 'AUTH_EMAIL_UNVERIFIED',
            ], 403);
        }

        return $next($request);
    }
}
