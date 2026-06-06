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
    var busy = false; // prevent MutationObserver re-entry while we manipulate the DOM

    // ── 1. Capture item ID on any click outside the action sheet ─────────────────
    // We intentionally skip clicks inside .actionSheet so that action-sheet buttons
    // (which may carry stale/wrong data-id attributes) never overwrite lastItemId.
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
    var observer = new MutationObserver(function (mutations) {
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

    observer.observe(document.documentElement, { childList: true, subtree: true });

    // ── 3. Inject the "Random Reel" menu item ────────────────────────────────────
    function tryInject(sheet) {
        try {
            var allItems = sheet.querySelectorAll('.listItem');
            var shuffleItem = null;
            for (var i = 0; i < allItems.length; i++) {
                if ((allItems[i].textContent || '').trim().indexOf('Shuffle') === 0) {
                    shuffleItem = allItems[i];
                    break;
                }
            }
            if (!shuffleItem || sheet.querySelector('.rr-menu-item')) return;

            busy = true;
            var rrItem = shuffleItem.cloneNode(true);
            rrItem.classList.add('rr-menu-item');
            // Remove any data-id the Shuffle button may have had — prevents
            // the capture listener from picking up a wrong/stale ID.
            rrItem.removeAttribute('data-id');

            var iconEl = rrItem.querySelector('.listItemIcon, .material-icons, i');
            if (iconEl) iconEl.textContent = 'casino';

            // Find the element whose text is "Shuffle" and rename it
            var allSpans = rrItem.querySelectorAll('span, div');
            for (var k = 0; k < allSpans.length; k++) {
                if ((allSpans[k].childNodes.length === 1 &&
                     allSpans[k].childNodes[0].nodeType === 3 &&
                     allSpans[k].textContent.trim() === 'Shuffle') ||
                    allSpans[k].textContent.trim() === 'Shuffle') {
                    allSpans[k].textContent = 'Random Reel';
                    break;
                }
            }

            shuffleItem.parentNode.insertBefore(rrItem, shuffleItem.nextSibling);
            busy = false;

            rrItem.addEventListener('click', function (e) {
                e.stopPropagation();
                e.preventDefault();

                // Close the sheet with Escape (safest — lets Jellyfin clean up its own state)
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));

                var itemId = lastItemId;
                if (!itemId) { console.warn('[RandomReel] No item ID captured.'); return; }

                // Small delay so the sheet animation finishes before playback starts
                setTimeout(function () { launchRandomReel(itemId); }, 150);
            });
        } catch (err) {
            busy = false;
            console.error('[RandomReel] tryInject error:', err);
        }
    }

    // ── 4. Resolve token + headers from ApiClient ────────────────────────────────
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

    // ── 5. Ask the plugin for the next clip, then play via Sessions API ──────────
    function launchRandomReel(folderId) {
        var hdrs = authHeaders();
        var rrData = null; // store plugin response for later use

        fetch(API_BASE + '/Next?folderId=' + encodeURIComponent(folderId), { headers: hdrs })
            .then(function (r) {
                if (!r.ok) throw new Error('RandomReel/Next returned HTTP ' + r.status);
                return r.json();
            })
            .then(function (data) {
                // Support both PascalCase (default STJ) and camelCase serialization
                rrData = {
                    itemId:             data.itemId             || data.ItemId,
                    startPositionTicks: data.startPositionTicks || data.StartPositionTicks,
                    playbackDurationTicks: data.playbackDurationTicks || data.PlaybackDurationTicks,
                    remainingInPool:    data.remainingInPool    || data.RemainingInPool
                };
                console.log('[RandomReel] Next clip (raw):', JSON.stringify(data));
                console.log('[RandomReel] Next clip (resolved):', rrData);

                // Find the current browser session
                var deviceId = null;
                try { deviceId = ApiClient.deviceId && ApiClient.deviceId(); } catch (e) { /* ignore */ }
                console.log('[RandomReel] deviceId:', deviceId);

                var sessionsUrl = '/Sessions' + (deviceId ? '?deviceId=' + encodeURIComponent(deviceId) : '');
                return fetch(sessionsUrl, { headers: hdrs }).then(function (r) { return r.json(); });
            })
            .then(function (sessions) {
                console.log('[RandomReel] Sessions:', sessions.map(function(s) {
                    return { Id: s.Id, DeviceId: s.DeviceId, DeviceName: s.DeviceName, Client: s.Client };
                }));

                var deviceId = null;
                try { deviceId = ApiClient.deviceId && ApiClient.deviceId(); } catch (e) { /* ignore */ }

                var session = null;
                for (var i = 0; i < sessions.length; i++) {
                    if (sessions[i].DeviceId === deviceId) { session = sessions[i]; break; }
                }
                if (!session && sessions.length > 0) session = sessions[0];
                if (!session) throw new Error('No active session found');

                console.log('[RandomReel] Using session:', session.Id, session.DeviceName);

                var startTicks = Math.floor(rrData.startPositionTicks);
                var qs = 'playCommand=PlayNow' +
                         '&itemIds=' + encodeURIComponent(rrData.itemId) +
                         '&startPositionTicks=' + startTicks +
                         '&mediaSourceId=' + encodeURIComponent(rrData.itemId);
                console.log('[RandomReel] Playing querystring:', qs);

                return fetch('/Sessions/' + session.Id + '/Playing?' + qs, {
                    method: 'POST',
                    headers: hdrs
                }).then(function (r) {
                    if (!r.ok) {
                        return r.text().then(function (txt) {
                            throw new Error('Sessions/Playing ' + r.status + ': ' + txt);
                        });
                    }
                    console.log('[RandomReel] Playback started.');
                });
            })
            .catch(function (err) {
                console.error('[RandomReel] Error:', err);
            });
    }
})();
