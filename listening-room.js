const records = [
  {
    id: "record-01",
    title: "Anatolia Aura",
    cover: "assets/listening-room/covers/anatoliaaura.jpeg",
    spotifyUrl: "https://open.spotify.com/playlist/5gaUiPEbOdNIfCHMLePcnf?si=80f07bb0a0b448f7",
    accent: "#f6d365"
  },
  {
    id: "record-02",
    title: "Yes,it was my way",
    cover: "assets/listening-room/covers/myway.jpeg",
    spotifyUrl: "https://open.spotify.com/playlist/0Z9hd2UMWexxsdWnOLd9d0?si=e95ca0940da04a7a",
    accent: "#9fd3ff"
  },
  {
    id: "record-03",
    title: "The art of losing",
    cover: "assets/listening-room/covers/ros.jpeg",
    spotifyUrl: "https://open.spotify.com/playlist/6cIlDWcMGKHVdKaBETpexG?si=19de32ec90cf4c9e",
    accent: "#f7b3cb"
  },
  {
    id: "record-04",
    title: "Kutsal Olmayan Acı",
    cover: "assets/listening-room/covers/kutsalolmayan.png",
    spotifyUrl: "https://open.spotify.com/playlist/2Thd0imERTql6t4QokxSyQ?si=90fb45a38a0f45b7",
    accent: "#b8e7c5"
  }
];

(() => {
  const validStates = new Set(["idle", "selecting", "loaded", "starting", "playing", "ejecting"]);
  const shelf = document.querySelector("#record-shelf");
  const platter = document.querySelector("#platter");
  const mountedRecord = document.querySelector("#mounted-record");
  const mountedLabel = document.querySelector("#mounted-label");
  const turntable = document.querySelector("#turntable");
  const playButton = document.querySelector("#play-record");
  const ejectButton = document.querySelector("#eject-record");
  const spotifyButton = document.querySelector("#open-spotify");
  const powerLed = document.querySelector("#power-led");
  const title = document.querySelector("#record-title");
  const subtitle = document.querySelector("#record-subtitle");
  const status = document.querySelector("#room-status");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!shelf || !platter || !mountedRecord || !mountedLabel || !turntable || !playButton || !ejectButton || !spotifyButton || !powerLed || !title || !subtitle || !status) {
    return;
  }

  let playerState = "idle";
  let activeRecord = null;
  let spotifyLaunchPending = false;
  let spotifyRedirectTimer = null;

  const clearSpotifyRedirect = () => {
    if (spotifyRedirectTimer === null) return;
    window.clearTimeout(spotifyRedirectTimer);
    spotifyRedirectTimer = null;
  };

  const getRecordButton = recordId => shelf.querySelector(`[data-record-id="${CSS.escape(recordId)}"]`);
  const isSpotifyUrl = value => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && (url.hostname === "open.spotify.com" || url.hostname.endsWith(".spotify.com"));
    } catch (error) {
      return false;
    }
  };

  const setState = nextState => {
    if (!validStates.has(nextState)) return;
    playerState = nextState;
    document.body.dataset.playerState = nextState;
    const busy = nextState === "selecting" || nextState === "starting" || nextState === "ejecting";
    shelf.classList.toggle("is-busy", busy);
    shelf.setAttribute("aria-busy", String(busy));
    shelf.querySelectorAll(".record-choice").forEach(button => {
      button.disabled = busy;
    });
    playButton.disabled = nextState !== "loaded" || !activeRecord || !isSpotifyUrl(activeRecord.spotifyUrl);
    ejectButton.disabled = busy || !activeRecord;
    spotifyButton.disabled = nextState !== "playing" || !activeRecord || !isSpotifyUrl(activeRecord.spotifyUrl);
  };

  const setStatus = message => {
    status.textContent = message;
  };

  const recordStyle = record => {
    const coverValue = record.cover ? `url("${record.cover.replaceAll('"', '\\"')}")` : "none";
    return `--record-accent:${record.accent};--record-cover:${coverValue};--sleeve-color:${record.accent}`;
  };

  const renderRecords = () => {
    const fragment = document.createDocumentFragment();
    records.forEach(record => {
      const button = document.createElement("button");
      button.className = "record-choice";
      button.type = "button";
      button.dataset.recordId = record.id;
      button.setAttribute("aria-label", `Load ${record.title} record`);
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("style", recordStyle(record));

      const sleeve = document.createElement("span");
      sleeve.className = "record-sleeve";

      if (record.cover) {
        const image = document.createElement("img");
        image.className = "record-cover";
        image.src = record.cover;
        image.alt = `${record.title} playlist cover`;
        image.width = 600;
        image.height = 600;
        image.loading = "lazy";
        image.addEventListener("load", () => {
          image.classList.add("is-ready");
        }, { once: true });
        image.addEventListener("error", () => {
          image.remove();
          sleeve.classList.add("is-missing-cover");
        }, { once: true });
        sleeve.append(image);
        if (image.complete && image.naturalWidth > 0) {
          image.classList.add("is-ready");
        }
      } else {
        sleeve.classList.add("is-missing-cover");
      }

      const disc = document.createElement("span");
      disc.className = "record-disc";
      disc.setAttribute("aria-hidden", "true");

      const recordTitle = document.createElement("span");
      recordTitle.className = "record-choice-title";
      recordTitle.textContent = record.title;

      button.append(sleeve, disc, recordTitle);
      fragment.append(button);
    });
    shelf.append(fragment);
  };

  const animateTravel = async (fromElement, toElement, record, reverse = false) => {
    const from = fromElement.getBoundingClientRect();
    const to = toElement.getBoundingClientRect();
    const travel = document.createElement("div");
    const startSize = from.width;
    const targetSize = Math.min(to.width, to.height) * 0.9;
    const startX = from.left + from.width / 2 - startSize / 2;
    const startY = from.top + from.height / 2 - startSize / 2;
    const deltaX = to.left + to.width / 2 - (startX + startSize / 2);
    const deltaY = to.top + to.height / 2 - (startY + startSize / 2);
    const scale = targetSize / startSize;

    travel.className = "travel-record";
    travel.setAttribute("style", `${recordStyle(record)};left:${startX}px;top:${startY}px;width:${startSize}px;height:${startSize}px`);
    document.body.append(travel);

    const duration = reducedMotion.matches ? 1 : reverse ? 520 : 720;
    const frames = reverse
      ? [
          { transform: "translate3d(0,0,0) scale(1) rotate(0deg)", opacity: 1 },
          { transform: `translate3d(${deltaX * 0.24}px,${deltaY * 0.18 - 20}px,0) scale(${1 + (scale - 1) * 0.24}) rotate(-12deg)`, opacity: 1, offset: 0.28 },
          { transform: `translate3d(${deltaX}px,${deltaY}px,0) scale(${scale}) rotate(-34deg)`, opacity: 0.92 }
        ]
      : [
          { transform: "translate3d(0,0,0) scale(1) rotate(0deg)", opacity: 0.92 },
          { transform: `translate3d(${deltaX * 0.22}px,${deltaY * 0.12 - 26}px,0) scale(${1 + (scale - 1) * 0.22}) rotate(18deg)`, opacity: 1, offset: 0.32 },
          { transform: `translate3d(${deltaX}px,${deltaY}px,0) scale(${scale}) rotate(46deg)`, opacity: 1 }
        ];

    try {
      await travel.animate(frames, {
        duration,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards"
      }).finished;
    } catch (error) {
      // Animation cancellation still resolves to the correct deterministic state.
    } finally {
      travel.remove();
    }
  };

  const markSelection = record => {
    shelf.classList.toggle("has-selection", Boolean(record));
    shelf.querySelectorAll(".record-choice").forEach(button => {
      const selected = Boolean(record) && button.dataset.recordId === record.id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  };

  const updateRecordInfo = record => {
    title.textContent = record ? record.title : "No record loaded";
    subtitle.textContent = record ? record.subtitle : "Select a pressing from the shelf.";
  };

  const mountRecord = record => {
    mountedRecord.setAttribute("style", recordStyle(record));
    mountedLabel.setAttribute("style", recordStyle(record));
    mountedRecord.classList.add("is-loaded");
    turntable.classList.add("is-loaded");
    powerLed.classList.add("is-on");
    activeRecord = record;
    markSelection(record);
    updateRecordInfo(record);
    setState("loaded");
    setStatus(isSpotifyUrl(record.spotifyUrl) ? "READY — PRESS PLAY" : "LOADED — SPOTIFY LINK NEEDED");
  };

  const unmountRecord = () => {
    mountedRecord.classList.remove("is-loaded", "is-spinning");
    mountedRecord.removeAttribute("style");
    mountedLabel.removeAttribute("style");
    turntable.classList.remove("is-loaded", "is-playing");
    powerLed.classList.remove("is-on");
  };

  const ejectRecord = async ({ keepInfo = false } = {}) => {
    if (!activeRecord || !["loaded", "playing"].includes(playerState)) return;
    clearSpotifyRedirect();
    const departingRecord = activeRecord;
    const targetButton = getRecordButton(departingRecord.id);
    const targetDisc = targetButton?.querySelector(".record-disc");
    setState("ejecting");
    setStatus("RETURNING RECORD");
    turntable.classList.remove("is-loaded", "is-playing");
    mountedRecord.classList.remove("is-spinning");
    await new Promise(resolve => window.setTimeout(resolve, reducedMotion.matches ? 1 : 420));
    if (targetDisc) {
      await animateTravel(platter, targetDisc, departingRecord, true);
    }
    unmountRecord();
    activeRecord = null;
    markSelection(null);
    if (!keepInfo) updateRecordInfo(null);
    setState("idle");
    setStatus("STANDBY");
  };

  const selectRecord = async record => {
    if (!record || ["selecting", "starting", "ejecting"].includes(playerState)) return;
    if (activeRecord?.id === record.id) return;

    if (activeRecord) {
      await ejectRecord({ keepInfo: true });
    }

    const button = getRecordButton(record.id);
    const sourceDisc = button?.querySelector(".record-disc");
    if (!button || !sourceDisc) {
      setStatus("RECORD UNAVAILABLE");
      return;
    }

    setState("selecting");
    markSelection(record);
    updateRecordInfo(record);
    setStatus("LOADING RECORD");
    await animateTravel(sourceDisc, platter, record);
    mountRecord(record);
  };

  const openSpotify = record => {
    if (!record || !isSpotifyUrl(record.spotifyUrl) || spotifyLaunchPending) return false;
    spotifyLaunchPending = true;
    window.open(record.spotifyUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => { spotifyLaunchPending = false; }, 1200);
    return true;
  };

  const playRecord = async () => {
    if (playerState !== "loaded" || !activeRecord || !isSpotifyUrl(activeRecord.spotifyUrl)) return;
    const recordAtStart = activeRecord;
    setState("starting");
    setStatus("LOWERING NEEDLE");
    mountedRecord.classList.add("is-spinning");
    turntable.classList.add("is-playing");
    clearSpotifyRedirect();
    spotifyRedirectTimer = window.setTimeout(() => {
      spotifyRedirectTimer = null;
      if (activeRecord === recordAtStart && ["starting", "playing"].includes(playerState)) {
        window.location.assign(recordAtStart.spotifyUrl);
      }
    }, 2000);
    await new Promise(resolve => window.setTimeout(resolve, reducedMotion.matches ? 1 : 1050));
    if (activeRecord !== recordAtStart || playerState !== "starting") return;
    setState("playing");
    setStatus("NEEDLE DOWN — OPENING SPOTIFY IN 2 SECONDS");
  };

  renderRecords();
  setState("idle");

  shelf.addEventListener("click", event => {
    const button = event.target.closest(".record-choice");
    if (!button || button.disabled) return;
    const record = records.find(item => item.id === button.dataset.recordId);
    if (!record) {
      setStatus("RECORD UNAVAILABLE");
      return;
    }
    selectRecord(record);
  });

  playButton.addEventListener("click", playRecord);
  ejectButton.addEventListener("click", () => ejectRecord());
  spotifyButton.addEventListener("click", () => {
    if (playerState !== "playing" || !activeRecord) return;
    clearSpotifyRedirect();
    const opened = openSpotify(activeRecord);
    setStatus(opened ? "OPENED IN SPOTIFY" : "SPOTIFY LINK UNAVAILABLE");
  });
})();
