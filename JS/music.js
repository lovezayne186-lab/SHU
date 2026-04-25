// 使用第三方聚合接口 (示例地址，需具备容错处理)
const API_GET_URL = "https://api.liumingye.cn/m/api/link?id=";
const API_METING_PLAYLIST = "https://api.injahow.com/meting/?type=playlist&id=";
const API_METING_PLAYLIST_FALLBACK = "https://api.i-meto.com/meting/api?server=netease&type=playlist&id=";
const ITUNES_SEARCH = "https://itunes.apple.com/search?media=music&limit=30&term=";
const ENABLE_LINGSHA_APIS = false;
const ALL_SEARCH_TYPE = "all";
const DEFAULT_SOURCE_TYPE = "wy";
const SOURCE_POOL = ["wy", "tx", "kw", "kg", "migu", "joox", "ytmusic", "tidal", "ximalaya"];

const SEARCH_SOURCES = [
  { type: "kw", name: "酷我" },
  { type: "kg", name: "酷狗" },
  { type: "tx", name: "QQ" },
  { type: "wy", name: "网易" },
];

(function () {
  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function clampInt(n, min, max) {
    var v = Math.round(n);
    if (v < min) return min;
    if (v > max) return max;
    return v;
  }

  function uiPromptCompat(message, defaultValue, opts) {
    try {
      if (window.parent && window.parent !== window && typeof window.parent.uiPrompt === "function") {
        return window.parent.uiPrompt(message, defaultValue, opts);
      }
    } catch (e) {}
    if (typeof window.uiPrompt === "function") return window.uiPrompt(message, defaultValue, opts);
    return Promise.resolve(window.prompt(String(message || ""), defaultValue));
  }

  function getWindowCandidates() {
    var list = [window];
    try {
      if (window.parent && window.parent !== window) list.push(window.parent);
    } catch (e) {}
    try {
      if (window.top && window.top !== window && list.indexOf(window.top) < 0) list.push(window.top);
    } catch (e2) {}
    return list;
  }

  function findHostByFunction(fnName) {
    var name = String(fnName || "").trim();
    if (!name) return null;
    var list = getWindowCandidates();
    for (var i = 0; i < list.length; i++) {
      try {
        var host = list[i];
        if (host && typeof host[name] === "function") return host;
      } catch (e) {}
    }
    return null;
  }

  function findHostByObject(objName) {
    var name = String(objName || "").trim();
    if (!name) return null;
    var list = getWindowCandidates();
    for (var i = 0; i < list.length; i++) {
      try {
        var host = list[i];
        if (host && host[name] && typeof host[name] === "object") return host;
      } catch (e) {}
    }
    return null;
  }

  var DEFAULT_COVER = "../assets/images/beijing.jpg";
  var BLANK_COVER = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
  var COVER_CACHE_KEY_PREFIX = "music_cover_cache_v1::";
  var LOCAL_TRACK_ASSET_KEY_PREFIX = "music_local_track_asset_v1::";
  var localTrackObjectUrlCache = Object.create(null);

  var musicApp = qs("#musicApp");
  var topSearch = qs("#topSearch");
  var searchSource = qs("#searchSource");
  var searchInput = qs("#searchInput");
  var searchClear = qs("#searchClear");
  var searchCancel = qs("#searchCancel");
  var playlistImportBtn = qs("#playlistImportBtn");
  var localMusicUploadBtn = qs("#localMusicUploadBtn");
  var localMusicInput = qs("#localMusicInput");
  var recommendView = qs("#recommend-view");
  var searchView = qs("#search-view");
  var searchList = qs("#searchList");
  var searchHint = qs("#searchHint");

  var miniPlayer = qs("#miniPlayer");
  var miniOpen = qs("#miniOpen");
  var miniCover = qs("#miniCover");
  var miniTitle = qs("#miniTitle");
  var miniArtist = qs("#miniArtist");
  var miniPlayBtn = qs("#miniPlayBtn");

  var toastEl = qs("#toast");

  var playerSheet = qs("#playerSheet");
  if (!playerSheet) return;

  var waveEl = qs("#wave");
  var playBtn = qs("#playBtn");
  var shuffleBtn = qs("#shuffleBtn");
  var prevBtn = qs("#prevBtn");
  var nextBtn = qs("#nextBtn");
  var repeatBtn = qs("#repeatBtn");
  var closeBtn = qs("#closePlayer");
  var moreBtn = qs("#moreBtn");

  var favBtn = qs("#favBtn");
  var chatBtn = qs("#chatBtn");
  var inviteBtn = qs("#inviteBtn");
  var inviteModal = qs("#inviteModal");
  var inviteBackdrop = qs("#inviteBackdrop");
  var inviteClose = qs("#inviteClose");
  var inviteList = qs("#inviteList");
  var togetherMenuModal = qs("#togetherMenuModal");
  var togetherMenuBackdrop = qs("#togetherMenuBackdrop");
  var togetherMenuChatBtn = qs("#togetherMenuChat");
  var togetherMenuExitBtn = qs("#togetherMenuExit");
  var togetherExitModal = qs("#togetherExitModal");
  var togetherExitBackdrop = qs("#togetherExitBackdrop");
  var togetherExitAvatarLeft = qs("#togetherExitAvatarLeft");
  var togetherExitAvatarRight = qs("#togetherExitAvatarRight");
  var togetherExitSongCount = qs("#togetherExitSongCount");
  var togetherExitDurationMin = qs("#togetherExitDurationMin");
  var togetherExitShareBtn = qs("#togetherExitShare");
  var togetherExitCloseBtn = qs("#togetherExitClose");
  var queueModal = qs("#queueModal");
  var queueBackdrop = qs("#queueBackdrop");
  var queueClose = qs("#queueClose");
  var queueList = qs("#queueList");
  var settingsModal = qs("#settingsModal");
  var settingsBackdrop = qs("#settingsBackdrop");
  var settingsClose = qs("#settingsClose");
  var bgUpload = qs("#bgUpload");
  var bgUploadBtn = qs("#bgUploadBtn");
  var overlayToneInputs = qsa('input[name="overlayTone"]');
  var overlayOpacitySlider = qs("#overlayOpacitySlider");
  var overlayOpacityValue = qs("#overlayOpacityValue");
  var coverUpload = qs("#coverUpload");
  var coverUploadBtn = qs("#coverUploadBtn");
  var coverModeInputs = qsa('input[name="coverMode"]');
  var miniPlayerModeInputs = qsa('input[name="miniPlayerMode"]');
  var playerVisualStyleInputs = qsa('input[name="playerVisualStyle"]');
  var lyricColorPicker = qs("#lyricColorPicker");
  var progressColorPicker = qs("#progressColorPicker");
  var playBtnColorPicker = qs("#playBtnColorPicker");
  var settingsReset = qs("#settingsReset");
  var profileBackBtn = qs("#profileBackBtn");
  var profileSettingsBtn = qs("#profileSettingsBtn");
  var profileSettingsModal = qs("#profileSettingsModal");
  var profileSettingsBackdrop = qs("#profileSettingsBackdrop");
  var profileSettingsClose = qs("#profileSettingsClose");
  var profileBgUpload = qs("#profileBgUpload");
  var profileBgUploadBtn = qs("#profileBgUploadBtn");
  var profileOverlayToneInputs = qsa('input[name="profileOverlayTone"]');
  var profileOverlayOpacitySlider = qs("#profileOverlayOpacitySlider");
  var profileOverlayOpacityValue = qs("#profileOverlayOpacityValue");
  var togetherRow = qs("#togetherRow");
  var togetherDurationLabel = qs("#togetherDurationLabel");
  var chatDrawer = qs("#chatDrawer");
  var chatDrawerBackdrop = qs("#chatDrawerBackdrop");
  var chatDrawerClose = qs("#chatDrawerClose");
  var chatDrawerTitle = qs("#chatDrawerTitle");
  var chatDrawerBody = qs("#chatList") || qs("#chatDrawerBody");
  var chatDrawerTyping = qs("#chatDrawerTyping");
  var chatDrawerInput = qs("#chatDrawerInput");
  var chatDrawerSend = qs("#chatDrawerSend");
  var chatDrawerReply = qs("#chatDrawerReply");
  var profilePlaylistContainer = qs("#profilePlaylistContainer");
  var addToPlaylistModal = qs("#addToPlaylistModal");
  var sheetPlaylistList = qs("#sheetPlaylistList");
  var sheetTitle = qs("#addToPlaylistModal .sheet-title");
  var createNewPlaylistBtn = qs("#createNewPlaylistBtn");
  var addToPlaylistBackdrop = qs("#addToPlaylistModal .sheet-backdrop");
  var addToPlaylistCancel = qs("#addToPlaylistModal .sheet-cancel");
  var currentTimeEl = qs("#currentTime");
  var durationTimeEl = qs("#durationTime");
  var vinylCurrentTimeEl = qs("#vinylCurrentTime");
  var vinylDurationTimeEl = qs("#vinylDurationTime");
  var progressSlider = qs("#progressSlider");
  var sliderFill = qs("#sliderFill");

  var coverImg = qs("#coverImg");
  var vinylCoverImg = qs("#vinylCoverImg");
  var coverCard = qs("#coverCard");
  var vinylPlayerWrap = qs("#vinylPlayerWrap");
  var trackTitle = qs("#trackTitle");
  var trackArtist = qs("#trackArtist");
  var npTrackTitle = qs("#npTrackTitle");
  var npTrackArtist = qs("#npTrackArtist");
  var lyricsView = qs("#lyricsView");
  var lyricListEl = qs("#lyricList");

  var tabs = qsa(".tab");
  var homePlaylist = qs("#homePlaylist");
  var homePage = qs("#homePage");
  var profilePage = qs("#profilePage");
  var characterPage = qs("#characterPage");
  var profileRoot = qs("#profileRoot");
  var homeHeader = qs(".home-header");
  var homeExitBtn = qs("#homeExitBtn");
  var homeSelectCancel = qs("#homeSelectCancel");
  var homeSelectAll = qs("#homeSelectAll");
  var homeAddPlaylistBtn = qs("#homeAddPlaylistBtn");
  var homeDeleteBtn = qs("#homeDeleteBtn");
  var profileFollowStat = qs("#profileFollowStat");
  var profilePageTitle = qs("#profilePageTitle");
  var profileSettingsModalTitle = qs("#profileSettingsModalTitle");
  var profileGallery = qs(".profile-gallery", profileRoot);
  var charBgImg = qs("#charBgImg");
  var charBackBtn = qs("#charBackBtn");
  var charTopMoreBtn = qs(".char-more-btn", characterPage);
  var charTitle = qs(".char-title", characterPage);
  var charAvatarImg = qs("#charAvatarImg");
  var charName = qs("#charName");
  var charSign = qs("#charSign");
  var charListenTime = qs("#charListenTime");
  var charSongCount = qs("#charSongCount");
  var charPlayAllBtn = qs("#charPlayAllBtn");
  var charCollectAllBtn = qs("#charCollectAllBtn");
  var charRefreshBtn = qs("#charRefreshBtn");
  var charSongList = qs("#charSongList");

  var audioEl = null;
  try {
    if (window.parent && window.parent !== window && window.parent.__globalAudioEl) {
      audioEl = window.parent.__globalAudioEl;
    }
  } catch (e) {}
  if (!audioEl) audioEl = qs("#audioEl");

  function getGlobalPlayer() {
    try {
      if (window.parent && window.parent !== window && window.parent.GlobalMusicPlayer) {
        return window.parent.GlobalMusicPlayer;
      }
    } catch (e) {}
    return null;
  }

  function readTogetherSession() {
    try {
      if (!window.localStorage) return state && state.togetherSessionShadow ? state.togetherSessionShadow : null;
      var raw = localStorage.getItem("listen_together_session") || "";
      if (!raw) return state && state.togetherSessionShadow ? state.togetherSessionShadow : null;
      var data = safeJsonParse(raw);
      if (!data || typeof data !== "object") return state && state.togetherSessionShadow ? state.togetherSessionShadow : null;
      if (state) state.togetherSessionShadow = data;
      return data;
    } catch (e) {
      return state && state.togetherSessionShadow ? state.togetherSessionShadow : null;
    }
  }

  function writeTogetherSession(session) {
    var next = session && typeof session === "object" ? session : {};
    if (state) state.togetherSessionShadow = next;
    try {
      if (!window.localStorage) return;
      localStorage.setItem("listen_together_session", JSON.stringify(next));
    } catch (e) {}
    try {
      if (window.parent && window.parent !== window && window.parent.localStorage) {
        window.parent.localStorage.setItem("listen_together_session", JSON.stringify(next));
      }
    } catch (e2) {}
  }

  function normalizeTogetherSession(session) {
    var s = session && typeof session === "object" ? session : {};
    var startedAt = Number(s.startedAt || s.startAt || s.started_at || 0);
    if (!isFinite(startedAt) || startedAt <= 0) {
      var at = Number(s.at || 0);
      if (isFinite(at) && at > 0) startedAt = at;
      else startedAt = Date.now();
    }
    s.startedAt = startedAt;
    if (!s.stats || typeof s.stats !== "object") s.stats = {};
    var songs = Number(s.stats.songs || 0);
    if (!isFinite(songs) || songs < 0) songs = 0;
    s.stats.songs = Math.floor(songs);
    s.stats.lastTrackKey = s.stats.lastTrackKey ? String(s.stats.lastTrackKey) : "";
    if (!s.track || typeof s.track !== "object") s.track = {};
    return s;
  }

  function syncFromGlobalPlayer() {
    var gp = getGlobalPlayer();
    if (!gp || typeof gp.getState !== "function") return;
    var s = null;
    try {
      s = gp.getState();
    } catch (e) {
      s = null;
    }
    var t = s && s.track ? s.track : null;
    var matchedSong = syncCurrentSongFromExternalTrack(t);
    var activeSong = mergeTrackInfo(matchedSong, t);
    if (t && (t.cover || t.title || t.artist)) {
      applyTrackInfo(activeSong);
    }
    if (typeof s === "object" && s) {
      state.isPlaying = !!s.isPlaying;
      if (state.isPlaying && !state.listenStartedAt) state.listenStartedAt = Date.now();
      if (activeSong) clearSongPlaybackIssue(activeSong);
      if (playerSheet) playerSheet.classList.toggle("is-playing", !!s.isPlaying);
      setPlayIcon(!!s.isPlaying);
      updateTimeLabels();
      updateWaveFromAudio();
      syncMiniPlayerPresentation();
      renderQueue();
    }
  }

  function syncTogetherFromStorage() {
    var session = readTogetherSession();
    if (!session) {
      try {
        if (window.parent && window.parent !== window && window.parent.localStorage) {
          var raw = window.parent.localStorage.getItem("listen_together_session") || "";
          session = raw ? safeJsonParse(raw) : null;
        }
      } catch (e0) {
        session = session;
      }
    }
    if (session) applyTogetherSession(session);
    else {
      clearTogetherDurationTicker();
      playerSheet.classList.remove("is-together");
      state.togetherRoleId = "";
      state.togetherLastCountedKey = "";
      state.togetherSessionShadow = null;
    }
  }

  var togetherDurationTicker = 0;
  function ensureTogetherDurationTicker() {
    if (togetherDurationTicker) return;
    togetherDurationTicker = window.setInterval(function () {
      if (!isTogetherActive()) return;
      updateTogetherDurationLabel();
    }, 1000);
  }

  function clearTogetherDurationTicker() {
    if (!togetherDurationTicker) return;
    try {
      window.clearInterval(togetherDurationTicker);
    } catch (e) {}
    togetherDurationTicker = 0;
  }

  var FAV_KEY = "music_favs_v1";

  function loadFavs() {
    try {
      var raw = window.localStorage ? localStorage.getItem(FAV_KEY) : "";
      if (!raw) return {};
      var data = safeJsonParse(raw);
      if (!data || typeof data !== "object") return {};
      return data;
    } catch (e) {
      return {};
    }
  }

  function saveFavs(map) {
    try {
      if (!window.localStorage) return;
      localStorage.setItem(FAV_KEY, JSON.stringify(map || {}));
    } catch (e) {}
  }

  function isFav(key) {
    if (!key) return false;
    var m = loadFavs();
    return !!m[String(key)];
  }

  function normalizeLibrarySong(song) {
    if (!song || typeof song !== "object") return null;
    var title = song.title ? String(song.title) : "";
    if (!title) return null;
    var id = song.id ? String(song.id) : "";
    var source = song.source || song.sourceType ? String(song.source || song.sourceType) : "";
    var sourceType = song.sourceType || song.source ? String(song.sourceType || song.source) : "";
    var cover = song.cover ? String(song.cover) : "";
    var artist = song.artist ? String(song.artist) : "未知歌手";
    var url = song.url || song.src ? String(song.url || song.src) : "";
    var lyric = song.lyric || song.lrc ? String(song.lyric || song.lrc) : "";
    var importUrl = song.importUrl ? String(song.importUrl) : "";
    var lyricUrl = song.lyricUrl ? String(song.lyricUrl) : "";
    if (!id && !url && !importUrl) return null;
    return {
      id: id,
      title: title,
      artist: artist,
      cover: cover,
      url: url,
      source: source,
      sourceType: sourceType,
      lyric: lyric,
      lyricUrl: lyricUrl,
      importUrl: importUrl,
      pendingMatch: !!song.pendingMatch,
      imported: !!song.imported,
      localOnly: !!song.localOnly,
      localFileName: song.localFileName ? String(song.localFileName) : "",
      playbackIssue: song.playbackIssue ? String(song.playbackIssue) : "",
      disabled: false,
    };
  }

  function mergeLibrarySongDetails(target, incoming) {
    if (!target || !incoming) return false;
    var changed = false;

    function assignIfBetter(key, value, allowDefault) {
      var next = value == null ? "" : String(value);
      if (!next) return;
      var current = target[key] == null ? "" : String(target[key]);
      if (current === next) return;
      if (!allowDefault && current && current !== DEFAULT_COVER && current !== BLANK_COVER) {
        if (!(key === "cover" && /^data:image\//i.test(next) && !/^data:image\//i.test(current))) return;
      }
      target[key] = next;
      changed = true;
    }

    assignIfBetter("cover", incoming.cover, false);
    if (incoming.artist) {
      var nextArtist = String(incoming.artist).trim();
      var currentArtist = String(target.artist || "").trim();
      if (nextArtist && nextArtist !== currentArtist && (!currentArtist || currentArtist === "未知歌手")) {
        target.artist = nextArtist;
        changed = true;
      }
    }
    if (incoming.title) {
      var nextTitle = String(incoming.title).trim();
      var currentTitle = String(target.title || "").trim();
      if (nextTitle && nextTitle !== currentTitle && !currentTitle) {
        target.title = nextTitle;
        changed = true;
      }
    }
    if (incoming.url && String(incoming.url) && String(target.url || "") !== String(incoming.url)) {
      target.url = String(incoming.url);
      changed = true;
    }
    if (incoming.importUrl && String(target.importUrl || "") !== String(incoming.importUrl)) {
      target.importUrl = String(incoming.importUrl);
      changed = true;
    }
    if (incoming.lyric && !String(target.lyric || "").trim()) {
      target.lyric = String(incoming.lyric);
      changed = true;
    }
    if (incoming.lyricUrl && !String(target.lyricUrl || "").trim()) {
      target.lyricUrl = String(incoming.lyricUrl);
      changed = true;
    }
    if (incoming.localFileName && !String(target.localFileName || "").trim()) {
      target.localFileName = String(incoming.localFileName);
      changed = true;
    }
    if (incoming.localOnly && !target.localOnly) {
      target.localOnly = true;
      changed = true;
    }
    if (incoming.imported && !target.imported) {
      target.imported = true;
      changed = true;
    }
    if (!incoming.pendingMatch && target.pendingMatch) {
      target.pendingMatch = false;
      changed = true;
    }
    return changed;
  }

  function addSongToLibrary(song, silent) {
    var currentBefore = state.queue && state.queue.length ? state.queue[state.currentIndex] : song;
    var normalized = normalizeLibrarySong(song);
    if (!normalized) return { song: null, added: false };
    var idx = findLibrarySongIndex(normalized);
    if (idx >= 0) {
      var existingSong = state.library[idx];
      if (mergeLibrarySongDetails(existingSong, normalized)) {
        saveLibrary();
        if (!silent) renderHomePlaylist();
      }
      return { song: existingSong, added: false };
    }
    state.library = (state.library || []).concat([normalized]);
    saveLibrary();
    if (state.queueMode === "library") rebuildQueuePreservingCurrent(currentBefore || normalized);
    if (!silent) renderHomePlaylist();
    return { song: normalized, added: true };
  }

  function toggleFavForSong(song) {
    if (!song) return false;
    var res = addSongToLibrary(song, true);
    var target = res.song || song;
    var key = trackKey(target);
    if (!key) return false;
    var m = loadFavs();
    var active = !!m[String(key)];
    if (active) delete m[String(key)];
    else m[String(key)] = 1;
    saveFavs(m);
    updateFavButton();
    if (profilePage && !profilePage.hidden) renderProfileView();
    return !active;
  }

  function toggleFav() {
    var current = ensureCurrentTrackInfo();
    if (!current) {
      showToast("暂无歌曲");
      return;
    }
    toggleFavForSong(current);
  }

  function updateFavButton() {
    if (!favBtn) return;
    var current = state.queue[state.currentIndex];
    var key = trackKey(current);
    var active = !!(key && isFav(key));
    var icon = qs("i", favBtn);
    if (icon) icon.className = active ? "bx bxs-heart" : "bx bx-heart";
    favBtn.setAttribute("aria-pressed", active ? "true" : "false");
  }

  function setInviteOpen(open) {
    if (!inviteModal) return;
    inviteModal.classList.toggle("is-active", !!open);
    inviteModal.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function setQueueOpen(open) {
    if (!queueModal) return;
    queueModal.classList.toggle("is-active", !!open);
    queueModal.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function setTogetherMenuOpen(open) {
    if (!togetherMenuModal) return;
    togetherMenuModal.classList.toggle("is-active", !!open);
    togetherMenuModal.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function setTogetherExitOpen(open) {
    if (!togetherExitModal) return;
    togetherExitModal.classList.toggle("is-active", !!open);
    togetherExitModal.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function setSettingsOpen(open) {
    if (!settingsModal) return;
    settingsModal.classList.toggle("is-active", !!open);
    settingsModal.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function setProfileSettingsOpen(open) {
    if (!profileSettingsModal) return;
    profileSettingsModal.classList.toggle("is-active", !!open);
    profileSettingsModal.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function getSharedLocalforage() {
    try {
      if (window.localforage && typeof window.localforage.getItem === "function") return window.localforage;
    } catch (e) {}
    try {
      if (window.parent && window.parent !== window && window.parent.localforage && typeof window.parent.localforage.getItem === "function") {
        return window.parent.localforage;
      }
    } catch (e2) {}
    return null;
  }

  function readPersistedJsonAsync(key) {
    var storage = getSharedLocalforage();
    if (!storage || typeof storage.getItem !== "function") return Promise.resolve(null);
    return Promise.resolve(storage.getItem(String(key || "")))
      .then(function (value) {
        if (typeof value === "string") return safeJsonParse(value);
        return value && typeof value === "object" ? value : null;
      })
      .catch(function () {
        return null;
      });
  }

  function writeStorageMirror(key, value) {
    try {
      if (!window.localStorage) return;
      localStorage.setItem(String(key || ""), JSON.stringify(value || {}));
    } catch (e) {}
  }

  function persistJsonState(key, value) {
    writeStorageMirror(key, value);
    var storage = getSharedLocalforage();
    if (!storage || typeof storage.setItem !== "function") return;
    Promise.resolve(storage.setItem(String(key || ""), value || {})).catch(function () {});
  }

  function buildCommonProxyList() {
    return [
      { name: "codetabs", build: function (u) { return "https://api.codetabs.com/v1/proxy?quest=" + u; } },
      { name: "allorigins_raw", build: function (u) { return "https://api.allorigins.win/raw?url=" + encodeURIComponent(u); } },
      { name: "allorigins_get", build: function (u) { return "https://api.allorigins.win/get?url=" + encodeURIComponent(u); } },
      { name: "isomorphic_git", build: function (u) { return "https://cors.isomorphic-git.org/" + u; } },
      { name: "thingproxy", build: function (u) { return "https://thingproxy.freeboard.io/fetch/" + u; } },
    ];
  }

  function decodeHtmlEntities(text) {
    var raw = String(text || "");
    if (!raw) return "";
    try {
      var textarea = document.createElement("textarea");
      textarea.innerHTML = raw;
      return textarea.value || raw;
    } catch (e) {
      return raw
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    }
  }

  function coverCacheKey(song) {
    var key = trackKey(song);
    if (!key) return "";
    return COVER_CACHE_KEY_PREFIX + encodeURIComponent(String(key));
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve) {
      try {
        var reader = new FileReader();
        reader.onload = function () {
          resolve(typeof reader.result === "string" ? reader.result : "");
        };
        reader.onerror = function () {
          resolve("");
        };
        reader.readAsDataURL(blob);
      } catch (e) {
        resolve("");
      }
    });
  }

  function readCachedCoverData(song) {
    var key = coverCacheKey(song);
    var storage = getSharedLocalforage();
    if (!key || !storage || typeof storage.getItem !== "function") return Promise.resolve("");
    return Promise.resolve(storage.getItem(key))
      .then(function (value) {
        return typeof value === "string" ? String(value) : "";
      })
      .catch(function () {
        return "";
      });
  }

  function writeCachedCoverData(song, dataUrl) {
    var key = coverCacheKey(song);
    var storage = getSharedLocalforage();
    var value = String(dataUrl || "").trim();
    if (!key || !value || !storage || typeof storage.setItem !== "function") return Promise.resolve();
    return Promise.resolve(storage.setItem(key, value)).catch(function () {});
  }

  function shouldKeepInlineCoverInLibrary(song, cover) {
    var value = String(cover || "").trim();
    if (!/^data:image\//i.test(value)) return true;
    return !(song && song.imported);
  }

  function cacheRemoteCoverForSong(song) {
    if (!song || !song.imported) return Promise.resolve(false);
    var cover = String(song.cover || "").trim();
    if (!cover) return Promise.resolve(false);
    if (/^data:image\//i.test(cover)) {
      return writeCachedCoverData(song, cover).then(function () {
        return true;
      });
    }
    if (!/^https?:\/\//i.test(cover)) return Promise.resolve(false);
    return fetch(cover, { method: "GET" })
      .then(function (resp) {
        if (!resp || !resp.ok) throw new Error("cover_fetch_failed");
        return resp.blob();
      })
      .then(function (blob) {
        if (!blob || !/^image\//i.test(String(blob.type || ""))) throw new Error("cover_blob_invalid");
        return blobToDataUrl(blob);
      })
      .then(function (dataUrl) {
        if (!dataUrl) return false;
        return writeCachedCoverData(song, dataUrl).then(function () {
          return true;
        });
      })
      .catch(function () {
        return false;
      });
  }

  function hydrateCachedImportedCovers() {
    // Do not hydrate cached remote covers back into the in-memory playlist.
    // On mobile, many dataURL covers can make the music iframe exceed memory limits.
  }

  function normalizePlayerCustomState(data) {
    var source = data && typeof data === "object" ? data : {};
    return {
      lyricColor: typeof source.lyricColor === "string" && source.lyricColor ? source.lyricColor : DEFAULT_PLAYER_CUSTOM.lyricColor,
      progressColor:
        typeof source.progressColor === "string" && source.progressColor ? source.progressColor : DEFAULT_PLAYER_CUSTOM.progressColor,
      playBtnColor: typeof source.playBtnColor === "string" && source.playBtnColor ? source.playBtnColor : DEFAULT_PLAYER_CUSTOM.playBtnColor,
      backgroundImage:
        typeof source.backgroundImage === "string" && source.backgroundImage ? source.backgroundImage : DEFAULT_PLAYER_CUSTOM.backgroundImage,
      overlayTone: source.overlayTone === "light" ? "light" : "dark",
      overlayOpacity: Number.isFinite(Number(source.overlayOpacity))
        ? Math.max(0, Math.min(100, Math.round(Number(source.overlayOpacity))))
        : DEFAULT_PLAYER_CUSTOM.overlayOpacity,
      coverImages: Array.isArray(source.coverImages) ? source.coverImages.filter(Boolean).slice(0, 12) : [],
      coverMode: source.coverMode === "carousel" ? "carousel" : "single",
      miniPlayerMode: source.miniPlayerMode === "float" ? "float" : "island",
      playerVisualStyle: source.playerVisualStyle === "vinyl" ? "vinyl" : "square",
      floatBallX: Number.isFinite(Number(source.floatBallX)) ? Number(source.floatBallX) : null,
      floatBallY: Number.isFinite(Number(source.floatBallY)) ? Number(source.floatBallY) : null,
    };
  }

  function normalizeProfilePageCustomState(data) {
    var source = data && typeof data === "object" ? data : {};
    return {
      backgroundImage:
        typeof source.backgroundImage === "string" && source.backgroundImage ? source.backgroundImage : DEFAULT_PROFILE_PAGE_CUSTOM.backgroundImage,
      overlayTone: source.overlayTone === "light" ? "light" : "dark",
      overlayOpacity: Number.isFinite(Number(source.overlayOpacity))
        ? Math.max(0, Math.min(100, Math.round(Number(source.overlayOpacity))))
        : DEFAULT_PROFILE_PAGE_CUSTOM.overlayOpacity,
    };
  }

  function normalizeProfileData(p) {
    var raw = p && typeof p === "object" ? p : {};
    if (!Array.isArray(raw.gallery)) raw.gallery = [];
    return {
      name: raw.name ? String(raw.name) : "姣月几盏",
      sign: raw.sign ? String(raw.sign) : "♀ · 点击设置个性签名",
      avatar: raw.avatar ? String(raw.avatar) : "../assets/images/touxiang.jpg",
      gallery: [raw.gallery[0], raw.gallery[1], raw.gallery[2], raw.gallery[3]].map(function (x) {
        return x ? String(x) : "";
      }),
      follow: Number.isFinite(Number(raw.follow)) ? Math.max(0, Math.floor(Number(raw.follow))) : 6,
      fans: Number.isFinite(Number(raw.fans)) ? Math.max(0, Math.floor(Number(raw.fans))) : 102,
    };
  }

  var myPlaylists = [];
  var pendingPlaylistSongs = [];
  var pendingPlaylistSource = "";

  function buildPlaylistId() {
    return "playlist_" + String(Date.now()) + "_" + String(Math.floor(Math.random() * 1e6));
  }

  function normalizePlaylistSong(song) {
    var normalized = normalizeLibrarySong(song);
    if (!normalized) return null;
    normalized.localOnly = !!(song && song.localOnly);
    normalized.disabled = !!(song && song.disabled);
    normalized.playbackIssue = song && song.playbackIssue ? String(song.playbackIssue) : normalized.playbackIssue || "";
    return normalized;
  }

  function normalizePlaylistItem(item, index) {
    var raw = item && typeof item === "object" ? item : {};
    var songs = Array.isArray(raw.songs)
      ? raw.songs
          .map(function (song) {
            return normalizePlaylistSong(song);
          })
          .filter(function (song) {
            return !!song;
          })
      : [];
    var name = String(raw.name || "").trim();
    var createdAt = Number(raw.createdAt || raw.created_at || Date.now());
    if (!isFinite(createdAt) || createdAt <= 0) createdAt = Date.now() + index;
    return {
      id: raw.id ? String(raw.id) : "playlist_auto_" + String(index) + "_" + String(createdAt),
      name: name || "我的歌单 " + String(index + 1),
      songs: songs,
      playCount: Number.isFinite(Number(raw.playCount)) ? Math.max(0, Math.floor(Number(raw.playCount))) : 0,
      createdAt: createdAt,
    };
  }

  function normalizeMyPlaylists(data) {
    if (!Array.isArray(data)) return [];
    var seen = {};
    return data
      .map(function (item, index) {
        return normalizePlaylistItem(item, index);
      })
      .filter(function (item) {
        if (!item || !item.id) return false;
        if (seen[item.id]) return false;
        seen[item.id] = 1;
        return true;
      });
  }

  function loadMyPlaylists() {
    try {
      if (!window.localStorage) return [];
      var raw = localStorage.getItem(MY_PLAYLISTS_KEY) || "";
      if (!raw) return [];
      return normalizeMyPlaylists(safeJsonParse(raw));
    } catch (e) {
      return [];
    }
  }

  function saveMyPlaylists() {
    try {
      persistJsonState(
        MY_PLAYLISTS_KEY,
        normalizeMyPlaylists(myPlaylists).map(function (playlist, index) {
          var item = normalizePlaylistItem(playlist, index);
          item.songs = (item.songs || [])
            .map(function (song) {
              return sanitizeTrackForStorage(song);
            })
            .filter(Boolean);
          return item;
        })
      );
    } catch (e) {}
  }

  function loadPlayerCustomState() {
    try {
      if (!window.localStorage) return Object.assign({}, DEFAULT_PLAYER_CUSTOM);
      var raw = localStorage.getItem(PLAYER_CUSTOM_KEY) || "";
      if (!raw) return Object.assign({}, DEFAULT_PLAYER_CUSTOM);
      return normalizePlayerCustomState(safeJsonParse(raw));
    } catch (e) {
      return Object.assign({}, DEFAULT_PLAYER_CUSTOM);
    }
  }

  function savePlayerCustomState() {
    try {
      persistJsonState(PLAYER_CUSTOM_KEY, normalizePlayerCustomState(playerCustomState));
    } catch (e) {
      showToast("自定义设置保存失败");
    }
  }

  function applyPlayerColorVars() {
    var lyricColor = playerCustomState.lyricColor || DEFAULT_PLAYER_CUSTOM.lyricColor;
    var progressColor = playerCustomState.progressColor || DEFAULT_PLAYER_CUSTOM.progressColor;
    var playBtnColor = playerCustomState.playBtnColor || DEFAULT_PLAYER_CUSTOM.playBtnColor;
    if (document && document.documentElement) {
      document.documentElement.style.setProperty("--custom-lyric-color", lyricColor);
      document.documentElement.style.setProperty("--custom-progress-color", progressColor);
      document.documentElement.style.setProperty("--custom-playbtn-color", playBtnColor);
    }
    if (!playerSheet) return;
    playerSheet.style.setProperty("--custom-lyric-color", lyricColor);
    playerSheet.style.setProperty("--custom-progress-color", progressColor);
    playerSheet.style.setProperty("--custom-playbtn-color", playBtnColor);
  }

  function getMiniPlayerMode() {
    return playerCustomState && playerCustomState.miniPlayerMode === "float" ? "float" : "island";
  }

  function getPlayerVisualStyle() {
    return playerCustomState && playerCustomState.playerVisualStyle === "vinyl" ? "vinyl" : "square";
  }

  function applyPlayerVisualStyle() {
    if (!playerSheet) return;
    var isVinyl = getPlayerVisualStyle() === "vinyl";
    playerSheet.classList.toggle("is-vinyl", isVinyl);
    window.requestAnimationFrame(function () {
      updateWaveFromAudio();
      if (!isVinyl) scheduleWaveRebuild();
    });
  }

  function updateDisplayedCovers(src) {
    var nextSrc = String(src || "").trim();
    if (coverImg) setImageSource(coverImg, nextSrc, BLANK_COVER);
    if (vinylCoverImg) setImageSource(vinylCoverImg, nextSrc, BLANK_COVER);
  }

  function setImageSource(img, src, fallback) {
    if (!img) return;
    var hasExplicitFallback = arguments.length >= 3;
    var safeFallback = hasExplicitFallback ? String(fallback == null ? "" : fallback).trim() : DEFAULT_COVER;
    var nextSrc = String(src || "").trim();
    if (!nextSrc && safeFallback) nextSrc = safeFallback;
    img.onerror = function () {
      if (img.dataset.fallbackApplied === "1") return;
      img.dataset.fallbackApplied = "1";
      if (safeFallback) {
        img.src = safeFallback;
      } else {
        try {
          img.removeAttribute("src");
        } catch (e) {}
      }
    };
    img.dataset.fallbackApplied = "0";
    if (nextSrc) img.src = nextSrc;
    else {
      try {
        img.removeAttribute("src");
      } catch (e2) {}
    }
  }

  function setSliderProgress(percent) {
    var safePercent = Number(percent);
    if (!isFinite(safePercent)) safePercent = 0;
    if (safePercent < 0) safePercent = 0;
    if (safePercent > 100) safePercent = 100;
    if (progressSlider) progressSlider.value = String(safePercent);
    if (sliderFill) sliderFill.style.width = safePercent + "%";
  }

  function syncGlobalWidgetMode() {
    var mode = getMiniPlayerMode();
    try {
      if (window.parent && window.parent !== window && window.parent.GlobalMusicPlayer) {
        var gp = window.parent.GlobalMusicPlayer;
        if (gp && typeof gp.setDisplayMode === "function") {
          gp.setDisplayMode(mode);
        }
      }
    } catch (e) {}
    try {
      if (window.parent && window.parent !== window && typeof window.parent.postMessage === "function") {
        window.parent.postMessage({ type: "MUSIC_WIDGET_MODE", mode: mode }, "*");
      }
    } catch (e2) {}
  }

  function clampFloatBallPosition(x, y) {
    var width = 64;
    var height = 64;
    var margin = 8;
    var maxX = Math.max(margin, window.innerWidth - width - margin);
    var maxY = Math.max(margin, window.innerHeight - height - margin);
    return {
      x: Math.min(Math.max(Number(x) || margin, margin), maxX),
      y: Math.min(Math.max(Number(y) || margin, margin), maxY),
    };
  }

  function applyFloatBallPosition() {
    ensureFloatBall();
    if (!musicFloatBall) return;
    var x = playerCustomState && Number.isFinite(Number(playerCustomState.floatBallX)) ? Number(playerCustomState.floatBallX) : null;
    var y = playerCustomState && Number.isFinite(Number(playerCustomState.floatBallY)) ? Number(playerCustomState.floatBallY) : null;
    if (!isFinite(x) || !isFinite(y)) {
      musicFloatBall.style.left = "";
      musicFloatBall.style.top = "";
      musicFloatBall.style.right = "";
      musicFloatBall.style.bottom = "";
      return;
    }
    var pos = clampFloatBallPosition(x, y);
    musicFloatBall.style.left = pos.x + "px";
    musicFloatBall.style.top = pos.y + "px";
    musicFloatBall.style.right = "auto";
    musicFloatBall.style.bottom = "auto";
  }

  function saveFloatBallPosition(x, y) {
    var pos = clampFloatBallPosition(x, y);
    playerCustomState.floatBallX = pos.x;
    playerCustomState.floatBallY = pos.y;
    applyFloatBallPosition();
    savePlayerCustomState();
  }

  function bindFloatBallDrag() {
    if (!musicFloatBall || musicFloatBall.dataset.dragBound === "1") return;
    musicFloatBall.dataset.dragBound = "1";

    musicFloatBall.addEventListener("pointerdown", function (event) {
      if (!event || event.button > 0) return;
      var rect = musicFloatBall.getBoundingClientRect();
      floatBallDragState.active = true;
      floatBallDragState.moved = false;
      floatBallDragState.pointerId = event.pointerId;
      floatBallDragState.startX = event.clientX;
      floatBallDragState.startY = event.clientY;
      floatBallDragState.originX = rect.left;
      floatBallDragState.originY = rect.top;
      try {
        musicFloatBall.setPointerCapture(event.pointerId);
      } catch (e) {}
    });

    musicFloatBall.addEventListener("pointermove", function (event) {
      if (!floatBallDragState.active || event.pointerId !== floatBallDragState.pointerId) return;
      var dx = event.clientX - floatBallDragState.startX;
      var dy = event.clientY - floatBallDragState.startY;
      if (!floatBallDragState.moved && Math.abs(dx) + Math.abs(dy) > 6) {
        floatBallDragState.moved = true;
      }
      if (!floatBallDragState.moved) return;
      var pos = clampFloatBallPosition(floatBallDragState.originX + dx, floatBallDragState.originY + dy);
      musicFloatBall.style.left = pos.x + "px";
      musicFloatBall.style.top = pos.y + "px";
      musicFloatBall.style.right = "auto";
      musicFloatBall.style.bottom = "auto";
    });

    function finishFloatBallDrag(event) {
      if (!floatBallDragState.active) return;
      if (event && floatBallDragState.pointerId !== null && event.pointerId !== floatBallDragState.pointerId) return;
      var moved = !!floatBallDragState.moved;
      if (moved && musicFloatBall) {
        var rect = musicFloatBall.getBoundingClientRect();
        saveFloatBallPosition(rect.left, rect.top);
        floatBallSuppressClick = true;
        window.setTimeout(function () {
          floatBallSuppressClick = false;
        }, 120);
      }
      try {
        if (musicFloatBall && floatBallDragState.pointerId !== null) {
          musicFloatBall.releasePointerCapture(floatBallDragState.pointerId);
        }
      } catch (e) {}
      floatBallDragState.active = false;
      floatBallDragState.moved = false;
      floatBallDragState.pointerId = null;
    }

    musicFloatBall.addEventListener("pointerup", finishFloatBallDrag);
    musicFloatBall.addEventListener("pointercancel", finishFloatBallDrag);
  }

  function ensureFloatBall() {
    if (musicFloatBall && floatCoverImg && floatProgressCircle) return musicFloatBall;
    musicFloatBall = qs("#musicFloatBall");
    if (!musicFloatBall) {
      musicFloatBall = document.createElement("button");
      musicFloatBall.type = "button";
      musicFloatBall.className = "music-float-ball";
      musicFloatBall.id = "musicFloatBall";
      musicFloatBall.setAttribute("aria-label", "打开播放器");
      musicFloatBall.innerHTML =
        '<svg class="float-progress-svg" viewBox="0 0 64 64" aria-hidden="true">' +
        '<circle class="float-progress-circle" cx="32" cy="32" r="30"></circle>' +
        "</svg>" +
        '<div class="float-cover-wrap"><img src="' +
        BLANK_COVER +
        '" alt="" /></div>' +
        '<div class="float-bars" aria-hidden="true"><div class="float-bar"></div><div class="float-bar"></div><div class="float-bar"></div></div>';
      document.body.appendChild(musicFloatBall);
      musicFloatBall.addEventListener("click", function () {
        if (floatBallSuppressClick) return;
        openPlayer();
        setActiveTab("play");
        scheduleWaveRebuild();
      });
    }
    floatCoverImg = qs(".float-cover-wrap img", musicFloatBall);
    floatProgressCircle = qs(".float-progress-circle", musicFloatBall);
    bindFloatBallDrag();
    applyFloatBallPosition();
    return musicFloatBall;
  }

  function updateFloatingBallProgress() {
    return;
  }

  function syncMiniPlayerPresentation() {
    var hasTrack = !!(
      state &&
      state.currentTrackMeta &&
      (state.currentTrackMeta.title || state.currentTrackMeta.artist || state.currentTrackMeta.cover)
    );
    if (miniPlayer) {
      miniPlayer.classList.remove("is-hidden-by-mode");
      miniPlayer.classList.toggle("is-active", !!hasTrack);
      miniPlayer.setAttribute("aria-hidden", !hasTrack ? "true" : "false");
    }
  }

  function getCurrentTrackCover() {
    try {
      if (state.currentTrackMeta && state.currentTrackMeta.cover) return String(state.currentTrackMeta.cover);
    } catch (e) {}
    return "";
  }

  function stopCoverCarousel() {
    if (!coverCarouselTimer) return;
    try {
      window.clearInterval(coverCarouselTimer);
    } catch (e) {}
    coverCarouselTimer = 0;
  }

  function renderCustomCover() {
    var covers = Array.isArray(playerCustomState.coverImages) ? playerCustomState.coverImages.filter(Boolean) : [];
    if (!covers.length) {
      updateDisplayedCovers(getCurrentTrackCover());
      return;
    }
    if (playerCustomState.coverMode === "carousel") {
      var next = covers[coverCarouselIndex % covers.length] || covers[0];
      if (next) updateDisplayedCovers(next);
      return;
    }
    updateDisplayedCovers(covers[0]);
  }

  function syncCoverCarousel() {
    stopCoverCarousel();
    var covers = Array.isArray(playerCustomState.coverImages) ? playerCustomState.coverImages.filter(Boolean) : [];
    if (!covers.length) {
      renderCustomCover();
      return;
    }
    if (playerCustomState.coverMode !== "carousel" || covers.length < 2) {
      coverCarouselIndex = 0;
      renderCustomCover();
      return;
    }
    renderCustomCover();
    coverCarouselTimer = window.setInterval(function () {
      coverCarouselIndex = (coverCarouselIndex + 1) % covers.length;
      renderCustomCover();
    }, 5000);
  }

  function applyPlayerBackground() {
    if (!playerSheet) return;
    var overlayTone = playerCustomState && playerCustomState.overlayTone === "light" ? "light" : "dark";
    var overlayOpacity = Number(playerCustomState && playerCustomState.overlayOpacity);
    if (!isFinite(overlayOpacity)) overlayOpacity = DEFAULT_PLAYER_CUSTOM.overlayOpacity;
    overlayOpacity = Math.max(0, Math.min(100, Math.round(overlayOpacity)));
    playerSheet.style.setProperty("--player-overlay-rgb", overlayTone === "light" ? "255, 255, 255" : "10, 12, 18");
    playerSheet.style.setProperty("--player-overlay-opacity", String((overlayOpacity / 100).toFixed(2)));
    playerSheet.classList.toggle("has-light-overlay", overlayTone === "light");
    var bg = String(playerCustomState.backgroundImage || "").trim();
    if (bg) {
      playerSheet.style.backgroundImage = 'url("' + bg.replace(/"/g, "") + '")';
      playerSheet.classList.add("has-custom-bg");
    } else {
      playerSheet.style.backgroundImage = "";
      playerSheet.classList.remove("has-custom-bg");
    }
  }

  function applyProfileBackground() {
    if (!profilePage) return;
    var currentProfileCustomState = getActiveProfileCustomState();
    var overlayTone = currentProfileCustomState && currentProfileCustomState.overlayTone === "light" ? "light" : "dark";
    var overlayOpacity = Number(currentProfileCustomState && currentProfileCustomState.overlayOpacity);
    if (!isFinite(overlayOpacity)) overlayOpacity = DEFAULT_PROFILE_PAGE_CUSTOM.overlayOpacity;
    overlayOpacity = Math.max(0, Math.min(100, Math.round(overlayOpacity)));
    var bg = String((currentProfileCustomState && currentProfileCustomState.backgroundImage) || "").trim();
    profilePage.style.setProperty("--profile-overlay-rgb", overlayTone === "light" ? "255, 255, 255" : "8, 10, 16");
    profilePage.style.setProperty("--profile-overlay-opacity", String((overlayOpacity / 100).toFixed(2)));
    profilePage.style.setProperty("--profile-text-color", overlayTone === "light" ? "#1c1f26" : "#ffffff");
    profilePage.style.setProperty("--profile-muted-color", overlayTone === "light" ? "rgba(28, 31, 38, 0.72)" : "rgba(255, 255, 255, 0.76)");
    if (bg) {
      profilePage.style.setProperty("--profile-bg-image", 'url("' + bg.replace(/"/g, "") + '")');
      profilePage.classList.add("has-custom-bg");
    } else {
      profilePage.style.removeProperty("--profile-bg-image");
      profilePage.classList.remove("has-custom-bg");
    }
  }

  function syncSettingControls() {
    if (lyricColorPicker) lyricColorPicker.value = playerCustomState.lyricColor || DEFAULT_PLAYER_CUSTOM.lyricColor;
    if (progressColorPicker) progressColorPicker.value = playerCustomState.progressColor || DEFAULT_PLAYER_CUSTOM.progressColor;
    if (playBtnColorPicker) playBtnColorPicker.value = playerCustomState.playBtnColor || DEFAULT_PLAYER_CUSTOM.playBtnColor;
    if (overlayToneInputs && overlayToneInputs.length) {
      overlayToneInputs.forEach(function (input) {
        input.checked = input.value === (playerCustomState.overlayTone === "light" ? "light" : "dark");
      });
    }
    if (overlayOpacitySlider) overlayOpacitySlider.value = String(
      Number.isFinite(Number(playerCustomState.overlayOpacity))
        ? Math.max(0, Math.min(100, Math.round(Number(playerCustomState.overlayOpacity))))
        : DEFAULT_PLAYER_CUSTOM.overlayOpacity
    );
    updateOverlayOpacityLabel();
    if (miniPlayerModeInputs && miniPlayerModeInputs.length) {
      miniPlayerModeInputs.forEach(function (input) {
        input.checked = input.value === getMiniPlayerMode();
      });
    }
    if (coverModeInputs && coverModeInputs.length) {
      coverModeInputs.forEach(function (input) {
        input.checked = input.value === (playerCustomState.coverMode || "single");
      });
    }
    if (playerVisualStyleInputs && playerVisualStyleInputs.length) {
      playerVisualStyleInputs.forEach(function (input) {
        input.checked = input.value === getPlayerVisualStyle();
      });
    }
  }

  function syncProfileSettingControls() {
    var currentProfileCustomState = getActiveProfileCustomState();
    if (profileOverlayToneInputs && profileOverlayToneInputs.length) {
      profileOverlayToneInputs.forEach(function (input) {
        input.checked = input.value === (currentProfileCustomState.overlayTone === "light" ? "light" : "dark");
      });
    }
    if (profileOverlayOpacitySlider) {
      profileOverlayOpacitySlider.value = String(
        Number.isFinite(Number(currentProfileCustomState.overlayOpacity))
          ? Math.max(0, Math.min(100, Math.round(Number(currentProfileCustomState.overlayOpacity))))
          : DEFAULT_PROFILE_PAGE_CUSTOM.overlayOpacity
      );
    }
    if (profileSettingsModalTitle) {
      profileSettingsModalTitle.textContent = isRoleProfileView() ? "角色主页设置" : "个人主页设置";
    }
    updateProfileOverlayOpacityLabel();
  }

  function applyPlayerCustomization() {
    applyPlayerColorVars();
    applyPlayerBackground();
    applyPlayerVisualStyle();
    syncCoverCarousel();
    syncSettingControls();
    syncMiniPlayerPresentation();
    updateWaveFromAudio();
  }

  function updateOverlayOpacityLabel() {
    if (!overlayOpacityValue) return;
    var raw = overlayOpacitySlider ? Number(overlayOpacitySlider.value) : Number(playerCustomState && playerCustomState.overlayOpacity);
    if (!isFinite(raw)) raw = DEFAULT_PLAYER_CUSTOM.overlayOpacity;
    raw = Math.max(0, Math.min(100, Math.round(raw)));
    overlayOpacityValue.textContent = raw + "%";
  }

  function updateProfileOverlayOpacityLabel() {
    if (!profileOverlayOpacityValue) return;
    var currentProfileCustomState = getActiveProfileCustomState();
    var raw = profileOverlayOpacitySlider ? Number(profileOverlayOpacitySlider.value) : Number(currentProfileCustomState && currentProfileCustomState.overlayOpacity);
    if (!isFinite(raw)) raw = DEFAULT_PROFILE_PAGE_CUSTOM.overlayOpacity;
    raw = Math.max(0, Math.min(100, Math.round(raw)));
    profileOverlayOpacityValue.textContent = raw + "%";
  }

  function readFilesAsDataUrls(fileList, multiple) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return Promise.resolve([]);
    if (!multiple) files = files.slice(0, 1);
    return Promise.all(
      files.map(function (file) {
        return new Promise(function (resolve) {
          var reader = new FileReader();
          reader.onload = function () {
            resolve(typeof reader.result === "string" ? reader.result : "");
          };
          reader.onerror = function () {
            resolve("");
          };
          reader.readAsDataURL(file);
        });
      })
    ).then(function (items) {
      return items.filter(Boolean);
    });
  }

  function renderQueue() {
    if (!queueList) return;
    queueList.innerHTML = "";
    if (!state.queue || !state.queue.length) {
      var empty = document.createElement("div");
      empty.className = "home-empty";
      empty.textContent = "暂无歌曲";
      queueList.appendChild(empty);
      return;
    }

    state.queue.forEach(function (song, idx) {
      var item = document.createElement("button");
      item.type = "button";
      item.className = "queue-item";
      item.dataset.index = String(idx);
      if (idx === state.currentIndex) item.classList.add("is-active");

      var meta = document.createElement("div");
      meta.className = "queue-item-meta";

      var t = document.createElement("div");
      t.className = "queue-item-title";
      t.textContent = song && song.title ? String(song.title) : "未知歌曲";

      var a = document.createElement("div");
      a.className = "queue-item-artist";
      a.textContent = song && song.artist ? String(song.artist) : "未知歌手";

      meta.appendChild(t);
      meta.appendChild(a);
      if (song && song.playbackIssue) {
        item.classList.add("has-issue");
        var issue = document.createElement("div");
        issue.className = "queue-item-issue";
        issue.textContent = String(song.playbackIssue);
        meta.appendChild(issue);
      }
      item.appendChild(meta);

      item.addEventListener("click", function () {
        playQueueIndex(idx);
        setQueueOpen(false);
      });

      queueList.appendChild(item);
    });
  }

  function openQueue() {
    renderQueue();
    setQueueOpen(true);
  }

  function getCharProfiles() {
    var host = findHostByObject("charProfiles");
    if (host) return host.charProfiles;
    try {
      var raw = localStorage.getItem("wechat_charProfiles");
      var parsed = safeJsonParse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (e) {}
    return {};
  }

  function getHostRoleIds() {
    var host = findHostByFunction("getRoleIds");
    if (!host || typeof host.getRoleIds !== "function") return [];
    try {
      var ids = host.getRoleIds();
      if (!Array.isArray(ids)) return [];
      return ids
        .map(function (id) {
          return trimString(id);
        })
        .filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  function getCharProfileIds() {
    var profiles = getCharProfiles();
    var ids = Object.keys(profiles || {}).filter(function (id) {
      if (!id || String(id).charAt(0) === "_") return false;
      return !!(profiles[id] && typeof profiles[id] === "object");
    });
    getHostRoleIds().forEach(function (id) {
      if (ids.indexOf(id) < 0) ids.push(id);
    });
    return ids;
  }

  function getCharProfileCount() {
    return getCharProfileIds().length;
  }

  function trimString(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalizeWorldBookIds(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map(function (item) {
          return trimString(item);
        })
        .filter(Boolean);
    }
    if (typeof value === "string") {
      var text = trimString(value);
      if (!text) return [];
      if (text.indexOf(",") >= 0) {
        return text
          .split(",")
          .map(function (item) {
            return trimString(item);
          })
          .filter(Boolean);
      }
      return [text];
    }
    return [];
  }

  function getWorldBooksMap() {
    var host = findHostByObject("worldBooks");
    if (host) return host.worldBooks;
    try {
      var raw = localStorage.getItem("wechat_worldbooks") || "";
      var parsed = raw ? safeJsonParse(raw) : null;
      if (parsed && typeof parsed === "object") return parsed;
    } catch (e2) {}
    return {};
  }

  function extractRoleDescription(profile) {
    var p = profile && typeof profile === "object" ? profile : {};
    return trimString(
      p.desc ||
        p.description ||
        p.persona ||
        p.prompt ||
        p.system_prompt ||
        p.systemPrompt ||
        p.character ||
        p.style
    );
  }

  function toMusicAssetUrl(url, fallback) {
    var value = trimString(url);
    if (!value) return fallback || "../assets/images/touxiang.jpg";
    if (/^(https?:|data:|blob:)/i.test(value)) return value;
    if (value.indexOf("../") === 0 || value.indexOf("./") === 0 || value.indexOf("/") === 0) return value;
    if (value.indexOf("assets/") === 0) return "../" + value;
    return value;
  }

  function getRoleProfileMeta(roleId) {
    var id = trimString(roleId);
    var profiles = getCharProfiles();
    var profile = id && profiles && typeof profiles === "object" && profiles[id] && typeof profiles[id] === "object" ? profiles[id] : {};
    var worldbookIds = normalizeWorldBookIds(profile.worldbookId || profile.worldbookIds || profile.worldBookIds || profile.world_book_ids);
    var name =
      trimString(
        profile.nickName ||
          profile.nickname ||
          profile.displayName ||
          profile.name ||
          profile.realName ||
          profile.character_name ||
          profile.characterName
      ) || id || "TA";
    var avatar = trimString(profile.avatar || profile.image || profile.portrait || profile.avatar_url || profile.avatarUrl);
    var desc = extractRoleDescription(profile);
    var sign = desc;
    if (sign.length > 34) sign = sign.slice(0, 34) + "...";
    if (!sign) sign = "最近在听一些适合 TA 气质的歌";
    return {
      id: id,
      raw: profile,
      name: name,
      avatar: toMusicAssetUrl(avatar, "../assets/images/touxiang.jpg"),
      desc: desc,
      sign: sign,
      worldbookIds: worldbookIds,
    };
  }

  function isRoleProfileView() {
    return state.profileViewMode === "role" && !!trimString(state.activeRoleProfileId);
  }

  function getActiveRoleProfileId() {
    return isRoleProfileView() ? trimString(state.activeRoleProfileId) : "";
  }

  function roleProfileCustomStateKey(roleId) {
    return ROLE_PROFILE_CUSTOM_KEY_PREFIX + trimString(roleId);
  }

  function loadRoleProfileCustomState(roleId) {
    var id = trimString(roleId);
    if (!id) return Object.assign({}, DEFAULT_PROFILE_PAGE_CUSTOM);
    try {
      if (!window.localStorage) return Object.assign({}, DEFAULT_PROFILE_PAGE_CUSTOM);
      var raw = localStorage.getItem(roleProfileCustomStateKey(id)) || "";
      if (!raw) return Object.assign({}, DEFAULT_PROFILE_PAGE_CUSTOM);
      return normalizeProfilePageCustomState(safeJsonParse(raw));
    } catch (e) {
      return Object.assign({}, DEFAULT_PROFILE_PAGE_CUSTOM);
    }
  }

  function getActiveProfileCustomState() {
    var roleId = getActiveRoleProfileId();
    if (roleId) {
      if (!roleProfileCustomStateMap[roleId]) {
        roleProfileCustomStateMap[roleId] = loadRoleProfileCustomState(roleId);
      }
      return roleProfileCustomStateMap[roleId];
    }
    return profilePageCustomState;
  }

  function saveActiveProfileCustomState() {
    var roleId = getActiveRoleProfileId();
    if (roleId) {
      try {
        roleProfileCustomStateMap[roleId] = normalizeProfilePageCustomState(getActiveProfileCustomState());
        persistJsonState(roleProfileCustomStateKey(roleId), roleProfileCustomStateMap[roleId]);
      } catch (e) {
        showToast("角色主页设置保存失败");
      }
      return;
    }
    saveProfilePageCustomState();
  }

  function resetToSelfProfileView() {
    state.profileViewMode = "self";
    state.activeRoleProfileId = "";
  }

  function setCurrentChatRoleValue(roleId) {
    var nextId = trimString(roleId);
    try {
      window.currentChatRole = nextId;
    } catch (e) {}
    try {
      if (window.parent && window.parent !== window) {
        window.parent.currentChatRole = nextId;
      }
    } catch (e2) {}
    try {
      localStorage.setItem("currentChatId", nextId);
    } catch (e3) {}
    try {
      if (window.parent && window.parent !== window && window.parent.localStorage) {
        window.parent.localStorage.setItem("currentChatId", nextId);
      }
    } catch (e4) {}
  }

  function openSelfProfile() {
    resetToSelfProfileView();
    setActiveTab("me");
    setActivePage("me");
  }

  function openRoleProfile(roleId) {
    var nextId = trimString(roleId);
    if (!nextId) return;
    state.profileViewMode = "role";
    state.activeRoleProfileId = nextId;
    setCurrentChatRoleValue(nextId);
    primeRoleMusicPrefetch([nextId].concat(getCharProfileIds().filter(function (id) { return String(id) !== nextId; })), true);
    setActiveTab("me");
    setActivePage("character");
  }

  function handleProfileRolePicked(roleId) {
    var meta = getRoleProfileMeta(roleId);
    if (!meta.id) return;
    openRoleProfile(meta.id);
    showToast("已切换到 " + String(meta.name));
  }

  function openProfileRolePicker() {
    var ids = getCharProfileIds();
    if (!ids.length) {
      showToast("当前还没有可选角色");
      return;
    }

    function openLocalRolePicker() {
      if (!ids.length) {
        showToast("当前还没有可选角色");
        return;
      }
      if (inviteModal && inviteList) {
        inviteList.innerHTML = "";
        ids.forEach(function (id) {
          var meta = getRoleProfileMeta(id);
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "invite-item";
          btn.dataset.id = String(id);

          var av = document.createElement("div");
          av.className = "invite-avatar";
          var img = document.createElement("img");
          img.alt = "";
          img.loading = "lazy";
          setImageSource(img, (meta && meta.avatar) || "assets/chushitouxiang.jpg", DEFAULT_COVER);
          av.appendChild(img);

          var info = document.createElement("div");
          info.className = "invite-meta";
          var name = document.createElement("div");
          name.className = "invite-name";
          name.textContent = (meta && meta.name) || String(id);
          var sub = document.createElement("div");
          sub.className = "invite-sub";
          sub.textContent = "点击进入角色音乐主页";
          info.appendChild(name);
          info.appendChild(sub);

          btn.appendChild(av);
          btn.appendChild(info);
          btn.addEventListener("click", function () {
            handleProfileRolePicked(String(id));
            setInviteOpen(false);
          });
          inviteList.appendChild(btn);
        });
        setInviteOpen(true);
        return;
      }

      var lines = ids.map(function (id, idx) {
        var meta = getRoleProfileMeta(id);
        var name = trimString(meta && meta.name ? meta.name : id) || id;
        return String(idx + 1) + ". " + name + " (" + id + ")";
      });
      var message = "请选择角色（输入序号或角色ID）\n" + lines.join("\n");
      uiPromptCompat(message, ids[0], { title: "角色选择" }).then(function (picked) {
        var raw = trimString(picked);
        if (!raw) return;
        var roleId = raw;
        if (/^\d+$/.test(raw)) {
          var index = Number(raw) - 1;
          if (index >= 0 && index < ids.length) roleId = ids[index];
        }
        handleProfileRolePicked(roleId);
      });
    }
    openLocalRolePicker();
  }

  function readUserPersonasMap() {
    var host = findHostByObject("userPersonas");
    if (host) return host.userPersonas;
    try {
      var raw = localStorage.getItem("wechat_userPersonas") || "";
      var parsed = raw ? safeJsonParse(raw) : null;
      if (parsed && typeof parsed === "object") return parsed;
    } catch (e2) {}
    return {};
  }

  function getScopedUserProfile(roleId) {
    var rid = String(roleId || "").trim();
    var personas = readUserPersonasMap();
    var scoped = rid && personas && typeof personas === "object" && personas[rid] && typeof personas[rid] === "object" ? personas[rid] : {};
    var baseName = "";
    var baseAvatar = "";

    try {
      if (window.parent && window.parent !== window && typeof window.parent.getCurrentUserProfile === "function") {
        var current = window.parent.getCurrentUserProfile() || {};
        baseName = current.name ? String(current.name) : "";
        baseAvatar = current.avatar ? String(current.avatar) : "";
      }
    } catch (e0) {}

    if (!baseName) {
      try {
        baseName = String(localStorage.getItem("user_name") || "");
      } catch (e1) {}
    }
    if (!baseAvatar) {
      try {
        baseAvatar = String(localStorage.getItem("user_avatar") || "");
      } catch (e2) {}
    }

    var musicProfile = null;
    try {
      musicProfile = loadProfile();
    } catch (e3) {
      musicProfile = null;
    }

    if (!baseName && musicProfile && musicProfile.name) baseName = String(musicProfile.name || "");
    if ((!baseAvatar || baseAvatar === DEFAULT_COVER) && musicProfile && musicProfile.avatar && musicProfile.avatar !== DEFAULT_COVER) {
      baseAvatar = String(musicProfile.avatar || "");
    }

    var name = String((scoped && scoped.name) || baseName || "我").trim() || "我";
    var avatar = String((scoped && scoped.avatar) || baseAvatar || "assets/chushitouxiang.jpg").trim();
    if (!avatar || avatar === DEFAULT_COVER) avatar = "assets/chushitouxiang.jpg";

    return {
      name: name,
      avatar: normalizeAssetUrl(avatar),
    };
  }

  function renderInviteList() {
    if (!inviteList) return;
    inviteList.innerHTML = "";
    var profiles = getCharProfiles();
    var ids = Object.keys(profiles || {});
    if (!ids.length) {
      var empty = document.createElement("div");
      empty.className = "home-empty";
      empty.textContent = "暂无角色";
      inviteList.appendChild(empty);
      return;
    }

    ids.forEach(function (id) {
      var p = profiles[id] || {};
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "invite-item";
      btn.dataset.id = String(id);

      var av = document.createElement("div");
      av.className = "invite-avatar";
      var img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      setImageSource(img, p.avatar || "assets/chushitouxiang.jpg", DEFAULT_COVER);
      av.appendChild(img);

      var meta = document.createElement("div");
      meta.className = "invite-meta";
      var name = document.createElement("div");
      name.className = "invite-name";
      name.textContent = p.nickName || p.name || String(id);
      var sub = document.createElement("div");
      sub.className = "invite-sub";
      sub.textContent = "发送一起听邀请";
      meta.appendChild(name);
      meta.appendChild(sub);

      btn.appendChild(av);
      btn.appendChild(meta);

      btn.addEventListener("click", function () {
        sendTogetherInvite(String(id));
        setInviteOpen(false);
      });

      inviteList.appendChild(btn);
    });
  }

  function normalizeAssetUrl(url) {
    var s = url ? String(url) : "";
    if (!s) return "";
    if (s.indexOf("../") === 0) return s.slice(3);
    return s;
  }

  function sendTogetherInvite(roleId) {
    var current = ensureCurrentTrackInfo();
    var title = current && current.title ? String(current.title) : "未知歌曲";
    var artist = current && current.artist ? String(current.artist) : "未知歌手";
    var url = audioEl && audioEl.src ? String(audioEl.src) : "";
    var cover = current && current.cover ? String(current.cover) : "";
    var myProfile = getScopedUserProfile(roleId);
    var payload = {
      roleId: String(roleId || ""),
      track: { title: title, artist: artist, cover: normalizeAssetUrl(cover), url: url, key: trackKey(current) },
      userName: myProfile && myProfile.name ? String(myProfile.name) : "",
      userAvatar: myProfile && myProfile.avatar ? normalizeAssetUrl(myProfile.avatar) : "",
      at: Date.now(),
    };
    try {
      if (window.parent && window.parent !== window) {
        window.parent.localStorage.setItem("listen_together_invite", JSON.stringify(payload));
      } else {
        localStorage.setItem("listen_together_invite", JSON.stringify(payload));
      }
    } catch (e) {}

    try {
      if (window.parent && window.parent !== window) {
        var parentWin = window.parent;
        if (typeof parentWin.sendInvite === "function") {
          try {
            parentWin.sendInvite(payload);
          } catch (e0) {}
        } else {
          if (!parentWin.chatData || typeof parentWin.chatData !== "object") {
            try {
              parentWin.chatData = JSON.parse(parentWin.localStorage.getItem("wechat_chatData") || "{}");
            } catch (e2) {
              parentWin.chatData = {};
            }
          }
          if (!Array.isArray(parentWin.chatData[roleId])) parentWin.chatData[roleId] = [];
          var userAvatar = payload && payload.userAvatar ? String(payload.userAvatar) : "";
          var userName = payload && payload.userName ? String(payload.userName) : "";
          parentWin.chatData[roleId].push({
            role: "me",
            type: "listen_invite",
            timestamp: Date.now(),
            status: "sent",
            inviteId: "lt_" + Date.now() + "_" + Math.random().toString(16).slice(2),
            inviteStatus: "pending",
            userName: userName || "我",
            userAvatar: userAvatar || "assets/chushitouxiang.jpg",
            track: payload.track || null,
          });
          try {
            parentWin.localStorage.setItem("wechat_chatData", JSON.stringify(parentWin.chatData));
          } catch (e4) {}
          if (typeof parentWin.saveData === "function") {
            try {
              parentWin.saveData();
            } catch (e5) {}
          }
        }
        if (typeof parentWin.enterChatRoom === "function") {
          parentWin.enterChatRoom(roleId);
        } else if (typeof parentWin.openChatApp === "function") {
          parentWin.openChatApp();
        }
        showToast("已发送邀请");
        return;
      }
    } catch (e) {}

    showToast("邀请已生成");
  }

  var modeList = [
    { key: "loop", icon: "bx-refresh", label: "顺序播放" },
    { key: "shuffle", icon: "bx-shuffle", label: "随机播放" },
    { key: "single", icon: "bx-repeat", label: "单曲循环" },
  ];

  var STORAGE_KEY = "music_library_v1";
  var MY_PLAYLISTS_KEY = "music_my_playlists_v1";
  var PLAYER_CUSTOM_KEY = "music_player_custom_v1";
  var PROFILE_PAGE_CUSTOM_KEY = "music_profile_page_custom_v1";
  var ROLE_MUSIC_CACHE_KEY = "music_role_music_cache_v1";
  var ROLE_PROFILE_CUSTOM_KEY_PREFIX = "music_role_profile_custom_v1::";
  var DEFAULT_PLAYER_CUSTOM = {
    lyricColor: "#111111",
    progressColor: "#111111",
    playBtnColor: "#ffffff",
    backgroundImage: "",
    overlayTone: "dark",
    overlayOpacity: 44,
    coverImages: [],
    coverMode: "single",
    miniPlayerMode: "island",
    playerVisualStyle: "square",
    floatBallX: null,
    floatBallY: null,
  };
  var DEFAULT_PROFILE_PAGE_CUSTOM = {
    backgroundImage: "",
    overlayTone: "dark",
    overlayOpacity: 40,
  };

  var playerCustomState = Object.assign({}, DEFAULT_PLAYER_CUSTOM);
  var profilePageCustomState = Object.assign({}, DEFAULT_PROFILE_PAGE_CUSTOM);
  var roleMusicCache = {};
  var roleMusicRequestMap = {};
  var roleMusicPrefetchQueue = [];
  var roleMusicPrefetchTimer = 0;
  var roleMusicPrefetchActive = "";
  var roleProfileCustomStateMap = {};
  var coverCarouselTimer = 0;
  var coverCarouselIndex = 0;
  var musicFloatBall = null;
  var floatCoverImg = null;
  var floatProgressCircle = null;
  var FLOAT_PROGRESS_CIRCUMFERENCE = 188.5;
  var PLAY_URL_CACHE_TTL_MS = 8 * 60 * 1000;
  var floatBallSuppressClick = false;
  var progressSliderPreviewActive = false;
  var floatBallDragState = {
    active: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  };

  function getSearchType() {
    return ALL_SEARCH_TYPE;
  }

  function getDefaultSourceType() {
    return DEFAULT_SOURCE_TYPE;
  }

  function getSourcePool() {
    return SOURCE_POOL.slice();
  }

  var state = {
    queue: [],
    library: [],
    queueMode: "library",
    currentIndex: 0,
    isPlaying: false,
    searchResults: [],
    homeSelecting: false,
    homeSelectedKeys: null,
    homeIgnoreClick: false,
    modeIndex: 0,
    barCount: 0,
    progressCount: 0,
    bars: [],
    toastTimer: null,
    playCtx: null,
    lyricsKey: "",
    lyricsLines: [],
    lyricsEls: [],
    lyricsActiveIndex: -1,
    lyricFetchTimer: null,
    lyricCache: {},
    urlCache: {},
    listenSeconds: 0,
    listenStartedAt: 0,
    previewFixMap: {},
    repairMap: {},
    togetherRoleId: "",
    togetherLastCountedKey: "",
    togetherSessionShadow: null,
    profileViewMode: "self",
    activeRoleProfileId: "",
    roleProfileLoading: false,
    roleProfileRequestToken: 0,
    importBusy: false,
  };

  function safeJsonParse(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  var PROFILE_KEY = "music_profile_v1";
  var LISTEN_SECONDS_KEY = "music_listen_seconds_v1";
  var TOGETHER_STATS_KEY = "listen_together_stats_v1";

  state.homeSelectedKeys = new Set();

  function loadListenSeconds() {
    try {
      if (!window.localStorage) return 0;
      var raw = localStorage.getItem(LISTEN_SECONDS_KEY) || "";
      var v = Number(raw || 0);
      if (!isFinite(v) || v < 0) v = 0;
      return Math.floor(v);
    } catch (e) {
      return 0;
    }
  }

  state.listenSeconds = loadListenSeconds();

  function saveListenSeconds(sec) {
    try {
      if (!window.localStorage) return;
      var v = Number(sec || 0);
      if (!isFinite(v) || v < 0) v = 0;
      localStorage.setItem(LISTEN_SECONDS_KEY, String(Math.floor(v)));
    } catch (e) {}
  }

  function loadTogetherStatsMap() {
    try {
      if (!window.localStorage) return {};
      var raw = localStorage.getItem(TOGETHER_STATS_KEY) || "";
      var data = raw ? safeJsonParse(raw) : null;
      if (!data || typeof data !== "object") return {};
      return data;
    } catch (e) {
      return {};
    }
  }

  function saveTogetherStatsMap(map) {
    try {
      if (!window.localStorage) return;
      localStorage.setItem(TOGETHER_STATS_KEY, JSON.stringify(map || {}));
    } catch (e) {}
  }

  function resolveTogetherRoleId(session) {
    if (!session || typeof session !== "object") return "";
    var id = session.roleId || session.characterId || session.character || session.aiId || session.id;
    return id ? String(id) : "";
  }

  function ensureTogetherRoleId() {
    var session = readTogetherSession();
    var id = resolveTogetherRoleId(session);
    state.togetherRoleId = id;
    return id;
  }

  function addTogetherListenSeconds(sec) {
    var roleId = state.togetherRoleId || ensureTogetherRoleId();
    if (!roleId) return;
    var s = Number(sec || 0);
    if (!isFinite(s) || s <= 0) return;
    var map = loadTogetherStatsMap();
    var cur = map[roleId] && typeof map[roleId] === "object" ? map[roleId] : {};
    var prev = Number(cur.listenSeconds || 0);
    if (!isFinite(prev) || prev < 0) prev = 0;
    cur.listenSeconds = Math.floor(prev + s);
    if (!("songs" in cur)) cur.songs = 0;
    map[roleId] = cur;
    saveTogetherStatsMap(map);
  }

  function bumpTogetherSongCount() {
    var roleId = state.togetherRoleId || ensureTogetherRoleId();
    if (!roleId) return;
    var map = loadTogetherStatsMap();
    var cur = map[roleId] && typeof map[roleId] === "object" ? map[roleId] : {};
    var prev = Number(cur.songs || 0);
    if (!isFinite(prev) || prev < 0) prev = 0;
    cur.songs = Math.floor(prev + 1);
    if (!("listenSeconds" in cur)) cur.listenSeconds = 0;
    map[roleId] = cur;
    saveTogetherStatsMap(map);
  }

  function addListenDeltaMs(deltaMs) {
    var d = Number(deltaMs || 0);
    if (!isFinite(d) || d <= 0) return;
    var sec = Math.floor(d / 1000);
    if (!sec) return;
    state.listenSeconds = (state.listenSeconds || 0) + sec;
    saveListenSeconds(state.listenSeconds);
    addTogetherListenSeconds(sec);
  }

  function flushListenTime() {
    if (!state.listenStartedAt) return;
    addListenDeltaMs(Date.now() - state.listenStartedAt);
    state.listenStartedAt = 0;
  }

  function formatListenDuration(sec) {
    var s = Number(sec || 0);
    if (!isFinite(s) || s < 0) s = 0;
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    if (h <= 0) return m + "m";
    if (m <= 0) return h + "h";
    return h + "h " + m + "m";
  }

  function formatHoursMinutesCN(sec) {
    var s = Number(sec || 0);
    if (!isFinite(s) || s < 0) s = 0;
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    return h + "小时" + m + "分钟";
  }

  function getChatCountForRole(roleId) {
    var id = String(roleId || "");
    if (!id) return 0;
    try {
      if (window.parent && window.parent !== window) {
        var pw = window.parent;
        var cd = pw.chatData;
        if (!cd || typeof cd !== "object") {
          try {
            cd = safeJsonParse(pw.localStorage.getItem("wechat_chatData") || "{}");
          } catch (e0) {
            cd = null;
          }
        }
        var list = cd && cd[id];
        if (Array.isArray(list)) return list.length;
      }
    } catch (e) {}
    try {
      var local = safeJsonParse(localStorage.getItem("wechat_chatData") || "{}");
      var list2 = local && local[id];
      if (Array.isArray(list2)) return list2.length;
    } catch (e2) {}
    return 0;
  }

  function buildTogetherExitSummaryText(roleId) {
    var session = normalizeTogetherSession(readTogetherSession());
    var id = String(roleId || resolveTogetherRoleId(session) || "");
    var songs = 0;
    var sec = 0;
    if (session && resolveTogetherRoleId(session) === id) {
      songs = Number(session.stats && session.stats.songs ? session.stats.songs : 0);
      if (!isFinite(songs) || songs < 0) songs = 0;
      var startedAt = Number(session.startedAt || 0);
      if (isFinite(startedAt) && startedAt > 0) {
        var d = Math.floor((Date.now() - startedAt) / 1000);
        if (isFinite(d) && d > 0) sec = d;
      }
    }
    return "本次一起听歌" + Math.floor(songs) + "首，本次相互陪伴" + formatHoursMinutesCN(sec);
  }

  function sendTextToRole(roleId, text) {
    var id = String(roleId || "");
    var content = String(text || "").trim();
    if (!id || !content) return false;
    try {
      if (window.parent && window.parent !== window) {
        var parentWin = window.parent;
        if (!parentWin.chatData || typeof parentWin.chatData !== "object") {
          try {
            parentWin.chatData = JSON.parse(parentWin.localStorage.getItem("wechat_chatData") || "{}");
          } catch (e1) {
            parentWin.chatData = {};
          }
        }
        if (!Array.isArray(parentWin.chatData[id])) parentWin.chatData[id] = [];
        parentWin.chatData[id].push({
          role: "me",
          content: content,
          type: "text",
          timestamp: Date.now(),
          status: "sent",
        });
        try {
          parentWin.localStorage.setItem("wechat_chatData", JSON.stringify(parentWin.chatData));
        } catch (e2) {}
        if (typeof parentWin.saveData === "function") {
          try {
            parentWin.saveData();
          } catch (e3) {}
        }
        return true;
      }
    } catch (e) {}
    try {
      var local = safeJsonParse(localStorage.getItem("wechat_chatData") || "{}");
      if (!local || typeof local !== "object") local = {};
      if (!Array.isArray(local[id])) local[id] = [];
      local[id].push({ role: "me", content: content, type: "text", timestamp: Date.now(), status: "sent" });
      localStorage.setItem("wechat_chatData", JSON.stringify(local));
      return true;
    } catch (e4) {}
    return false;
  }

  function loadProfile() {
    var p = null;
    try {
      if (!window.localStorage) p = null;
      else {
        var raw = localStorage.getItem(PROFILE_KEY) || "";
        p = raw ? safeJsonParse(raw) : null;
      }
    } catch (e) {
      p = null;
    }
    return normalizeProfileData(p);
  }

  function saveProfile(p) {
    try {
      persistJsonState(PROFILE_KEY, normalizeProfileData(p));
    } catch (e) {}
  }

  function loadProfilePageCustomState() {
    try {
      if (!window.localStorage) return Object.assign({}, DEFAULT_PROFILE_PAGE_CUSTOM);
      var raw = localStorage.getItem(PROFILE_PAGE_CUSTOM_KEY) || "";
      if (!raw) return Object.assign({}, DEFAULT_PROFILE_PAGE_CUSTOM);
      return normalizeProfilePageCustomState(safeJsonParse(raw));
    } catch (e) {
      return Object.assign({}, DEFAULT_PROFILE_PAGE_CUSTOM);
    }
  }

  function saveProfilePageCustomState() {
    try {
      persistJsonState(PROFILE_PAGE_CUSTOM_KEY, normalizeProfilePageCustomState(profilePageCustomState));
    } catch (e) {
      showToast("个人主页设置保存失败");
    }
  }

  function hydratePersistedStates() {
    readPersistedJsonAsync(PLAYER_CUSTOM_KEY).then(function (data) {
      if (!data || typeof data !== "object") return;
      playerCustomState = normalizePlayerCustomState(data);
      writeStorageMirror(PLAYER_CUSTOM_KEY, playerCustomState);
      applyPlayerCustomization();
      syncGlobalWidgetMode();
    });
    readPersistedJsonAsync(PROFILE_KEY).then(function (data) {
      if (!data || typeof data !== "object") return;
      writeStorageMirror(PROFILE_KEY, normalizeProfileData(data));
      renderProfileView();
    });
    readPersistedJsonAsync(PROFILE_PAGE_CUSTOM_KEY).then(function (data) {
      if (!data || typeof data !== "object") return;
      profilePageCustomState = normalizeProfilePageCustomState(data);
      writeStorageMirror(PROFILE_PAGE_CUSTOM_KEY, profilePageCustomState);
      applyProfileBackground();
      syncProfileSettingControls();
    });
    readPersistedJsonAsync(MY_PLAYLISTS_KEY).then(function (data) {
      myPlaylists = normalizeMyPlaylists(data);
      writeStorageMirror(MY_PLAYLISTS_KEY, myPlaylists);
      hydratePersistedLocalTracks();
      renderProfilePlaylists();
      renderAddToPlaylistSheet();
    });
  }

  function hashString(input) {
    var text = String(input || "");
    var hash = 2166136261;
    for (var i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function loadRoleMusicCacheStore() {
    try {
      if (!window.localStorage) return {};
      var raw = localStorage.getItem(ROLE_MUSIC_CACHE_KEY) || "";
      var parsed = raw ? safeJsonParse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function normalizeRoleMusicPlaylist(item, index) {
    var raw = item && typeof item === "object" ? item : {};
    return {
      id: trimString(raw.id || "role_playlist_" + index),
      title: trimString(raw.title || "TA 的歌单 " + String(index + 1)) || "TA 的歌单 " + String(index + 1),
      subtitle: trimString(raw.subtitle || raw.desc || "最近在循环这些歌"),
      query: trimString(raw.query || raw.keyword || raw.search || ""),
      fallbackQuery: trimString(raw.fallbackQuery || raw.backupQuery || ""),
      playCount: Number.isFinite(Number(raw.playCount)) ? Math.max(0, Math.floor(Number(raw.playCount))) : 0,
      songs: (Array.isArray(raw.songs) ? raw.songs : [])
        .map(function (song) {
          return normalizePlaylistSong(song);
        })
        .filter(Boolean),
    };
  }

  function normalizeRoleMusicEntry(roleId, data) {
    var raw = data && typeof data === "object" ? data : {};
    var playlists = Array.isArray(raw.playlists)
      ? raw.playlists
          .map(function (item, index) {
            return normalizeRoleMusicPlaylist(item, index);
          })
          .filter(function (item) {
            return !!item.title;
          })
      : [];
    return {
      roleId: trimString(roleId || raw.roleId),
      updatedAt: Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : Date.now(),
      summary: trimString(raw.summary || raw.sign || ""),
      fans: Number.isFinite(Number(raw.fans)) ? Math.max(1, Math.floor(Number(raw.fans))) : 128,
      level: Number.isFinite(Number(raw.level)) ? Math.max(1, Math.floor(Number(raw.level))) : 6,
      listenSeconds: Number.isFinite(Number(raw.listenSeconds)) ? Math.max(0, Math.floor(Number(raw.listenSeconds))) : 0,
      playlists: playlists,
    };
  }

  function saveRoleMusicCacheStore() {
    try {
      persistJsonState(ROLE_MUSIC_CACHE_KEY, roleMusicCache || {});
    } catch (e) {}
  }

  function getRoleMusicCacheEntry(roleId, allowExpired) {
    var id = trimString(roleId);
    if (!id) return null;
    var raw = roleMusicCache && roleMusicCache[id] ? roleMusicCache[id] : null;
    if (!raw) return null;
    return normalizeRoleMusicEntry(id, raw);
  }

  function setRoleMusicCacheEntry(roleId, entry) {
    var id = trimString(roleId);
    if (!id) return;
    roleMusicCache[id] = normalizeRoleMusicEntry(id, entry);
    saveRoleMusicCacheStore();
  }

  function getRoleWorldbookText(roleMeta) {
    var meta = roleMeta && typeof roleMeta === "object" ? roleMeta : getRoleProfileMeta(roleMeta);
    var books = getWorldBooksMap();
    var parts = [];
    (meta.worldbookIds || []).forEach(function (bookId) {
      var book = books && books[bookId] && typeof books[bookId] === "object" ? books[bookId] : null;
      if (!book) return;
      var title = trimString(book.title || book.name || book.label);
      var content = trimString(book.content || book.text || book.desc || book.description);
      var piece = [title, content].filter(Boolean).join("：");
      if (piece) parts.push(piece);
    });
    return parts.join("\n").slice(0, 1200);
  }

  function buildFallbackRoleMusicPlan(roleMeta, worldbookText) {
    var meta = roleMeta && typeof roleMeta === "object" ? roleMeta : getRoleProfileMeta(roleMeta);
    var text = (meta.desc + "\n" + String(worldbookText || "")).toLowerCase();
    var playlists = [
      { id: "role_a", title: "TA 的单曲循环", subtitle: "适合这个角色气质的一组歌", query: "华语 流行 经典", fallbackQuery: "夜晚 华语 流行" },
      { id: "role_b", title: "深夜情绪收藏", subtitle: "更偏私人、安静和耐听", query: "安静 华语 女声", fallbackQuery: "民谣 华语 治愈" },
    ];

    if (/古风|仙|江湖|修仙|国风|宫廷/.test(text)) {
      playlists = [
        { id: "role_a", title: "云中旧梦", subtitle: "偏古风和故事感", query: "古风 国风 华语", fallbackQuery: "影视 原声 国风" },
        { id: "role_b", title: "月下长风", subtitle: "更像 TA 夜里会放的歌", query: "国风 抒情 华语", fallbackQuery: "仙侠 原声 华语" },
      ];
    } else if (/摇滚|热血|机车|燃|乐队/.test(text)) {
      playlists = [
        { id: "role_a", title: "心跳过载", subtitle: "更燃一点的日常播放", query: "华语 摇滚 热门", fallbackQuery: "乐队 华语 摇滚" },
        { id: "role_b", title: "失控之前", subtitle: "情绪上头时会点开的歌", query: "流行 摇滚 华语", fallbackQuery: "热血 华语 男声" },
      ];
    } else if (/温柔|治愈|安静|月亮|夜|冷|疏离/.test(text)) {
      playlists = [
        { id: "role_a", title: "夜里不说话", subtitle: "安静但有心事", query: "夜晚 华语 流行", fallbackQuery: "安静 华语 女声" },
        { id: "role_b", title: "风经过的时候", subtitle: "更轻一点的陪伴感", query: "民谣 华语 治愈", fallbackQuery: "清新 华语 流行" },
      ];
    }

    return {
      summary: meta.sign,
      playlists: playlists,
    };
  }

  function extractJsonObjectText(text) {
    var raw = trimString(text);
    if (!raw) return "";
    if (raw.indexOf("```") >= 0) {
      raw = raw.replace(/```[a-z0-9_-]*\n?/gi, "").replace(/```/g, "").trim();
    }
    if (raw.charAt(0) === "{") return raw;
    var start = raw.indexOf("{");
    var end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) return raw.slice(start, end + 1);
    return raw;
  }

  async function requestRoleMusicPlan(roleMeta, worldbookText) {
    var host = window.parent && window.parent !== window ? window.parent : window;
    var getSettings = host && typeof host.getEffectiveApiSettings === "function" ? host.getEffectiveApiSettings : null;
    var meta = roleMeta && typeof roleMeta === "object" ? roleMeta : getRoleProfileMeta(roleMeta);
    if (!getSettings || !meta.id) throw new Error("api_unavailable");
    var apiSettings = getSettings(meta.id) || {};
    var baseUrl = trimString(apiSettings.baseUrl);
    var apiKey = trimString(apiSettings.apiKey);
    if (!baseUrl || !apiKey) throw new Error("api_unconfigured");
    if (baseUrl.charAt(baseUrl.length - 1) === "/") baseUrl = baseUrl.slice(0, -1);
    if (baseUrl.indexOf("/chat/completions") < 0) {
      if (baseUrl.indexOf("/v1") < 0) baseUrl += "/v1";
      baseUrl += "/chat/completions";
    }

    var system =
      "你是一个中文音乐策展助手。你的任务不是虚构歌曲，而是为一个角色生成两个适合用于真实音乐搜索的歌单主题。" +
      "只输出 JSON，不要 Markdown，不要解释。" +
      'JSON 结构必须是 {"summary":"", "playlists":[{"title":"","subtitle":"","query":"","fallbackQuery":""},{"title":"","subtitle":"","query":"","fallbackQuery":""}] }。' +
      "query 和 fallbackQuery 必须是简短中文搜索关键词，适合直接在网易云/聚合搜索里搜到真实歌曲，不要编造歌名。";
    var user =
      "角色名称：" +
      meta.name +
      "\n角色人设：" +
      (meta.desc || "未提供") +
      "\n世界书：" +
      (trimString(worldbookText) || "未提供") +
      "\n请输出 2 个歌单主题，每个主题更像这个角色平时会听的歌。";
    var resp = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: trimString(apiSettings.model || "deepseek-chat") || "deepseek-chat",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.45,
        max_tokens: 600,
        stream: false,
      }),
    });
    if (!resp.ok) throw new Error("role_music_api_" + resp.status);
    var data = await resp.json();
    var raw = data && data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : "";
    var obj = safeJsonParse(extractJsonObjectText(raw));
    if (!obj || typeof obj !== "object") throw new Error("role_music_parse_failed");
    var fallback = buildFallbackRoleMusicPlan(meta, worldbookText);
    var playlists = Array.isArray(obj.playlists) ? obj.playlists : fallback.playlists;
    return {
      summary: trimString(obj.summary || fallback.summary),
      playlists: playlists.slice(0, 2).map(function (item, index) {
        var rawItem = item && typeof item === "object" ? item : {};
        var fallbackItem = fallback.playlists[index] || fallback.playlists[0];
        return {
          id: "role_ai_" + index,
          title: trimString(rawItem.title || fallbackItem.title) || fallbackItem.title,
          subtitle: trimString(rawItem.subtitle || fallbackItem.subtitle) || fallbackItem.subtitle,
          query: trimString(rawItem.query || fallbackItem.query) || fallbackItem.query,
          fallbackQuery: trimString(rawItem.fallbackQuery || fallbackItem.fallbackQuery) || fallbackItem.fallbackQuery,
        };
      }),
    };
  }

  async function buildRolePlaylistSongs(query, fallbackQuery) {
    var primaryQuery = trimString(query);
    var backupQuery = trimString(fallbackQuery);
    if (!primaryQuery && !backupQuery) return [];

    var queryCandidates = [];
    function pushQuery(value) {
      var text = trimString(value);
      if (!text || queryCandidates.indexOf(text) >= 0) return;
      queryCandidates.push(text);
    }

    pushQuery(primaryQuery);
    pushQuery(backupQuery);
    if (primaryQuery && primaryQuery.indexOf("华语") < 0) pushQuery(primaryQuery + " 华语");
    if (primaryQuery && primaryQuery.indexOf("流行") < 0) pushQuery(primaryQuery + " 流行");
    if (backupQuery && backupQuery.indexOf("华语") < 0) pushQuery(backupQuery + " 华语");
    if (backupQuery && backupQuery.indexOf("流行") < 0) pushQuery(backupQuery + " 流行");

    var songs = [];
    for (var i = 0; i < queryCandidates.length; i += 1) {
      var extra = await searchProviderGroup(queryCandidates[i], "wy", { skipLiumingye: true }).catch(function () {
        return [];
      });
      songs = uniqueSongs((songs || []).concat(extra || []));
      if (songs.length >= 10) break;
    }

    if (songs.length < 8) {
      for (var j = 0; j < queryCandidates.length; j += 1) {
        var backupSongs = await searchProviderGroup(queryCandidates[j], "tx", { skipLiumingye: true }).catch(function () {
          return [];
        });
        songs = uniqueSongs((songs || []).concat(backupSongs || []));
        if (songs.length >= 10) break;
      }
    }

    return (songs || [])
      .slice(0, 10)
      .map(function (song) {
        return normalizePlaylistSong(song);
      })
      .filter(Boolean);
  }

  function buildRoleProfileStats(roleMeta, playlistCount, songCount) {
    var meta = roleMeta && typeof roleMeta === "object" ? roleMeta : getRoleProfileMeta(roleMeta);
    var seed = hashString(meta.id + "::" + meta.name + "::" + songCount);
    var chatCount = getChatCountForRole(meta.id);
    var fans = 80 + (seed % 3200) + chatCount * 3;
    var level = 3 + (seed % 8);
    var baseHours = 120 + playlistCount * 48 + songCount * 6 + (seed % 260);
    return {
      fans: fans,
      level: level,
      listenSeconds: baseHours * 3600,
    };
  }

  function getActiveRoleMusicEntry() {
    var roleId = getActiveRoleProfileId();
    if (!roleId) return null;
    return getRoleMusicCacheEntry(roleId, true);
  }

  function hasRoleMusicCache(roleId) {
    var entry = getRoleMusicCacheEntry(roleId, true);
    return !!(entry && entry.playlists && entry.playlists.length);
  }

  function enqueueRoleMusicPrefetch(roleId, front) {
    var id = trimString(roleId);
    if (!id) return;
    if (hasRoleMusicCache(id)) return;
    if (roleMusicRequestMap[id]) return;
    var existingIndex = roleMusicPrefetchQueue.indexOf(id);
    if (existingIndex >= 0) {
      if (front && existingIndex > 0) {
        roleMusicPrefetchQueue.splice(existingIndex, 1);
        roleMusicPrefetchQueue.unshift(id);
      }
      return;
    }
    if (front) roleMusicPrefetchQueue.unshift(id);
    else roleMusicPrefetchQueue.push(id);
  }

  function scheduleRoleMusicPrefetch(delayMs) {
    if (roleMusicPrefetchTimer || roleMusicPrefetchActive || state.importBusy) return;
    var delay = Number(delayMs || 0);
    if (!isFinite(delay) || delay < 0) delay = 0;
    roleMusicPrefetchTimer = window.setTimeout(function () {
      roleMusicPrefetchTimer = 0;
      runNextRoleMusicPrefetch();
    }, delay);
  }

  function runNextRoleMusicPrefetch() {
    if (roleMusicPrefetchActive || state.importBusy) return;
    while (roleMusicPrefetchQueue.length) {
      var nextId = trimString(roleMusicPrefetchQueue.shift());
      if (!nextId) continue;
      if (hasRoleMusicCache(nextId)) continue;
      roleMusicPrefetchActive = nextId;
      ensureRoleMusicProfileData(nextId)
        .catch(function () {})
        .finally(function () {
          roleMusicPrefetchActive = "";
          if (roleMusicPrefetchQueue.length) scheduleRoleMusicPrefetch(900);
        });
      return;
    }
  }

  function primeRoleMusicPrefetch(roleIds, front) {
    (Array.isArray(roleIds) ? roleIds : []).forEach(function (roleId) {
      enqueueRoleMusicPrefetch(roleId, !!front);
    });
    if (roleMusicPrefetchQueue.length) scheduleRoleMusicPrefetch(front ? 80 : 400);
  }

  function renderActiveRolePageIfVisible(roleId) {
    var id = trimString(roleId);
    if (!id || getActiveRoleProfileId() !== id) return;
    if (characterPage && !characterPage.hidden) {
      renderCharacterView();
      return;
    }
    if (profilePage && !profilePage.hidden) {
      renderProfileView();
    }
  }

  async function ensureRoleMusicProfileData(roleId, forceRefresh) {
    var id = trimString(roleId);
    if (!id) return null;
    var cached = !forceRefresh ? getRoleMusicCacheEntry(id, false) : null;
    if (cached) return cached;
    var isVisibleRole = getActiveRoleProfileId() === id;
    if (roleMusicRequestMap[id]) {
      if (isVisibleRole) {
        state.roleProfileLoading = true;
        renderActiveRolePageIfVisible(id);
      }
      return roleMusicRequestMap[id];
    }

    var token = isVisibleRole ? ++state.roleProfileRequestToken : state.roleProfileRequestToken;
    if (isVisibleRole) {
      state.roleProfileLoading = true;
      renderActiveRolePageIfVisible(id);
    }

    roleMusicRequestMap[id] = (async function () {
      var meta = getRoleProfileMeta(id);
      var worldbookText = getRoleWorldbookText(meta);
      var plan = null;
      try {
        plan = await requestRoleMusicPlan(meta, worldbookText);
      } catch (e) {
        plan = buildFallbackRoleMusicPlan(meta, worldbookText);
      }

      var playlists = [];
      for (var i = 0; i < (plan.playlists || []).length; i += 1) {
        var item = plan.playlists[i];
        var songs = await buildRolePlaylistSongs(item.query, item.fallbackQuery);
        if (!songs.length) continue;
        playlists.push({
          id: trimString(item.id || "role_playlist_" + i) || "role_playlist_" + i,
          title: trimString(item.title || "TA 的歌单"),
          subtitle: trimString(item.subtitle || "最近在听"),
          query: trimString(item.query || ""),
          fallbackQuery: trimString(item.fallbackQuery || ""),
          playCount: 0,
          songs: songs,
        });
      }

      if (!playlists.length) {
        var fallbackPlan = buildFallbackRoleMusicPlan(meta, worldbookText);
        for (var j = 0; j < fallbackPlan.playlists.length; j += 1) {
          var fallbackItem = fallbackPlan.playlists[j];
          var fallbackSongs = await buildRolePlaylistSongs(fallbackItem.query, fallbackItem.fallbackQuery);
          if (!fallbackSongs.length) continue;
          playlists.push({
            id: trimString(fallbackItem.id || "role_playlist_fallback_" + j) || "role_playlist_fallback_" + j,
            title: fallbackItem.title,
            subtitle: fallbackItem.subtitle,
            query: fallbackItem.query,
            fallbackQuery: fallbackItem.fallbackQuery,
            playCount: 0,
            songs: fallbackSongs,
          });
        }
      }

      var totalSongs = playlists.reduce(function (sum, playlist) {
        return sum + ((playlist.songs && playlist.songs.length) || 0);
      }, 0);
      var stats = buildRoleProfileStats(meta, playlists.length, totalSongs);
      var entry = normalizeRoleMusicEntry(id, {
        roleId: id,
        updatedAt: Date.now(),
        summary: trimString(plan.summary || meta.sign),
        playlists: playlists,
        fans: stats.fans,
        level: stats.level,
        listenSeconds: stats.listenSeconds,
      });
      setRoleMusicCacheEntry(id, entry);
      return entry;
    })();

    try {
      return await roleMusicRequestMap[id];
    } finally {
      delete roleMusicRequestMap[id];
      if (isVisibleRole && token === state.roleProfileRequestToken && getActiveRoleProfileId() === id) {
        state.roleProfileLoading = false;
        renderActiveRolePageIfVisible(id);
      }
    }
  }

  function loadLibrary() {
    try {
      var raw = window.localStorage ? localStorage.getItem(STORAGE_KEY) : "";
      if (!raw) return [];
      var data = safeJsonParse(raw);
      if (!Array.isArray(data)) return [];
      return data
        .map(function (x) {
          if (!x || typeof x !== "object") return null;
          var title = x.title ? String(x.title) : "";
          var id = x.id ? String(x.id) : "";
          var url = x.url ? String(x.url) : "";
          var importUrl = x.importUrl ? String(x.importUrl) : x.imported && x.url ? String(x.url) : "";
          if (!title) return null;
          if (!id && !url && !importUrl) return null;
          return {
            id: id,
            title: title,
            artist: x.artist ? String(x.artist) : "未知歌手",
            cover: shouldKeepInlineCoverInLibrary(x, x.cover) && x.cover ? String(x.cover) : "",
            url: url,
            importUrl: importUrl,
            source: x.source || x.sourceType ? String(x.source || x.sourceType) : "",
            sourceType: x.sourceType || x.source ? String(x.sourceType || x.source) : "",
            lyric: x.lyric || x.lrc ? String(x.lyric || x.lrc) : "",
            lyricUrl: x.lyricUrl ? String(x.lyricUrl) : "",
            imported: !!x.imported,
            pendingMatch: !!x.pendingMatch,
            localFileName: x.localFileName ? String(x.localFileName) : "",
            playbackIssue: x.playbackIssue ? String(x.playbackIssue) : "",
            localOnly: !!x.localOnly,
            disabled: !!x.disabled,
          };
        })
        .filter(function (x) {
          return !!x;
        });
    } catch (e) {
      return [];
    }
  }

  function saveLibrary() {
    try {
      if (!window.localStorage) return;
      var payload = (state.library || [])
        .filter(function (s) {
          if (!s) return false;
          var u = s.url || s.src ? String(s.url || s.src) : "";
          if (!isLocalTrackSong(s) && (/^blob:/i.test(u) || /^data:audio/i.test(u))) return false;
          return true;
        })
        .map(function (s) {
          var stored = sanitizeTrackForStorage(s);
          if (!stored) return null;
          return {
            id: stored.id ? String(stored.id) : "",
            title: stored.title ? String(stored.title) : "",
            artist: stored.artist ? String(stored.artist) : "",
            cover: stored.cover ? String(stored.cover) : "",
            url: stored.url ? String(stored.url) : "",
            importUrl: stored.importUrl ? String(stored.importUrl) : "",
            source: stored.source || stored.sourceType ? String(stored.source || stored.sourceType) : "",
            sourceType: stored.sourceType || stored.source ? String(stored.sourceType || stored.source) : "",
            lyric: stored.lyric || stored.lrc ? String(stored.lyric || stored.lrc) : "",
            lyricUrl: stored.lyricUrl ? String(stored.lyricUrl) : "",
            imported: !!stored.imported,
            pendingMatch: !!stored.pendingMatch,
            localFileName: stored.localFileName ? String(stored.localFileName) : "",
            playbackIssue: stored.playbackIssue ? String(stored.playbackIssue) : "",
            disabled: !!stored.disabled,
            localOnly: !!stored.localOnly,
          };
        })
        .filter(Boolean);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {}
  }

  function isLocalTrackSong(song) {
    if (!song || typeof song !== "object") return false;
    return !!(
      song.localOnly ||
      String(song.sourceType || song.source || "").toLowerCase() === "local" ||
      /^local:/i.test(String(song.id || ""))
    );
  }

  function localTrackAssetKey(songOrId) {
    var id = songOrId && typeof songOrId === "object" ? String(songOrId.id || "") : String(songOrId || "");
    id = id.trim();
    if (!id) return "";
    return LOCAL_TRACK_ASSET_KEY_PREFIX + encodeURIComponent(id);
  }

  function setLocalTrackPlayableUrl(song, url) {
    if (!song || typeof song !== "object") return song;
    var next = String(url || "").trim();
    song.importUrl = next;
    if (!next && song.url && /^blob:/i.test(String(song.url || ""))) song.url = "";
    return song;
  }

  function getCachedLocalTrackObjectUrl(songOrId) {
    var id = songOrId && typeof songOrId === "object" ? String(songOrId.id || "") : String(songOrId || "");
    id = id.trim();
    if (!id) return "";
    return String(localTrackObjectUrlCache[id] || "");
  }

  function cacheLocalTrackObjectUrl(songOrId, blob) {
    var id = songOrId && typeof songOrId === "object" ? String(songOrId.id || "") : String(songOrId || "");
    id = id.trim();
    if (!id || !blob) return "";
    if (localTrackObjectUrlCache[id]) return String(localTrackObjectUrlCache[id] || "");
    try {
      localTrackObjectUrlCache[id] = URL.createObjectURL(blob);
      return String(localTrackObjectUrlCache[id] || "");
    } catch (e) {
      return "";
    }
  }

  function persistLocalTrackAsset(songOrId, blob) {
    var key = localTrackAssetKey(songOrId);
    var storage = getSharedLocalforage();
    if (!key || !blob || !storage || typeof storage.setItem !== "function") return Promise.resolve(false);
    return Promise.resolve(storage.setItem(key, blob))
      .then(function () {
        return true;
      })
      .catch(function () {
        return false;
      });
  }

  function readLocalTrackAsset(songOrId) {
    var key = localTrackAssetKey(songOrId);
    var storage = getSharedLocalforage();
    if (!key || !storage || typeof storage.getItem !== "function") return Promise.resolve(null);
    return Promise.resolve(storage.getItem(key)).catch(function () {
      return null;
    });
  }

  function sanitizeTrackForStorage(song) {
    var normalized = normalizePlaylistSong(song);
    if (!normalized) return null;
    if (isLocalTrackSong(normalized)) {
      normalized.url = "";
      normalized.importUrl = "";
    } else {
      normalized.url = normalized.url ? cleanPlayableUrl(String(normalized.url)) : "";
      normalized.importUrl = normalized.importUrl ? cleanPlayableUrl(String(normalized.importUrl)) : "";
    }
    return normalized;
  }

  function hydrateLocalTrackUrlsForSongList(list) {
    var songs = Array.isArray(list)
      ? list.filter(function (song) {
          return isLocalTrackSong(song);
        })
      : [];
    if (!songs.length) return Promise.resolve(false);
    return Promise.all(
      songs.map(function (song) {
        var cached = getCachedLocalTrackObjectUrl(song);
        if (cached) {
          setLocalTrackPlayableUrl(song, cached);
          return false;
        }
        return readLocalTrackAsset(song).then(function (blob) {
          if (!blob) return false;
          var objectUrl = cacheLocalTrackObjectUrl(song, blob);
          if (!objectUrl) return false;
          setLocalTrackPlayableUrl(song, objectUrl);
          return true;
        });
      })
    ).then(function (result) {
      return (result || []).some(function (item) {
        return !!item;
      });
    });
  }

  function hydratePersistedLocalTracks() {
    var targets = [state.library];
    myPlaylists.forEach(function (playlist) {
      if (playlist && Array.isArray(playlist.songs)) targets.push(playlist.songs);
    });
    return Promise.all(targets.map(hydrateLocalTrackUrlsForSongList)).then(function (changes) {
      var changed = (changes || []).some(function (item) {
        return !!item;
      });
      if (!changed) return false;
      rebuildQueue();
      renderHomePlaylist();
      renderAddToPlaylistSheet();
      if (profilePage && !profilePage.hidden) renderProfileView();
      if (characterPage && !characterPage.hidden) renderCharacterView();
      return true;
    });
  }

  function getActiveLibrary() {
    return (state.library || [])
      .filter(function (s) {
        if (!s) return false;
        if (s.url || s.src) return true;
        return !!s.id;
      });
  }

  function syncLibraryQueue() {
    if (state.queueMode !== "library") return;
    var current = state.queue && state.queue.length ? state.queue[state.currentIndex] : null;
    state.queue = getActiveLibrary().slice();
    var idx = findSongIndexInList(state.queue, current);
    if (idx >= 0) state.currentIndex = idx;
    else if (state.currentIndex >= state.queue.length) state.currentIndex = state.queue.length ? state.queue.length - 1 : 0;
    else if (state.currentIndex < 0) state.currentIndex = 0;
  }

  function rebuildQueue() {
    syncLibraryQueue();
  }

  function songIdentityKey(song) {
    if (!song) return "";
    var title = normalizeTitleForMatch(song.title || "");
    if (!title) return "";
    var artist = normalizeMatchText(song.artist || "");
    return title + "::" + artist;
  }

  function findSongIndexInList(list, song) {
    if (!song || !list || !list.length) return -1;
    var key = trackKey(song);
    var identity = songIdentityKey(song);
    for (var i = 0; i < list.length; i += 1) {
      var item = list[i];
      if (!item) continue;
      if (key && trackKey(item) === key) return i;
      if (identity && songIdentityKey(item) === identity) return i;
    }
    return -1;
  }

  function findSongIndexInQueue(song) {
    return findSongIndexInList(state.queue, song);
  }

  function mergeTrackInfo(baseSong, externalTrack) {
    var base = baseSong && typeof baseSong === "object" ? baseSong : {};
    var ext = externalTrack && typeof externalTrack === "object" ? externalTrack : {};
    return {
      id: base.id || (ext.id ? String(ext.id) : ""),
      title: base.title || ext.title || "",
      artist: base.artist || ext.artist || "",
      cover: base.cover || ext.cover || "",
      url: ext.url || base.url || base.src || "",
      source: base.source || base.sourceType || ext.source || ext.sourceType || "",
      sourceType: base.sourceType || base.source || ext.sourceType || ext.source || "",
      lyric: base.lyric || base.lrc || "",
      lyricUrl: base.lyricUrl || "",
      importUrl: base.importUrl || "",
      localOnly: !!base.localOnly,
      key: trackKey(base) || trackKey(ext),
    };
  }

  function syncCurrentSongFromExternalTrack(song) {
    if (!song) return null;
    if (!state.queue || !state.queue.length) rebuildQueue();
    var idx = findSongIndexInQueue(song);
    if (idx < 0) {
      var libIndex = findLibrarySongIndex(song);
      if (libIndex >= 0 && state.library && state.library[libIndex]) {
        idx = findSongIndexInQueue(state.library[libIndex]);
        if (idx < 0 && state.queueMode === "library") {
          rebuildQueuePreservingCurrent(state.library[libIndex]);
          idx = findSongIndexInQueue(state.library[libIndex]);
        }
      }
    }
    if (idx >= 0) {
      state.currentIndex = idx;
      return state.queue[idx];
    }
    return null;
  }

  function rebuildQueuePreservingCurrent(currentSong) {
    var current = currentSong || (state.queue && state.queue.length ? state.queue[state.currentIndex] : null);
    rebuildQueue();
    var idx = findSongIndexInQueue(current);
    if (idx >= 0) state.currentIndex = idx;
    else if (state.currentIndex >= state.queue.length) state.currentIndex = state.queue.length ? state.queue.length - 1 : 0;
    updateFavButton();
    renderQueue();
  }

  function ensureLatestServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    var key = "__music_sw_reloaded__";
    navigator.serviceWorker
      .getRegistrations()
      .then(function (regs) {
        if (!regs || !regs.length) return null;
        return Promise.all(
          regs.map(function (reg) {
            if (!reg) return null;
            return reg
              .update()
              .catch(function () {})
              .then(function () {
                return reg;
              });
          })
        );
      })
      .then(function (regs) {
        if (!regs || !regs.length) return;
        regs.forEach(function (reg) {
          if (!reg) return;
          if (reg.waiting) {
            try {
              reg.waiting.postMessage({ type: "SKIP_WAITING" });
            } catch (e) {}
          }
        });
      })
      .catch(function () {});

    navigator.serviceWorker.addEventListener("controllerchange", function () {
      try {
        if (window.sessionStorage && sessionStorage.getItem(key) === "1") return;
        if (window.sessionStorage) sessionStorage.setItem(key, "1");
      } catch (e) {}
    });
  }

  function renderHomePlaylist() {
    if (!homePlaylist) return;
    var list = getActiveLibrary();
    homePlaylist.innerHTML = "";

    if (!list.length) {
      var empty = document.createElement("div");
      empty.className = "home-empty";
      empty.textContent = "暂无歌曲";
      homePlaylist.appendChild(empty);
      return;
    }

    list.forEach(function (song, index) {
      var btn = document.createElement("button");
      btn.className = "playlist-item";
      btn.type = "button";
      btn.dataset.index = String(index);
      var key = trackKey(song);
      if (key) btn.dataset.key = key;
      if (state.homeSelectedKeys && key && state.homeSelectedKeys.has(key)) btn.classList.add("is-selected");

      var cover = document.createElement("div");
      cover.className = "playlist-cover";
      var coverUrl = song && song.cover ? String(song.cover) : "";
      if (coverUrl) {
        var img = document.createElement("img");
        img.alt = "";
        img.loading = "lazy";
        setImageSource(img, coverUrl);
        cover.appendChild(img);
      } else {
        if (index % 3 === 1) cover.classList.add("alt");
        if (index % 3 === 2) cover.classList.add("alt2");
      }

      var meta = document.createElement("div");
      meta.className = "playlist-meta";
      var name = document.createElement("div");
      name.className = "playlist-name";
      name.textContent = (song && song.title) || "未知歌曲";
      var desc = document.createElement("div");
      desc.className = "playlist-desc";
      desc.textContent = (song && song.artist) || "未知歌手";
      meta.appendChild(name);
      meta.appendChild(desc);
      if (song && song.playbackIssue) {
        btn.classList.add("has-issue");
        var issue = document.createElement("div");
        issue.className = "playlist-issue";
        issue.textContent = String(song.playbackIssue);
        meta.appendChild(issue);
      }

      var sel = document.createElement("div");
      sel.className = "playlist-select";
      var selIcon = document.createElement("i");
      selIcon.className = "bx bx-check";
      sel.appendChild(selIcon);

      btn.appendChild(cover);
      btn.appendChild(meta);
      btn.appendChild(sel);
      homePlaylist.appendChild(btn);
    });
  }

  function updateHomeSelectUi() {
    if (homeHeader) homeHeader.classList.toggle("is-selecting", !!state.homeSelecting);
    if (homePlaylist) homePlaylist.classList.toggle("is-selecting", !!state.homeSelecting);
    if (homeAddPlaylistBtn) {
      homeAddPlaylistBtn.disabled = !(
        state.homeSelecting &&
        state.homeSelectedKeys &&
        state.homeSelectedKeys.size
      );
    }
    if (homeSelectAll) {
      if (!state.homeSelecting) {
        homeSelectAll.textContent = "全选";
      } else {
        var list = getActiveLibrary();
        var keys = list
          .map(function (s) {
            return trackKey(s);
          })
          .filter(function (k) {
            return !!k;
          });
        var allSelected =
          !!(keys.length && state.homeSelectedKeys && keys.every(function (k) {
            return state.homeSelectedKeys.has(k);
          }));
        homeSelectAll.textContent = allSelected ? "取消全选" : "全选";
      }
    }
  }

  function exitHomeSelectMode() {
    state.homeSelecting = false;
    if (state.homeSelectedKeys) state.homeSelectedKeys.clear();
    updateHomeSelectUi();
    renderHomePlaylist();
  }

  function enterHomeSelectMode() {
    state.homeSelecting = true;
    updateHomeSelectUi();
  }

  function toggleHomeSelectedByKey(key) {
    if (!key) return;
    if (!state.homeSelectedKeys) state.homeSelectedKeys = new Set();
    if (!state.homeSelecting) enterHomeSelectMode();
    if (state.homeSelectedKeys.has(key)) state.homeSelectedKeys.delete(key);
    else state.homeSelectedKeys.add(key);
    if (!state.homeSelectedKeys.size) {
      exitHomeSelectMode();
      return;
    }
    renderHomePlaylist();
    updateHomeSelectUi();
  }

  function selectHomeSongByKey(key) {
    if (!key) return;
    if (!state.homeSelectedKeys) state.homeSelectedKeys = new Set();
    if (!state.homeSelecting) enterHomeSelectMode();
    state.homeSelectedKeys.add(key);
    renderHomePlaylist();
    updateHomeSelectUi();
  }

  function toggleHomeSelectAll() {
    var list = getActiveLibrary();
    if (!list.length) return;
    if (!state.homeSelectedKeys) state.homeSelectedKeys = new Set();
    var keys = list
      .map(function (s) {
        return trackKey(s);
      })
      .filter(function (k) {
        return !!k;
      });
    if (!keys.length) return;
    var allSelected = keys.every(function (k) {
      return state.homeSelectedKeys.has(k);
    });
    if (allSelected) {
      exitHomeSelectMode();
      return;
    }
    enterHomeSelectMode();
    state.homeSelectedKeys.clear();
    keys.forEach(function (k) {
      state.homeSelectedKeys.add(k);
    });
    renderHomePlaylist();
    updateHomeSelectUi();
  }

  function getHomeSelectedSongs() {
    if (!state.homeSelectedKeys || !state.homeSelectedKeys.size) return [];
    return getActiveLibrary().filter(function (song) {
      var key = trackKey(song);
      return !!(key && state.homeSelectedKeys.has(key));
    });
  }

  function removeLibrarySongsByKeys(keys) {
    if (!keys || !keys.size) return 0;
    var before = (state.library || []).length;
    state.library = (state.library || []).filter(function (s) {
      var k = trackKey(s);
      return !k || !keys.has(k);
    });
    var removed = before - state.library.length;
    if (removed < 0) removed = 0;

    var favMap = loadFavs();
    Object.keys(favMap || {}).forEach(function (k) {
      if (keys.has(String(k))) delete favMap[k];
    });
    saveFavs(favMap);

    saveLibrary();
    rebuildQueue();
    return removed;
  }

  function deleteHomeSelectedSongs() {
    if (!state.homeSelectedKeys || !state.homeSelectedKeys.size) return;
    var keys = new Set(Array.from(state.homeSelectedKeys));
    var current = state.queue[state.currentIndex];
    var currentKey = trackKey(current);
    var removed = removeLibrarySongsByKeys(keys);
    if (removed) {
      if (currentKey && keys.has(currentKey)) {
        try {
          if (audioEl) audioEl.pause();
        } catch (e) {}
        state.isPlaying = false;
        setPlayIcon(false);
      }
      showToast("已删除 " + removed + " 首歌曲");
    }
    exitHomeSelectMode();
    if (profilePage && !profilePage.hidden) renderProfileView();
  }

  var PROFILE_GALLERY_PLACEHOLDERS = [
    "../assets/images/beijing.jpg",
    "../assets/images/touxiang.jpg",
    "../assets/images/chatphoto.jpg",
    "../assets/images/beijing.jpg",
  ];

  var profileGallerySlot = -1;

  function renderProfileFavList(list) {
    var root = qs("#profileFavList");
    if (!root) return;
    root.innerHTML = "";
    if (!list || !list.length) {
      var empty = document.createElement("div");
      empty.className = "profile-empty";
      empty.textContent = "暂无收藏";
      root.appendChild(empty);
      return;
    }

    list.forEach(function (song, idx) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "profile-fav-item";
      btn.dataset.index = String(idx);

      var cover = document.createElement("div");
      cover.className = "profile-fav-cover";
      var img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      setImageSource(img, (song && song.cover) || "", BLANK_COVER);
      cover.appendChild(img);

      var meta = document.createElement("div");
      meta.className = "profile-fav-meta";
      var title = document.createElement("div");
      title.className = "profile-fav-title";
      title.textContent = (song && song.title) || "未知歌曲";
      var artist = document.createElement("div");
      artist.className = "profile-fav-artist";
      artist.textContent = (song && song.artist) || "未知歌手";
      meta.appendChild(title);
      meta.appendChild(artist);

      btn.appendChild(cover);
      btn.appendChild(meta);

      btn.addEventListener("click", function () {
        state.queueMode = "profile_favs";
        state.queue = list.slice();
        state.currentIndex = idx;
        playSong(song);
      });

      root.appendChild(btn);
    });
  }

  function getFavoriteSongs() {
    var favMap = loadFavs();
    return (state.library || []).filter(function (song) {
      var key = trackKey(song);
      return !!(key && favMap && favMap[String(key)]);
    });
  }

  function buildProfilePlaylistCard(options) {
    var opts = options && typeof options === "object" ? options : {};
    var card = document.createElement("div");
    card.className = "glass-playlist-card";
    card.setAttribute("role", "button");
    card.tabIndex = 0;
    if (opts.kind) card.dataset.playlistKind = String(opts.kind);
    if (opts.id) card.dataset.playlistId = String(opts.id);

    var cover = document.createElement("img");
    cover.className = "playlist-cover";
    cover.alt = "cover";
    setImageSource(cover, opts.cover || "", BLANK_COVER);

    var info = document.createElement("div");
    info.className = "playlist-info";

    var title = document.createElement("div");
    title.className = "playlist-title";
    title.textContent = opts.title || "未命名歌单";

    var desc = document.createElement("div");
    desc.className = "playlist-desc";
    desc.textContent = opts.desc || "0首";

    var playBtn = document.createElement("button");
    playBtn.className = "glass-play-btn";
    playBtn.type = "button";
    playBtn.setAttribute("aria-label", "播放歌单");
    playBtn.innerHTML = '<i class="bx bx-play"></i>';

    info.appendChild(title);
    info.appendChild(desc);
    card.appendChild(cover);
    card.appendChild(info);
    card.appendChild(playBtn);
    return card;
  }

  function renderProfilePlaylists(favSongs) {
    if (!profilePlaylistContainer) return;
    if (isRoleProfileView()) {
      var roleEntry = getActiveRoleMusicEntry();
      profilePlaylistContainer.innerHTML = "";

      if (state.roleProfileLoading && (!roleEntry || !roleEntry.playlists.length)) {
        profilePlaylistContainer.appendChild(
          buildProfilePlaylistCard({
            kind: "role_loading",
            title: "正在生成角色歌单",
            desc: "按人设和世界书整理 TA 平时会听的歌",
            cover: "",
          })
        );
        return;
      }

      if (!roleEntry || !roleEntry.playlists.length) {
        profilePlaylistContainer.appendChild(
          buildProfilePlaylistCard({
            kind: "role_empty",
            title: "暂时还没有生成歌单",
            desc: "稍后再试，或者检查角色 API 设置",
            cover: "",
          })
        );
        return;
      }

      roleEntry.playlists.forEach(function (playlist, index) {
        profilePlaylistContainer.appendChild(
          buildProfilePlaylistCard({
            id: playlist.id || "role_playlist_" + index,
            kind: "role_generated",
            title: playlist.title,
            desc:
              String((playlist.songs || []).length) +
              "首 · " +
              String(playlist.subtitle || "TA 最近在听"),
            cover:
              playlist.songs && playlist.songs[0] && playlist.songs[0].cover
                ? playlist.songs[0].cover
                : "",
          })
        );
      });
      return;
    }

    var favorites = Array.isArray(favSongs) ? favSongs : getFavoriteSongs();
    profilePlaylistContainer.innerHTML = "";

    profilePlaylistContainer.appendChild(
      buildProfilePlaylistCard({
        kind: "favorites",
        title: "我喜欢的音乐",
        desc: String(favorites.length) + "首 · 收藏歌单",
        cover: favorites.length && favorites[0] && favorites[0].cover ? favorites[0].cover : "",
      })
    );

    myPlaylists.forEach(function (playlist) {
      profilePlaylistContainer.appendChild(
        buildProfilePlaylistCard({
          id: playlist.id,
          kind: "custom",
          title: playlist.name,
          desc: String((playlist.songs || []).length) + "首 · " + String(playlist.playCount || 0) + "次播放",
          cover: playlist.songs && playlist.songs[0] && playlist.songs[0].cover ? playlist.songs[0].cover : "",
        })
      );
    });
  }

  function updateAddToPlaylistSheetTitle() {
    if (!sheetTitle) return;
    var count = pendingPlaylistSongs.length;
    sheetTitle.textContent = count > 1 ? "添加 " + String(count) + " 首歌曲到歌单" : "添加到歌单";
  }

  function setAddToPlaylistModalOpen(open) {
    if (!addToPlaylistModal) return;
    addToPlaylistModal.setAttribute("aria-hidden", open ? "false" : "true");
    if (!open) {
      pendingPlaylistSongs = [];
      pendingPlaylistSource = "";
      updateAddToPlaylistSheetTitle();
    }
  }

  function getPendingPlaylistSongs(songOrSongs) {
    var list = Array.isArray(songOrSongs) ? songOrSongs : [songOrSongs];
    var seen = {};
    return list
      .map(function (song) {
        return normalizePlaylistSong(song);
      })
      .filter(function (song) {
        if (!song) return false;
        var identity = trackKey(song) || [song.title, song.artist, song.url].join("::");
        if (!identity) return false;
        if (seen[identity]) return false;
        seen[identity] = 1;
        return true;
      });
  }

  function finishAddToPlaylist(success) {
    var shouldExitHomeSelection = !!success && pendingPlaylistSource === "home-selection";
    setAddToPlaylistModalOpen(false);
    if (shouldExitHomeSelection) exitHomeSelectMode();
  }

  function formatPlaylistAddResult(targetName, addedCount, skippedCount) {
    if (!addedCount) {
      return targetName === "我喜欢的音乐"
        ? "所选歌曲已在我喜欢的音乐"
        : "所选歌曲已在 " + String(targetName);
    }
    var msg =
      addedCount > 1
        ? "已添加 " + String(addedCount) + " 首到 " + String(targetName)
        : "已添加到 " + String(targetName);
    if (skippedCount > 0) {
      msg += "，跳过 " + String(skippedCount) + " 首重复歌曲";
    }
    return msg;
  }

  function buildSheetItem(iconClass, label, countText, dataAttrs) {
    var item = document.createElement("div");
    item.className = "sheet-item";
    Object.keys(dataAttrs || {}).forEach(function (key) {
      item.dataset[key] = String(dataAttrs[key]);
    });

    var icon = document.createElement("i");
    icon.className = iconClass || "bx bx-music";

    var labelEl = document.createElement("span");
    labelEl.className = "sheet-item-label";
    labelEl.textContent = label || "未命名歌单";

    item.appendChild(icon);
    item.appendChild(labelEl);

    if (countText) {
      var count = document.createElement("span");
      count.className = "sheet-item-count";
      count.textContent = countText;
      item.appendChild(count);
    }

    return item;
  }

  function renderAddToPlaylistSheet() {
    if (!sheetPlaylistList) return;
    sheetPlaylistList.innerHTML = "";
    updateAddToPlaylistSheetTitle();
    sheetPlaylistList.appendChild(buildSheetItem("bx bx-plus", "创建新歌单", "", { action: "create" }));
    sheetPlaylistList.appendChild(buildSheetItem("bx bx-heart", "我喜欢的音乐", String(getFavoriteSongs().length) + "首", { playlistKind: "favorites" }));
    myPlaylists.forEach(function (playlist) {
      sheetPlaylistList.appendChild(
        buildSheetItem("bx bx-music", playlist.name, String((playlist.songs || []).length) + "首", {
          playlistKind: "custom",
          playlistId: playlist.id,
        })
      );
    });
  }

  function openAddToPlaylistSheet(songOrSongs, options) {
    var songs = getPendingPlaylistSongs(songOrSongs);
    if (!songs.length) {
      showToast("这些歌曲暂时无法加入歌单");
      return;
    }
    pendingPlaylistSongs = songs;
    pendingPlaylistSource = options && options.source ? String(options.source) : "";
    renderAddToPlaylistSheet();
    setAddToPlaylistModalOpen(true);
  }

  function addSongToFavoritesPlaylist(songOrSongs) {
    var songs = getPendingPlaylistSongs(songOrSongs);
    if (!songs.length) {
      showToast("添加失败");
      return;
    }
    var favMap = loadFavs();
    var addedCount = 0;
    var skippedCount = 0;
    var libraryChanged = false;
    songs.forEach(function (song) {
      var result = addSongToLibrary(song, true);
      var target = result.song || song;
      if (result.added) libraryChanged = true;
      var key = trackKey(target);
      if (!key || favMap[String(key)]) {
        skippedCount += 1;
        return;
      }
      favMap[String(key)] = 1;
      addedCount += 1;
    });
    if (!addedCount) {
      showToast(formatPlaylistAddResult("我喜欢的音乐", 0, skippedCount));
      return;
    }
    saveFavs(favMap);
    if (libraryChanged) renderHomePlaylist();
    renderProfilePlaylists();
    renderAddToPlaylistSheet();
    if (profilePage && !profilePage.hidden) renderProfileView();
    showToast(formatPlaylistAddResult("我喜欢的音乐", addedCount, skippedCount));
    finishAddToPlaylist(true);
  }

  function addSongToCustomPlaylist(playlistId, songOrSongs) {
    var songs = getPendingPlaylistSongs(songOrSongs);
    if (!songs.length) {
      showToast("添加失败");
      return;
    }
    var id = String(playlistId || "");
    var playlist = myPlaylists.find(function (item) {
      return item && String(item.id) === id;
    });
    if (!playlist) {
      showToast("歌单不存在");
      return;
    }
    var existing = {};
    (playlist.songs || []).forEach(function (item) {
      var key = trackKey(item) || [item.title, item.artist, item.url].join("::");
      if (key) existing[key] = 1;
    });
    var addedCount = 0;
    var skippedCount = 0;
    songs.forEach(function (target) {
      var key = trackKey(target) || [target.title, target.artist, target.url].join("::");
      if (!key || existing[key]) {
        skippedCount += 1;
        return;
      }
      existing[key] = 1;
      playlist.songs = (playlist.songs || []).concat([target]);
      addedCount += 1;
    });
    if (!addedCount) {
      showToast(formatPlaylistAddResult(playlist.name, 0, skippedCount));
      return;
    }
    saveMyPlaylists();
    renderProfilePlaylists();
    renderAddToPlaylistSheet();
    if (profilePage && !profilePage.hidden) renderProfileView();
    showToast(formatPlaylistAddResult(playlist.name, addedCount, skippedCount));
    finishAddToPlaylist(true);
  }

  function createNewPlaylistFromPendingSong() {
    uiPromptCompat("请输入新歌单名称", "", { title: "创建新歌单" }).then(function (name) {
      if (name === null || name === undefined) return;
      var nextName = String(name || "").trim();
      if (!nextName) return;
      var playlist = {
        id: buildPlaylistId(),
        name: nextName,
        songs: [],
        playCount: 0,
        createdAt: Date.now(),
      };
      myPlaylists = myPlaylists.concat([playlist]);
      saveMyPlaylists();
      if (pendingPlaylistSongs.length) {
        addSongToCustomPlaylist(playlist.id, pendingPlaylistSongs);
        return;
      }
      renderProfilePlaylists();
      renderAddToPlaylistSheet();
      showToast("已创建新歌单");
    });
  }

  function playSongsAsQueue(songs, mode) {
    var list = (songs || [])
      .map(function (song) {
        return normalizePlaylistSong(song) || song;
      })
      .filter(function (song) {
        return !!song;
      });
    if (!list.length) {
      showToast("歌单里还没有歌曲");
      return;
    }
    state.queueMode = mode || "custom_playlist";
    state.queue = list.slice();
    state.currentIndex = 0;
    playSong(state.queue[0]);
  }

  function playFavoritesPlaylist() {
    playSongsAsQueue(getFavoriteSongs(), "profile_favs");
  }

  function getRoleSongFeed(entry) {
    var playlists = entry && Array.isArray(entry.playlists) ? entry.playlists : [];
    var out = [];
    var seen = {};
    playlists.forEach(function (playlist, playlistIndex) {
      (playlist && Array.isArray(playlist.songs) ? playlist.songs : []).forEach(function (song, songIndex) {
        var normalized = normalizePlaylistSong(song);
        if (!normalized) return;
        var key =
          trackKey(normalized) ||
          songIdentityKey(normalized) ||
          [normalized.title, normalized.artist, normalized.id, normalized.sourceType, playlistIndex, songIndex].join("::");
        if (!key || seen[key]) return;
        seen[key] = 1;
        normalized.rolePlaylistId = playlist && playlist.id ? String(playlist.id) : "";
        normalized.rolePlaylistTitle = playlist && playlist.title ? String(playlist.title) : "";
        out.push(normalized);
      });
    });
    return out;
  }

  function getActiveRoleSongFeed() {
    return getRoleSongFeed(getActiveRoleMusicEntry());
  }

  function playSongsAsQueueAt(songs, mode, startIndex) {
    var list = (songs || [])
      .map(function (song) {
        return normalizePlaylistSong(song) || song;
      })
      .filter(function (song) {
        return !!song;
      });
    if (!list.length) {
      showToast("歌单里还没有歌曲");
      return;
    }
    var idx = Number(startIndex || 0);
    if (!isFinite(idx)) idx = 0;
    idx = Math.max(0, Math.min(list.length - 1, Math.floor(idx)));
    state.queueMode = mode || "custom_playlist";
    state.queue = list.slice();
    state.currentIndex = idx;
    playSong(state.queue[idx]);
  }

  function playActiveRoleSongAt(index) {
    var songs = getActiveRoleSongFeed();
    if (!songs.length) {
      showToast("角色歌单还在准备中");
      return;
    }
    playSongsAsQueueAt(songs, "role_profile", index);
  }

  function inviteActiveRoleToListen() {
    var roleId = getActiveRoleProfileId();
    var songs = getActiveRoleSongFeed();
    if (!roleId || !songs.length) {
      showToast("角色歌单还在准备中");
      return;
    }
    var current = getCurrentPlaybackSong();
    if (findSongIndexInList(songs, current) >= 0) {
      sendTogetherInvite(roleId);
      return;
    }
    playSongsAsQueueAt(songs, "role_profile", 0);
    window.setTimeout(function () {
      sendTogetherInvite(roleId);
    }, 260);
  }

  function refreshActiveRoleMusicProfile() {
    var roleId = getActiveRoleProfileId();
    if (!roleId) return;
    if (roleMusicRequestMap[roleId]) {
      showToast("角色歌单正在生成中");
      return;
    }
    state.roleProfileLoading = true;
    renderCharacterView();
    showToast("正在重新生成角色歌单");
    ensureRoleMusicProfileData(roleId, true)
      .then(function () {
        showToast("角色歌单已重新生成");
      })
      .catch(function () {
        showToast("重新生成失败，请稍后再试");
      });
  }

  function renderCharacterSongList(roleMeta, roleEntry) {
    if (!charSongList) return;
    var songs = getRoleSongFeed(roleEntry);
    charSongList.innerHTML = "";

    if (state.roleProfileLoading && !songs.length) {
      var loadingItem = document.createElement("li");
      loadingItem.className = "char-song-item is-placeholder";
      loadingItem.innerHTML =
        '<div class="char-song-index">...</div><div class="char-song-info"><div class="char-song-name">正在整理 ' +
        String(roleMeta && roleMeta.name ? roleMeta.name : "角色") +
        ' 的常听歌曲</div><div class="char-song-meta">按角色人设和世界书生成中</div></div>';
      charSongList.appendChild(loadingItem);
      return;
    }

    if (!songs.length) {
      var emptyItem = document.createElement("li");
      emptyItem.className = "char-song-item is-placeholder";
      emptyItem.innerHTML =
        '<div class="char-song-index">-</div><div class="char-song-info"><div class="char-song-name">暂时还没有歌曲</div><div class="char-song-meta">稍后再试，或检查角色 API 设置</div></div>';
      charSongList.appendChild(emptyItem);
      return;
    }

    songs.forEach(function (song, index) {
      var item = document.createElement("li");
      item.className = "char-song-item";
      item.dataset.index = String(index);

      var number = document.createElement("div");
      number.className = "char-song-index";
      number.textContent = String(index + 1);

      var info = document.createElement("div");
      info.className = "char-song-info";
      var name = document.createElement("div");
      name.className = "char-song-name";
      name.textContent = song && song.title ? String(song.title) : "未知歌曲";
      var meta = document.createElement("div");
      meta.className = "char-song-meta";
      var metaParts = [song && song.artist ? String(song.artist) : "未知歌手"];
      if (song && song.rolePlaylistTitle) metaParts.push(String(song.rolePlaylistTitle));
      meta.textContent = metaParts.join(" · ");
      info.appendChild(name);
      info.appendChild(meta);

      var more = document.createElement("button");
      more.className = "char-song-more";
      more.type = "button";
      more.dataset.index = String(index);
      more.setAttribute("aria-label", "添加到歌单");
      more.innerHTML = '<i class="bx bx-plus-circle"></i>';

      item.appendChild(number);
      item.appendChild(info);
      item.appendChild(more);
      charSongList.appendChild(item);
    });
  }

  function renderCharacterView() {
    if (!characterPage) return;
    var roleId = getActiveRoleProfileId();
    if (!roleId) return;
    var roleMeta = getRoleProfileMeta(roleId);
    var roleEntry = getActiveRoleMusicEntry();
    var roleStats = roleEntry || buildRoleProfileStats(roleMeta, 0, 0);
    var backgroundState = getActiveProfileCustomState();
    var backgroundImage =
      trimString(backgroundState && backgroundState.backgroundImage) || roleMeta.avatar || DEFAULT_COVER;
    var songs = getRoleSongFeed(roleEntry);

    if (charBgImg) setImageSource(charBgImg, backgroundImage);
    if (charAvatarImg) setImageSource(charAvatarImg, roleMeta.avatar || DEFAULT_COVER);
    if (charName) charName.textContent = roleMeta.name || "TA";
    if (charSign) charSign.textContent = (roleEntry && roleEntry.summary) || roleMeta.sign || "最近在听";
    if (charListenTime) charListenTime.textContent = String(Math.max(1, Math.round((roleStats.listenSeconds || 0) / 3600)));
    if (charSongCount) charSongCount.textContent = String(songs.length);
    if (charTitle) charTitle.textContent = roleMeta.name || "角色专属档案";
    if (charRefreshBtn) {
      charRefreshBtn.disabled = !!state.roleProfileLoading;
      charRefreshBtn.classList.toggle("is-loading", !!state.roleProfileLoading);
      charRefreshBtn.setAttribute("aria-label", state.roleProfileLoading ? "正在生成角色歌单" : "重新生成角色歌单");
      charRefreshBtn.title = state.roleProfileLoading ? "正在生成角色歌单" : "重新生成角色歌单";
    }
    renderCharacterSongList(roleMeta, roleEntry);

    if (!roleEntry && !state.roleProfileLoading) ensureRoleMusicProfileData(roleId);
  }

  function playRolePlaylist(playlistId) {
    var roleId = getActiveRoleProfileId();
    if (!roleId) return;
    var entry = getRoleMusicCacheEntry(roleId, true);
    if (!entry || !entry.playlists || !entry.playlists.length) {
      showToast("角色歌单还在准备中");
      return;
    }
    var playlist = entry.playlists.find(function (item) {
      return item && String(item.id || "") === String(playlistId || "");
    });
    if (!playlist) {
      showToast("歌单不存在");
      return;
    }
    if (!playlist.songs || !playlist.songs.length) {
      showToast("歌单里还没有歌曲");
      return;
    }
    playlist.playCount = Math.max(0, Math.floor(Number(playlist.playCount || 0))) + 1;
    setRoleMusicCacheEntry(roleId, entry);
    renderProfilePlaylists();
    if (characterPage && !characterPage.hidden) renderCharacterView();
    playSongsAsQueue(playlist.songs || [], "role_profile");
  }

  function playCustomPlaylist(playlistId) {
    var id = String(playlistId || "");
    var playlist = myPlaylists.find(function (item) {
      return item && String(item.id) === id;
    });
    if (!playlist) {
      showToast("歌单不存在");
      return;
    }
    if (!playlist.songs || !playlist.songs.length) {
      showToast("歌单里还没有歌曲");
      return;
    }
    playlist.playCount = Math.max(0, Math.floor(Number(playlist.playCount || 0))) + 1;
    saveMyPlaylists();
    renderProfilePlaylists();
    playSongsAsQueue(playlist.songs || [], "custom_playlist");
  }

  function renderProfileView() {
    if (!profilePage || !profileRoot) return;
    applyProfileBackground();

    if (profilePage) profilePage.classList.toggle("is-role-view", isRoleProfileView());

    if (isRoleProfileView()) {
      var roleMeta = getRoleProfileMeta(getActiveRoleProfileId());
      var roleEntry = getActiveRoleMusicEntry();
      var avatarImg2 = qs("#profileAvatarImg");
      if (avatarImg2) setImageSource(avatarImg2, roleMeta.avatar || DEFAULT_COVER);

      var nameBtn2 = qs("#profileNameBtn");
      if (nameBtn2) nameBtn2.textContent = roleMeta.name || "TA";

      var signBtn2 = qs("#profileSignBtn");
      if (signBtn2) signBtn2.textContent = (roleEntry && roleEntry.summary) || roleMeta.sign || "最近在听";

      var followNum2 = qs("#profileFollowNum");
      if (followNum2) followNum2.textContent = "1";

      var fansNum2 = qs("#profileFansNum");
      var roleStats = roleEntry || buildRoleProfileStats(roleMeta, 0, 0);
      if (fansNum2) fansNum2.textContent = String(roleStats && roleStats.fans ? roleStats.fans : 128);

      var levelNum2 = qs(".profile-stats .profile-stat:nth-child(3) .profile-stat-num", profileRoot);
      if (levelNum2) levelNum2.textContent = "Lv." + String(roleStats && roleStats.level ? roleStats.level : 6);

      var listenNum2 = qs("#profileListenNum");
      if (listenNum2) {
        listenNum2.textContent = formatListenDuration(
          roleStats && roleStats.listenSeconds ? roleStats.listenSeconds : 0
        );
      }

      if (profilePageTitle) profilePageTitle.textContent = roleMeta.name + "的主页";
      renderProfilePlaylists();
      if (!roleEntry && !state.roleProfileLoading) ensureRoleMusicProfileData(roleMeta.id);
      return;
    }

    var p = loadProfile();

    var avatarImg = qs("#profileAvatarImg");
    if (avatarImg) setImageSource(avatarImg, p.avatar || DEFAULT_COVER);

    var nameBtn = qs("#profileNameBtn");
    if (nameBtn) nameBtn.textContent = p.name || "未命名用户";

    var signBtn = qs("#profileSignBtn");
    if (signBtn) signBtn.textContent = p.sign || "点击设置个性签名";

    var followNum = qs("#profileFollowNum");
    if (followNum) followNum.textContent = String(getCharProfileCount());

    var fansNum = qs("#profileFansNum");
    if (fansNum) fansNum.textContent = String(p.fans || 0);

    var levelNum = qs(".profile-stats .profile-stat:nth-child(3) .profile-stat-num", profileRoot);
    if (levelNum) levelNum.textContent = "Lv.8";

    var listenNum = qs("#profileListenNum");
    if (listenNum) listenNum.textContent = formatListenDuration(state.listenSeconds || 0);

    var photos = qsa(".profile-photo, .glass-photo", profileRoot);
    photos.forEach(function (btn, idx) {
      var img = qs("img", btn);
      if (!img) return;
      var src = p.gallery[idx] || PROFILE_GALLERY_PLACEHOLDERS[idx] || DEFAULT_COVER;
      setImageSource(img, src);
    });

    var favSongs = getFavoriteSongs();
    renderProfileFavList(favSongs);
    if (profilePageTitle) profilePageTitle.textContent = "我的主页";
    renderProfilePlaylists(favSongs);
  }

  var profileBound = false;
  var characterBound = false;

  function readImageAsDataUrl(file, done) {
    try {
      var reader = new FileReader();
      reader.onload = function () {
        done(reader.result ? String(reader.result) : "");
      };
      reader.onerror = function () {
        done("");
      };
      reader.readAsDataURL(file);
    } catch (e) {
      done("");
    }
  }

  function setupProfileInteractions() {
    if (profileBound) return;
    if (!profileRoot) return;
    profileBound = true;

    if (profileBackBtn) {
      profileBackBtn.addEventListener("click", function () {
        if (isRoleProfileView()) {
          openSelfProfile();
          return;
        }
        setActiveTab("home");
        setActivePage("home");
      });
    }

    var avatarBtn = qs("#profileAvatarBtn");
    var avatarInput = qs("#profileAvatarInput");
    var nameBtn = qs("#profileNameBtn");
    var signBtn = qs("#profileSignBtn");
    var followStat = profileFollowStat;
    var galleryInput = qs("#profileGalleryInput");

    if (avatarBtn && avatarInput) {
      avatarBtn.addEventListener("click", function () {
        if (isRoleProfileView()) return;
        try {
          avatarInput.click();
        } catch (e) {}
      });

      avatarInput.addEventListener("change", function () {
        var file = avatarInput.files && avatarInput.files[0] ? avatarInput.files[0] : null;
        if (!file) return;
        readImageAsDataUrl(file, function (dataUrl) {
          if (!dataUrl) return;
          var p = loadProfile();
          p.avatar = dataUrl;
          saveProfile(p);
          renderProfileView();
        });
        try {
          avatarInput.value = "";
        } catch (e2) {}
      });
    }

    if (nameBtn) {
      nameBtn.addEventListener("click", function () {
        if (isRoleProfileView()) return;
        var p = loadProfile();
        uiPromptCompat("请输入用户名", String(p.name || ""), { title: "修改用户名" }).then(function (next) {
          if (next === null || next === undefined) return;
          next = String(next).trim();
          if (!next) return;
          p.name = next;
          saveProfile(p);
          renderProfileView();
        });
      });
    }

    if (signBtn) {
      signBtn.addEventListener("click", function () {
        if (isRoleProfileView()) return;
        var p = loadProfile();
        uiPromptCompat("请输入个性签名", String(p.sign || ""), { title: "修改签名" }).then(function (next) {
          if (next === null || next === undefined) return;
          next = String(next).trim();
          if (!next) return;
          p.sign = next;
          saveProfile(p);
          renderProfileView();
        });
      });
    }

    var followPickerLockAt = 0;
    function triggerFollowRolePicker() {
      var now = Date.now();
      if (now - followPickerLockAt < 280) return;
      followPickerLockAt = now;
      openProfileRolePicker();
    }

    if (followStat) {
      followStat.addEventListener("click", function () {
        triggerFollowRolePicker();
      });
      followStat.addEventListener("pointerup", function () {
        triggerFollowRolePicker();
      });
      followStat.addEventListener("touchend", function (e) {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        triggerFollowRolePicker();
      });
      followStat.addEventListener("keydown", function (e) {
        if (!e || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        triggerFollowRolePicker();
      });
    }

    profileRoot.addEventListener("click", function (e) {
      var target = e && e.target ? e.target : null;
      var stat = target && target.closest ? target.closest("#profileFollowStat") : null;
      if (!stat) return;
      triggerFollowRolePicker();
    });

    var photoBtns = qsa(".profile-photo, .glass-photo", profileRoot);
    if (galleryInput && photoBtns && photoBtns.length) {
      photoBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (isRoleProfileView()) return;
          profileGallerySlot = Number(btn.dataset.slot || 0);
          try {
            galleryInput.click();
          } catch (e) {}
        });
      });

      galleryInput.addEventListener("change", function () {
        var file = galleryInput.files && galleryInput.files[0] ? galleryInput.files[0] : null;
        if (!file) return;
        var slot = Number(profileGallerySlot || 0);
        if (!isFinite(slot) || slot < 0 || slot > 3) slot = 0;
        readImageAsDataUrl(file, function (dataUrl) {
          if (!dataUrl) return;
          var p = loadProfile();
          if (!Array.isArray(p.gallery)) p.gallery = [];
          p.gallery[slot] = dataUrl;
          saveProfile(p);
          renderProfileView();
        });
        try {
          galleryInput.value = "";
        } catch (e2) {}
      });
    }
  }

  function setupCharacterInteractions() {
    if (characterBound) return;
    if (!characterPage) return;
    characterBound = true;

    if (charBackBtn) {
      charBackBtn.addEventListener("click", function () {
        openSelfProfile();
      });
    }

    if (charPlayAllBtn) {
      charPlayAllBtn.addEventListener("click", function () {
        playActiveRoleSongAt(0);
      });
    }

    if (charTopMoreBtn) {
      charTopMoreBtn.addEventListener("click", function () {
        inviteActiveRoleToListen();
      });
    }

    if (charCollectAllBtn) {
      charCollectAllBtn.addEventListener("click", function () {
        var songs = getActiveRoleSongFeed();
        if (!songs.length) {
          showToast("角色歌单还在准备中");
          return;
        }
        openAddToPlaylistSheet(songs, { source: "character-all" });
      });
    }

    if (charRefreshBtn) {
      charRefreshBtn.addEventListener("click", function () {
        refreshActiveRoleMusicProfile();
      });
    }

    if (charSongList) {
      charSongList.addEventListener("click", function (e) {
        var target = e && e.target ? e.target : null;
        if (!target) return;
        var moreBtn = target.closest ? target.closest(".char-song-more") : null;
        if (moreBtn && charSongList.contains(moreBtn)) {
          var moreIndex = Number(moreBtn.dataset.index || -1);
          var moreSongs = getActiveRoleSongFeed();
          if (moreIndex >= 0 && moreIndex < moreSongs.length) {
            openAddToPlaylistSheet(moreSongs[moreIndex], { source: "character-song" });
          }
          return;
        }

        var item = target.closest ? target.closest(".char-song-item") : null;
        if (!item || !charSongList.contains(item)) return;
        var index = Number(item.dataset.index || -1);
        if (index < 0) return;
        playActiveRoleSongAt(index);
      });
    }
  }

  function showToast(text) {
    if (!toastEl) return;
    if (state.toastTimer) window.clearTimeout(state.toastTimer);
    toastEl.textContent = String(text || "");
    toastEl.classList.add("is-active");
    state.toastTimer = window.setTimeout(function () {
      toastEl.classList.remove("is-active");
    }, 1800);
  }

  // ===== 聊天抽屉与消息同步 =====
  var chatDrawerState = {
    open: false,
    roleId: "",
    roleName: "",
    typingTimer: 0,
    aiReq: 0,
    aiInFlight: false,
    aiInFlightAt: 0,
    lastSystemAt: 0,
    lastSwitchAt: 0,
    lastTrackKey: "",
    lastAmbientAt: 0,
    lastLyricAt: 0,
    lastLyricText: "",
    lastPlaybackAt: 0,
    lastPlaybackKind: "",
  };

  var TOGETHER_START_EMITTED_KEY = "listen_together_start_emitted_v1";

  function readTogetherStartEmittedMap() {
    try {
      if (!window.localStorage) return {};
      var raw = localStorage.getItem(TOGETHER_START_EMITTED_KEY) || "";
      var data = raw ? safeJsonParse(raw) : null;
      return data && typeof data === "object" ? data : {};
    } catch (e) {
      return {};
    }
  }

  function writeTogetherStartEmittedMap(map) {
    try {
      if (!window.localStorage) return;
      localStorage.setItem(TOGETHER_START_EMITTED_KEY, JSON.stringify(map || {}));
    } catch (e) {}
  }

  function maybeEmitTogetherStart(session) {
    var roleId = resolveTogetherRoleId(session) || state.togetherRoleId;
    if (!roleId) return;
    var at = session && session.at ? String(session.at) : "";
    if (!at) at = "unknown";
    var map = readTogetherStartEmittedMap();
    if (String(map[roleId] || "") === at) return;
    map[roleId] = at;
    writeTogetherStartEmittedMap(map);
    var cur = getCurrentPlaybackSong();
    chatDrawerState.lastTrackKey = cur ? trackKey(cur) : "";
    chatDrawerState.lastAmbientAt = 0;
    chatDrawerState.lastLyricAt = 0;
    chatDrawerState.lastLyricText = "";
    updateTogetherSessionTrack(cur, "start");
    syncSystemMessage("start", { song: cur });
  }

  function maybeSyncTogetherSongSwitch(nextSongInfo) {
    if (!isTogetherActive()) return;
    var next = nextSongInfo && typeof nextSongInfo === "object" ? nextSongInfo : null;
    if (!next) return;
    var nextKey = trackKey(next) || (String(next.title || "") + "::" + String(next.artist || ""));
    if (!nextKey) return;
    if (!chatDrawerState.lastTrackKey) {
      chatDrawerState.lastTrackKey = nextKey;
      bumpTogetherSessionSongCount(nextKey);
      return;
    }
    if (chatDrawerState.lastTrackKey === nextKey) return;
    chatDrawerState.lastTrackKey = nextKey;
    chatDrawerState.lastAmbientAt = 0;
    chatDrawerState.lastLyricAt = 0;
    chatDrawerState.lastLyricText = "";
    bumpTogetherSessionSongCount(nextKey);
    updateTogetherSessionTrack(next, "switch");
    syncSystemMessage("switch", { song: next });
  }

  function getTogetherRoleId() {
    return state.togetherRoleId || resolveTogetherRoleId(readTogetherSession());
  }

  function readChatStore() {
    try {
      if (window.parent && window.parent !== window) {
        var pw = window.parent;
        var data = pw.chatData || JSON.parse(pw.localStorage.getItem("wechat_chatData") || "{}");
        return data && typeof data === "object" ? data : {};
      }
    } catch (e) {}
    try {
      var raw = localStorage.getItem("wechat_chatData") || "{}";
      var data2 = safeJsonParse(raw);
      return data2 && typeof data2 === "object" ? data2 : {};
    } catch (e2) {
      return {};
    }
  }

  function writeChatStore(map) {
    try {
      if (window.parent && window.parent !== window) {
        var pw = window.parent;
        pw.chatData = map;
        pw.localStorage.setItem("wechat_chatData", JSON.stringify(map));
        if (typeof pw.saveData === "function") {
          try {
            pw.saveData();
          } catch (e0) {}
        }
        return;
      }
    } catch (e) {}
    try {
      localStorage.setItem("wechat_chatData", JSON.stringify(map));
    } catch (e2) {}
  }

  function pushChatMessage(roleId, msg) {
    var id = String(roleId || "");
    if (!id) return;
    var all = readChatStore();
    if (!Array.isArray(all[id])) all[id] = [];
    all[id].push(msg);
    writeChatStore(all);
    if (String(chatDrawerState.roleId || "") === id) updateChatDrawerReplyButton();
  }

  function pushHiddenTogetherSystemMessage(roleId, kind, text) {
    var rid = String(roleId || "");
    var content = String(text || "").trim();
    if (!rid || !content) return null;
    var msg = {
      role: "system",
      type: "system_event",
      hidden: true,
      includeInAI: true,
      content: content,
      timestamp: Date.now(),
      status: "sent",
      systemEventKind: String(kind || ""),
      musicPending: true,
    };
    pushChatMessage(rid, msg);
    return msg;
  }

  function countPendingTogetherSystemMessages(roleId) {
    var rid = String(roleId || chatDrawerState.roleId || getTogetherRoleId() || "");
    if (!rid) return 0;
    var all = readChatStore();
    var list = Array.isArray(all[rid]) ? all[rid] : [];
    var count = 0;
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (!m || m.role !== "system" || m.hidden !== true) continue;
      if (m.type !== "system_event") continue;
      if (m.musicPending === false) continue;
      count += 1;
    }
    return count;
  }

  function getLatestPendingTogetherSystemEvent(roleId) {
    var rid = String(roleId || chatDrawerState.roleId || getTogetherRoleId() || "");
    if (!rid) return null;
    var all = readChatStore();
    var list = Array.isArray(all[rid]) ? all[rid] : [];
    for (var i = list.length - 1; i >= 0; i--) {
      var m = list[i];
      if (!m || m.role !== "system" || m.hidden !== true) continue;
      if (m.type !== "system_event") continue;
      if (m.musicPending === false) continue;
      return m;
    }
    return null;
  }

  function markPendingTogetherSystemMessagesHandled(roleId) {
    var rid = String(roleId || "");
    if (!rid) return;
    var all = readChatStore();
    var list = Array.isArray(all[rid]) ? all[rid] : null;
    if (!list || !list.length) return;
    var changed = false;
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (!m || m.role !== "system" || m.hidden !== true) continue;
      if (m.type !== "system_event") continue;
      if (m.musicPending === false) continue;
      m.musicPending = false;
      changed = true;
    }
    if (changed) {
      writeChatStore(all);
      if (String(chatDrawerState.roleId || "") === rid) updateChatDrawerReplyButton();
    }
  }

  function updateChatDrawerReplyButton() {
    if (!chatDrawerReply) return;
    var rid = String(chatDrawerState.roleId || getTogetherRoleId() || "");
    if (!rid) {
      chatDrawerReply.textContent = "回复";
      return;
    }
    var pending = countPendingTogetherSystemMessages(rid);
    chatDrawerReply.textContent = pending > 0 ? "回复(" + pending + ")" : "回复";
  }

  function sanitizeAiReply(text) {
    var s = String(text == null ? "" : text).trim();
    if (!s) return "";
    
    // === 新增：尝试解析 JSON 提取 reply === 
    try { 
      var jsonStr = s; 
      if (jsonStr.indexOf("```") >= 0) { 
        jsonStr = jsonStr.replace(/```(json)?/gi, "").replace(/```/g, "").trim(); 
      } 
      var start = jsonStr.indexOf("{"); 
      var end = jsonStr.lastIndexOf("}"); 
      if (start !== -1 && end > start) { 
        var obj = JSON.parse(jsonStr.substring(start, end + 1)); 
        if (obj.reply) { 
            s = String(obj.reply); 
        } else if (obj.content) { 
            s = String(obj.content); 
        } 
      } 
    } catch (e) { 
      // 解析失败则继续走常规文本清洗 
    } 
    // =================================== 

    if (s.indexOf("```") >= 0) {
      s = s.replace(/```[a-z0-9]*\n?/gi, "").replace(/```/g, "");
    }
    s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    s = s.replace(/\n{3,}/g, "\n\n");
    s = s.replace(/\s*\|\|\|\s*/g, "\n");
    s = s.trim();
    if (s.length > 320) s = s.slice(0, 320) + "…";
    return s;
  }

  function pushAiText(roleId, text) {
    var rid = String(roleId || "");
    if (!rid) return;
    var content = sanitizeAiReply(text);
    if (!content) return;
    var now = Date.now();
    var aiMsg = { role: "ai", type: "text", content: content, timestamp: now, status: "sent" };
    markPendingTogetherSystemMessagesHandled(rid);
    pushChatMessage(rid, aiMsg);
    if (chatDrawerState.open && String(chatDrawerState.roleId || "") === rid && chatDrawerBody) {
      var row = document.createElement("div");
      row.className = "chat-drawer-row is-ai";
      var b = document.createElement("div");
      b.className = "chat-drawer-bubble";
      b.textContent = content;
      row.appendChild(b);
      chatDrawerBody.appendChild(row);
      scrollChatDrawerToEnd();
    }
  }

  function getHistoryForAi(roleId) {
    var rid = String(roleId || "");
    if (!rid) return [];
    var all = readChatStore();
    var list = Array.isArray(all[rid]) ? all[rid] : [];
    return list.filter(function (m) {
      if (!m) return false;
      if (m.role === "system") {
        return m.hidden === true && m.type === "system_event" && m.musicPending !== false;
      }
      if (!(m.role === "me" || m.role === "ai")) return false;
      if (m.hidden === true) return false;
      return true;
    }).slice(-80);
  }

  function maybeEmitTogetherLyricMoment() {
    if (!isTogetherActive()) return;
    if (!state.isPlaying) return;
    var rid = getTogetherRoleId();
    if (!rid) return;
    var quote = getActiveLyricQuote();
    if (!quote) return;
    if (quote === chatDrawerState.lastLyricText) return;
    chatDrawerState.lastLyricText = quote;
    var now = Date.now();
    if (now - chatDrawerState.lastLyricAt < 18000) return;
    if (now - chatDrawerState.lastAmbientAt < 26000) return;
    if (Math.random() > 0.35) return;
    chatDrawerState.lastLyricAt = now;
    chatDrawerState.lastAmbientAt = now;
    syncSystemMessage("lyric", { lyric: quote });
  }

  function maybeEmitTogetherPlaybackMoment(kind, song) {
    if (!isTogetherActive()) return;
    var rid = getTogetherRoleId();
    if (!rid) return;
    var now = Date.now();
    if (now - chatDrawerState.lastPlaybackAt < 7000) return;
    if (chatDrawerState.lastPlaybackKind === String(kind || "") && now - chatDrawerState.lastPlaybackAt < 20000) return;
    chatDrawerState.lastPlaybackAt = now;
    chatDrawerState.lastPlaybackKind = String(kind || "");
    syncSystemMessage(String(kind || ""), { song: song && typeof song === "object" ? song : getCurrentPlaybackSong() });
  }

  function scrollChatDrawerToEnd() {
    if (!chatDrawerBody) return;
    chatDrawerBody.scrollTop = chatDrawerBody.scrollHeight;
  }

  function renderChatDrawerHistory(roleId) {
    if (!chatDrawerBody) return;
    chatDrawerBody.innerHTML = "";
    var all = readChatStore();
    var list = Array.isArray(all[roleId]) ? all[roleId] : [];
    var startIndex = 0;
    var session = readTogetherSession();
    if (session && typeof session === "object") {
      session = normalizeTogetherSession(session);
      var inviteId = session.inviteId ? String(session.inviteId) : "";
      if (inviteId) {
        for (var i = list.length - 1; i >= 0; i--) {
          var it = list[i];
          if (it && it.type === "listen_invite" && String(it.inviteId || "") === inviteId) {
            startIndex = i + 1;
            break;
          }
        }
      } else if (session.startedAt) {
        var st = Number(session.startedAt || 0);
        if (isFinite(st) && st > 0) {
          for (var j = 0; j < list.length; j++) {
            var it2 = list[j];
            var ts = it2 && isFinite(Number(it2.timestamp || 0)) ? Number(it2.timestamp) : 0;
            if (ts && ts >= st) {
              startIndex = j;
              break;
            }
          }
        }
      }
    }

    for (var k = startIndex; k < list.length; k++) {
      var m = list[k];
      if (!m || m.hidden) continue;
      if (m.type === "listen_invite" || m.type === "listen_invite_accepted" || m.type === "listen_invite_declined") continue;
      if (!(m.role === "me" || m.role === "ai")) continue;
      if (m.type && m.type !== "text") continue;
      if (typeof m.content !== "string" || !String(m.content || "").trim()) continue;
      var row = document.createElement("div");
      if (m.role === "me") {
        row.className = "chat-drawer-row is-me";
      } else {
        row.className = "chat-drawer-row is-ai";
      }
      var b = document.createElement("div");
      b.className = "chat-drawer-bubble";
      b.textContent = m.content || "";
      row.appendChild(b);
      chatDrawerBody.appendChild(row);
    }
    scrollChatDrawerToEnd();
  }

  function toggleChatDrawer(open) {
    if (!chatDrawer) return;
    if (open) {
      var rid0 = getTogetherRoleId();
      if (!rid0) {
        showToast("请先进入一起听");
        return;
      }
    }
    chatDrawerState.open = !!open;
    chatDrawer.classList.toggle("is-active", !!open);
    chatDrawer.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) {
      var rid = getTogetherRoleId();
      chatDrawerState.roleId = rid;
      var profiles = getCharProfiles();
      var p = profiles[rid] || {};
      if (chatDrawerTitle) {
        var who = p.nickName || p.name || rid || "对方";
        chatDrawerTitle.textContent = "与 " + who + " 聊天中";
        chatDrawerState.roleName = who;
      }
      renderChatDrawerHistory(rid);
      updateChatDrawerReplyButton();
      setTimeout(scrollChatDrawerToEnd, 50);
      try {
        if (chatDrawerInput) chatDrawerInput.focus();
      } catch (e) {}
    } else {
      if (chatDrawerTyping) {
        chatDrawerTyping.textContent = "";
        chatDrawerTyping.classList.remove("is-active");
      }
      updateChatDrawerReplyButton();
    }
  }

  function getCurrentPlaybackContext(overrideSong) {
    var song = overrideSong && typeof overrideSong === "object" ? overrideSong : getCurrentPlaybackSong();
    var title = song && song.title ? String(song.title) : "";
    var artist = song && song.artist ? String(song.artist) : "";
    var key = "";
    try {
      key = song ? trackKey(song) : "";
    } catch (e) {
      key = "";
    }
    if (!title && state.currentTrackMeta && state.currentTrackMeta.title) title = String(state.currentTrackMeta.title || "");
    if (!artist && state.currentTrackMeta && state.currentTrackMeta.artist) artist = String(state.currentTrackMeta.artist || "");
    if (!key && state.currentTrackMeta && state.currentTrackMeta.key) key = String(state.currentTrackMeta.key || "");
    var url = song && (song.url || song.src) ? String(song.url || song.src) : "";
    if (!url && audioEl) url = String(audioEl.currentSrc || audioEl.src || "");
    return {
      song: song || null,
      title: title || "未知歌曲",
      artist: artist || "未知歌手",
      key: key || "",
      url: url || "",
    };
  }

  function updateTogetherSessionTrack(song, action) {
    var session = readTogetherSession();
    if (!session || typeof session !== "object") return null;
    session = normalizeTogetherSession(session);
    var roleId = resolveTogetherRoleId(session) || state.togetherRoleId;
    if (!roleId) return null;
    var ctx = getCurrentPlaybackContext(song && typeof song === "object" ? song : null);
    var cover = "";
    if (ctx && ctx.song && ctx.song.cover) cover = String(ctx.song.cover || "");
    else if (state.currentTrackMeta && state.currentTrackMeta.cover) cover = String(state.currentTrackMeta.cover || "");
    session.roleId = String(roleId);
    session.track = {
      title: String(ctx && ctx.title ? ctx.title : "未知歌曲"),
      artist: String(ctx && ctx.artist ? ctx.artist : "未知歌手"),
      cover: cover ? normalizeAssetUrl(cover) : "",
      url: String(ctx && ctx.url ? ctx.url : ""),
      key: String(ctx && ctx.key ? ctx.key : ""),
      id: ctx && ctx.song && ctx.song.id ? String(ctx.song.id) : "",
    };
    session.currentTrack = session.track;
    session.lastAction = String(action || session.lastAction || "update");
    session.lastUpdatedAt = Date.now();
    writeTogetherSession(session);
    state.togetherRoleId = String(roleId);
    setCurrentChatRoleValue(roleId);
    if (playerSheet) playerSheet.classList.add("is-together");
    return session;
  }

  function buildTogetherSystemMessageText(action, payload) {
    var details = payload && typeof payload === "object" ? payload : {};
    if (typeof payload === "string" && payload) details = { song: { title: String(payload) } };
    var ctx = getCurrentPlaybackContext(details.song || null);
    if (action === "start") {
      return "[系统] 开启了一起听模式；当前播放：《" + ctx.title + "》 - " + ctx.artist + "；track_key=" + (ctx.key || "未知") + "；audio_url=" + (ctx.url || "未知");
    }
    if (action === "switch") {
      return "[系统] 歌曲切换为：《" + ctx.title + "》 - " + ctx.artist + "；track_key=" + (ctx.key || "未知") + "；audio_url=" + (ctx.url || "未知");
    }
    if (action === "pause") {
      return "[系统] 用户暂停了音乐；当前歌曲：《" + ctx.title + "》 - " + ctx.artist + "；track_key=" + (ctx.key || "未知");
    }
    if (action === "resume") {
      return "[系统] 用户继续播放；当前歌曲：《" + ctx.title + "》 - " + ctx.artist + "；track_key=" + (ctx.key || "未知");
    }
    if (action === "lyric") {
      var quote = details.lyric ? String(details.lyric).trim() : "";
      if (!quote) return "";
      return "[系统] 当前唱到歌词：「" + quote + "」；当前歌曲：《" + ctx.title + "》 - " + ctx.artist;
    }
    if (action === "stop") {
      return "[系统] 用户关闭了一起听模式；结束前播放的是：《" + ctx.title + "》 - " + ctx.artist;
    }
    return String(action || "").trim();
  }

  function syncSystemMessage(action, payload) {
    var rid = getTogetherRoleId();
    if (!rid) return;
    updateTogetherSessionTrack(payload && payload.song ? payload.song : getCurrentPlaybackSong(), action);
    var now = Date.now();
    if (action === "switch") {
      if (now - chatDrawerState.lastSwitchAt < 800) return;
      chatDrawerState.lastSwitchAt = now;
    } else {
      if (now - chatDrawerState.lastSystemAt < 800) return;
      chatDrawerState.lastSystemAt = now;
    }
    var text = buildTogetherSystemMessageText(action, payload);
    if (!text) return;
    pushHiddenTogetherSystemMessage(rid, action, text);
  }

  function sendMessage(text) {
    var rid = getTogetherRoleId();
    if (!rid) return;
    var content = String(text || "").trim();
    if (!content) return;
    var now = Date.now();
    var userMsg = { role: "me", type: "text", content: content, timestamp: now, status: "sent" };
    pushChatMessage(rid, userMsg);
    if (chatDrawerBody) {
      var row = document.createElement("div");
      row.className = "chat-drawer-row is-me";
      var b = document.createElement("div");
      b.className = "chat-drawer-bubble";
      b.textContent = content;
      row.appendChild(b);
      chatDrawerBody.appendChild(row);
      scrollChatDrawerToEnd();
    }
    updateChatDrawerReplyButton();
  }

  function requestTogetherReply(promptText) {
    var rid = getTogetherRoleId();
    if (!rid) return;
    var content = String(promptText || "").trim();
    var eventKind = "manual_reply";
    if (!content) {
      var latestPending = getLatestPendingTogetherSystemEvent(rid);
      if (latestPending && latestPending.content) {
        content = String(latestPending.content || "").trim();
        eventKind = String(latestPending.systemEventKind || "manual_reply");
      } else {
        content = "请自然接着刚刚的话题回复我。";
      }
    }
    autoReplyLogic(content, eventKind, rid);
  }

  function buildSongContextText() {
    var ctx = getCurrentPlaybackContext();
    var title = ctx && ctx.title ? String(ctx.title) : "";
    var artist = ctx && ctx.artist ? String(ctx.artist) : "";
    if (title && artist) return "当前歌曲《" + title + "》 - " + artist;
    if (title) return "当前歌曲《" + title + "》";
    return "当前未获取到歌曲信息";
  }

  function getActiveLyricQuote() {
    var idx = Number(state.lyricsActiveIndex);
    if (!isFinite(idx) || idx < 0) return "";
    if (!state.lyricsLines || !state.lyricsLines.length) return "";
    var cur = state.lyricsLines[idx] && state.lyricsLines[idx].text ? String(state.lyricsLines[idx].text) : "";
    if (cur && cur.trim()) return cur.trim();
    return "";
  }

  function isEmojiOnlyText(text) {
    var s = String(text || "").trim();
    if (!s) return false;
    if (s.length > 12) return false;
    try {
      var t = s.replace(/\s+/g, "");
      if (!t) return false;
      var emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
      if (!emojiRe.test(t)) return false;
      var rest = t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "");
      return rest.length === 0;
    } catch (e) {
      return false;
    }
  }

  function simulateAIResponse(prompt, systemEventKind, forcedRoleId) {
    var rid = forcedRoleId || getTogetherRoleId();
    if (!rid) return;
    if (chatDrawerTyping) {
      chatDrawerTyping.textContent = (chatDrawerState.roleName || "对方") + " 正在输入...";
      chatDrawerTyping.classList.add("is-active");
    }
    if (chatDrawerState.typingTimer) window.clearTimeout(chatDrawerState.typingTimer);
    var delay = 1500 + Math.floor(Math.random() * 1500);
    chatDrawerState.typingTimer = window.setTimeout(function () {
      if (chatDrawerTyping) {
        chatDrawerTyping.textContent = "";
        chatDrawerTyping.classList.remove("is-active");
      }
      var reply = "";
      var songCtx = buildSongContextText();
      var p = String(prompt || "").trim();
      if (systemEventKind === "lyric") {
        var q = "";
        try {
          var m = p.match(/歌词[:：]\s*(.+)$/);
          if (m && m[1]) q = String(m[1]).trim();
        } catch (e0) {}
        if (!q) q = getActiveLyricQuote();
        if (q) {
          var picks = [
            "这句“" + q + "”有点上头",
            "听到“" + q + "”，突然就安静了",
            "这句太戳了：“" + q + "”",
            "等等，这句“" + q + "”好像在说我们",
          ];
          reply = picks[Math.floor(Math.random() * picks.length)];
        } else {
          reply = "这段旋律有点走心";
        }
      } else if (systemEventKind === "pause") {
        reply = "暂停一下也好～你想聊聊这首歌哪里最戳你吗";
      } else if (systemEventKind === "resume") {
        reply = "继续～我刚刚还在回味前面那句";
      } else {
        var isSystem =
          systemEventKind === "switch" || systemEventKind === "start" || systemEventKind === "stop" || /^\[系统\]/.test(p);
        if (isSystem) {
        var songName = getCurrentPlaybackContext().title || "这首歌";
        if (systemEventKind === "stop" || p.indexOf("关闭了一起听模式") >= 0) {
          reply = "那就先到这里～下次再一起听";
        } else if (systemEventKind === "switch" || p.indexOf("歌曲切换") >= 0) {
          reply = "啊，换到《" + songName + "》了，前奏太美了";
        } else {
          reply = "一起听开始～我已经准备好了，" + "《" + songName + "》走起";
        }
        } else if (isEmojiOnlyText(p)) {
          reply = p;
        } else if (/(歌词|这句|这段|那句|唱到|词)/.test(p)) {
          var quote2 = getActiveLyricQuote();
          if (quote2) reply = "你说的是这句吧：「" + quote2 + "」";
          else reply = "我也想看歌词那句～ " + songCtx;
        } else {
          reply = "我在听～ " + songCtx;
        }
      }
      pushAiText(rid, reply);
    }, delay);
  }

  function autoReplyLogic(userText, systemEventKind, forcedRoleId) {
    var rid = forcedRoleId || getTogetherRoleId();
    if (!rid) return;
    var content = String(userText || "").trim();
    if (!content) return;

    var parentWin = null;
    try {
      if (window.parent && window.parent !== window) parentWin = window.parent;
    } catch (e0) {
      parentWin = null;
    }

    if (parentWin && typeof parentWin.callAI === "function") {
      var now = Date.now();
      if (chatDrawerState.aiInFlight && systemEventKind && now - (chatDrawerState.aiInFlightAt || 0) < 9000) return;
      chatDrawerState.aiInFlight = true;
      chatDrawerState.aiInFlightAt = now;
      chatDrawerState.aiReq = (chatDrawerState.aiReq || 0) + 1;
      var reqId = chatDrawerState.aiReq;

      if (chatDrawerTyping && chatDrawerState.open) {
        chatDrawerTyping.textContent = (chatDrawerState.roleName || "对方") + " 正在输入...";
        chatDrawerTyping.classList.add("is-active");
      }

      var profiles = getCharProfiles();
      var p = profiles[rid] || {};
      var roleName = p.nickName || p.name || rid || "TA";
      var persona = p.desc || p.persona || p.prompt || "";
      var lyricQuote = getActiveLyricQuote();
      var extraCurrentContext = "当前音乐状态：" + (state.isPlaying ? "播放中" : "已暂停") + "；" + buildSongContextText() + (lyricQuote ? "；当前歌词：" + lyricQuote : "");
      var systemPrompt = (parentWin && typeof parentWin.buildFullChatPrompt === "function")
        ? parentWin.buildFullChatPrompt("music_chat", rid, {
            outputMode: "plain_json_task",
            maxSummaryLines: 12,
            extraCurrentContext: extraCurrentContext,
            extraTaskRules: [
              "你正在和用户在手机音乐App里一起听歌并聊天，说话仍然要像微信聊天。",
              "回复要求：1-2句自然中文；不要输出 markdown、代码块、触发码或指令；不要长篇大论。",
              "可以自然提及歌曲气氛、歌词余韵和你们此刻的关系温度，但不要机械播报播放状态。"
            ].join("\n"),
            sceneIntro: "当前场景是一起听歌时的连续聊天。"
          })
        : (function () {
            var sysParts = [];
            sysParts.push("【角色名称】" + roleName);
            if (persona && String(persona).trim()) sysParts.push(String(persona).trim());
            sysParts.push("你正在和用户在手机音乐App里一起听歌并聊天。你说话要像微信聊天。");
            sysParts.push("回复要求：1-2句自然中文；不要使用markdown/代码块；不要输出任何触发码或指令；不要长篇大论。");
            sysParts.push(extraCurrentContext);
            return sysParts.join("\n\n");
          })();
      var history = getHistoryForAi(rid);

      try {
        parentWin.callAI(
          systemPrompt,
          history,
          content,
          function (text) {
            if (reqId !== chatDrawerState.aiReq) return;
            chatDrawerState.aiInFlight = false;
            chatDrawerState.aiInFlightAt = 0;
            if (chatDrawerTyping) {
              chatDrawerTyping.textContent = "";
              chatDrawerTyping.classList.remove("is-active");
            }
            pushAiText(rid, text);
          },
          function () {
            if (reqId !== chatDrawerState.aiReq) return;
            chatDrawerState.aiInFlight = false;
            chatDrawerState.aiInFlightAt = 0;
            if (chatDrawerTyping) {
              chatDrawerTyping.textContent = "";
              chatDrawerTyping.classList.remove("is-active");
            }
            simulateAIResponse(content, systemEventKind, rid);
          }
        );
      } catch (e1) {
        chatDrawerState.aiInFlight = false;
        chatDrawerState.aiInFlightAt = 0;
        if (chatDrawerTyping) {
          chatDrawerTyping.textContent = "";
          chatDrawerTyping.classList.remove("is-active");
        }
        simulateAIResponse(content, systemEventKind, rid);
      }
      return;
    }

    simulateAIResponse(content, systemEventKind, rid);
  }

  function handleMusicEvents() {
    try {
      if (chatBtn) {
        chatBtn.addEventListener("click", function () {
          toggleChatDrawer(true);
        });
      }
      if (chatDrawerBackdrop) {
        chatDrawerBackdrop.addEventListener("click", function () {
          toggleChatDrawer(false);
        });
      }
      if (chatDrawerClose) {
        chatDrawerClose.addEventListener("click", function () {
          toggleChatDrawer(false);
        });
      }
      if (chatDrawerSend) {
        chatDrawerSend.addEventListener("click", function () {
          var v = chatDrawerInput ? String(chatDrawerInput.value || "").trim() : "";
          if (!v) return;
          if (chatDrawerInput) chatDrawerInput.value = "";
          sendMessage(v);
        });
      }
      if (chatDrawerReply) {
        chatDrawerReply.addEventListener("click", function () {
          var v = chatDrawerInput ? String(chatDrawerInput.value || "").trim() : "";
          if (v) {
            if (chatDrawerInput) chatDrawerInput.value = "";
            sendMessage(v);
            requestTogetherReply(v);
            return;
          }
          requestTogetherReply("");
        });
      }
      if (chatDrawerInput) {
        chatDrawerInput.addEventListener("keydown", function (e) {
          if (e && (e.key === "Enter" || e.keyCode === 13)) {
            var v = String(chatDrawerInput.value || "").trim();
            if (!v) return;
            chatDrawerInput.value = "";
            sendMessage(v);
          }
        });
      }
    } catch (e) {}
  }

  function setSearchActive(active) {
    if (topSearch) topSearch.classList.toggle("is-active", !!active);
    if (musicApp) musicApp.classList.toggle("is-searching", !!active);
    if (recommendView) recommendView.classList.toggle("is-active", !active);
    if (searchView) searchView.classList.toggle("is-active", !!active);
  }

  function setClearVisible(visible) {
    if (!searchClear) return;
    searchClear.style.display = visible ? "grid" : "none";
  }

  function setParentFullscreen(enabled) {
    try {
      if (window.parent && window.parent !== window && window.parent.postMessage) {
        window.parent.postMessage({ type: "MUSIC_PARENT_FULLSCREEN", enabled: !!enabled }, "*");
      }
    } catch (e) {}
  }

  function requestCloseMusicApp() {
    try {
      if (playerSheet && playerSheet.classList.contains("active")) {
        closePlayer();
      }
    } catch (e) {}
    try {
      if (window.parent && window.parent !== window && typeof window.parent.closeApp === "function") {
        window.parent.closeApp();
        return;
      }
    } catch (e2) {}
    try {
      if (typeof window.closeApp === "function") {
        window.closeApp();
      }
    } catch (e3) {}
  }

  function openPlayer() {
    playerSheet.classList.add("active");
    playerSheet.setAttribute("aria-hidden", "false");
    setParentFullscreen(true);
    syncFromGlobalPlayer();
    syncTogetherFromStorage();
  }

  function closePlayer() {
    try {
      if (miniOpen) miniOpen.focus();
      else if (document.activeElement && typeof document.activeElement.blur === "function") document.activeElement.blur();
    } catch (e) {}
    playerSheet.classList.remove("active");
    playerSheet.setAttribute("aria-hidden", "true");
    setParentFullscreen(false);
  }

  function setActiveTab(tabName) {
    tabs.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.dataset.tab === tabName);
    });
  }

  function setActivePage(tabName) {
    if (!homePage || !profilePage) return;
    var isMe = tabName === "me";
    var isCharacter = tabName === "character";
    if (isMe) setSearchActive(false);
    if (isCharacter) setSearchActive(false);
    homePage.hidden = !!(isMe || isCharacter);
    profilePage.hidden = !isMe;
    if (characterPage) characterPage.hidden = !isCharacter;
    if (musicApp) {
      musicApp.classList.toggle("is-profile", !!isMe);
      musicApp.classList.toggle("is-character", !!isCharacter);
    }
    if (topSearch) topSearch.style.display = isMe || isCharacter ? "none" : "";
    if (isMe) renderProfileView();
    if (isCharacter) renderCharacterView();
    if (!isMe && !isCharacter) exitHomeSelectMode();
  }

  function normalizeModeIndex(index) {
    var len = modeList.length || 1;
    var n = Number(index);
    if (!isFinite(n)) n = 0;
    n = Math.floor(n) % len;
    if (n < 0) n += len;
    return n;
  }

  function getCurrentPlayMode() {
    return modeList[normalizeModeIndex(state.modeIndex)] || modeList[0] || { key: "loop", icon: "bx-refresh", label: "顺序播放" };
  }

  function syncAudioLoopMode() {
    if (!audioEl) return;
    try {
      audioEl.loop = getCurrentPlayMode().key === "single";
    } catch (e) {}
  }

  function setModeByIndex(nextIndex) {
    state.modeIndex = normalizeModeIndex(nextIndex);
    syncAudioLoopMode();
    updateModeButtons();
  }

  function updateModeButtons() {
    var mode = getCurrentPlayMode();
    if (!shuffleBtn) return;
    var icon = qs("i", shuffleBtn);
    if (icon) icon.className = "bx " + String(mode.icon || "bx-refresh");
    shuffleBtn.setAttribute("aria-label", String(mode.label || "顺序播放"));
    shuffleBtn.title = String(mode.label || "顺序播放");
  }

  function updateQueueButton() {
    if (!repeatBtn) return;
    var icon = qs("i", repeatBtn);
    if (icon) icon.className = "bx bx-list-ul";
    repeatBtn.setAttribute("aria-label", "播放列表");
    repeatBtn.title = "播放列表";
  }

  function setPlayIcon(isPlaying) {
    var icon = qs("i", playBtn);
    if (icon) icon.className = isPlaying ? "bx bx-pause" : "bx bx-play";
    if (playBtn) playBtn.setAttribute("aria-label", isPlaying ? "暂停" : "播放");

    var miniIcon = miniPlayBtn ? qs("i", miniPlayBtn) : null;
    if (miniIcon) miniIcon.className = isPlaying ? "bx bx-pause" : "bx bx-play";
    if (miniPlayBtn) miniPlayBtn.setAttribute("aria-label", isPlaying ? "暂停" : "播放");
    syncMiniPlayerPresentation();
  }

  function setPlaying(nextPlaying) {
    if (!audioEl) return;

    if (nextPlaying) {
      var gp = getGlobalPlayer();
      var p = gp && typeof gp.play === "function" ? gp.play() : audioEl.play();
      if (p && typeof p.catch === "function") {
        p.catch(function () {
          showToast("点击播放继续");
        });
      }
    } else {
      var gp2 = getGlobalPlayer();
      if (gp2 && typeof gp2.pause === "function") gp2.pause();
      else audioEl.pause();
    }
  }

  function applyTrackInfo(songInfo) {
    var prevKey = "";
    try {
      prevKey = state && state.currentTrackMeta && state.currentTrackMeta.key ? String(state.currentTrackMeta.key) : "";
    } catch (e) {
      prevKey = "";
    }
    var nextKey = "";
    try {
      nextKey = trackKey(songInfo);
    } catch (e) {
      nextKey = "";
    }

    var cover = songInfo && songInfo.cover ? songInfo.cover : "";
    var title = songInfo && songInfo.title ? songInfo.title : "未知歌曲";
    var artist = songInfo && songInfo.artist ? songInfo.artist : "未知歌手";

    if (nextKey && nextKey !== prevKey) {
      try {
        var pw = window.parent && window.parent !== window ? window.parent : window;
        if (pw && typeof pw.recordActivity === "function") {
          pw.recordActivity("music", { songName: title });
        }
      } catch (e) {}
    }

    try {
      var id = songInfo && songInfo.id ? String(songInfo.id) : "";
      var sourceType = songInfo && (songInfo.sourceType || songInfo.source) ? String(songInfo.sourceType || songInfo.source) : "";
      state.currentTrackMeta = {
        title: title,
        artist: artist,
        cover: cover,
        key: trackKey(songInfo),
        id: id,
        sourceType: sourceType,
      };
    } catch (e) {}
    if (state.togetherRoleId || readTogetherSession()) {
      updateTogetherSessionTrack(songInfo, "track_info");
      if (playerSheet) playerSheet.classList.add("is-together");
    }

    updateDisplayedCovers(cover);
    syncCoverCarousel();
    if (trackTitle) trackTitle.textContent = title;
    if (trackArtist) trackArtist.textContent = artist;
    if (npTrackTitle) npTrackTitle.textContent = title;
    if (npTrackArtist) npTrackArtist.textContent = artist;
    if (miniCover) setImageSource(miniCover, cover, BLANK_COVER);
    if (miniTitle) miniTitle.textContent = title;
    if (miniArtist) miniArtist.textContent = artist;

    if (miniPlayer) {
      miniPlayer.classList.add("is-active");
      miniPlayer.setAttribute("aria-hidden", "false");
    }
    syncMiniPlayerPresentation();

    updateFavButton();
    loadLyricsForSong(songInfo);
    updateTogetherDurationLabel();
  }

  function setLyricsOpen(open) {
    playerSheet.classList.toggle("is-lyrics", !!open);
    if (!!open) {
      syncLyric();
    } else {
      window.requestAnimationFrame(function () {
        scheduleWaveRebuild();
        updateWaveFromAudio();
      });
    }
  }

  function setLyricsEmpty(text) {
    if (!lyricsView) return;
    if (lyricListEl) {
      lyricListEl.innerHTML = "";
      var el = document.createElement("li");
      el.className = "lyrics-empty";
      el.textContent = String(text || "暂无歌词");
      lyricListEl.appendChild(el);
    } else {
      lyricsView.innerHTML = "";
      var el2 = document.createElement("div");
      el2.className = "lyrics-empty";
      el2.textContent = String(text || "暂无歌词");
      lyricsView.appendChild(el2);
    }
    state.lyricsEls = [];
    state.lyricsActiveIndex = -1;
  }

  function parseLrc(text) {
    var raw = String(text || "");
    if (!raw.trim()) return [];
    var out = [];
    raw.split(/\r?\n/).forEach(function (line) {
      var s = String(line || "").trim();
      if (!s) return;
      if (/^\[(ar|ti|al|by|offset):/i.test(s)) return;
      var re = /\[(\d{1,2}):(\d{1,2}(?:\.\d{1,3})?)\]/g;
      var match = null;
      var times = [];
      while ((match = re.exec(s))) {
        var mm = Number(match[1]);
        var ss = Number(match[2]);
        if (!isFinite(mm) || !isFinite(ss)) continue;
        times.push(mm * 60 + ss);
      }
      if (!times.length) return;
      var txt = s.replace(re, "").trim();
      times.forEach(function (t) {
        out.push({ time: t, text: txt });
      });
    });
    out.sort(function (a, b) {
      return (a.time || 0) - (b.time || 0);
    });
    return out;
  }

  function renderLyrics(lines) {
    if (!lyricsView) return;
    if (!lyricListEl) {
      setLyricsEmpty("暂无歌词");
      return;
    }
    lyricListEl.innerHTML = "";
    state.lyricsEls = [];
    state.lyricsActiveIndex = -1;

    if (!lines || !lines.length) {
      setLyricsEmpty("暂无歌词");
      return;
    }

    var frag = document.createDocumentFragment();
    lines.forEach(function (it, idx) {
      var li = document.createElement("li");
      li.className = "lyric-line";
      li.dataset.index = String(idx);
      li.textContent = it && it.text ? String(it.text) : "…";
      state.lyricsEls.push(li);
      frag.appendChild(li);
    });
    lyricListEl.appendChild(frag);
    syncLyric();
  }

  function extractLyricText(payloadText) {
    var t = String(payloadText || "").trim();
    if (!t) return "";
    if (t[0] !== "{") return t;
    var obj = safeJsonParse(t);
    if (!obj || typeof obj !== "object") return t;
    if (typeof obj.lyric === "string" && obj.lyric.trim()) return obj.lyric;
    if (typeof obj.lrc === "string" && obj.lrc.trim()) return obj.lrc;
    if (obj.data && typeof obj.data.lrc === "string" && obj.data.lrc.trim()) return obj.data.lrc;
    if (obj.data && typeof obj.data.lyric === "string" && obj.data.lyric.trim()) return obj.data.lyric;
    if (obj.lrc && typeof obj.lrc.lyric === "string" && obj.lrc.lyric.trim()) return obj.lrc.lyric;
    return t;
  }

  function lyricProviderSource(sourceType) {
    var type = String(sourceType || "").trim();
    if (type === "vkeys_netease") return "netease";
    if (type === "vkeys_tencent") return "tencent";
    return toProviderSource(type || "kw");
  }

  function liumingyeLyricType(sourceType) {
    var type = String(sourceType || "").trim() || "kw";
    if (type === "vkeys_netease") return "wy";
    if (type === "vkeys_tencent") return "tx";
    return type;
  }

  function fetchVkeysLyricById(id, sourceType) {
    var type = String(sourceType || "").trim();
    var comparable = comparableSourceType(type);
    if (comparable !== "wy" && comparable !== "tx") return Promise.resolve("");
    var src = comparable === "wy" ? "netease" : "tencent";
    var url = "https://api.vkeys.cn/v2/music/" + src + "/lyric?id=" + encodeURIComponent(id);
    return fetchJson(url, 12000)
      .then(function (payload) {
        if (!payload) return "";
        var d = payload.data;
        if (typeof d === "string") return d;
        if (d && typeof d === "object") {
          if (typeof d.lyric === "string" && d.lyric.trim()) return d.lyric;
          if (typeof d.lrc === "string" && d.lrc.trim()) return d.lrc;
        }
        return "";
      })
      .catch(function () {
        return "";
      });
  }

  function fetchLingshaLyricById(id, sourceType) {
    if (!ENABLE_LINGSHA_APIS) return Promise.resolve("");
    if (comparableSourceType(sourceType) !== "wy") return Promise.resolve("");
    var url = "https://netease-cloud-lingsha-music-api.vercel.app/lyric?id=" + encodeURIComponent(id);
    return fetchJson(url, 12000)
      .then(function (payload) {
        if (!payload) return "";
        if (typeof payload === "string") return extractLyricText(payload);
        return extractLyricText(JSON.stringify(payload));
      })
      .catch(function () {
        return "";
      });
  }

  function fetchMetingLyricById(id, sourceType) {
    if (!ENABLE_LINGSHA_APIS) return Promise.resolve("");
    var source = lyricProviderSource(sourceType);
    if (!source) return Promise.resolve("");
    var url =
      "https://meting-api-lingsha.vercel.app/api?server=" +
      encodeURIComponent(source) +
      "&type=lyric&id=" +
      encodeURIComponent(id);
    return fetchJson(url, 12000)
      .then(function (payload) {
        if (!payload) return "";
        if (typeof payload === "string") return extractLyricText(payload);
        return extractLyricText(JSON.stringify(payload));
      })
      .catch(function () {
        return "";
      });
  }

  function fetchGdstudioLyricById(id, sourceType) {
    var source = lyricProviderSource(sourceType);
    if (!source) return Promise.resolve("");
    var url =
      "https://music-api.gdstudio.xyz/api.php?types=lyric&source=" +
      encodeURIComponent(source) +
      "&id=" +
      encodeURIComponent(id);
    return fetchJson(url, 12000)
      .then(function (payload) {
        if (!payload) return "";
        if (typeof payload === "string") return extractLyricText(payload);
        return extractLyricText(JSON.stringify(payload));
      })
      .catch(function () {
        return "";
      });
  }

  function fetchLyricByUrl(url) {
    var target = String(url || "").trim();
    if (!/^https?:\/\//i.test(target)) return Promise.resolve("");
    return fetch(target, { method: "GET" })
      .then(function (res) {
        if (!res.ok) throw new Error("status_" + res.status);
        return res.text();
      })
      .then(function (txt) {
        return extractLyricText(txt);
      })
      .catch(function () {
        return "";
      });
  }

  function fetchLyricById(id, sourceType) {
    var vid = String(id || "").trim();
    if (!vid) return Promise.resolve("");
    var type = String(sourceType || "").trim() || "kw";
    var providers = [];
    if (comparableSourceType(type) === "wy" || comparableSourceType(type) === "tx") {
      providers.push(function () {
        return fetchVkeysLyricById(vid, type);
      });
    }
    if (comparableSourceType(type) === "wy") {
      providers.push(function () {
        return fetchLingshaLyricById(vid, type);
      });
    }
    providers.push(function () {
      return fetchGdstudioLyricById(vid, type);
    });
    providers.push(function () {
      return fetchMetingLyricById(vid, type);
    });
    return new Promise(function (resolve) {
      var done = false;
      var left = providers.length;
      if (!left) {
        resolve("");
        return;
      }
      providers.forEach(function (provider) {
        provider()
          .then(function (txt) {
            if (done) return;
            if (txt && String(txt).trim()) {
              done = true;
              resolve(txt);
            }
          })
          .catch(function () {})
          .finally(function () {
            left -= 1;
            if (!done && left <= 0) {
              done = true;
              resolve("");
            }
          });
      });
    });
  }

  function loadLyricsForSong(songInfo) {
    var key = trackKey(songInfo) || (songInfo && songInfo.id ? String(songInfo.id) : "");
    if (!key) key = "unknown";
    state.lyricsKey = key;
    var isLocalSong = !!(
      songInfo &&
      (songInfo.localOnly ||
        String(songInfo.sourceType || songInfo.source || "").toLowerCase() === "local" ||
        /^local:/i.test(String(songInfo.id || "")))
    );

    if (!lyricsView) return;
    if (state.lyricFetchTimer) window.clearTimeout(state.lyricFetchTimer);

    var inline = songInfo && (songInfo.lyric || songInfo.lrc) ? String(songInfo.lyric || songInfo.lrc) : "";
    if (inline.trim()) {
      state.lyricsLines = parseLrc(inline);
      renderLyrics(state.lyricsLines);
      return;
    }

    if (state.lyricCache && state.lyricCache[key]) {
      state.lyricsLines = parseLrc(state.lyricCache[key]);
      renderLyrics(state.lyricsLines);
      return;
    }

    var lyricUrl = songInfo && songInfo.lyricUrl ? String(songInfo.lyricUrl) : "";
    if (lyricUrl) {
      setLyricsEmpty("歌词加载中...");
      state.lyricFetchTimer = window.setTimeout(function () {
        fetchLyricByUrl(lyricUrl).then(function (txt) {
          if (state.lyricsKey !== key) return;
          if (txt && txt.trim()) {
            state.lyricCache[key] = txt;
            try {
              songInfo.lyric = String(txt);
              var libIndex = findLibrarySongIndex(songInfo);
              if (libIndex >= 0 && state.library && state.library[libIndex]) {
                state.library[libIndex].lyric = String(txt);
                saveLibrary();
              }
            } catch (e) {}
            state.lyricsLines = parseLrc(txt);
            renderLyrics(state.lyricsLines);
          } else {
            state.lyricsLines = [];
            setLyricsEmpty(isLocalSong ? "未发现歌词，可上传同名 LRC 或重新导入带歌词的音频文件" : "暂无歌词");
          }
        });
      }, 60);
      return;
    }

    if (isLocalSong) {
      state.lyricsLines = [];
      setLyricsEmpty("未发现歌词，可上传同名 LRC 或重新导入带歌词的音频文件");
      return;
    }

    var id = songInfo && songInfo.id ? String(songInfo.id) : "";
    if (!id) {
      state.lyricsLines = [];
      setLyricsEmpty(isLocalSong ? "未发现歌词，可上传同名 LRC 或重新导入带歌词的音频文件" : "暂无歌词");
      return;
    }

    var type = songInfo && (songInfo.source || songInfo.sourceType) ? String(songInfo.source || songInfo.sourceType) : "";
    if (!type && state.currentTrackMeta && state.currentTrackMeta.sourceType) type = String(state.currentTrackMeta.sourceType || "");
    if (!type) type = getDefaultSourceType();

    setLyricsEmpty("歌词加载中...");
    state.lyricFetchTimer = window.setTimeout(function () {
      fetchLyricById(id, type).then(function (txt) {
        if (state.lyricsKey !== key) return;
        if (txt && txt.trim()) {
          state.lyricCache[key] = txt;
          try {
            songInfo.lyric = String(txt);
            var libIndex = findLibrarySongIndex(songInfo);
            if (libIndex >= 0 && state.library && state.library[libIndex]) {
              state.library[libIndex].lyric = String(txt);
              saveLibrary();
            }
          } catch (e) {}
          state.lyricsLines = parseLrc(txt);
          renderLyrics(state.lyricsLines);
        } else {
          state.lyricsLines = [];
          setLyricsEmpty(isLocalSong ? "未发现歌词，可上传同名 LRC 或重新导入带歌词的音频文件" : "暂无歌词");
        }
      });
    }, 60);
  }

  function findActiveLyricIndex(timeSeconds) {
    var t = Number(timeSeconds);
    if (!isFinite(t) || t < 0) t = 0;
    var lines = state.lyricsLines || [];
    if (!lines.length) return -1;
    var lo = 0;
    var hi = lines.length - 1;
    var ans = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      var mt = Number(lines[mid].time);
      if (!isFinite(mt)) mt = 0;
      if (mt <= t + 0.08) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return ans;
  }

  function syncLyric() {
    if (!lyricsView) return;
    if (!state.lyricsLines || !state.lyricsLines.length) return;
    var t = audioEl ? Number(audioEl.currentTime || 0) : 0;
    var idx = findActiveLyricIndex(t);
    if (idx === state.lyricsActiveIndex) return;

    var prev = state.lyricsActiveIndex;
    state.lyricsActiveIndex = idx;
    if (prev >= 0 && state.lyricsEls && state.lyricsEls[prev]) {
      state.lyricsEls[prev].classList.remove("active");
    }
    if (idx >= 0 && state.lyricsEls && state.lyricsEls[idx]) {
      state.lyricsEls[idx].classList.add("active");
    }

    if (idx < 0) return;
    var el = state.lyricsEls && state.lyricsEls[idx] ? state.lyricsEls[idx] : null;
    if (!el) return;

    var top = el.offsetTop - (lyricsView.clientHeight / 2 - el.clientHeight / 2);
    var nextTop = Math.max(0, top);
    try {
      lyricsView.scrollTo({ top: nextTop, behavior: "smooth" });
    } catch (e) {
      lyricsView.scrollTop = nextTop;
    }
    try {
      maybeEmitTogetherLyricMoment();
    } catch (e2) {}
  }

  function formatClock(seconds) {
    var s = Number(seconds);
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60);
    var r = Math.floor(s % 60);
    return m + ":" + String(r).padStart(2, "0");
  }

  function updateTimeLabels() {
    if (!audioEl) return;
    var currentText = formatClock(audioEl.currentTime || 0);
    var durationText = formatClock(audioEl.duration || 0);
    if (currentTimeEl) currentTimeEl.textContent = currentText;
    if (durationTimeEl) durationTimeEl.textContent = durationText;
    if (vinylCurrentTimeEl) vinylCurrentTimeEl.textContent = currentText;
    if (vinylDurationTimeEl) vinylDurationTimeEl.textContent = durationText;
  }

  function setLoading(loading) {
    if (!playBtn) return;
    playBtn.disabled = !!loading;
    playBtn.setAttribute("aria-busy", loading ? "true" : "false");
    var icon = qs("i", playBtn);
    if (!icon) return;
    if (loading) icon.className = "bx bx-loader-alt bx-spin";
    else icon.className = state.isPlaying ? "bx bx-pause" : "bx bx-play";
  }

  function mulberry32(seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function computeBarCount() {
    if (!waveEl) return 0;
    var rect = waveEl.getBoundingClientRect();
    var w = rect.width || 0;
    if (w <= 0) return 0;
    var barWidth = 3;
    var gap = 3;
    var count = Math.floor((w + gap) / (barWidth + gap));
    return clampInt(count, 28, 64);
  }

  function renderWave() {
    state.bars.forEach(function (barEl, i) {
      barEl.classList.toggle("filled", i < state.progressCount);
    });
  }

  function updateWaveFromAudio() {
    if (!audioEl) return;
    var duration = audioEl.duration;
    updateTimeLabels();
    if (!duration || !isFinite(duration) || duration <= 0) {
      if (!progressSliderPreviewActive) setSliderProgress(0);
      return;
    }
    var ratio = audioEl.currentTime / duration;
    if (!progressSliderPreviewActive) setSliderProgress(ratio * 100);
    if (!state.barCount) return;
    state.progressCount = clampInt(ratio * state.barCount, 0, state.barCount);
    renderWave();
  }

  function seekByRatio(ratio) {
    if (!audioEl) return;
    var r = Number(ratio);
    if (!isFinite(r)) return;
    if (r < 0) r = 0;
    if (r > 1) r = 1;
    var duration = audioEl.duration;
    if (!duration || !isFinite(duration) || duration <= 0) return;
    var t = duration * r;
    var gp = getGlobalPlayer();
    if (gp && typeof gp.seek === "function") gp.seek(t);
    else {
      try {
        audioEl.currentTime = t;
      } catch (e) {}
    }
    updateWaveFromAudio();
  }

  function playUrl(url) {
    if (!audioEl) return;
    var u = String(url || "").trim();
    if (!u) {
      showToast("该歌曲无可用音源");
      return;
    }
    syncAudioLoopMode();

    var meta = state.currentTrackMeta || null;
    var gp = getGlobalPlayer();
    if (gp && typeof gp.setTrack === "function") {
      gp.setTrack({
        title: meta && meta.title ? meta.title : "",
        artist: meta && meta.artist ? meta.artist : "",
        cover: meta && meta.cover ? meta.cover : "",
        key: meta && meta.key ? meta.key : "",
        id: meta && meta.id ? meta.id : "",
        sourceType: meta && meta.sourceType ? meta.sourceType : "",
        url: u,
      });
    } else {
      audioEl.src = u;
    }
    setPlaying(true);
  }

  function getCachedPlayUrl(key) {
    if (!key || !state.urlCache) return "";
    var entry = state.urlCache[key];
    if (!entry) return "";
    if (typeof entry === "string") return entry;
    if (!entry.url) return "";
    var expiresAt = Number(entry.expiresAt || 0);
    if (!isFinite(expiresAt) || expiresAt <= 0 || expiresAt > Date.now()) return String(entry.url);
    delete state.urlCache[key];
    return "";
  }

  function setCachedPlayUrl(key, url) {
    if (!key || !url) return;
    if (!state.urlCache) state.urlCache = {};
    state.urlCache[key] = {
      url: String(url),
      expiresAt: Date.now() + PLAY_URL_CACHE_TTL_MS,
    };
  }

  function invalidateSongPlayUrl(song) {
    if (!song) return;
    var key = playUrlCacheKey(song);
    if (key && state.urlCache && state.urlCache[key]) delete state.urlCache[key];
    if (song.id) {
      song.url = "";
      if ("src" in song) song.src = "";
    }
    if ("importUrl" in song && !song.imported) song.importUrl = "";
    var libIndex = findLibrarySongIndex(song);
    if (libIndex >= 0 && state.library && state.library[libIndex] && state.library[libIndex].id) {
      state.library[libIndex].url = "";
      if ("src" in state.library[libIndex]) state.library[libIndex].src = "";
      if ("importUrl" in state.library[libIndex] && !state.library[libIndex].imported) state.library[libIndex].importUrl = "";
    }
  }

  function buildWaveBars() {
    if (!waveEl) return;
    waveEl.innerHTML = "";

    var rnd = mulberry32(0x13579bdf);
    var count = computeBarCount();
    if (!count) count = 40;
    state.barCount = count;
    var bars = [];
    for (var i = 0; i < state.barCount; i += 1) {
      var h = 8 + Math.round(rnd() * 28);
      if (h < 10) h = 10;
      if (h > 36) h = 36;
      var bar = document.createElement("span");
      bar.className = "bar";
      bar.style.setProperty("--h", h + "px");
      bars.push(bar);
      waveEl.appendChild(bar);
    }
    state.bars = bars;
    if (state.progressCount > state.barCount) state.progressCount = state.barCount;
    renderWave();
    updateWaveFromAudio();
  }

  function scheduleWaveRebuild() {
    window.requestAnimationFrame(function () {
      buildWaveBars();
    });
  }

  function extractSearchArray(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (typeof payload === "string") {
      var txt = String(payload || "").trim();
      if (!txt) return [];
      var first = txt.charAt(0);
      if (first === "{" || first === "[") {
        try {
          return extractSearchArray(JSON.parse(txt));
        } catch (e) {
          return [];
        }
      }
      return [];
    }
    if (typeof payload !== "object") return [];

    var candidates = [
      payload.data,
      payload.result,
      payload.results,
      payload.songs,
      payload.list,
      payload.items,
      payload.data && payload.data.list,
      payload.data && payload.data.songs,
      payload.data && payload.data.results,
      payload.result && payload.result.songs,
      payload.result && payload.result.list,
    ];

    for (var i = 0; i < candidates.length; i += 1) {
      if (Array.isArray(candidates[i])) return candidates[i];
    }

    var keys = Object.keys(payload);
    for (var j = 0; j < keys.length; j += 1) {
      var v = payload[keys[j]];
      if (Array.isArray(v)) return v;
      if (v && typeof v === "object") {
        var inner = extractSearchArray(v);
        if (inner.length) return inner;
      }
    }
    return [];
  }

  function normalizeSong(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = raw.id || raw.songid || raw.songId || raw.ID || raw.trackId || raw.trackID || raw.track_id;
    var title = raw.title || raw.name || raw.songname || raw.songName || raw.trackName || raw.track_name;
    var author =
      raw.author || raw.artist || raw.singer || raw.artistname || raw.artistName || raw.singerName || raw.artist_name;
    var pic = raw.pic || raw.cover || raw.picUrl || raw.img || raw.image || raw.artworkUrl100 || raw.artworkUrl60;
    var url = raw.url || raw.playUrl || raw.play_url || raw.mp3 || raw.musicUrl;
    if (!url && raw.previewUrl) url = raw.previewUrl;
    if (!id || !title) return null;
    return {
      id: String(id),
      title: String(title),
      artist: author ? String(author) : "未知歌手",
      cover: pic ? String(pic).replace(/^http:\/\//i, "https://") : "",
      url: url ? String(url).replace(/^http:\/\//i, "https://") : "",
    };
  }

  function parseTrackIdFromUrl(value) {
    var text = String(value || "").trim();
    if (!text) return "";
    var m = text.match(/[?&]id=(\d{5,})/i);
    return m && m[1] ? String(m[1]) : "";
  }

  function normalizeMetingTrack(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id =
      raw.id ||
      raw.url_id ||
      raw.urlId ||
      raw.song_id ||
      raw.songId ||
      parseTrackIdFromUrl(raw.url) ||
      parseTrackIdFromUrl(raw.lrc) ||
      parseTrackIdFromUrl(raw.pic);
    var title = raw.title || raw.name;
    var artist = raw.artist || raw.author || raw.singer;
    if (!artist && raw.ar && Array.isArray(raw.ar)) {
      artist = raw.ar
        .map(function (item) {
          return item && item.name ? String(item.name) : "";
        })
        .filter(Boolean)
        .join(" / ");
    }
    if (!artist && raw.artists && Array.isArray(raw.artists)) {
      artist = raw.artists
        .map(function (item) {
          return item && item.name ? String(item.name) : "";
        })
        .filter(Boolean)
        .join(" / ");
    }
    if (Array.isArray(artist)) artist = artist.join(" / ");
    var cover =
      raw.cover ||
      raw.pic ||
      (raw.al && raw.al.picUrl) ||
      (raw.album && (raw.album.picUrl || raw.album.blurPicUrl)) ||
      (raw.picUrl ? raw.picUrl : "");
    var url = raw.url || raw.mp3 || raw.playUrl || raw.play_url;
    var lyricUrl = raw.lrc || raw.lyricUrl || raw.lrcUrl || "";
    if (!title) return null;
    if (!id && !url) return null;
    return {
      id: id ? String(id) : "",
      title: String(title),
      artist: artist ? String(artist) : "未知歌手",
      cover: cover ? String(cover).replace(/^http:\/\//i, "https://") : "",
      url: url ? String(url).replace(/^http:\/\//i, "https://") : "",
      lyricUrl: /^https?:\/\//i.test(String(lyricUrl || "")) ? String(lyricUrl).replace(/^http:\/\//i, "https://") : "",
      source: "wy",
      sourceType: "wy",
    };
  }

  function appSourceName(type) {
    var t = String(type || "").trim();
    if (t === "vkeys_tencent") return "QQ";
    if (t === "vkeys_netease") return "网易云";
    if (t === "tx") return "QQ";
    if (t === "wy") return "网易云";
    if (t === "kg") return "酷狗";
    if (t === "kw") return "酷我";
    if (t === "migu") return "咪咕";
    if (t === "joox") return "JOOX";
    if (t === "ytmusic") return "YouTube Music";
    if (t === "tidal") return "TIDAL";
    if (t === "ximalaya") return "喜马拉雅";
    return "全网";
  }

  function toProviderSource(type) {
    var t = String(type || "").trim();
    if (t === "tx") return "tencent";
    if (t === "wy") return "netease";
    if (t === "kg") return "kugou";
    if (t === "kw") return "kuwo";
    if (t === "migu") return "migu";
    if (t === "joox") return "joox";
    if (t === "ytmusic") return "ytmusic";
    if (t === "tidal") return "tidal";
    if (t === "ximalaya") return "ximalaya";
    return t;
  }

  function toAppSource(providerSource, fallbackType) {
    var s = String(providerSource || "").trim();
    if (s === "tencent") return "tx";
    if (s === "netease") return "wy";
    if (s === "kugou") return "kg";
    if (s === "kuwo") return "kw";
    if (s === "migu") return "migu";
    if (s === "joox") return "joox";
    if (s === "ytmusic") return "ytmusic";
    if (s === "tidal") return "tidal";
    if (s === "ximalaya") return "ximalaya";
    return String(fallbackType || s || "kw").trim();
  }

  function normalizeProviderSong(raw, sourceType, options) {
    if (!raw || typeof raw !== "object") return null;
    var opts = options && typeof options === "object" ? options : {};
    var id = raw.id || raw.songid || raw.songId || raw.ID || raw.trackId || raw.trackID || raw.track_id || raw.mid;
    var title = raw.title || raw.name || raw.song || raw.songname || raw.songName || raw.trackName || raw.track_name;
    var artist =
      raw.author || raw.artist || raw.singer || raw.artistname || raw.artistName || raw.singerName || raw.artist_name;
    if (!artist && raw.ar && Array.isArray(raw.ar)) {
      artist = raw.ar
        .map(function (item) {
          return item && item.name ? String(item.name) : "";
        })
        .filter(Boolean)
        .join(" / ");
    }
    if (!artist && raw.artists && Array.isArray(raw.artists)) {
      artist = raw.artists
        .map(function (item) {
          return item && item.name ? String(item.name) : "";
        })
        .filter(Boolean)
        .join(" / ");
    }
    if (Array.isArray(artist)) artist = artist.join(" / ");
    var cover =
      raw.pic ||
      raw.cover ||
      raw.picUrl ||
      raw.img ||
      raw.image ||
      raw.artworkUrl100 ||
      raw.artworkUrl60 ||
      (raw.al && raw.al.picUrl) ||
      (raw.album && (raw.album.picUrl || raw.album.blurPicUrl));
    var url = raw.url || raw.playUrl || raw.play_url || raw.mp3 || raw.musicUrl;
    if (!url && raw.previewUrl) url = raw.previewUrl;
    if (!id || !title) return null;
    var st = String(sourceType || opts.sourceType || "").trim() || "kw";
    return {
      id: String(id),
      title: String(title),
      artist: artist ? String(artist) : "未知歌手",
      cover: cover ? String(cover).replace(/^http:\/\//i, "https://") : "",
      url: url ? String(url).replace(/^http:\/\//i, "https://") : "",
      source: st,
      sourceType: st,
      lyric: raw.lyric || raw.lrc || "",
    };
  }

  function uniqueSongs(list) {
    var out = [];
    var seen = new Set();
    (Array.isArray(list) ? list : []).forEach(function (song) {
      if (!song || !song.title) return;
      var key = [
        String(song.sourceType || song.source || ""),
        String(song.id || ""),
        normalizeTitleForMatch(song.title),
        normalizeMatchText(song.artist || ""),
      ].join("::");
      if (seen.has(key)) return;
      seen.add(key);
      out.push(song);
    });
    return out;
  }

  async function searchVkeysProvider(keyword, sourceType) {
    var t = String(sourceType || "").trim();
    if (t !== "wy" && t !== "tx") return [];
    var providerSource = t === "wy" ? "netease" : "tencent";
    var url = "https://api.vkeys.cn/v2/music/" + providerSource + "?word=" + encodeURIComponent(keyword);
    var payload = await fetchJson(url, 6000);
    return parseVkeysSearchSongs(payload, providerSource);
  }

  async function searchGdstudioProvider(keyword, sourceType) {
    var t = String(sourceType || "").trim();
    var providerSource = toProviderSource(t);
    if (!providerSource) return [];
    var url =
      "https://music-api.gdstudio.xyz/api.php?types=search&source=" +
      encodeURIComponent(providerSource) +
      "&name=" +
      encodeURIComponent(keyword) +
      "&count=30";
    var payload = await fetchJson(url, 14000);
    var list = extractSearchArray(payload);
    return list
      .map(function (raw) {
        return normalizeProviderSong(raw, toAppSource(providerSource, t));
      })
      .filter(Boolean);
  }

  async function searchMetingProvider(keyword, sourceType) {
    if (!ENABLE_LINGSHA_APIS) return [];
    var t = String(sourceType || "").trim();
    var providerSource = toProviderSource(t);
    if (!providerSource) return [];
    var url =
      "https://meting-api-lingsha.vercel.app/api?server=" +
      encodeURIComponent(providerSource) +
      "&type=search&s=" +
      encodeURIComponent(keyword);
    var payload = await fetchJson(url, 6000);
    var list = extractSearchArray(payload);
    return list
      .map(function (raw) {
        return normalizeProviderSong(raw, toAppSource(providerSource, t));
      })
      .filter(Boolean);
  }

  async function searchLingshaNeteaseProvider(keyword) {
    if (!ENABLE_LINGSHA_APIS) return [];
    var url =
      "https://netease-cloud-lingsha-music-api.vercel.app/search?keywords=" +
      encodeURIComponent(keyword) +
      "&type=1";
    var payload = await fetchJson(url, 6000);
    var list = payload && payload.result && Array.isArray(payload.result.songs) ? payload.result.songs : extractSearchArray(payload);
    return list
      .map(function (raw) {
        return normalizeProviderSong(raw, "wy");
      })
      .filter(Boolean);
  }

  async function searchProviderGroup(keyword, sourceType, options) {
    var opts = options && typeof options === "object" ? options : {};
    var t = String(sourceType || getDefaultSourceType() || "kw").trim();
    var tasks = [
      searchGdstudioProvider(keyword, t).catch(function () { return []; }),
    ];
    if (ENABLE_LINGSHA_APIS) {
      tasks.push(searchMetingProvider(keyword, t).catch(function () { return []; }));
    }
    if (!opts.skipLiumingye && ["kw", "kg", "tx", "wy"].indexOf(t) >= 0) {
      tasks.push(searchLiumingyeSongs(keyword, t).catch(function () { return []; }));
    }
    if (t === "wy" || t === "tx") {
      tasks.unshift(searchVkeysProvider(keyword, t).catch(function () { return []; }));
    }
    if (ENABLE_LINGSHA_APIS && t === "wy") {
      tasks.push(searchLingshaNeteaseProvider(keyword).catch(function () { return []; }));
    }
    var groups = await Promise.all(tasks);
    var merged = [];
    groups.forEach(function (group) {
      merged = merged.concat(group || []);
    });
    return uniqueSongs(merged).slice(0, 60);
  }

  async function searchWithFallbackSources(keyword, preferredType) {
    var preferred = String(preferredType || getSearchType() || "kw").trim();
    if (preferred === ALL_SEARCH_TYPE) {
      if (searchHint) searchHint.textContent = "正在全网搜索...";
      var pool = getSourcePool();
      var groups = await Promise.all(
        pool.map(function (type) {
          return searchProviderGroup(keyword, type).catch(function () {
            return [];
          });
        })
      );
      var merged = [];
      groups.forEach(function (group) {
        merged = merged.concat(group || []);
      });
      return { songs: uniqueSongs(merged).slice(0, 80), sourceType: ALL_SEARCH_TYPE, fallback: false, aggregated: true };
    }
    var order = [preferred];
    getSourcePool().forEach(function (type) {
      if (order.indexOf(type) < 0) order.push(type);
    });
    for (var i = 0; i < order.length; i += 1) {
      var type = order[i];
      if (searchHint) searchHint.textContent = "正在从 " + appSourceName(type) + " 多源搜索...";
      var songs = await searchProviderGroup(keyword, type);
      if (songs && songs.length) {
        return { songs: songs, sourceType: type, fallback: type !== preferred };
      }
    }
    return { songs: [], sourceType: preferred, fallback: false };
  }

  function clearSearchList() {
    if (!searchList) return;
    state.searchResults = [];
    searchList.innerHTML = "";
  }

  function renderSearchList(songs) {
    if (!searchList) return;
    clearSearchList();
    state.searchResults = Array.isArray(songs) ? songs.slice() : [];

    if (!songs || !songs.length) {
      if (searchHint) searchHint.textContent = "未找到结果";
      return;
    }

    if (searchHint) searchHint.textContent = "";

    songs.forEach(function (song, index) {
      var li = document.createElement("li");
      var row = document.createElement("div");
      row.className = "search-item";
      row.dataset.id = song.id;
      row.dataset.index = String(index);

      var cover = document.createElement("div");
      cover.className = "search-cover";
      var img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      setImageSource(img, song.cover || "", BLANK_COVER);
      cover.appendChild(img);

      var meta = document.createElement("div");
      meta.className = "search-meta";
      var title = document.createElement("div");
      title.className = "search-title";
      title.textContent = song.title;
      var artist = document.createElement("div");
      artist.className = "search-artist";
      artist.textContent = song.artist || "未知歌手";
      meta.appendChild(title);
      meta.appendChild(artist);

      var actions = document.createElement("div");
      actions.className = "search-actions";

      var addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "search-action-btn";
      addBtn.setAttribute("aria-label", "添加到列表");
      var addIcon = document.createElement("i");
      addIcon.className = "bx bx-list-plus";
      addBtn.appendChild(addIcon);

      var favBtn2 = document.createElement("button");
      favBtn2.type = "button";
      favBtn2.className = "search-action-btn";
      favBtn2.setAttribute("aria-label", "收藏");
      var favIcon = document.createElement("i");
      favIcon.className = "bx bx-heart";
      favBtn2.appendChild(favIcon);

      var play = document.createElement("div");
      play.className = "search-play";
      var icon = document.createElement("i");
      icon.className = "bx bx-play";
      play.appendChild(icon);

      actions.appendChild(addBtn);
      actions.appendChild(favBtn2);
      actions.appendChild(play);

      function syncActionState() {
        var libIndex = findLibrarySongIndex(song);
        var libSong = libIndex >= 0 ? state.library[libIndex] : null;
        addBtn.classList.toggle("is-added", libIndex >= 0);
        var favKey = trackKey(libSong || song);
        var active = !!(favKey && isFav(favKey));
        favBtn2.classList.toggle("is-fav", active);
        favIcon.className = active ? "bx bxs-heart" : "bx bx-heart";
      }

      syncActionState();

      addBtn.addEventListener("click", function (e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        var res = addSongToLibrary(song, false);
        if (res.added) showToast("已添加到列表");
        else showToast("已在列表中");
        syncActionState();
      });

      favBtn2.addEventListener("click", function (e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        var active = toggleFavForSong(song);
        showToast(active ? "已收藏" : "已取消收藏");
        syncActionState();
      });

      row.addEventListener("click", function () {
        if (state.homeIgnoreClick) {
          state.homeIgnoreClick = false;
          return;
        }
        state.queueMode = "search";
        state.queue = songs.slice();
        var idx = Number(row.dataset.index || 0);
        state.currentIndex = idx;
        playSong(song);
      });

      row.appendChild(cover);
      row.appendChild(meta);
      row.appendChild(actions);

      li.appendChild(row);
      searchList.appendChild(li);
    });
  }

  function renderList(songs) {
    renderSearchList(songs);
  }

  function fetchJson(url, timeoutMs) {
    var totalTimeout = Number(timeoutMs || 15000);
    if (!isFinite(totalTimeout) || totalTimeout <= 0) totalTimeout = 15000;
    var startedAt = Date.now();

    function isLiumingyeApi(u) {
      return String(u || "").indexOf("https://api.liumingye.cn/m/api/") === 0;
    }

    function parseJsonText(text) {
      var t = String(text || "").trim();
      if (!t) throw new Error("empty_response");
      return JSON.parse(t);
    }

    function unwrapAllOriginsGet(data) {
      if (!data || typeof data !== "object") return data;
      if (!("contents" in data)) return data;
      var c = data.contents;
      if (typeof c === "string") {
        try {
          return JSON.parse(c);
        } catch (e) {
          return c;
        }
      }
      return c;
    }

    function remainingMs() {
      var elapsed = Date.now() - startedAt;
      var left = totalTimeout - elapsed;
      return left > 0 ? left : 0;
    }

    var commonProxies = buildCommonProxyList();

    var proxies = isLiumingyeApi(url)
      ? commonProxies.concat([{ name: "direct", build: function (u) { return u; } }])
      : [{ name: "direct", build: function (u) { return u; } }].concat(commonProxies);

    function fetchTextWithTimeout(targetUrl, timeoutLeft) {
      var ctl = null;
      var signal = null;
      try {
        ctl = new AbortController();
        signal = ctl.signal;
      } catch (e) {
        ctl = null;
        signal = null;
      }

      var t = null;
      if (timeoutLeft) {
        t = window.setTimeout(function () {
          try {
            if (ctl) ctl.abort();
          } catch (e) {}
        }, timeoutLeft);
      }

      return fetch(targetUrl, { method: "GET", signal: signal })
        .then(function (res) {
          if (!res.ok) throw new Error("status_" + res.status);
          return res.text();
        })
        .finally(function () {
          if (t) window.clearTimeout(t);
        });
    }

    function tryProxy(index) {
      var left = remainingMs();
      if (!left) return Promise.reject(new Error("timeout"));

      if (index === 0 && isLiumingyeApi(url)) {
        return fetchJsonp(url, Math.min(10000, left)).catch(function () {
          return tryProxy(index + 1);
        });
      }

      if (index >= proxies.length) {
        return Promise.reject(new Error("所有线路均繁忙，请稍后再试"));
      }

      var item = proxies[index];
      var targetUrl = item.build(url);
      var isAllOriginsGet = item.name === "allorigins_get";

      return fetchTextWithTimeout(targetUrl, left)
        .then(function (text) {
          if (isAllOriginsGet) {
            var wrapped = parseJsonText(text);
            return unwrapAllOriginsGet(wrapped);
          }
          return parseJsonText(text);
        })
        .catch(function (err) {
          try {
            console.warn("线路 " + (index + 1) + " 连接失败，自动切换下一条...", err && err.message ? err.message : "");
          } catch (e) {}
          return tryProxy(index + 1);
        });
    }

    return tryProxy(0);
  }

  function fetchJsonp(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var cb = "__jsonp_cb_" + String(Date.now()) + "_" + String(Math.floor(Math.random() * 1e9));
      var done = false;
      var script = document.createElement("script");

      function cleanup() {
        if (script && script.parentNode) script.parentNode.removeChild(script);
        try {
          delete window[cb];
        } catch (e) {
          window[cb] = undefined;
        }
      }

      var timer = null;
      if (timeoutMs) {
        timer = window.setTimeout(function () {
          if (done) return;
          done = true;
          cleanup();
          reject(new Error("timeout"));
        }, timeoutMs);
      }

      window[cb] = function (data) {
        if (done) return;
        done = true;
        if (timer) window.clearTimeout(timer);
        cleanup();
        resolve(data);
      };

      script.onerror = function () {
        if (done) return;
        done = true;
        if (timer) window.clearTimeout(timer);
        cleanup();
        reject(new Error("load_error"));
      };

      var sep = url.indexOf("?") >= 0 ? "&" : "?";
      script.src = url + sep + "callback=" + encodeURIComponent(cb);
      document.head.appendChild(script);
    });
  }

  function fetchRemoteText(url, timeoutMs) {
    var totalTimeout = Number(timeoutMs || 15000);
    if (!isFinite(totalTimeout) || totalTimeout <= 0) totalTimeout = 15000;
    var startedAt = Date.now();
    var proxies = [{ name: "direct", build: function (u) { return u; } }].concat(buildCommonProxyList());

    function remainingMs() {
      var elapsed = Date.now() - startedAt;
      var left = totalTimeout - elapsed;
      return left > 0 ? left : 0;
    }

    function fetchTextWithTimeout(targetUrl, timeoutLeft) {
      var ctl = null;
      var signal = null;
      try {
        ctl = new AbortController();
        signal = ctl.signal;
      } catch (e) {}

      var t = null;
      if (timeoutLeft) {
        t = window.setTimeout(function () {
          try {
            if (ctl) ctl.abort();
          } catch (e2) {}
        }, timeoutLeft);
      }

      return fetch(targetUrl, { method: "GET", signal: signal })
        .then(function (res) {
          if (!res.ok) throw new Error("status_" + res.status);
          return res.text();
        })
        .finally(function () {
          if (t) window.clearTimeout(t);
        });
    }

    function tryProxy(index) {
      var left = remainingMs();
      if (!left) return Promise.reject(new Error("timeout"));
      if (index >= proxies.length) return Promise.reject(new Error("all_failed"));
      var item = proxies[index];
      var targetUrl = item.build(url);
      var isAllOriginsGet = item.name === "allorigins_get";
      return fetchTextWithTimeout(targetUrl, left)
        .then(function (text) {
          if (!isAllOriginsGet) return text;
          var wrapped = safeJsonParse(text);
          if (wrapped && typeof wrapped === "object" && "contents" in wrapped) {
            return typeof wrapped.contents === "string" ? wrapped.contents : "";
          }
          return text;
        })
        .catch(function () {
          return tryProxy(index + 1);
        });
    }

    return tryProxy(0);
  }

  function parseNeteasePlaylistHtml(html, playlistId) {
    var text = String(html || "");
    if (!text) return [];
    var coverMatch = text.match(/<meta\s+itemprop="images"\s+content="([^"]+)"/i);
    var cover = coverMatch && coverMatch[1] ? String(coverMatch[1]).replace(/^http:\/\//i, "https://") : "";
    var songs = [];
    var seen = {};
    var re = /<li>\s*<a\s+href="\/song\?id=(\d+)">([\s\S]*?)<\/a>\s*<\/li>/gi;
    var m;
    while ((m = re.exec(text))) {
      var id = m[1] ? String(m[1]) : "";
      var title = decodeHtmlEntities(m[2] || "").trim();
      if (!id || !title || seen[id]) continue;
      seen[id] = 1;
      songs.push({
        id: id,
        title: title,
        artist: "未知歌手",
        cover: cover,
        url: "",
        source: "wy",
        sourceType: "wy",
        imported: true,
      });
      if (songs.length >= 500) break;
    }
    if (!songs.length) throw new Error("playlist_html_parse_failed");
    return songs;
  }

  function parseNeteaseOfficialPlaylistPayload(payload) {
    var data = payload && typeof payload === "object" ? payload : null;
    if (!data) return null;
    if (Number(data.code) !== 200) return null;
    var playlist = data.playlist && typeof data.playlist === "object" ? data.playlist : null;
    if (!playlist) return null;
    return playlist;
  }

  function fetchNeteaseOfficialSongDetails(idList) {
    var ids = (Array.isArray(idList) ? idList : [])
      .map(function (id) {
        return String(id || "").trim();
      })
      .filter(Boolean);
    if (!ids.length) return Promise.resolve([]);
    var chunkSize = 80;
    var chunks = [];
    for (var i = 0; i < ids.length; i += chunkSize) {
      chunks.push(ids.slice(i, i + chunkSize));
    }
    return Promise.all(
      chunks.map(function (chunk) {
        var url = "https://music.163.com/api/song/detail?ids=" + encodeURIComponent("[" + chunk.join(",") + "]");
        return fetchJson(url, 20000)
          .then(function (payload) {
            return payload && Array.isArray(payload.songs) ? payload.songs : [];
          })
          .catch(function () {
            return [];
          });
      })
    ).then(function (groups) {
      var merged = [];
      (groups || []).forEach(function (group) {
        merged = merged.concat(group || []);
      });
      return merged;
    });
  }

  function fetchNeteaseOfficialPlaylistTracks(playlistId) {
    var pid = String(playlistId || "").trim();
    if (!pid) return Promise.reject(new Error("invalid_playlist_id"));
    var urls = [
      "https://music.163.com/api/v6/playlist/detail?id=" + encodeURIComponent(pid),
      "https://music.163.com/api/v3/playlist/detail?id=" + encodeURIComponent(pid),
    ];

    function tryFetch(index, lastErr) {
      if (index >= urls.length) return Promise.reject(lastErr || new Error("official_playlist_failed"));
      return fetchJson(urls[index], 20000)
        .then(function (payload) {
          var playlist = parseNeteaseOfficialPlaylistPayload(payload);
          if (!playlist) throw new Error("official_playlist_invalid");
          var baseTracks = Array.isArray(playlist.tracks) ? playlist.tracks.slice() : [];
          var trackIds = Array.isArray(playlist.trackIds)
            ? playlist.trackIds
                .map(function (item) {
                  return item && item.id ? String(item.id) : "";
                })
                .filter(Boolean)
            : [];
          if (!trackIds.length) {
            return baseTracks
              .map(function (raw) {
                return normalizeProviderSong(raw, "wy");
              })
              .filter(Boolean);
          }

          var hasAllTracks = baseTracks.length >= trackIds.length;
          if (hasAllTracks) {
            return baseTracks
              .map(function (raw) {
                return normalizeProviderSong(raw, "wy");
              })
              .filter(Boolean);
          }

          return fetchNeteaseOfficialSongDetails(trackIds).then(function (detailTracks) {
            var detailMap = {};
            detailTracks.forEach(function (item) {
              if (!item || !item.id) return;
              detailMap[String(item.id)] = item;
            });
            return trackIds
              .map(function (id) {
                return normalizeProviderSong(detailMap[id], "wy");
              })
              .filter(Boolean);
          });
        })
        .catch(function (err) {
          return tryFetch(index + 1, err);
        });
    }

    return tryFetch(0);
  }

  function pickUrl(payload) {
    if (!payload) return "";
    if (typeof payload === "string") return payload;
    var direct = payload.url || payload.link;
    if (direct) return String(direct);
    var data = payload.data || payload.result;
    if (data && (data.url || data.link)) return String(data.url || data.link);
    if (data && typeof data === "string") return data;
    if (Array.isArray(data) && data.length) return pickUrl(data[0]);
    if (payload.data && payload.data.data) return pickUrl(payload.data.data);
    if (payload.result && payload.result.data) return pickUrl(payload.result.data);
    return "";
  }

  function cleanPlayableUrl(url) {
    var u = String(url || "").trim();
    if (!u) return "";
    if (/^(null|undefined|false|0)$/i.test(u)) return "";
    if (!/^https?:\/\//i.test(u) && !/^blob:/i.test(u) && !/^data:audio/i.test(u)) return "";
    return u.replace(/^http:\/\//i, "https://");
  }

  function playUrlCacheKey(song) {
    if (!song) return "";
    var id = song.id ? String(song.id) : "";
    var type = song.sourceType || song.source ? String(song.sourceType || song.source) : "";
    var url = song.url || song.src ? String(song.url || song.src) : "";
    if (id) return "id:" + comparableSourceType(type || "kw") + "::" + id;
    if (url) return "url:" + url;
    return "";
  }

  async function fetchVkeysPlayUrl(id, sourceType) {
    var type = comparableSourceType(sourceType || "");
    if (type !== "wy" && type !== "tx") return "";
    var src = type === "wy" ? "netease" : "tencent";
    var qualities = src === "netease" ? [4, 3, 2, 1] : [0];
    for (var i = 0; i < qualities.length; i += 1) {
      var q = qualities[i];
      var url = "https://api.vkeys.cn/v2/music/" + src + "?id=" + encodeURIComponent(id);
      if (q) url += "&quality=" + encodeURIComponent(q);
      try {
        var payload = await fetchJson(url, 12000);
        var out = cleanPlayableUrl((payload && payload.data && payload.data.url) || pickUrl(payload));
        if (out) return out;
      } catch (e) {}
    }
    return "";
  }

  async function fetchGdstudioPlayUrl(id, sourceType) {
    var providerSource = lyricProviderSource(sourceType || "kw");
    if (!providerSource) return "";
    var brs = [320, 192, 128];
    for (var i = 0; i < brs.length; i += 1) {
      var url =
        "https://music-api.gdstudio.xyz/api.php?types=url&source=" +
        encodeURIComponent(providerSource) +
        "&id=" +
        encodeURIComponent(id) +
        "&br=" +
        encodeURIComponent(brs[i]);
      try {
        var payload = await fetchJson(url, 12000);
        var out = cleanPlayableUrl(pickUrl(payload));
        if (out) return out;
      } catch (e) {}
    }
    return "";
  }

  async function fetchLingshaPlayUrl(id, sourceType) {
    if (!ENABLE_LINGSHA_APIS) return "";
    if (comparableSourceType(sourceType) !== "wy") return "";
    var brs = [320000, 192000, 128000];
    for (var i = 0; i < brs.length; i += 1) {
      var url =
        "https://netease-cloud-lingsha-music-api.vercel.app/song/url?id=" +
        encodeURIComponent(id) +
        "&br=" +
        encodeURIComponent(brs[i]);
      try {
        var payload = await fetchJson(url, 12000);
        var out = cleanPlayableUrl(pickUrl(payload));
        if (out) return out;
      } catch (e) {}
    }
    return "";
  }

  async function fetchMetingPlayUrl(id, sourceType) {
    if (!ENABLE_LINGSHA_APIS) return "";
    var providerSource = lyricProviderSource(sourceType || "kw");
    if (!providerSource) return "";
    var brs = [320000, 192000, 128000];
    for (var i = 0; i < brs.length; i += 1) {
      var url =
        "https://meting-api-lingsha.vercel.app/api?server=" +
        encodeURIComponent(providerSource) +
        "&type=url&id=" +
        encodeURIComponent(id) +
        "&br=" +
        encodeURIComponent(brs[i]);
      try {
        var payload = await fetchJson(url, 12000);
        var out = cleanPlayableUrl(pickUrl(payload));
        if (out) return out;
      } catch (e) {}
    }
    return "";
  }

  async function fetchLiumingyePlayUrl(id, sourceType) {
    var type = liumingyeLyricType(sourceType || "kw");
    var url =
      "https://api.liumingye.cn/m/api/link?id=" + encodeURIComponent(id) + "&type=" + encodeURIComponent(type);
    var payload = await fetchJson(url, 12000);
    return cleanPlayableUrl(pickUrl(payload));
  }

  async function resolveSongPlayUrl(song, options) {
    var opts = options && typeof options === "object" ? options : {};
    if (!song) return "";
    var id = song.id ? String(song.id) : "";
    var direct = cleanPlayableUrl(song.url || song.src);
    var isLocalSong = !!(
      song.localOnly ||
      String(song.sourceType || song.source || "").toLowerCase() === "local" ||
      /^local:/i.test(id)
    );
    if (direct && (isLocalSong || !id || song.imported)) return direct;
    var importUrl = cleanPlayableUrl(song.importUrl || "");
    if (!opts.skipImportUrl && importUrl) return importUrl;
    var type = song.sourceType || song.source ? String(song.sourceType || song.source) : getDefaultSourceType();
    var key = playUrlCacheKey(song);
    var cached = !opts.skipCache ? getCachedPlayUrl(key) : "";
    if (cached) return cached;

    var providers = [];
    var comparable = comparableSourceType(type);
    if (comparable === "wy") {
      providers.push(function () {
        return fetchGdstudioPlayUrl(id, type);
      });
      if (ENABLE_LINGSHA_APIS) {
        providers.push(function () {
          return fetchLingshaPlayUrl(id, type);
        });
        providers.push(function () {
          return fetchMetingPlayUrl(id, type);
        });
      }
      providers.push(function () {
        return fetchVkeysPlayUrl(id, type);
      });
    } else if (comparable === "tx") {
      providers.push(function () {
        return fetchVkeysPlayUrl(id, type);
      });
      providers.push(function () {
        return fetchGdstudioPlayUrl(id, type);
      });
      if (ENABLE_LINGSHA_APIS) {
        providers.push(function () {
          return fetchMetingPlayUrl(id, type);
        });
      }
    } else {
      providers.push(function () {
        return fetchGdstudioPlayUrl(id, type);
      });
      if (ENABLE_LINGSHA_APIS) {
        providers.push(function () {
          return fetchMetingPlayUrl(id, type);
        });
      }
    }
    providers.push(function () {
      return fetchLiumingyePlayUrl(id, type);
    });

    for (var i = 0; i < providers.length; i += 1) {
      try {
        var u = cleanPlayableUrl(await providers[i]());
        if (u) {
          setCachedPlayUrl(key, u);
          return u;
        }
      } catch (e) {}
    }
    return "";
  }

  function trackKey(song) {
    if (!song) return "";
    if (song.id) return "id:" + String(song.id);
    if (song.url || song.src) return "u:" + String(song.url || song.src);
    var t = String(song.title || "").trim().toLowerCase();
    var a = String(song.artist || "").trim().toLowerCase();
    if (!t) return "";
    return "ta:" + t + "::" + a;
  }

  function findLibrarySongIndex(song) {
    if (!song) return -1;
    var key = trackKey(song);
    if (!key) return -1;
    var list = state.library || [];
    for (var i = 0; i < list.length; i += 1) {
      if (trackKey(list[i]) === key) return i;
    }
    return -1;
  }

  function markSongPlaybackIssue(song, message) {
    if (!song) return false;
    var msg = String(message || "当前音源暂不可播放").trim() || "当前音源暂不可播放";
    var changed = false;
    if (song.playbackIssue !== msg) {
      song.playbackIssue = msg;
      changed = true;
    }
    var libIndex = findLibrarySongIndex(song);
    if (libIndex >= 0 && state.library && state.library[libIndex] && state.library[libIndex].playbackIssue !== msg) {
      state.library[libIndex].playbackIssue = msg;
      changed = true;
    }
    if (changed) {
      saveLibrary();
      renderHomePlaylist();
      renderQueue();
    }
    return changed;
  }

  function clearSongPlaybackIssue(song) {
    if (!song) return false;
    var changed = false;
    if (song.playbackIssue) {
      song.playbackIssue = "";
      changed = true;
    }
    var libIndex = findLibrarySongIndex(song);
    if (libIndex >= 0 && state.library && state.library[libIndex] && state.library[libIndex].playbackIssue) {
      state.library[libIndex].playbackIssue = "";
      changed = true;
    }
    if (changed) {
      saveLibrary();
      renderHomePlaylist();
      renderQueue();
    }
    return changed;
  }

  function disableSong(song) {
    markSongPlaybackIssue(song, "当前音源暂不可播放");
    return false;
  }

  function playNextAfterDisable(prevIndex, removedCurrent) {
    rebuildQueue();
    if (!state.queue.length) return;
    var next = Number(prevIndex);
    if (!isFinite(next)) next = 0;
    if (!removedCurrent) next += 1;
    if (next >= state.queue.length) next = removedCurrent ? state.queue.length - 1 : 0;
    if (next < 0) next = 0;
    playQueueIndex(next);
  }

  function ensureCurrentTrackInfo() {
    var current = getCurrentPlaybackSong();
    if (!current) return null;
    applyTrackInfo(current);
    return current;
  }

  function playQueueIndex(index) {
    if (!state.queue.length) {
      rebuildQueue();
    }
    if (!state.queue.length) {
      showToast("暂无歌曲");
      return;
    }
    var idx = Number(index);
    if (!isFinite(idx)) idx = 0;
    idx = Math.floor(idx);
    if (idx < 0 || idx >= state.queue.length) {
      idx = (idx % state.queue.length + state.queue.length) % state.queue.length;
    }
    var next = state.queue[idx];
    if (!next) return;
    maybeSyncTogetherSongSwitch(next);
    state.currentIndex = idx;
    syncAudioLoopMode();

    if (next.id) {
      playSongById(next.id, next);
    } else {
      openPlayer();
      setActiveTab("play");
      applyTrackInfo(next);
      scheduleWaveRebuild();
      playUrl(next.url || next.src);
    }
  }

  function computeNextIndex(delta) {
    if (!state.queue.length) return 0;
    var modeKey = getCurrentPlayMode().key;
    var len = state.queue.length;
    if (modeKey === "shuffle") {
      if (len <= 1) return 0;
      var current = Math.max(0, Math.min(len - 1, Number(state.currentIndex) || 0));
      var next = current;
      var guard = 0;
      while (next === current && guard < 8) {
        next = Math.floor(Math.random() * len);
        guard += 1;
      }
      if (next === current) next = (current + 1) % len;
      return next;
    }
    return (state.currentIndex + delta + len) % len;
  }

  function replayCurrentTrack() {
    var current = state.queue[state.currentIndex] || null;
    try {
      if (audioEl) audioEl.currentTime = 0;
    } catch (e) {}
    if (audioEl && audioEl.src) {
      setPlaying(true);
      return;
    }
    if (current && current.id) {
      playSongById(current.id, current);
      return;
    }
    if (current && (current.url || current.src)) {
      playUrl(current.url || current.src);
    }
  }

  function handleTrackEnd() {
    if (!state.queue.length) rebuildQueue();
    var modeKey = getCurrentPlayMode().key;
    if (modeKey === "single") {
      replayCurrentTrack();
      return;
    }
    if (!state.queue.length) {
      setPlayIcon(false);
      return;
    }
    playQueueIndex(computeNextIndex(1));
  }

  async function playSong(songInfo) {
    maybeSyncTogetherSongSwitch(songInfo);
    openPlayer();
    setActiveTab("play");
    applyTrackInfo(songInfo);
    scheduleWaveRebuild();
    setLoading(true);

    var id = songInfo && songInfo.id ? String(songInfo.id) : "";
    var type = songInfo && (songInfo.source || songInfo.sourceType) ? String(songInfo.source || songInfo.sourceType) : "";
    if (!type) type = getDefaultSourceType();
    var hasDirectUrl = !!cleanPlayableUrl(songInfo && (songInfo.url || songInfo.src) ? String(songInfo.url || songInfo.src) : "");
    if (!id && !hasDirectUrl) {
      setLoading(false);
      showToast("该歌曲无法播放");
      return;
    }

    try {
      var url = await resolveSongPlayUrl(songInfo);
      if (!url) throw new Error("empty_url");
      clearSongPlaybackIssue(songInfo);
      playUrl(url);
    } catch (e) {
      if (songInfo && (songInfo.localOnly || String(songInfo.sourceType || songInfo.source || "").toLowerCase() === "local")) {
        markSongPlaybackIssue(songInfo, "本地文件暂时无法读取");
        showToast("本地音频播放失败，请重新上传该文件");
        return;
      }
      var failedIndex = Number(state.currentIndex || 0);
      invalidateSongPlayUrl(songInfo);
      markSongPlaybackIssue(songInfo, "当前音源暂不可播放");
      if (await repairSongSource(songInfo, { replay: true })) return;
      showToast("该歌曲无法播放");
      var removed = disableSong(songInfo);
      playNextAfterDisable(failedIndex, removed);
    } finally {
      setLoading(false);
    }
  }

  function playSongById(id, songInfo) {
    var s = songInfo && typeof songInfo === "object" ? songInfo : {};
    if (!s.id) s.id = String(id || "");
    playSong(s);
  }

  function parseSongsFromPayload(payload) {
    var list = extractSearchArray(payload);
    return list
      .map(normalizeSong)
      .filter(function (x) {
        return !!x;
      });
  }

  function parseVkeysSearchSongs(payload, sourceKey) {
    if (!payload || typeof payload !== "object") return [];
    var ok = payload.code === 200 || payload.code === "200";
    if (!ok) return [];
    var arr = payload.data;
    if (!Array.isArray(arr) || !arr.length) return [];
    var out = [];
    for (var i = 0; i < arr.length; i += 1) {
      var raw = arr[i];
      if (!raw || typeof raw !== "object") continue;
      var id = raw.id;
      var name = raw.song || raw.name || raw.title;
      var singer = raw.singer || raw.artist || raw.author;
      var cover = raw.cover || raw.pic || raw.image;
      if (!id || !name) continue;
      out.push({
        id: String(id),
        title: String(name),
        artist: singer ? String(singer) : "未知歌手",
      cover: cover ? String(cover).replace(/^http:\/\//i, "https://") : "",
        url: "",
        source: sourceKey === "netease" ? "vkeys_netease" : "vkeys_tencent",
        sourceType: sourceKey === "netease" ? "vkeys_netease" : "vkeys_tencent",
      });
    }
    return out;
  }

  async function searchVkeysAll(keyword) {
    var q = String(keyword || "").trim();
    if (!q) return [];
    var urlNetease = "https://api.vkeys.cn/v2/music/netease?word=" + encodeURIComponent(q);
    var urlTencent = "https://api.vkeys.cn/v2/music/tencent?word=" + encodeURIComponent(q);
    var results = await Promise.all([
      fetchJson(urlNetease, 12000).catch(function () {
        return null;
      }),
      fetchJson(urlTencent, 12000).catch(function () {
        return null;
      }),
    ]);
    var a = parseVkeysSearchSongs(results[0], "netease");
    var b = parseVkeysSearchSongs(results[1], "tencent");
    return a.concat(b).slice(0, 50);
  }

  async function doSearch(keyword) {
    var q = String(keyword || "").trim();
    if (!q) {
      if (searchHint) searchHint.textContent = "请输入关键词";
      clearSearchList();
      return;
    }

    setSearchActive(true);
    clearSearchList();

    try {
      var result = await searchWithFallbackSources(q, getSearchType());
      if (result.songs && result.songs.length) {
        renderList(result.songs);
        if (searchHint) searchHint.textContent = "";
        if (result.aggregated) showToast("已显示全网多源结果");
        else {
          showToast(
            result.fallback
              ? "当前来源无结果，已显示 " + appSourceName(result.sourceType) + " 结果"
              : "已显示 " + appSourceName(result.sourceType) + " 多源结果"
          );
        }
        return;
      }
    } catch (e) {}

    if (searchHint) searchHint.textContent = "搜索失败，未找到相关歌曲";
    showToast("所有音源均无法连接");
  }

  function normalizeMatchText(input) {
    var s = String(input || "")
      .toLowerCase()
      .replace(/（[^）]*）|\([^)]*\)|【[^】]*】|\[[^\]]*\]/g, " ")
      .replace(/[\u2018\u2019'"]/g, "")
      .replace(/[-‐‑–—_]/g, " ")
      .replace(/[·•]/g, " ")
      .replace(/[^a-z0-9\u00c0-\u024f\u4e00-\u9fff\uac00-\ud7af\s]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return s;
  }

  function normalizeTitleForMatch(title) {
    var t = normalizeMatchText(title);
    t = t.replace(/\b(feat|ft|with)\b/g, " ").replace(/\s+/g, " ").trim();
    return t;
  }

  function splitArtistParts(artist) {
    var a = normalizeMatchText(artist).replace(/\b(feat|ft|with)\b/g, " ");
    return a
      .split(/[\/,&，、;；]+|\s{2,}/g)
      .map(function (x) {
        return String(x || "").trim();
      })
      .filter(function (x) {
        return !!x;
      });
  }

  function artistMatches(a, b) {
    var aa = splitArtistParts(a);
    var bb = splitArtistParts(b);
    if (!aa.length || !bb.length) return true;
    for (var i = 0; i < aa.length; i += 1) {
      for (var j = 0; j < bb.length; j += 1) {
        var x = aa[i];
        var y = bb[j];
        if (!x || !y) continue;
        if (x === y) return true;
        if (x.length >= 2 && y.length >= 2 && (x.indexOf(y) >= 0 || y.indexOf(x) >= 0)) return true;
      }
    }
    return false;
  }

  function titleScore(a, b) {
    var x = normalizeTitleForMatch(a);
    var y = normalizeTitleForMatch(b);
    if (!x || !y) return 0;
    if (x === y) return 3;
    if (x.indexOf(y) >= 0 || y.indexOf(x) >= 0) return 2;
    return 0;
  }

  function computeMatchScore(origin, candidate) {
    if (!origin || !candidate) return -1;
    var ts = titleScore(origin.title, candidate.title);
    if (!ts) return -1;
    if (!artistMatches(origin.artist, candidate.artist)) return -1;
    var score = ts + 3;
    var st = String(candidate.sourceType || candidate.source || "");
    if (st === "kw") score += 0.4;
    else if (st === "kg") score += 0.3;
    else if (st === "tx") score += 0.2;
    else if (st === "wy") score -= 0.2;
    return score;
  }

  async function searchLiumingyeSongs(keyword, sourceType) {
    var q = String(keyword || "").trim();
    if (!q) return [];
    var t = String(sourceType || "").trim();
    if (!t) return [];
    var url =
      "https://api.liumingye.cn/m/api/search?q=" + encodeURIComponent(q) + "&type=" + encodeURIComponent(t);
    var payload = await fetchJson(url, 10000);
    var list = extractSearchArray(payload);
    if (!list || !list.length) return [];
    var songs = list
      .map(normalizeSong)
      .filter(function (x) {
        return !!x;
      })
      .slice(0, 20);
    songs.forEach(function (s) {
      s.url = "";
      s.source = t;
      s.sourceType = t;
    });
    return songs;
  }

  function comparableSourceType(sourceType) {
    var type = String(sourceType || "").trim();
    if (type === "vkeys_netease") return "wy";
    if (type === "vkeys_tencent") return "tx";
    return type;
  }

  async function findBestMatchForSong(song, options) {
    if (!song) return null;
    var opts = options && typeof options === "object" ? options : {};
    var title = String(song.title || "").trim();
    if (!title) return null;
    var artist = String(song.artist || "").trim();
    var q = (title + " " + artist).trim();
    var currentSource = String(song.sourceType || song.source || "").trim();
    var currentId = String(song.id || "");
    var currentComparableSource = comparableSourceType(currentSource);
    if (currentSource === "vkeys_netease") currentSource = "wy";
    if (currentSource === "vkeys_tencent") currentSource = "tx";
    var sources = [];
    var sourcePool = getSourcePool();
    if (currentSource && sourcePool.indexOf(currentSource) >= 0) sources.push(currentSource);
    sourcePool.forEach(function (type) {
      if (sources.indexOf(type) < 0) sources.push(type);
    });
    var best = null;
    var bestScore = -1;

    async function acceptCandidate(candidate, score) {
      if (!candidate) return false;
      if (!opts.requirePlayable) return true;
      if (score < 5) return false;
      var url = await resolveSongPlayUrl(candidate).catch(function () {
        return "";
      });
      if (!url) return false;
      candidate.url = url;
      return true;
    }

    for (var i = 0; i < sources.length; i += 1) {
      var type = sources[i];
      try {
        var candidates = await searchProviderGroup(q, type);
        for (var j = 0; j < candidates.length; j += 1) {
          var c = candidates[j];
          if (
            opts.excludeCurrent &&
            currentId &&
            String(c.id || "") === currentId &&
            comparableSourceType(c.sourceType || c.source) === currentComparableSource
          ) {
            continue;
          }
          var score = computeMatchScore(song, c);
          if (score > bestScore && (await acceptCandidate(c, score))) {
            bestScore = score;
            best = c;
          }
          if (bestScore >= 6) return best;
        }
      } catch (e) {}
    }
    if (bestScore < 5) return null;
    return best;
  }

  function applyMatchToSong(target, candidate) {
    if (!target || !candidate) return false;
    var newId = candidate.id ? String(candidate.id) : "";
    var newType = candidate.sourceType || candidate.source ? String(candidate.sourceType || candidate.source) : "";
    if (!newId || !newType) return false;
    if (String(target.id || "") === newId && String(target.sourceType || target.source || "") === newType) return false;
    target.id = newId;
    target.source = newType;
    target.sourceType = newType;
    target.url = candidate.url ? cleanPlayableUrl(candidate.url) : "";
    target.importUrl = "";
    if (!target.cover || String(target.cover) === DEFAULT_COVER) {
      target.cover = candidate.cover || target.cover;
    }
    if (!target.artist || String(target.artist) === "未知歌手") {
      target.artist = candidate.artist || target.artist;
    }
    if (candidate.lyric || candidate.lrc) {
      target.lyric = String(candidate.lyric || candidate.lrc);
    }
    return true;
  }

  function repairAttemptKey(song) {
    var title = normalizeTitleForMatch(song && song.title ? song.title : "");
    var artist = normalizeMatchText(song && song.artist ? song.artist : "");
    if (!title) return "";
    return "repair:" + title + "::" + artist;
  }

  async function repairSongSource(song, options) {
    if (!song) return false;
    if (song.localOnly || String(song.sourceType || song.source || "").toLowerCase() === "local") return false;
    var opts = options && typeof options === "object" ? options : {};
    var key = repairAttemptKey(song);
    if (!key) return false;
    if (!state.repairMap) state.repairMap = {};
    var attempts = Number(state.repairMap[key] || 0);
    if (attempts >= 2) return false;
    state.repairMap[key] = attempts + 1;

    var libIndex = findLibrarySongIndex(song);
    invalidateSongPlayUrl(song);
    showToast("播放失败，正在自动换源...");
    if (song.id) {
      var freshUrl = await resolveSongPlayUrl(song, { skipCache: true });
      if (freshUrl) {
        song.disabled = false;
        clearSongPlaybackIssue(song);
        if (libIndex >= 0 && state.library && state.library[libIndex]) {
          state.library[libIndex].disabled = false;
        }
        saveLibrary();
        if (opts.replay) {
          try {
            if (audioEl) audioEl.pause();
          } catch (eFresh) {}
          window.setTimeout(function () {
            playSong(song);
          }, 80);
        }
        prefetchLyricsForTracks([song], 1, { concurrency: 1 }).catch(function () {});
        return true;
      }
    }
    var candidate = await findBestMatchForSong(song, { excludeCurrent: true, requirePlayable: true });
    if (!candidate) return false;

    var changed = applyMatchToSong(song, candidate);
    if (!changed && candidate.url) {
      song.url = String(candidate.url).replace(/^http:\/\//i, "https://");
      changed = true;
    }
    if (!changed) return false;

    song.disabled = false;
    clearSongPlaybackIssue(song);
    if (libIndex >= 0 && state.library && state.library[libIndex]) {
      var libSong = state.library[libIndex];
      applyMatchToSong(libSong, candidate);
      if (candidate.url) libSong.url = String(candidate.url).replace(/^http:\/\//i, "https://");
      libSong.disabled = false;
      libSong.playbackIssue = "";
    }

    saveLibrary();
    prefetchLyricsForTracks([song], 1, { concurrency: 1 }).catch(function () {});
    rebuildQueuePreservingCurrent(song);
    renderHomePlaylist();
    showToast("已自动换到 " + appSourceName(song.sourceType || song.source) + " 音源");

    if (opts.replay) {
      try {
        if (audioEl) audioEl.pause();
      } catch (e) {}
      window.setTimeout(function () {
        playSong(song);
      }, 80);
    }
    return true;
  }

  function previewFixKey(song) {
    var t = normalizeTitleForMatch(song && song.title ? song.title : "");
    var a = normalizeMatchText(song && song.artist ? song.artist : "");
    if (!t) return "";
    return "pf:" + t + "::" + a;
  }

  async function fixShortPreviewTrack(track) {
    if (!track) return;
    var libIndex = findLibrarySongIndex(track);
    showToast("正在匹配可播放音源...");
    var candidate = await findBestMatchForSong(track, { excludeCurrent: true, requirePlayable: true });
    if (!candidate) {
      showToast("未找到更可用的音源");
      return;
    }
    var changed = applyMatchToSong(track, candidate);
    if (!changed) return;
    if (libIndex >= 0 && state.library && state.library[libIndex]) {
      var libSong = state.library[libIndex];
      applyMatchToSong(libSong, candidate);
    }
    saveLibrary();
    prefetchLyricsForTracks([track], 1, { concurrency: 1 }).catch(function () {});
    rebuildQueuePreservingCurrent(track);
    renderHomePlaylist();
    try {
      if (audioEl) audioEl.pause();
    } catch (e) {}
    playSong(track);
  }

  function hasLyricText(song) {
    if (!song) return false;
    var txt = song.lyric || song.lrc ? String(song.lyric || song.lrc).trim() : "";
    return !!txt;
  }

  function cloneSongWithoutDirectUrl(song) {
    if (!song || typeof song !== "object") return song;
    var copy = Object.assign({}, song);
    copy.url = "";
    if ("src" in copy) copy.src = "";
    return copy;
  }

  function normalizeImportedTrack(track) {
    if (!track) return null;
    var out = Object.assign({}, track);
    var directUrl = cleanPlayableUrl(out.url || out.src);
    var hasId = !!(out.id && String(out.id).trim());
    out.imported = true;
    out.importUrl = directUrl || "";
    out.pendingMatch = !hasId && !directUrl;
    if (directUrl) out.url = directUrl;
    return out;
  }

  function maybeFixShortPreviewFromMetadata() {
    if (!audioEl) return;
    var d = Number(audioEl.duration || 0);
    if (!isFinite(d) || d <= 0) return;
    if (d < 20 || d > 45) return;
    var current = state.queue[state.currentIndex];
    if (!current) return;
    if (current.localOnly) return;
    var st = String(current.sourceType || current.source || "");
    if (!current.imported && st !== "vkeys_netease" && st !== "wy") return;
    var k = previewFixKey(current);
    if (!k) return;
    if (!state.previewFixMap) state.previewFixMap = {};
    if (state.previewFixMap[k]) return;
    state.previewFixMap[k] = 1;
    fixShortPreviewTrack(current).catch(function () {});
  }

  function prefetchMatchForTracks(tracks, maxCount, options) {
    if (!tracks || !tracks.length) return Promise.resolve({ matched: 0 });
    var opts = options && typeof options === "object" ? options : {};
    var limit = Number(maxCount || 20);
    if (!isFinite(limit) || limit <= 0) limit = 20;
    limit = Math.min(limit, tracks.length);
    var concurrency = Number(opts.concurrency || 2);
    if (!isFinite(concurrency) || concurrency <= 0) concurrency = 2;
    var idx = 0;
    var inFlight = 0;
    var changed = 0;
    var settled = false;

    return new Promise(function (resolve) {
      function finish() {
        if (settled) return;
        if (idx < limit || inFlight > 0) return;
        settled = true;
        if (changed > 0) {
          var currentBefore = state.queue && state.queue.length ? state.queue[state.currentIndex] : null;
          saveLibrary();
          rebuildQueuePreservingCurrent(currentBefore);
          renderHomePlaylist();
          showToast("已匹配 " + changed + " 首可播放音源");
        }
        resolve({ matched: changed });
      }

      function enqueue() {
        while (inFlight < concurrency && idx < limit) {
          var t = tracks[idx];
          idx += 1;
          if (!t) continue;
          inFlight += 1;
          (function (track) {
            var shouldPreferSearchMatch = !!(opts.preferSearchMatch || !track.id);
            var resolverTrack = opts.ignoreDirectUrl || track.importUrl ? cloneSongWithoutDirectUrl(track) : track;
            var existingPromise = shouldPreferSearchMatch
              ? Promise.resolve("")
              : resolveSongPlayUrl(resolverTrack, { skipCache: !!opts.skipCache });

            existingPromise
              .then(function (existingUrl) {
                if (existingUrl) {
                  var cleaned = cleanPlayableUrl(existingUrl);
                  if (cleaned && cleaned !== cleanPlayableUrl(track.url)) changed += 1;
                  track.url = cleaned;
                  track.pendingMatch = false;
                  return null;
                }
                return findBestMatchForSong(track, { excludeCurrent: !!track.id, requirePlayable: true });
              })
              .then(function (candidate) {
                if (!candidate) return;
                var ok = applyMatchToSong(track, candidate);
                if (!ok && candidate.url) {
                  track.url = cleanPlayableUrl(candidate.url);
                  ok = !!track.url;
                }
                if (ok) changed += 1;
                track.pendingMatch = false;
              })
              .catch(function () {})
              .finally(function () {
                inFlight -= 1;
                enqueue();
                finish();
              });
          })(t);
        }
        finish();
      }

      enqueue();
    });
  }

  function prefetchLyricsForTracks(tracks, maxCount, options) {
    if (!tracks || !tracks.length) return Promise.resolve({ lyrics: 0 });
    var opts = options && typeof options === "object" ? options : {};
    var limit = Number(maxCount || 30);
    if (!isFinite(limit) || limit <= 0) limit = 30;
    limit = Math.min(limit, tracks.length);
    var concurrency = Number(opts.concurrency || 4);
    if (!isFinite(concurrency) || concurrency <= 0) concurrency = 4;
    var idx = 0;
    var inFlight = 0;
    var changed = 0;
    var settled = false;

    return new Promise(function (resolve) {
      function saveLyricToTrack(t, txt) {
        if (!t || !txt || !String(txt).trim()) return false;
        var text = String(txt);
        var key = trackKey(t);
        if (!key) return false;
        if (!state.lyricCache) state.lyricCache = {};
        state.lyricCache[key] = text;
        if (t.lyric && String(t.lyric).trim() === text.trim()) return false;
        t.lyric = text;
        var libIndex = findLibrarySongIndex(t);
        if (libIndex >= 0 && state.library && state.library[libIndex]) {
          state.library[libIndex].lyric = text;
        }
        return true;
      }

      function finish() {
        if (settled) return;
        if (idx < limit || inFlight > 0) return;
        settled = true;
        if (changed > 0) {
          saveLibrary();
          renderHomePlaylist();
          showToast("已同步 " + changed + " 首歌词");
        }
        resolve({ lyrics: changed });
      }

      function enqueue() {
        while (inFlight < concurrency && idx < limit) {
          var t = tracks[idx];
          idx += 1;
          if (!t) continue;
          var key = trackKey(t);
          if (!key) continue;
          if (!state.lyricCache) state.lyricCache = {};
          if (state.lyricCache[key]) {
            if (saveLyricToTrack(t, state.lyricCache[key])) changed += 1;
            continue;
          }
          if (t.lyric || t.lrc) {
            if (saveLyricToTrack(t, String(t.lyric || t.lrc))) changed += 1;
            continue;
          }
          if (!t.id && !t.lyricUrl) continue;
          inFlight += 1;
          (function (track) {
            var lyricTask = track.lyricUrl
              ? fetchLyricByUrl(String(track.lyricUrl))
              : fetchLyricById(String(track.id), String(track.sourceType || track.source || ""));
            lyricTask
              .then(function (txt) {
                if (saveLyricToTrack(track, txt)) changed += 1;
              })
              .catch(function () {})
              .finally(function () {
                inFlight -= 1;
                enqueue();
                finish();
              });
          })(t);
        }
        finish();
      }

      enqueue();
    });
  }

  function prefetchImportedCovers(tracks, maxCount, options) {
    if (!tracks || !tracks.length) return Promise.resolve({ covers: 0 });
    var opts = options && typeof options === "object" ? options : {};
    var limit = Number(maxCount || 20);
    if (!isFinite(limit) || limit <= 0) limit = 20;
    limit = Math.min(limit, tracks.length);
    var concurrency = Number(opts.concurrency || 3);
    if (!isFinite(concurrency) || concurrency <= 0) concurrency = 3;
    var idx = 0;
    var inFlight = 0;
    var changed = 0;
    var settled = false;

    return new Promise(function (resolve) {
      function finish() {
        if (settled) return;
        if (idx < limit || inFlight > 0) return;
        settled = true;
        if (changed > 0) {
          saveLibrary();
          renderHomePlaylist();
        }
        resolve({ covers: changed });
      }

      function enqueue() {
        while (inFlight < concurrency && idx < limit) {
          var track = tracks[idx];
          idx += 1;
          if (!track || !track.imported) continue;
          var cover = String(track.cover || "").trim();
          if (!cover || /^data:image\//i.test(cover)) continue;
          inFlight += 1;
          cacheRemoteCoverForSong(track)
            .then(function (ok) {
              if (ok) changed += 1;
            })
            .catch(function () {})
            .finally(function () {
              inFlight -= 1;
              enqueue();
              finish();
            });
        }
        finish();
      }

      enqueue();
    });
  }

  function enhanceImportedTracks(tracks) {
    if (!tracks || !tracks.length) return;
    var fastLimit = Math.min(tracks.length, 12);
    var rest = tracks.slice(fastLimit);

    function runLyricEnhancement(batch, limit, options) {
      if (!batch || !batch.length) return Promise.resolve({ lyrics: 0 });
      var opts = options && typeof options === "object" ? options : {};
      return prefetchLyricsForTracks(batch, limit, {
        concurrency: opts.lyricConcurrency || 6,
      }).then(function (lyricResult) {
        return {
          lyrics: lyricResult && lyricResult.lyrics ? lyricResult.lyrics : 0,
        };
      });
    }

    showToast("正在后台补歌词和封面...");
    Promise.all([
      runLyricEnhancement(tracks, fastLimit, { lyricConcurrency: 8 }),
      prefetchImportedCovers(tracks, fastLimit, { concurrency: 3 }),
    ])
      .then(function (result) {
        var lyricResult = result && result[0] ? result[0] : { lyrics: 0 };
        var coverResult = result && result[1] ? result[1] : { covers: 0 };
        var parts = [];
        if (lyricResult.lyrics) parts.push("同步 " + lyricResult.lyrics + " 首歌词");
        if (coverResult.covers) parts.push("缓存 " + coverResult.covers + " 张封面");
        if (parts.length) showToast("导入完成：" + parts.join("，"));
        if (!rest.length) return;
        window.setTimeout(function () {
          runLyricEnhancement(rest, rest.length, { lyricConcurrency: 4 }).catch(function () {});
          prefetchImportedCovers(rest, rest.length, { concurrency: 2 }).catch(function () {});
        }, 80);
      })
      .catch(function () {});
  }

  function importPlaylist(playlistId) {
    function normalizePlaylistIdInput(input) {
      var raw = String(input || "").trim();
      if (!raw) return "";
      var nums = raw.match(/\d{5,}/g);
      if (!nums || !nums.length) return "";
      nums.sort(function (a, b) {
        return String(b).length - String(a).length;
      });
      return String(nums[0] || "").trim();
    }

    var pid = normalizePlaylistIdInput(playlistId);
    if (!pid) {
      showToast("请输入正确的歌单 ID 或分享链接");
      return;
    }

    state.importBusy = true;
    showToast("正在解析歌单...");
    var isNullOrigin = false;
    try {
      isNullOrigin = window.location.protocol === "file:" || window.location.origin === "null";
    } catch (e) {}

    var urls = [
      API_METING_PLAYLIST_FALLBACK + encodeURIComponent(pid),
      API_METING_PLAYLIST + encodeURIComponent(pid),
    ];
    if (ENABLE_LINGSHA_APIS) {
      urls.unshift("https://netease-cloud-lingsha-music-api.vercel.app/playlist/detail?id=" + encodeURIComponent(pid));
    }

    function fetchPlaylistPayload(i, lastErr) {
      if (i >= urls.length) {
        return fetchRemoteText("https://music.163.com/playlist?id=" + encodeURIComponent(pid), 20000)
          .then(function (html) {
            return parseNeteasePlaylistHtml(html, pid);
          })
          .catch(function (htmlErr) {
            return Promise.reject(htmlErr || lastErr || new Error("all_failed"));
          });
      }
      var u = urls[i];
      var tryJsonpFirst = isNullOrigin && u.indexOf("api.i-meto.com/meting/api") >= 0;
      var p = tryJsonpFirst
        ? fetchJsonp(u, 15000).catch(function () {
            return fetchJson(u, 15000);
          })
        : fetchJson(u, 15000).catch(function () {
            return fetchJsonp(u, 15000);
          });
      return p.catch(function (err) {
        return fetchPlaylistPayload(i + 1, err);
      });
    }

    fetchNeteaseOfficialPlaylistTracks(pid)
      .catch(function () {
        return fetchPlaylistPayload(0);
      })
      .then(function (payload) {
        var list = Array.isArray(payload) ? payload : extractSearchArray(payload);
        if (!Array.isArray(list) || !list.length) {
          var reason = "";
          if (typeof payload === "string") {
            var s = String(payload || "").trim();
            if (s && (s.indexOf("<!DOCTYPE") >= 0 || s.indexOf("<html") >= 0)) reason = "接口返回异常（HTML），可能被拦截";
          } else if (payload && typeof payload === "object") {
            reason =
              payload.msg ||
              payload.message ||
              payload.error ||
              payload.reason ||
              (payload.data && typeof payload.data === "string" ? payload.data : "");
          }
          showToast(reason ? "歌单解析失败：" + String(reason) : "未解析到歌曲");
          state.importBusy = false;
          if (roleMusicPrefetchQueue.length) scheduleRoleMusicPrefetch(1800);
          return;
        }

        var tracks = list
          .map(function (item) {
            if (item && item.sourceType) return item;
            return normalizeMetingTrack(item);
          })
          .filter(function (x) {
            return !!x;
          });

        if (!tracks.length) {
          showToast("未解析到可用歌曲");
          state.importBusy = false;
          if (roleMusicPrefetchQueue.length) scheduleRoleMusicPrefetch(1800);
          return;
        }

        tracks = tracks
          .map(function (t) {
            if (!t) return null;
            var out = normalizeImportedTrack(t);
            if (!out) return null;
            var hasId = !!(out.id && String(out.id).trim());
            var hasUrl = !!(out.url || out.src || out.importUrl);
            if (!hasId && !hasUrl) return null;
            out.source = out.source || "wy";
            out.sourceType = out.sourceType || "wy";
            return out;
          })
          .filter(function (t) {
            return !!t;
          });

        if (!tracks.length) {
          showToast("未解析到可用歌曲");
          state.importBusy = false;
          if (roleMusicPrefetchQueue.length) scheduleRoleMusicPrefetch(1800);
          return;
        }

        var added = [];
        var updated = 0;
        tracks.forEach(function (track) {
          if (!track) return;
          var normalized = normalizeLibrarySong(track);
          if (!normalized) return;
          var existingIndex = findLibrarySongIndex(normalized);
          if (existingIndex >= 0 && state.library && state.library[existingIndex]) {
            if (mergeLibrarySongDetails(state.library[existingIndex], normalized)) {
              updated += 1;
            }
            return;
          }
          state.library = state.library.concat([normalized]);
          added.push(normalized);
        });

        if (!added.length && !updated) {
          state.importBusy = false;
          if (roleMusicPrefetchQueue.length) scheduleRoleMusicPrefetch(1800);
          showToast("没有可导入的新歌曲");
          renderHomePlaylist();
          return;
        }

        state.queueMode = "library";
        rebuildQueue();
        saveLibrary();
        renderHomePlaylist();
        if (added.length && updated) {
          showToast("成功导入 " + added.length + " 首，并补全 " + updated + " 首歌曲信息");
        } else if (added.length) {
          showToast("成功导入 " + added.length + " 首歌曲！");
        } else {
          showToast("已补全 " + updated + " 首歌曲信息");
        }
        enhanceImportedTracks(added);
        state.importBusy = false;
        if (roleMusicPrefetchQueue.length) scheduleRoleMusicPrefetch(1800);
      })
      .catch(function (err) {
        try {
          console.error("importPlaylist failed:", err);
        } catch (e) {}
        var reason = err && err.message ? String(err.message) : "";
        showToast(reason ? "歌单解析失败：" + reason : "歌单解析失败");
        state.importBusy = false;
        if (roleMusicPrefetchQueue.length) scheduleRoleMusicPrefetch(1800);
      });
  }

  tabs.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var tabName = btn.dataset.tab || "home";
      if (tabName === "me") resetToSelfProfileView();
      setActiveTab(tabName);
      setActivePage(tabName);
      if (tabName === "play") {
        openPlayer();
        scheduleWaveRebuild();
      }
    });
  });

  function bindSongLongPress(container, itemSelector, options) {
    if (!container) return;
    var opts = options && typeof options === "object" ? options : {};
    var pressTimer = 0;
    var pressItem = null;
    var startX = 0;
    var startY = 0;
    var suppressContextMenuUntil = 0;

    function clearPress() {
      if (pressTimer) window.clearTimeout(pressTimer);
      pressTimer = 0;
      pressItem = null;
      startX = 0;
      startY = 0;
    }

    function getTouchPoint(e) {
      var touch = e && e.touches && e.touches[0] ? e.touches[0] : null;
      if (!touch) return null;
      return { x: Number(touch.clientX || 0), y: Number(touch.clientY || 0) };
    }

    function resolveItem(target) {
      if (!target || !target.closest) return null;
      var item = target.closest(itemSelector);
      if (!item || !container.contains(item)) return null;
      return item;
    }

    function schedulePress(item, e) {
      clearPress();
      pressItem = item;
      var point = getTouchPoint(e);
      if (point) {
        startX = point.x;
        startY = point.y;
      }
      pressTimer = window.setTimeout(function () {
        pressTimer = 0;
        state.homeIgnoreClick = true;
        suppressContextMenuUntil = Date.now() + 900;
        var song = typeof opts.resolveSong === "function" ? opts.resolveSong(pressItem) : null;
        if (!song) return;
        if (typeof opts.onLongPress === "function") {
          opts.onLongPress(pressItem, song);
          return;
        }
        openAddToPlaylistSheet(song);
      }, 500);
    }

    container.addEventListener("touchstart", function (e) {
      var target = e.target;
      if (!target) return;
      if (typeof opts.ignoreTarget === "function" && opts.ignoreTarget(target)) return;
      var item = resolveItem(target);
      if (!item) return;
      schedulePress(item, e);
    });

    container.addEventListener("touchmove", function (e) {
      if (!pressTimer) return;
      var point = getTouchPoint(e);
      if (!point) return;
      if (Math.abs(point.x - startX) > 10 || Math.abs(point.y - startY) > 10) {
        clearPress();
      }
    });

    container.addEventListener("touchend", function () {
      if (pressTimer) window.clearTimeout(pressTimer);
      pressTimer = 0;
      pressItem = null;
    });

    container.addEventListener("touchcancel", function () {
      clearPress();
    });

    container.addEventListener("contextmenu", function (e) {
      if (Date.now() < suppressContextMenuUntil) {
        e.preventDefault();
        return;
      }
      var target = e.target;
      if (!target) return;
      if (typeof opts.ignoreTarget === "function" && opts.ignoreTarget(target)) return;
      var item = resolveItem(target);
      if (!item) return;
      e.preventDefault();
      state.homeIgnoreClick = true;
      var song = typeof opts.resolveSong === "function" ? opts.resolveSong(item) : null;
      if (!song) return;
      if (typeof opts.onLongPress === "function") {
        opts.onLongPress(item, song);
        return;
      }
      openAddToPlaylistSheet(song);
    });
  }

  bindSongLongPress(homePlaylist, ".playlist-item", {
    resolveSong: function (item) {
      var index = Number(item && item.dataset ? item.dataset.index : 0);
      var list = getActiveLibrary();
      return list[index] || null;
    },
    onLongPress: function (item, song) {
      var key = trackKey(song) || String((item && item.dataset && item.dataset.key) || "");
      if (!key) return;
      selectHomeSongByKey(key);
    },
  });

  bindSongLongPress(searchList, ".search-item", {
    ignoreTarget: function (target) {
      return !!(target && target.closest && target.closest(".search-action-btn"));
    },
    resolveSong: function (item) {
      var index = Number(item && item.dataset ? item.dataset.index : 0);
      return state.searchResults && state.searchResults[index] ? state.searchResults[index] : null;
    },
  });

  if (homePlaylist) {
    homePlaylist.addEventListener("click", function (e) {
      var target = e.target;
      if (!target) return;
      var btn = target.closest ? target.closest(".playlist-item") : null;
      if (!btn || !homePlaylist.contains(btn)) return;
      if (state.homeIgnoreClick) {
        state.homeIgnoreClick = false;
        return;
      }
      if (state.homeSelecting) {
        e.preventDefault();
        e.stopPropagation();
        toggleHomeSelectedByKey(String(btn.dataset.key || ""));
        return;
      }
      var index = Number(btn.dataset.index || 0);
      state.queueMode = "library";
      rebuildQueue();
      playQueueIndex(index);
    });
  }

  if (homeSelectCancel) {
    homeSelectCancel.addEventListener("click", function () {
      exitHomeSelectMode();
    });
  }

  if (homeSelectAll) {
    homeSelectAll.addEventListener("click", function () {
      toggleHomeSelectAll();
    });
  }

  if (homeDeleteBtn) {
    homeDeleteBtn.addEventListener("click", function () {
      deleteHomeSelectedSongs();
    });
  }

  if (homeExitBtn) {
    homeExitBtn.addEventListener("click", function () {
      requestCloseMusicApp();
    });
  }

  if (homeAddPlaylistBtn) {
    homeAddPlaylistBtn.addEventListener("click", function () {
      var songs = getHomeSelectedSongs();
      if (!songs.length) {
        showToast("请先选择歌曲");
        return;
      }
      openAddToPlaylistSheet(songs, { source: "home-selection" });
    });
  }

  if (searchInput) {
    searchInput.addEventListener("focus", function () {
      setSearchActive(true);
    });

    searchInput.addEventListener("blur", function () {
      if (!String(searchInput.value || "").trim()) setSearchActive(false);
    });

    searchInput.addEventListener("input", function () {
      setClearVisible(!!searchInput.value);
      if (!searchInput.value && searchHint) {
        searchHint.textContent = "输入关键词后回车搜索";
        clearSearchList();
      }
    });

    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        doSearch(searchInput.value);
      }
    });
  }

  if (searchSource) {
    searchSource.addEventListener("change", function () {
      if (!searchInput) return;
      if (String(searchInput.value || "").trim()) doSearch(searchInput.value);
    });
  }

  if (searchClear) {
    searchClear.addEventListener("click", function () {
      if (!searchInput) return;
      searchInput.value = "";
      setClearVisible(false);
      if (searchHint) searchHint.textContent = "输入关键词后回车搜索";
      clearSearchList();
      searchInput.focus();
    });
  }

  if (searchCancel) {
    searchCancel.addEventListener("click", function () {
      if (searchInput) {
        searchInput.value = "";
        searchInput.blur();
      }
      setClearVisible(false);
      if (searchHint) searchHint.textContent = "输入关键词后回车搜索";
      clearSearchList();
      setSearchActive(false);
    });
  }

  function handlePlaylistImportClick() {
    uiPromptCompat("请输入网易云歌单 ID (例如: 24381616)", "", { title: "解析网易云歌单" }).then(function (pid) {
      if (pid === null || pid === undefined) return;
      var v = String(pid || "").trim();
      if (!v) return;
      importPlaylist(v);
    });
  }

  if (playlistImportBtn) playlistImportBtn.addEventListener("click", handlePlaylistImportClick);

  function parseLocalSongTitle(filename) {
    var name = String(filename || "").trim();
    if (!name) return "本地音频";
    return name.replace(/\.[^.]+$/, "") || "本地音频";
  }

  function normalizeLocalStem(filename) {
    return parseLocalSongTitle(filename)
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isLrcFile(file) {
    var name = file && file.name ? String(file.name) : "";
    return /\.(lrc|lcr)$/i.test(name);
  }

  function isAudioFile(file) {
    if (!file) return false;
    if (isLrcFile(file)) return false;
    var type = String(file.type || "").toLowerCase();
    if (type.indexOf("audio/") === 0) return true;
    return /\.(mp3|m4a|aac|wav|ogg|flac)$/i.test(String(file.name || ""));
  }

  function isImageFile(file) {
    if (!file) return false;
    var type = String(file.type || "").toLowerCase();
    if (type.indexOf("image/") === 0) return true;
    return /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(String(file.name || ""));
  }

  function readLocalTextFile(file) {
    if (!file) return Promise.resolve("");
    if (typeof file.text === "function") {
      return file.text().catch(function () {
        return "";
      });
    }
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(typeof reader.result === "string" ? reader.result : "");
      };
      reader.onerror = function () {
        resolve("");
      };
      reader.readAsText(file, "utf-8");
    });
  }

  function pictureTagToObjectUrl(picture) {
    if (!picture || !picture.data || !picture.data.length) return "";
    try {
      var bytes = picture.data instanceof Uint8Array ? picture.data : new Uint8Array(picture.data);
      var mime = picture.format ? String(picture.format) : "image/jpeg";
      var blob = new Blob([bytes], { type: mime });
      return URL.createObjectURL(blob);
    } catch (e) {
      return "";
    }
  }

  function pickEmbeddedLyrics(tags) {
    if (!tags || typeof tags !== "object") return "";
    var candidates = ["lyrics", "lyric", "unsynchronisedLyrics", "unsynchronizedLyrics", "USLT", "SYLT"];
    for (var i = 0; i < candidates.length; i += 1) {
      var key = candidates[i];
      var value = tags[key];
      if (!value) continue;
      if (typeof value === "string" && value.trim()) return value;
      if (value && typeof value === "object") {
        if (typeof value.lyrics === "string" && value.lyrics.trim()) return value.lyrics;
        if (typeof value.text === "string" && value.text.trim()) return value.text;
        if (typeof value.data === "string" && value.data.trim()) return value.data;
      }
    }
    return "";
  }

  function readLocalAudioMetadata(file) {
    return new Promise(function (resolve) {
      if (!file || !window.jsmediatags || typeof window.jsmediatags.read !== "function") {
        resolve({ title: "", artist: "", cover: "", lyric: "" });
        return;
      }
      try {
        window.jsmediatags.read(file, {
          onSuccess: function (result) {
            var tags = result && result.tags ? result.tags : {};
            resolve({
              title: tags && typeof tags.title === "string" ? tags.title : "",
              artist: tags && typeof tags.artist === "string" ? tags.artist : "",
              cover: pictureTagToObjectUrl(tags.picture),
              lyric: pickEmbeddedLyrics(tags),
            });
          },
          onError: function () {
            resolve({ title: "", artist: "", cover: "", lyric: "" });
          },
        });
      } catch (e) {
        resolve({ title: "", artist: "", cover: "", lyric: "" });
      }
    });
  }

  function handleLocalMusicUpload(files) {
    var list = Array.prototype.slice.call(files || []).filter(function (file) {
      return !!file;
    });
    if (!list.length) return;
    var lyricFiles = list.filter(isLrcFile);
    var coverFiles = list.filter(isImageFile);
    var audioFiles = list.filter(isAudioFile);

    Promise.all([
      Promise.all(
        lyricFiles.map(function (file) {
          return readLocalTextFile(file).then(function (text) {
            return {
              stem: normalizeLocalStem(file.name),
              text: String(text || "").trim(),
            };
          });
        })
      ),
      Promise.all(
        coverFiles.map(function (file) {
          return new Promise(function (resolve) {
            readImageAsDataUrl(file, function (dataUrl) {
              resolve({
                stem: normalizeLocalStem(file.name),
                dataUrl: String(dataUrl || "").trim(),
              });
            });
          });
        })
      ),
    ]).then(function (results) {
      var lyricPairs = results && results[0] ? results[0] : [];
      var coverPairs = results && results[1] ? results[1] : [];
      var lyricMap = {};
      lyricPairs.forEach(function (item) {
        if (!item || !item.stem || !item.text) return;
        lyricMap[item.stem] = item.text;
      });
      var coverMap = {};
      coverPairs.forEach(function (item) {
        if (!item || !item.stem || !item.dataUrl) return;
        coverMap[item.stem] = item.dataUrl;
      });
      if (!audioFiles.length) {
        var updatedSongs = 0;
        var updatedLyrics = 0;
        var updatedCovers = 0;
        var current = getCurrentPlaybackSong();
        var currentKey = current ? trackKey(current) : "";
        (state.library || []).forEach(function (song) {
          if (!song || !(song.localOnly || String(song.sourceType || song.source || "").toLowerCase() === "local")) return;
          var stem = normalizeLocalStem(song.localFileName || song.title || "");
          if (!stem) return;
          var changed = false;
          if (lyricMap[stem] && String(song.lyric || "").trim() !== String(lyricMap[stem] || "").trim()) {
            song.lyric = lyricMap[stem];
            updatedLyrics += 1;
            changed = true;
          }
          if (coverMap[stem] && String(song.cover || "") !== String(coverMap[stem] || "")) {
            song.cover = coverMap[stem];
            updatedCovers += 1;
            changed = true;
          }
          if (!changed) return;
          updatedSongs += 1;
          if (currentKey && trackKey(song) === currentKey) {
            applyTrackInfo(song);
            if (updatedLyrics) loadLyricsForSong(song);
          }
        });
        if (updatedSongs > 0) {
          saveLibrary();
          renderHomePlaylist();
          renderQueue();
          if (profilePage && !profilePage.hidden) renderProfileView();
          var tips = ["已补充 " + updatedSongs + " 首本地音乐资源"];
          if (updatedLyrics) tips.push(updatedLyrics + " 首歌词");
          if (updatedCovers) tips.push(updatedCovers + " 首封面");
          showToast(tips.join("，"));
        } else {
          showToast("未找到可匹配的本地歌曲，请选择同名音频、LRC 或封面");
        }
        return null;
      }
      return Promise.all(
        audioFiles.map(function (file, index) {
          return readLocalAudioMetadata(file).then(function (meta) {
            var stem = normalizeLocalStem(file.name);
            var blobUrl = "";
            try {
              blobUrl = URL.createObjectURL(file);
            } catch (e) {
              blobUrl = "";
            }
            if (!blobUrl) return null;
            var trackId = "local:" + [file.name || "audio", file.size || 0, file.lastModified || Date.now(), index].join(":");
            return persistLocalTrackAsset(trackId, file).then(function () {
              cacheLocalTrackObjectUrl(trackId, file);
              return {
                id: trackId,
                title: (meta && meta.title) || parseLocalSongTitle(file.name),
                artist: (meta && meta.artist) || "本地音乐",
                cover: (meta && meta.cover) || coverMap[stem] || "",
                url: "",
                importUrl: blobUrl,
                source: "local",
                sourceType: "local",
                lyric: (meta && meta.lyric) || lyricMap[stem] || "",
                localOnly: true,
                localFileName: file.name ? String(file.name) : "",
              };
            });
          });
        })
      );
    }).then(function (songs) {
      if (songs === null) return;
      var added = 0;
      var withLyrics = 0;
      var withCover = 0;
      var needLyrics = 0;
      var needCover = 0;
      (songs || []).forEach(function (localSong) {
        if (!localSong) return;
        var result = addSongToLibrary(localSong, true);
        if (result && result.added) {
          added += 1;
          if (localSong.lyric) withLyrics += 1;
          if (localSong.cover && localSong.cover !== DEFAULT_COVER) withCover += 1;
          if (!localSong.lyric) needLyrics += 1;
          if (!localSong.cover || localSong.cover === DEFAULT_COVER) needCover += 1;
        }
      });
      renderHomePlaylist();
      if (added > 0) {
        var parts = ["已加入 " + added + " 首本地音乐"];
        if (withCover) parts.push(withCover + " 首带封面");
        if (withLyrics) parts.push(withLyrics + " 首带歌词");
        if (needLyrics) parts.push(needLyrics + " 首可补同名 LRC");
        if (needCover) parts.push(needCover + " 首可补同名封面图");
        showToast(parts.join("，"));
      } else {
        showToast("这些本地音乐已在当前列表中");
      }
    }).catch(function () {
      showToast("本地音乐导入失败");
    });
  }

  if (localMusicUploadBtn && localMusicInput) {
    localMusicUploadBtn.addEventListener("click", function () {
      localMusicInput.click();
    });
    localMusicInput.addEventListener("change", function () {
      handleLocalMusicUpload(localMusicInput.files);
      localMusicInput.value = "";
    });
  }

  playBtn.addEventListener("click", function () {
    if (!audioEl) return;
    if (!audioEl.src) {
      var current = ensureCurrentTrackInfo();
      if (!current) {
        showToast("暂无歌曲");
        return;
      }
      if (current && current.id) {
        playSongById(current.id, current);
        return;
      }
      state.playCtx = { key: trackKey(current), triedApi: true, triedOuter: true };
      playUrl(current.url || current.src);
      return;
    }
    setPlaying(audioEl.paused);
  });

  if (miniPlayBtn) {
    miniPlayBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!audioEl) return;
      if (!audioEl.src) {
        var current = ensureCurrentTrackInfo();
        if (!current) {
          showToast("暂无歌曲");
          return;
        }
        if (current && current.id) {
          playSongById(current.id, current);
          return;
        }
        state.playCtx = { key: trackKey(current), triedApi: true, triedOuter: true };
        playUrl(current.url || current.src);
        return;
      }
      setPlaying(audioEl.paused);
    });
  }

  if (miniOpen) {
    miniOpen.addEventListener("click", function () {
      openPlayer();
      setActiveTab("play");
      scheduleWaveRebuild();
      syncFromGlobalPlayer();
      syncTogetherFromStorage();
    });
  }

  if (shuffleBtn) {
    shuffleBtn.addEventListener("click", function () {
      setModeByIndex(state.modeIndex + 1);
      showToast("已切换：" + getCurrentPlayMode().label);
    });
  }

  if (repeatBtn) {
    repeatBtn.addEventListener("click", function () {
      openQueue();
    });
  }

  prevBtn.addEventListener("click", function () {
    playQueueIndex(computeNextIndex(-1));
  });

  nextBtn.addEventListener("click", function () {
    playQueueIndex(computeNextIndex(1));
  });

  closeBtn.onclick = function () {
    closePlayer();
  };

  if (waveEl) {
    waveEl.addEventListener("click", function (e) {
      var rect = waveEl.getBoundingClientRect();
      var x = e.clientX - rect.left;
      seekByRatio(x / rect.width);
    });
  }

  if (favBtn) {
    favBtn.addEventListener("click", function () {
      toggleFav();
    });
  }

  function isTogetherActive() {
    if (!playerSheet) return false;
    var session = readTogetherSession();
    var roleId = state.togetherRoleId || resolveTogetherRoleId(session);
    if (roleId) {
      if (!playerSheet.classList.contains("is-together")) playerSheet.classList.add("is-together");
      return true;
    }
    return playerSheet.classList.contains("is-together");
  }

  function updateTogetherDurationLabel() {
    if (!togetherDurationLabel) return;
    if (!isTogetherActive()) {
      togetherDurationLabel.textContent = "";
      return;
    }
    var session = readTogetherSession();
    var roleId = state.togetherRoleId || resolveTogetherRoleId(session);
    if (!roleId || !session) {
      togetherDurationLabel.textContent = "";
      return;
    }
    var normalized = normalizeTogetherSession(session);
    if (normalized !== session) {
      session = normalized;
      writeTogetherSession(session);
    }
    var startedAt = Number(session.startedAt || 0);
    if (!isFinite(startedAt) || startedAt <= 0) {
      togetherDurationLabel.textContent = "0小时0分钟";
      return;
    }
    var sec = Math.floor((Date.now() - startedAt) / 1000);
    if (!isFinite(sec) || sec < 0) sec = 0;
    togetherDurationLabel.textContent = formatHoursMinutesCN(sec);
  }

  function bumpTogetherSessionSongCount(nextKey) {
    if (!isTogetherActive()) return;
    var session = readTogetherSession();
    if (!session || typeof session !== "object") return;
    session = normalizeTogetherSession(session);
    var roleId = resolveTogetherRoleId(session) || state.togetherRoleId;
    if (!roleId) return;
    var k = String(nextKey || "");
    if (!k) return;
    var last = session.stats && session.stats.lastTrackKey ? String(session.stats.lastTrackKey) : "";
    if (last === k) return;
    var songs = Number(session.stats && session.stats.songs ? session.stats.songs : 0);
    if (!isFinite(songs) || songs < 0) songs = 0;
    session.stats.songs = Math.floor(songs + 1);
    session.stats.lastTrackKey = k;
    writeTogetherSession(session);
    state.togetherLastCountedKey = k;
  }

  function getCurrentPlaybackSong() {
    var meta =
      state.currentTrackMeta &&
      (state.currentTrackMeta.title || state.currentTrackMeta.artist || state.currentTrackMeta.id || state.currentTrackMeta.url)
        ? state.currentTrackMeta
        : null;
    if (meta) {
      var matched = syncCurrentSongFromExternalTrack(meta);
      if (matched) return mergeTrackInfo(matched, meta);
      return meta;
    }
    var current = state.queue && state.queue[state.currentIndex] ? state.queue[state.currentIndex] : null;
    if (current) return current;
    var gp = getGlobalPlayer();
    if (gp && typeof gp.getState === "function") {
      try {
        var s = gp.getState();
        return s && s.track ? s.track : null;
      } catch (e) {}
    }
    return null;
  }

  function maybeCountTogetherSongStart() {
    if (!isTogetherActive()) return;
    var current = getCurrentPlaybackSong();
    if (!current) return;
    var k = trackKey(current) || (String(current.title || "") + "::" + String(current.artist || ""));
    if (!k) return;
    if (state.togetherLastCountedKey === k) return;
    bumpTogetherSessionSongCount(k);
  }

  function exitTogetherSession() {
    flushListenTime();
    try {
      if (isTogetherActive()) syncSystemMessage("stop");
    } catch (e0) {}
    try {
      if (window.localStorage) localStorage.removeItem("listen_together_session");
    } catch (e) {}
    try {
      if (window.parent && window.parent !== window && window.parent.localStorage) {
        window.parent.localStorage.removeItem("listen_together_session");
      }
    } catch (e2) {}
    state.togetherSessionShadow = null;
    setTogetherMenuOpen(false);
    setTogetherExitOpen(false);
    syncTogetherFromStorage();
    openPlayer();
    setActiveTab("play");
    setActivePage("play");
  }

  function openTogetherChat() {
    var roleId = state.togetherRoleId || resolveTogetherRoleId(readTogetherSession());
    if (!roleId) return;
    setTogetherMenuOpen(false);
    try {
      if (window.parent && window.parent !== window) {
        if (typeof window.parent.enterChatRoom === "function") {
          window.parent.enterChatRoom(roleId);
          return;
        }
        if (typeof window.parent.openChatApp === "function") {
          window.parent.openChatApp();
          return;
        }
      }
    } catch (e) {}
  }

  function openTogetherExitCard() {
    flushListenTime();
    var session = readTogetherSession();
    var roleId = state.togetherRoleId || resolveTogetherRoleId(session);
    if (!roleId) return;
    if (session && typeof session === "object") {
      session = normalizeTogetherSession(session);
      writeTogetherSession(session);
    }
    if (togetherExitAvatarLeft) {
      var mp = getScopedUserProfile(roleId);
      togetherExitAvatarLeft.src = normalizeAssetUrl(
        (mp && mp.avatar) || (session && session.userAvatar ? String(session.userAvatar) : "")
      );
    }
    if (togetherExitAvatarRight) {
      togetherExitAvatarRight.src = normalizeAssetUrl(session && session.characterAvatar ? String(session.characterAvatar) : "");
    }
    var songs = Number(session && session.stats && session.stats.songs ? session.stats.songs : 0);
    if (!isFinite(songs) || songs < 0) songs = 0;
    var startedAt = Number(session && session.startedAt ? session.startedAt : 0);
    var sec = 0;
    if (isFinite(startedAt) && startedAt > 0) {
      var d = Math.floor((Date.now() - startedAt) / 1000);
      if (isFinite(d) && d > 0) sec = d;
    }
    if (togetherExitSongCount) togetherExitSongCount.textContent = String(Math.floor(songs));
    if (togetherExitDurationMin) togetherExitDurationMin.textContent = String(Math.floor(sec / 60));
    setTogetherMenuOpen(false);
    setTogetherExitOpen(true);
  }

  function openInvite() {
    renderInviteList();
    setInviteOpen(true);
  }

  if (inviteBtn) {
    inviteBtn.addEventListener("click", function () {
      if (isTogetherActive()) {
        setTogetherMenuOpen(true);
      } else {
        openInvite();
      }
    });
  }

  if (inviteBackdrop) {
    inviteBackdrop.addEventListener("click", function () {
      setInviteOpen(false);
    });
  }

  if (inviteClose) {
    inviteClose.addEventListener("click", function () {
      setInviteOpen(false);
    });
  }

  if (togetherMenuBackdrop) {
    togetherMenuBackdrop.addEventListener("click", function () {
      setTogetherMenuOpen(false);
    });
  }

  if (togetherMenuChatBtn) {
    togetherMenuChatBtn.addEventListener("click", function () {
      setTogetherMenuOpen(false);
      toggleChatDrawer(true);
    });
  }

  if (togetherMenuExitBtn) {
    togetherMenuExitBtn.addEventListener("click", function () {
      openTogetherExitCard();
    });
  }

  if (togetherExitBackdrop) {
    togetherExitBackdrop.addEventListener("click", function () {
      setTogetherExitOpen(false);
    });
  }

  if (togetherExitShareBtn) {
    togetherExitShareBtn.addEventListener("click", function () {
      var roleId = state.togetherRoleId || resolveTogetherRoleId(readTogetherSession());
      if (roleId) {
        flushListenTime();
        var text = buildTogetherExitSummaryText(roleId);
        sendTextToRole(roleId, text);
        showToast("已分享");
      }
      exitTogetherSession();
    });
  }

  if (togetherExitCloseBtn) {
    togetherExitCloseBtn.addEventListener("click", function () {
      exitTogetherSession();
    });
  }

  if (moreBtn) {
    moreBtn.addEventListener("click", function () {
      playerSheet.style.removeProperty("--player-sheet-top");
      playerSheet.style.removeProperty("--player-sheet-radius");
      syncSettingControls();
      setSettingsOpen(true);
    });
  }

  function applyTogetherSession(session) {
    if (!playerSheet) return;
    session = normalizeTogetherSession(session);
    writeTogetherSession(session);
    playerSheet.classList.add("is-together");
    state.togetherRoleId = resolveTogetherRoleId(session);
    if (state.togetherRoleId) setCurrentChatRoleValue(state.togetherRoleId);
    state.togetherLastCountedKey = session && session.stats && session.stats.lastTrackKey ? String(session.stats.lastTrackKey) : "";
    maybeEmitTogetherStart(session);

    if (!togetherRow) return;

    var leftImg = togetherRow.querySelector(".avatar-left img");
    if (leftImg) {
      var mp = getScopedUserProfile(state.togetherRoleId || resolveTogetherRoleId(session));
      leftImg.src = normalizeAssetUrl(
        (mp && mp.avatar) || (session && session.userAvatar ? String(session.userAvatar) : "")
      );
    }

    var right = togetherRow.querySelector(".avatar-right");
    if (right) {
      if (session && session.characterAvatar) {
        right.classList.remove("placeholder");
        var rightImg = right.querySelector("img");
        if (!rightImg) {
          rightImg = document.createElement("img");
          rightImg.alt = "";
          rightImg.loading = "lazy";
          right.appendChild(rightImg);
        }
        rightImg.src = normalizeAssetUrl(String(session.characterAvatar));
      } else {
        right.classList.add("placeholder");
      }
    }
    updateTogetherDurationLabel();
    maybeCountTogetherSongStart();
    updateTogetherSessionTrack(getCurrentPlaybackSong(), "active");
    ensureTogetherDurationTicker();
  }

  window.addEventListener("message", function (ev) {
    var data = ev && ev.data ? ev.data : null;
    if (!data || typeof data !== "object") return;
    if (data.type === "MUSIC_OPEN_PLAYER") {
      openPlayer();
      setActiveTab("play");
      scheduleWaveRebuild();
      syncFromGlobalPlayer();
      var payload = data.payload && typeof data.payload === "object" ? data.payload : {};
      var session = payload && payload.togetherSession ? payload.togetherSession : null;
      if (session) applyTogetherSession(session);
      else syncTogetherFromStorage();
    } else if (data.type === "MUSIC_TOGETHER_START") {
      openPlayer();
      setActiveTab("play");
      scheduleWaveRebuild();
      syncFromGlobalPlayer();
      applyTogetherSession(data.payload || {});
      showToast("已进入一起听");
    }
  });

  function openPlayerFromPendingPayload(payload) {
    openPlayer();
    setActiveTab("play");
    scheduleWaveRebuild();
    syncFromGlobalPlayer();
    var togetherSession = payload && payload.togetherSession ? payload.togetherSession : null;
    if (togetherSession) applyTogetherSession(togetherSession);
    else syncTogetherFromStorage();
  }
  updateModeButtons();
  updateQueueButton();

  if (queueBackdrop) {
    queueBackdrop.addEventListener("click", function () {
      setQueueOpen(false);
    });
  }

  if (queueClose) {
    queueClose.addEventListener("click", function () {
      setQueueOpen(false);
    });
  }

  if (settingsBackdrop) {
    settingsBackdrop.addEventListener("click", function () {
      setSettingsOpen(false);
    });
  }

  if (settingsClose) {
    settingsClose.addEventListener("click", function () {
      setSettingsOpen(false);
    });
  }

  if (profileSettingsBtn) {
    profileSettingsBtn.addEventListener("click", function () {
      syncProfileSettingControls();
      setProfileSettingsOpen(true);
    });
  }

  if (profileSettingsBackdrop) {
    profileSettingsBackdrop.addEventListener("click", function () {
      setProfileSettingsOpen(false);
    });
  }

  if (profileSettingsClose) {
    profileSettingsClose.addEventListener("click", function () {
      setProfileSettingsOpen(false);
    });
  }

  if (profilePlaylistContainer) {
    profilePlaylistContainer.addEventListener("click", function (e) {
      var target = e.target;
      if (!target) return;
      var card = target.closest ? target.closest(".glass-playlist-card") : null;
      if (!card || !profilePlaylistContainer.contains(card)) return;
      var kind = String(card.dataset.playlistKind || "");
      var playlistId = String(card.dataset.playlistId || "");
      if (kind === "favorites") {
        playFavoritesPlaylist();
        return;
      }
      if (kind === "role_generated" && playlistId) {
        playRolePlaylist(playlistId);
        return;
      }
      if (kind === "custom" && playlistId) {
        playCustomPlaylist(playlistId);
      }
    });

    profilePlaylistContainer.addEventListener("keydown", function (e) {
      if (!e || (e.key !== "Enter" && e.key !== " ")) return;
      var target = e.target;
      if (!target) return;
      var card = target.closest ? target.closest(".glass-playlist-card") : null;
      if (!card || !profilePlaylistContainer.contains(card)) return;
      e.preventDefault();
      card.click();
    });
  }

  if (sheetPlaylistList) {
    sheetPlaylistList.addEventListener("click", function (e) {
      var target = e.target;
      if (!target) return;
      var item = target.closest ? target.closest(".sheet-item") : null;
      if (!item || !sheetPlaylistList.contains(item)) return;
      if (String(item.dataset.action || "") === "create") {
        createNewPlaylistFromPendingSong();
        return;
      }
      if (String(item.dataset.playlistKind || "") === "favorites") {
        addSongToFavoritesPlaylist(pendingPlaylistSongs);
        return;
      }
      if (String(item.dataset.playlistKind || "") === "custom" && item.dataset.playlistId) {
        addSongToCustomPlaylist(item.dataset.playlistId, pendingPlaylistSongs);
      }
    });
  }

  if (addToPlaylistBackdrop) {
    addToPlaylistBackdrop.addEventListener("click", function () {
      setAddToPlaylistModalOpen(false);
    });
  }

  if (addToPlaylistCancel) {
    addToPlaylistCancel.addEventListener("click", function () {
      setAddToPlaylistModalOpen(false);
    });
  }

  if (bgUploadBtn && bgUpload) {
    bgUploadBtn.addEventListener("click", function () {
      bgUpload.click();
    });
  }

  if (overlayToneInputs && overlayToneInputs.length) {
    overlayToneInputs.forEach(function (input) {
      input.addEventListener("change", function () {
        if (!input.checked) return;
        playerCustomState.overlayTone = input.value === "light" ? "light" : "dark";
        applyPlayerBackground();
        savePlayerCustomState();
      });
    });
  }

  if (overlayOpacitySlider) {
    overlayOpacitySlider.addEventListener("input", function () {
      playerCustomState.overlayOpacity = Math.max(0, Math.min(100, Math.round(Number(overlayOpacitySlider.value || DEFAULT_PLAYER_CUSTOM.overlayOpacity))));
      updateOverlayOpacityLabel();
      applyPlayerBackground();
      savePlayerCustomState();
    });
  }

  if (coverUploadBtn && coverUpload) {
    coverUploadBtn.addEventListener("click", function () {
      coverUpload.click();
    });
  }

  if (profileBgUploadBtn && profileBgUpload) {
    profileBgUploadBtn.addEventListener("click", function () {
      profileBgUpload.click();
    });
  }

  if (lyricColorPicker) {
    lyricColorPicker.addEventListener("input", function () {
      playerCustomState.lyricColor = String(lyricColorPicker.value || DEFAULT_PLAYER_CUSTOM.lyricColor);
      applyPlayerColorVars();
      syncMiniPlayerPresentation();
      savePlayerCustomState();
    });
  }

  if (progressColorPicker) {
    progressColorPicker.addEventListener("input", function () {
      playerCustomState.progressColor = String(progressColorPicker.value || DEFAULT_PLAYER_CUSTOM.progressColor);
      applyPlayerColorVars();
      syncMiniPlayerPresentation();
      savePlayerCustomState();
    });
  }

  if (playBtnColorPicker) {
    playBtnColorPicker.addEventListener("input", function () {
      playerCustomState.playBtnColor = String(playBtnColorPicker.value || DEFAULT_PLAYER_CUSTOM.playBtnColor);
      applyPlayerColorVars();
      savePlayerCustomState();
    });
  }

  if (miniPlayerModeInputs && miniPlayerModeInputs.length) {
    miniPlayerModeInputs.forEach(function (input) {
      input.addEventListener("change", function () {
        if (!input.checked) return;
        playerCustomState.miniPlayerMode = input.value === "float" ? "float" : "island";
        syncGlobalWidgetMode();
        savePlayerCustomState();
      });
    });
  }

  if (playerVisualStyleInputs && playerVisualStyleInputs.length) {
    playerVisualStyleInputs.forEach(function (input) {
      input.addEventListener("change", function () {
        if (!input.checked) return;
        playerCustomState.playerVisualStyle = input.value === "vinyl" ? "vinyl" : "square";
        applyPlayerVisualStyle();
        savePlayerCustomState();
      });
    });
  }

  if (coverModeInputs && coverModeInputs.length) {
    coverModeInputs.forEach(function (input) {
      input.addEventListener("change", function () {
        if (!input.checked) return;
        playerCustomState.coverMode = input.value === "carousel" ? "carousel" : "single";
        coverCarouselIndex = 0;
        syncCoverCarousel();
        savePlayerCustomState();
      });
    });
  }

  if (bgUpload) {
    bgUpload.addEventListener("change", function () {
      readFilesAsDataUrls(bgUpload.files, false).then(function (items) {
        if (!items.length) return;
        playerCustomState.backgroundImage = items[0];
        applyPlayerBackground();
        savePlayerCustomState();
        showToast("已更新播放页背景");
      });
    });
  }

  if (coverUpload) {
    coverUpload.addEventListener("change", function () {
      readFilesAsDataUrls(coverUpload.files, true).then(function (items) {
        if (!items.length) return;
        playerCustomState.coverImages = items.slice(0, 12);
        coverCarouselIndex = 0;
        syncCoverCarousel();
        savePlayerCustomState();
        showToast(items.length > 1 ? "已更新轮播封面" : "已更新封面");
      });
    });
  }

  if (profileOverlayToneInputs && profileOverlayToneInputs.length) {
    profileOverlayToneInputs.forEach(function (input) {
      input.addEventListener("change", function () {
        if (!input.checked) return;
        var currentProfileCustomState = getActiveProfileCustomState();
        currentProfileCustomState.overlayTone = input.value === "light" ? "light" : "dark";
        applyProfileBackground();
        saveActiveProfileCustomState();
      });
    });
  }

  if (profileOverlayOpacitySlider) {
    profileOverlayOpacitySlider.addEventListener("input", function () {
      var currentProfileCustomState = getActiveProfileCustomState();
      currentProfileCustomState.overlayOpacity = Math.max(
        0,
        Math.min(100, Math.round(Number(profileOverlayOpacitySlider.value || DEFAULT_PROFILE_PAGE_CUSTOM.overlayOpacity)))
      );
      updateProfileOverlayOpacityLabel();
      applyProfileBackground();
      saveActiveProfileCustomState();
    });
  }

  if (profileBgUpload) {
    profileBgUpload.addEventListener("change", function () {
      readFilesAsDataUrls(profileBgUpload.files, false).then(function (items) {
        if (!items.length) return;
        var currentProfileCustomState = getActiveProfileCustomState();
        currentProfileCustomState.backgroundImage = items[0];
        applyProfileBackground();
        if (characterPage && !characterPage.hidden) renderCharacterView();
        saveActiveProfileCustomState();
        showToast(isRoleProfileView() ? "已更新角色主页背景" : "已更新个人主页背景");
      });
    });
  }

  if (settingsReset) {
    settingsReset.addEventListener("click", function () {
      playerCustomState = Object.assign({}, DEFAULT_PLAYER_CUSTOM);
      coverCarouselIndex = 0;
      stopCoverCarousel();
      applyPlayerCustomization();
      savePlayerCustomState();
      if (bgUpload) bgUpload.value = "";
      if (coverUpload) coverUpload.value = "";
      setSettingsOpen(false);
      showToast("已恢复默认设置");
    });
  }

  if (coverCard) {
    coverCard.addEventListener("click", function () {
      setLyricsOpen(true);
    });
  }

  if (vinylPlayerWrap) {
    vinylPlayerWrap.addEventListener("click", function (event) {
      var target = event && event.target ? event.target : null;
      if (target && target.closest(".simple-progress-area")) return;
      setLyricsOpen(true);
    });
  }

  if (progressSlider) {
    progressSlider.addEventListener("input", function () {
      progressSliderPreviewActive = true;
      setSliderProgress(progressSlider.value);
    });
    progressSlider.addEventListener("change", function () {
      progressSliderPreviewActive = false;
      seekByRatio(Number(progressSlider.value || 0) / 100);
      updateWaveFromAudio();
    });
    progressSlider.addEventListener("pointerup", function () {
      progressSliderPreviewActive = false;
    });
    progressSlider.addEventListener("pointercancel", function () {
      progressSliderPreviewActive = false;
      updateWaveFromAudio();
    });
  }

  if (playerSheet) {
    playerSheet.addEventListener("click", function (e) {
      if (playerSheet.classList.contains("is-lyrics")) return;
      var target = e && e.target ? e.target : null;
      if (!target) return;
      if (target.closest(".controls")) return;
      if (target.closest(".np-topbar")) return;
      if (target.closest(".np-actions")) return;
      if (target.closest(".wave-wrap")) return;
      if (target.closest(".simple-progress-area")) return;
      if (target.closest(".queue-modal")) return;
      if (target.closest(".invite-modal")) return;
      if (target.closest(".cover-wrap") || target.closest(".vinyl-player-wrap") || target.closest(".track-info") || target.closest(".together")) {
        setLyricsOpen(true);
      }
    });
  }

  if (lyricsView) {
    lyricsView.addEventListener("click", function () {
      setLyricsOpen(false);
    });
  }

  if (audioEl) {
    audioEl.addEventListener("play", function () {
      state.isPlaying = true;
      if (!state.listenStartedAt) state.listenStartedAt = Date.now();
      maybeCountTogetherSongStart();
      playerSheet.classList.add("is-playing");
      setPlayIcon(true);
      syncMiniPlayerPresentation();
      updateTogetherDurationLabel();
      try {
        maybeEmitTogetherPlaybackMoment("resume", getCurrentPlaybackSong());
      } catch (e) {}
    });

    audioEl.addEventListener("pause", function () {
      state.isPlaying = false;
      flushListenTime();
      if (profilePage && !profilePage.hidden) renderProfileView();
      playerSheet.classList.remove("is-playing");
      setPlayIcon(false);
      syncMiniPlayerPresentation();
      updateTogetherDurationLabel();
      try {
        maybeEmitTogetherPlaybackMoment("pause", getCurrentPlaybackSong());
      } catch (e2) {}
    });

    audioEl.addEventListener("timeupdate", function () {
      updateWaveFromAudio();
      syncLyric();
      updateFloatingBallProgress();
      updateTogetherDurationLabel();
    });

    audioEl.addEventListener("loadedmetadata", function () {
      updateWaveFromAudio();
      updateFloatingBallProgress();
      maybeFixShortPreviewFromMetadata();
    });

    audioEl.addEventListener("ended", function () {
      flushListenTime();
      if (profilePage && !profilePage.hidden) renderProfileView();
      if (characterPage && !characterPage.hidden) renderCharacterView();
      handleTrackEnd();
    });

    audioEl.addEventListener("error", function () {
      flushListenTime();
      var current = getCurrentPlaybackSong() || state.queue[state.currentIndex];
      if (!current) {
        showToast("音频加载失败");
        return;
      }
      if (current.localOnly || String(current.sourceType || current.source || "").toLowerCase() === "local") {
        markSongPlaybackIssue(current, "本地文件暂时无法读取");
        showToast("本地音频读取失败，请重新上传该文件");
        return;
      }
      var failedIndex = Number(state.currentIndex || 0);
      invalidateSongPlayUrl(current);

      repairSongSource(current, { replay: true })
        .then(function (ok) {
          if (ok) return;
          showToast("该歌曲无法播放");
          var removed = disableSong(current);
          playNextAfterDisable(failedIndex, removed);
        })
        .catch(function () {
          showToast("该歌曲无法播放");
          var removed = disableSong(current);
          playNextAfterDisable(failedIndex, removed);
        });
    });
  }

  window.addEventListener("beforeunload", function () {
    flushListenTime();
  });

  ensureLatestServiceWorker();
  handleMusicEvents();
  setupProfileInteractions();
  setupCharacterInteractions();
  playerCustomState = loadPlayerCustomState();
  profilePageCustomState = loadProfilePageCustomState();
  roleMusicCache = loadRoleMusicCacheStore();
  applyPlayerCustomization();
  applyProfileBackground();
  syncProfileSettingControls();
  syncGlobalWidgetMode();
  state.library = loadLibrary();
  hydrateCachedImportedCovers();
  myPlaylists = loadMyPlaylists();
  hydratePersistedLocalTracks();
  rebuildQueue();
  setSearchActive(false);
  setClearVisible(false);
  setModeByIndex(0);
  scheduleWaveRebuild();
  setPlayIcon(false);
  setActivePage("home");
  updateHomeSelectUi();
  renderHomePlaylist();
  renderAddToPlaylistSheet();
  syncFromGlobalPlayer();
  syncTogetherFromStorage();
  hydratePersistedStates();
  try {
    if (window.parent && window.parent !== window && window.parent.__musicOpenPlayerOnLoad) {
      window.parent.__musicOpenPlayerOnLoad = false;
      var pendingPayload =
        window.parent.__musicPendingOpenPayload && typeof window.parent.__musicPendingOpenPayload === "object"
          ? window.parent.__musicPendingOpenPayload
          : null;
      try {
        window.parent.__musicPendingOpenPayload = null;
      } catch (e0) {}
      openPlayerFromPendingPayload(pendingPayload);
    }
  } catch (e) {}

  window.addEventListener("resize", function () {
    applyFloatBallPosition();
    scheduleWaveRebuild();
  });
})();
