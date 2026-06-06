/**
 * Random Reel — Jellyfin context menu injector
 * Adds a "Random Reel" item next to "Shuffle" in every folder/playlist menu.
 *
 * Playback is triggered via the Jellyfin Sessions API (POST /Sessions/{id}/Playing)
 * which is the same mechanism used by "Play on" — no internal React/webpack modules needed.
 */
(function () {
    'use strict';

    var API_BASE = '/RandomReel';
    var lastItemId = null;
    var busy = false;

    // Active Random Reel state — null when not in a reel
    var rrSession = null; // { itemId, folderId, graceTimer, pollInterval }

    // ── 0. Intercept fetch to block progress reporting for Random Reel clips ──────
    // Jellyfin's player sends POST /Sessions/Playing/Progress every few seconds,
    // which saves the playback position and adds items to "Continue Watching".
    // We suppress those reports while a reel is active.
    // When the player reports PlaybackStopped we let it through, then clean up.
    var _originalFetch = window.fetch.bind(window);
    window.fetch = function (url, options) {
        if (rrSession && typeof url === 'string') {
            if (url.indexOf('/Sessions/Playing/Progress') !== -1) {
                // Suppress — don't save position to server
                return Promise.resolve(new Response(null, { status: 204 }));
            }
            if (url.indexOf('/Sessions/Playing/Stopped') !== -1) {
                // Let the stop report through, then clean up twice:
                // immediately (for position reset) and again after 3 s
                // (in case the player fires a stray Progress just before Stopped).
                var stoppedItemId = rrSession.itemId;
                return _originalFetch(url, options).then(function (r) {
                    cleanupWatchHistory(stoppedItemId);
                    setTimeout(function () { cleanupWatchHistory(stoppedItemId); }, 3000);
                    return r;
                });
            }
        }
        return _originalFetch(url, options);
    };

    // ── 1. Capture item ID on any click outside the action sheet ─────────────────
    document.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('.actionSheet')) return;
        var el = e.target;
        while (el && el !== document.body) {
            var id = el.getAttribute && el.getAttribute('data-id');
            if (id) { lastItemId = id; break; }
            el = el.parentElement;
        }
    }, true);

    // ── 2. Watch for Jellyfin's action sheet to appear ───────────────────────────
    var sheetObserver = new MutationObserver(function (mutations) {
        if (busy) return;
        for (var i = 0; i < mutations.length; i++) {
            var added = mutations[i].addedNodes;
            for (var j = 0; j < added.length; j++) {
                var node = added[j];
                if (node.nodeType !== 1) continue;
                var sheet = node.classList && node.classList.contains('actionSheet')
                    ? node
                    : node.querySelector && node.querySelector('.actionSheet');
                if (sheet) tryInject(sheet);
            }
        }
    });
    sheetObserver.observe(document.documentElement, { childList: true, subtree: true });

    // ── 3. Inject the "Random Reel" menu item ────────────────────────────────────
    function tryInject(sheet) {
        try {
            var allItems = sheet.querySelectorAll('.listItem');
            var shuffleItem = null;
            for (var i = 0; i < allItems.length; i++) {
                if ((allItems[i].textContent || '').trim().indexOf('Shuffle') === 0) {
                    shuffleItem = allItems[i]; break;
                }
            }
            if (!shuffleItem || sheet.querySelector('.rr-menu-item')) return;

            busy = true;
            var rrItem = shuffleItem.cloneNode(true);
            rrItem.classList.add('rr-menu-item');
            rrItem.removeAttribute('data-id');

            var iconEl = rrItem.querySelector('.listItemIcon, .material-icons, i');
            if (iconEl) iconEl.textContent = 'casino';

            var allSpans = rrItem.querySelectorAll('span, div');
            for (var k = 0; k < allSpans.length; k++) {
                if (allSpans[k].textContent.trim() === 'Shuffle') {
                    allSpans[k].textContent = 'Random Reel'; break;
                }
            }

            shuffleItem.parentNode.insertBefore(rrItem, shuffleItem.nextSibling);
            busy = false;

            rrItem.addEventListener('click', function (e) {
                e.stopPropagation();
                e.preventDefault();
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
                var itemId = lastItemId;
                if (!itemId) { console.warn('[RandomReel] No item ID captured.'); return; }
                setTimeout(function () { launchRandomReel(itemId); }, 150);
            });
        } catch (err) {
            busy = false;
            console.error('[RandomReel] tryInject error:', err);
        }
    }

    // ── 4. Auth headers ───────────────────────────────────────────────────────────
    function authHeaders() {
        var token = null, deviceId = null, deviceName = null, clientName = null, version = null;
        try {
            token      = window.ApiClient && ApiClient.accessToken  && ApiClient.accessToken();
            deviceId   = window.ApiClient && ApiClient.deviceId     && ApiClient.deviceId();
            deviceName = window.ApiClient && ApiClient.deviceName   && ApiClient.deviceName();
            clientName = window.ApiClient && ApiClient.appName      && ApiClient.appName();
            version    = window.ApiClient && ApiClient.appVersion   && ApiClient.appVersion();
        } catch (e) { /* ignore */ }
        var auth = 'MediaBrowser Client="' + (clientName || 'Jellyfin Web') + '"' +
                   ', Device="' + (deviceName || 'Browser') + '"' +
                   ', DeviceId="' + (deviceId || '') + '"' +
                   ', Version="' + (version || '10.9.11') + '"' +
                   (token ? ', Token="' + token + '"' : '');
        return { 'Authorization': auth, 'Content-Type': 'application/json' };
    }

    // ── 5. Get current device's session ──────────────────────────────────────────
    function getMySession(hdrs) {
        var deviceId = null;
        try { deviceId = ApiClient.deviceId && ApiClient.deviceId(); } catch (e) { /* ignore */ }
        var url = '/Sessions' + (deviceId ? '?deviceId=' + encodeURIComponent(deviceId) : '');
        return fetch(url, { headers: hdrs })
            .then(function (r) { return r.json(); })
            .then(function (sessions) {
                for (var i = 0; i < sessions.length; i++) {
                    if (sessions[i].DeviceId === deviceId) return sessions[i];
                }
                return sessions[0] || null;
            });
    }

    // ── 6. Clean up watch history (mark played → mark unplayed) ──────────────────
    function cleanupWatchHistory(itemId) {
        var hdrs = authHeaders();
        var userId = null;
        try { userId = ApiClient.getCurrentUserId && ApiClient.getCurrentUserId(); } catch (e) { /* ignore */ }
        if (!userId) { console.warn('[RandomReel] Cannot clean watch history — userId unknown.'); return; }

        var base = '/Users/' + userId + '/PlayedItems/' + itemId;
        fetch(base, { method: 'POST', headers: hdrs })
            .then(function (r) {
                if (!r.ok) throw new Error('Mark played: ' + r.status);
                return fetch(base, { method: 'DELETE', headers: hdrs });
            })
            .then(function (r) {
                if (!r.ok) throw new Error('Mark unplayed: ' + r.status);
                console.log('[RandomReel] Watch history cleaned for', itemId);
            })
            .catch(function (err) { console.warn('[RandomReel] cleanupWatchHistory:', err); });
    }

    // ── 7. Stop monitoring ────────────────────────────────────────────────────────
    function stopMonitor() {
        if (rrSession) {
            if (rrSession.graceTimer)  clearTimeout(rrSession.graceTimer);
            if (rrSession.pollInterval) clearInterval(rrSession.pollInterval);
        }
        rrSession = null;
        unhookNextButton();
    }

    // ── 8. Poll every 8 s — only for cleanup, never auto-plays ───────────────────
    // Grace period: wait 15 s before first poll so the player has time to register
    // the session on the server. Require 2 consecutive "not playing" polls before
    // concluding the clip has stopped (avoids false positives during buffering).
    function startMonitor(itemId, folderId) {
        stopMonitor();
        rrSession = { itemId: itemId, folderId: folderId, pollInterval: null, missCount: 0 };

        var capturedSession = rrSession;

        // Start polling only after grace period
        capturedSession.graceTimer = setTimeout(function () {
            if (!rrSession || rrSession.itemId !== itemId) return;

            rrSession.pollInterval = setInterval(function () {
                if (!rrSession || rrSession.itemId !== itemId) return;

                var hdrs = authHeaders();
                getMySession(hdrs)
                    .then(function (session) {
                        if (!rrSession || rrSession.itemId !== itemId) return;
                        var nowPlaying = session && session.NowPlayingItem;

                        if (!nowPlaying || nowPlaying.Id !== itemId) {
                            rrSession.missCount = (rrSession.missCount || 0) + 1;
                            if (rrSession.missCount >= 2) {
                                // Two consecutive polls with no match — clip truly stopped
                                var stoppedItemId = rrSession.itemId;
                                stopMonitor();
                                cleanupWatchHistory(stoppedItemId);
                                console.log('[RandomReel] Playback stopped — reel ended.');
                            }
                        } else {
                            rrSession.missCount = 0; // reset on successful match
                        }
                    })
                    .catch(function () { /* ignore transient poll errors */ });
            }, 8000);
        }, 15000);

        hookNextButton(folderId);
    }

    // ── 9. Next-button hook ───────────────────────────────────────────────────────
    // We find the player's Next button once and attach a capturing listener.
    // The listener is removed when the reel ends (stopMonitor → unhookNextButton).
    var _nextBtn = null;
    var _nextHandler = null;
    var _nextObserver = null;

    function onNextClick(e, folderId) {
        if (!rrSession) return;
        e.stopImmediatePropagation();
        e.preventDefault();
        var capturedItemId   = rrSession.itemId;
        var capturedFolderId = folderId;
        stopMonitor();
        cleanupWatchHistory(capturedItemId);
        console.log('[RandomReel] Next clicked — launching next clip.');
        setTimeout(function () { launchRandomReel(capturedFolderId); }, 200);
    }

    function unhookNextButton() {
        if (_nextObserver) { _nextObserver.disconnect(); _nextObserver = null; }
        if (_nextBtn && _nextHandler) {
            _nextBtn.removeEventListener('click', _nextHandler, true);
            _nextBtn._rrHooked = false;
        }
        _nextBtn = null;
        _nextHandler = null;
    }

    function hookNextButton(folderId) {
        unhookNextButton(); // clear any stale hook

        function tryHook() {
            // Jellyfin uses btnNextTrack in the full video player
            var btn = document.querySelector('.btnNextTrack');
            if (btn && !btn._rrHooked) {
                _nextBtn = btn;
                _nextHandler = function (e) { onNextClick(e, folderId); };
                btn.addEventListener('click', _nextHandler, true);
                btn._rrHooked = true;
                console.log('[RandomReel] Next button hooked.');
                if (_nextObserver) { _nextObserver.disconnect(); _nextObserver = null; }
            }
        }

        // Try immediately (player might already be open)
        tryHook();

        // If not found yet, watch for the player to appear — disconnect once hooked
        if (!_nextBtn) {
            _nextObserver = new MutationObserver(function () {
                if (!rrSession) { _nextObserver.disconnect(); _nextObserver = null; return; }
                tryHook();
            });
            _nextObserver.observe(document.documentElement, { childList: true, subtree: true });
        }
    }

    // ── 10. Trigger playback via Sessions API ─────────────────────────────────────
    function launchRandomReel(folderId) {
        var hdrs = authHeaders();
        var rrData = null;

        fetch(API_BASE + '/Next?folderId=' + encodeURIComponent(folderId), { headers: hdrs })
            .then(function (r) {
                if (!r.ok) throw new Error('RandomReel/Next returned HTTP ' + r.status);
                return r.json();
            })
            .then(function (data) {
                rrData = {
                    itemId:               data.itemId               || data.ItemId,
                    startPositionTicks:   data.startPositionTicks   || data.StartPositionTicks,
                    playbackDurationTicks: data.playbackDurationTicks || data.PlaybackDurationTicks,
                    remainingInPool:      data.remainingInPool      || data.RemainingInPool
                };
                console.log('[RandomReel] Next clip:', rrData.itemId,
                    '@ tick', rrData.startPositionTicks, 'remaining:', rrData.remainingInPool);
                return getMySession(hdrs);
            })
            .then(function (session) {
                if (!session) throw new Error('No active session found');

                var startTicks = Math.floor(rrData.startPositionTicks);
                var qs = 'playCommand=PlayNow' +
                         '&itemIds='             + encodeURIComponent(rrData.itemId) +
                         '&startPositionTicks='  + startTicks +
                         '&mediaSourceId='       + encodeURIComponent(rrData.itemId);

                return fetch('/Sessions/' + session.Id + '/Playing?' + qs, {
                    method: 'POST', headers: hdrs
                }).then(function (r) {
                    if (!r.ok) {
                        return r.text().then(function (txt) {
                            throw new Error('Sessions/Playing ' + r.status + ': ' + txt);
                        });
                    }
                    console.log('[RandomReel] Playback started.');
                    startMonitor(rrData.itemId, folderId);
                });
            })
            .catch(function (err) { console.error('[RandomReel] Error:', err); });
    }
})();
