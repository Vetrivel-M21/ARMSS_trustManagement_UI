import React, { useEffect, useState } from 'react';

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
const GATEWAY_VALIDATION_URL = 'https://armssgateway.arminfo.in/api/v1/auth/validate-token';

interface GatewayGuardProps {
  children: React.ReactNode;
}

export const GatewayGuard: React.FC<GatewayGuardProps> = ({ children }) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [errorReason, setErrorReason] = useState<string>('');

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | undefined;
    let pollIntervalId: ReturnType<typeof setInterval> | undefined;

    const clearGatewaySession = () => {
      sessionStorage.removeItem('gateway_device_id');
      sessionStorage.removeItem('gateway_token');
      sessionStorage.removeItem('gateway_login_time');
      sessionStorage.removeItem('device_id');
      sessionStorage.removeItem('device_token');
      localStorage.removeItem('device_id');
      localStorage.removeItem('device_token');
      localStorage.removeItem('gateway_device_id');
      localStorage.removeItem('gateway_token');
    };

    const cleanAddressBar = () => {
      const urlParams = new URLSearchParams(window.location.search);
      let changed = false;
      ['gateway_device_id', 'device_id', 'gateway_token', 'device_token', 'token', 'entry_secret'].forEach((k) => {
        if (urlParams.has(k)) {
          urlParams.delete(k);
          changed = true;
        }
      });
      if (changed) {
        const cleanQuery = urlParams.toString() ? `?${urlParams.toString()}` : '';
        window.history.replaceState({}, document.title, window.location.pathname + cleanQuery + window.location.hash);
      }
    };

    const unlock = (remainingMs: number, devId: string, tok: string) => {
      cleanAddressBar();
      setIsAuthorized(true);

      // Auto-lock after remaining 8 hours
      timerId = setTimeout(() => {
        clearGatewaySession();
        setErrorReason('Your 8-hour work session has expired. Please relaunch from ARMSS Gateway.');
        setIsAuthorized(false);
      }, remainingMs);

      // Periodic check every 15 minutes for admin token revocation
      pollIntervalId = setInterval(async () => {
        const currentDevId = sessionStorage.getItem('gateway_device_id') || sessionStorage.getItem('device_id') || devId;
        const currentTok = sessionStorage.getItem('gateway_token') || sessionStorage.getItem('device_token') || tok;
        if (!currentDevId || !currentTok) return;

        try {
          const checkPayload = JSON.stringify({ device_id: currentDevId, token: currentTok });
          const checkRes = await fetch(GATEWAY_VALIDATION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: checkPayload,
          });

          if (checkRes) {
            const checkData = await checkRes.json();
            const validationData = checkData.data ?? checkData;
            const isValid = validationData.valid ?? validationData.is_valid;
            if (isValid === false) {
              clearGatewaySession();
              setErrorReason('Access revoked by administrator. Please contact your admin or request activation.');
              setIsAuthorized(false);
            }
          }
        } catch (_) {}
      }, 15 * 60 * 1000);
    };

    const runValidation = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlDeviceId = urlParams.get('gateway_device_id') || urlParams.get('device_id');
      const urlToken = urlParams.get('gateway_token') || urlParams.get('token') || urlParams.get('device_token');

      const sessionDeviceId = sessionStorage.getItem('gateway_device_id') || sessionStorage.getItem('device_id');
      const sessionToken = sessionStorage.getItem('gateway_token') || sessionStorage.getItem('device_token');
      const sessionLoginTimeStr = sessionStorage.getItem('gateway_login_time');
      const sessionLoginTime = sessionLoginTimeStr ? parseInt(sessionLoginTimeStr, 10) : 0;

      const now = Date.now();

      // 1. Check 8-Hour expiration for existing session
      if (sessionLoginTime > 0 && now - sessionLoginTime > EIGHT_HOURS_MS) {
        clearGatewaySession();
        setErrorReason('Your 8-hour work session has expired. Please relaunch from ARMSS Gateway.');
        setIsAuthorized(false);
        return;
      }

      // 2. Identify effective credentials
      const effectiveDeviceId = urlDeviceId || sessionDeviceId || "";
      const effectiveToken = urlToken || sessionToken || "";

      const requestDeviceId = effectiveDeviceId || '';
      const requestToken = effectiveToken || '';

      // Always verify against the live gateway before mounting the application.
      try {
        const payload = JSON.stringify({
          device_id: requestDeviceId,
          token: requestToken,
        });

        let res: Response | null = null;
        try {
          res = await fetch(GATEWAY_VALIDATION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
          });
        } catch (_) {
          res = null;
        }

        if (!res || !res.ok) {
          clearGatewaySession();
          setErrorReason('Security verification failed. Device token revoked or invalid.');
          setIsAuthorized(false);
          return;
        }

        const responseData = await res.json();
        const data = responseData.data ?? responseData;
        const isValid = data.valid ?? data.is_valid;
        if (isValid !== true) {
          clearGatewaySession();
          setErrorReason(
            !requestDeviceId || !requestToken
              ? 'The requested URL was not found on this server. Direct web browser access without ARMSS Gateway launch authorization is restricted.'
              : data.reason ? `Access denied: ${data.reason}` : 'Access denied: Device token revoked or invalid.'
          );
          setIsAuthorized(false);
          return;
        }

        // Verification successful: Store in sessionStorage
        sessionStorage.setItem('gateway_device_id', effectiveDeviceId);
        sessionStorage.setItem('gateway_token', effectiveToken);
        sessionStorage.setItem('device_id', effectiveDeviceId);
        sessionStorage.setItem('device_token', effectiveToken);
        sessionStorage.setItem('gateway_login_time', String(Date.now()));
        // Clean legacy localStorage
        localStorage.removeItem('device_id');
        localStorage.removeItem('device_token');
        localStorage.removeItem('gateway_device_id');
        localStorage.removeItem('gateway_token');

        unlock(EIGHT_HOURS_MS, effectiveDeviceId, effectiveToken);
      } catch (err: any) {
        clearGatewaySession();
        setErrorReason('Unable to reach ARMSS Gateway verification service.');
        setIsAuthorized(false);
      }
    };

    runValidation();

    return () => {
      if (timerId) clearTimeout(timerId);
      if (pollIntervalId) clearInterval(pollIntervalId);
    };
  }, []);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-slate-700 border-t-cyan-400 rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-400 tracking-wide">
            Verifying ARMSS Gateway Session...
          </p>
        </div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-slate-800 border border-slate-700/80 rounded-2xl p-8 sm:p-10 text-center shadow-2xl space-y-6">
          {/* Security Padlock Icon */}
          <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-500 shadow-lg shadow-rose-500/5">
            <svg
              className="w-10 h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 uppercase tracking-widest">
              Access Restricted
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              You Are Restricted
            </h1>
          </div>

          {/* Explanatory Message */}
          <div className="bg-slate-900/70 border border-slate-700/60 rounded-xl p-5 text-left space-y-3">
            <p className="text-sm font-medium text-slate-200 leading-relaxed">
              Your access to this application has been restricted by the administrator.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              If you require access, please submit an activation request from the <span className="text-slate-200 font-semibold">ARMSS Gateway</span> desktop application, or contact the <span className="text-cyan-400 font-semibold">ARMSS Infotech Support Team</span> for assistance.
            </p>
            {errorReason && (
              <div className="pt-2 border-t border-slate-800 text-[11px] text-rose-400/90 font-mono break-words">
                Notice: {errorReason}
              </div>
            )}
          </div>

          {/* Footer Support Tag */}
          <div className="pt-2 flex items-center justify-center gap-2 text-xs text-slate-400">
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <span>ARMSS Infotech Technical Support</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
