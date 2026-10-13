<?php

namespace App\Modules\Identity\Services;

use App\Models\User;
use App\Modules\Identity\Models\MfaBackupCode;
use App\Modules\Identity\Models\MfaSecret;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

class MfaService
{
    protected Google2FA $google2fa;

    public function __construct()
    {
        $this->google2fa = new Google2FA();
    }

    public function generateSecret(User $user): array
    {
        $secret = $this->google2fa->generateSecretKey();
        $qrCodeUri = $this->google2fa->getQRCodeUrl(
            config('app.name', 'DeliverOps'),
            $user->email,
            $secret
        );

        $encryptedSecret = Crypt::encryptString($secret);
        $user->mfa_secret = $encryptedSecret;
        $user->save();

        if (Schema::hasTable('mfa_secrets')) {
            MfaSecret::updateOrCreate(
                ['user_id' => $user->id],
                ['secret' => $encryptedSecret]
            );
        }

        return [
            'secret' => $secret,
            'qrCodeUri' => $qrCodeUri,
        ];
    }

    public function confirmAndEnable(User $user, string $code): array
    {
        $encryptedSecret = $user->mfa_secret;
        if (empty($encryptedSecret) && Schema::hasTable('mfa_secrets')) {
            $mfaSecret = MfaSecret::where('user_id', $user->id)->first();
            $encryptedSecret = $mfaSecret?->secret;
        }

        if (empty($encryptedSecret)) {
            return ['success' => false, 'error' => 'AUTH_MFA_NOT_INITIALIZED'];
        }

        $secret = Crypt::decryptString($encryptedSecret);

        if (!$this->google2fa->verifyKey($secret, $code, 2)) {
            return ['success' => false, 'error' => 'AUTH_MFA_INVALID_CODE'];
        }

        return DB::transaction(function () use ($user) {
            // Delete old recovery codes across both tables
            if (Schema::hasTable('mfa_backup_codes')) {
                DB::table('mfa_backup_codes')->where('user_id', $user->id)->delete();
            }
            if (Schema::hasTable('mfa_recovery_codes')) {
                DB::table('mfa_recovery_codes')->where('user_id', $user->id)->delete();
            }

            // Generate exactly 10 single-use backup codes per Deliverable 5 & 10
            $plainCodes = [];
            $backupRecords = [];
            $recoveryRecords = [];
            for ($i = 0; $i < 10; $i++) {
                $plain = strtoupper(Str::random(5) . '-' . Str::random(5));
                $plainCodes[] = $plain;
                $codeHash = Hash::make($plain);

                $backupRecords[] = [
                    'id' => (string) Str::ulid(),
                    'user_id' => $user->id,
                    'code_hash' => $codeHash,
                    'used_at' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                $recoveryRecords[] = [
                    'id' => (string) Str::ulid(),
                    'user_id' => $user->id,
                    'code_hash' => $codeHash,
                    'used_at' => null,
                    'created_at' => now(),
                ];
            }

            if (Schema::hasTable('mfa_backup_codes')) {
                DB::table('mfa_backup_codes')->insert($backupRecords);
            }
            if (Schema::hasTable('mfa_recovery_codes')) {
                DB::table('mfa_recovery_codes')->insert($recoveryRecords);
            }

            $user->mfa_enabled = true;
            $user->mfa_confirmed_at = now();
            $user->mfa_enabled_at = now();
            $user->save();

            return [
                'success' => true,
                'recoveryCodes' => $plainCodes,
                'backupCodes' => $plainCodes,
            ];
        });
    }

    public function disable(User $user): void
    {
        DB::transaction(function () use ($user) {
            if (Schema::hasTable('mfa_backup_codes')) {
                DB::table('mfa_backup_codes')->where('user_id', $user->id)->delete();
            }
            if (Schema::hasTable('mfa_recovery_codes')) {
                DB::table('mfa_recovery_codes')->where('user_id', $user->id)->delete();
            }
            if (Schema::hasTable('mfa_secrets')) {
                DB::table('mfa_secrets')->where('user_id', $user->id)->delete();
            }

            $user->mfa_enabled = false;
            $user->mfa_secret = null;
            $user->mfa_confirmed_at = null;
            $user->mfa_enabled_at = null;
            $user->save();
        });
    }

    public function getRecoveryCodesStatus(User $user): array
    {
        $table = Schema::hasTable('mfa_backup_codes') ? 'mfa_backup_codes' : 'mfa_recovery_codes';
        $total = DB::table($table)->where('user_id', $user->id)->count();
        $remaining = DB::table($table)
            ->where('user_id', $user->id)
            ->whereNull('used_at')
            ->count();

        return [
            'total' => $total,
            'remaining' => $remaining,
            'hasRecoveryCodes' => $remaining > 0,
        ];
    }

    public function regenerateRecoveryCodes(User $user): array
    {
        return DB::transaction(function () use ($user) {
            if (Schema::hasTable('mfa_backup_codes')) {
                DB::table('mfa_backup_codes')->where('user_id', $user->id)->delete();
            }
            if (Schema::hasTable('mfa_recovery_codes')) {
                DB::table('mfa_recovery_codes')->where('user_id', $user->id)->delete();
            }

            $plainCodes = [];
            $backupRecords = [];
            $recoveryRecords = [];
            for ($i = 0; $i < 10; $i++) {
                $plain = strtoupper(Str::random(5) . '-' . Str::random(5));
                $plainCodes[] = $plain;
                $codeHash = Hash::make($plain);

                $backupRecords[] = [
                    'id' => (string) Str::ulid(),
                    'user_id' => $user->id,
                    'code_hash' => $codeHash,
                    'used_at' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                $recoveryRecords[] = [
                    'id' => (string) Str::ulid(),
                    'user_id' => $user->id,
                    'code_hash' => $codeHash,
                    'used_at' => null,
                    'created_at' => now(),
                ];
            }

            if (Schema::hasTable('mfa_backup_codes')) {
                DB::table('mfa_backup_codes')->insert($backupRecords);
            }
            if (Schema::hasTable('mfa_recovery_codes')) {
                DB::table('mfa_recovery_codes')->insert($recoveryRecords);
            }

            return $plainCodes;
        });
    }

    public function verify(User $user, string $code): bool
    {
        if (!$user->mfa_enabled) {
            return false;
        }

        $encryptedSecret = $user->mfa_secret;
        if (empty($encryptedSecret) && Schema::hasTable('mfa_secrets')) {
            $mfaSecret = MfaSecret::where('user_id', $user->id)->first();
            $encryptedSecret = $mfaSecret?->secret;
        }

        if (empty($encryptedSecret)) {
            return false;
        }

        // 1. Try TOTP code
        if (strlen($code) === 6 && ctype_digit($code)) {
            $secret = Crypt::decryptString($encryptedSecret);
            if ($this->google2fa->verifyKey($secret, $code, 2)) {
                return true;
            }
        }

        // 2. Try single-use recovery / backup code
        $matched = false;
        $tables = ['mfa_backup_codes', 'mfa_recovery_codes'];
        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                $unusedCodes = DB::table($table)
                    ->where('user_id', $user->id)
                    ->whereNull('used_at')
                    ->get();

                foreach ($unusedCodes as $record) {
                    if (Hash::check($code, $record->code_hash)) {
                        DB::table($table)
                            ->where('id', $record->id)
                            ->update(['used_at' => now()]);
                        $matched = true;
                    }
                }
            }
        }

        return $matched;
    }
}
