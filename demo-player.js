(function () {
  // Nudge all bubble timings for a demo (+ = later, − = earlier)
  const newPatientOffset = 0;
  const toothacheOffset = 0;

  const DEMO_OFFSETS = {
    "new-patient-exam": newPatientOffset,
    toothache: toothacheOffset,
    "broken-tooth": 0,
  };

  // Manual full-turn transcripts — edit start times here
  const DEMO_TRANSCRIPTS = {
    "new-patient-exam": [
      {
        speaker: "aly",
        start: 0,
        text: "Thank you for calling Buurma Family Dentistry. This is Aly. How can I help you today?",
      },
      {
        speaker: "patient",
        start: 4.7,
        text: "Hey, I just moved to the Grand Rapids area and I need a new dentist. I read your reviews and figured I'd call to see if I can book an appointment.",
      },
      {
        speaker: "aly",
        start: 12.72,
        text: "Absolutely. We can definitely help you out. And welcome to Grand Rapids.",
      },
      {
        speaker: "aly",
        start: 17.16,
        text: "Our front desk team is busy helping patients in the office right now, but I can get everything started for you and send your appointment request over for review.",
      },
      {
        speaker: "aly",
        start: 25.82,
        text: "Can I start with your first and last name and date of birth?",
      },
      {
        speaker: "patient",
        start: 29.14,
        text: "My name is Finn Leo and my birthday is May 11, 1995.",
      },
      {
        speaker: "aly",
        start: 34.24,
        text: "Got it. What's the best phone number and email address to contact you?",
      },
      {
        speaker: "patient",
        start: 38.86,
        text: "My phone number is 616-555-0198 and my email is fin123@gmail.com.",
      },
      {
        speaker: "aly",
        start: 48.28,
        text: "And what are you hoping to do during this appointment? Just a routine exam and cleaning?",
      },
      {
        speaker: "aly",
        start: 53.22,
        text: "Or is there anything specific you'd like the doctor to take a look at?",
      },
      {
        speaker: "patient",
        start: 57.24,
        text: "Mostly a cleaning and check-up. I'm also wondering if there's anything we can do to make my smile better because I'm a sales rep and first impressions are everything for my job.",
      },
      {
        speaker: "aly",
        start: 66.76,
        text: "Got it. I'll make a note for the doctor. Our doctors take pride in creating beautiful smiles for our patient family.",
      },
      {
        speaker: "aly",
        start: 74,
        text: "Do you have dental insurance?",
      },
      {
        speaker: "patient",
        start: 76.02,
        text: "I have Delta Dental.",
      },
      {
        speaker: "aly",
        start: 77.8,
        text: "Can I get your member ID?",
      },
      {
        speaker: "patient",
        start: 80,
        text: "DD48291.",
      },
      {
        speaker: "aly",
        start: 83.66,
        text: "Got it. We'll verify your benefits before your appointment so everything is ready when you arrive.",
      },
      {
        speaker: "aly",
        start: 89.3,
        text: "Give me just a moment while I check availability.",
      },
      {
        speaker: "aly",
        start: 92.66,
        text: "I have an opening this Friday June 7th at 3pm with Dr. Buurma. Would that time work for you?",
      },
      {
        speaker: "patient",
        start: 99.14,
        text: "Ah, I can't make that time.",
      },
      {
        speaker: "patient",
        start: 101.24,
        text: "What about Monday?",
      },
      {
        speaker: "aly",
        start: 102.54,
        text: "Let me take a look. I have an opening at 4pm on Monday June 10th with Dr. Buurma and we will be able to move you over to Hygiene right after. Would you like me to request 4pm?",
      },
      {
        speaker: "patient",
        start: 114.58,
        text: "Yes, that would be great.",
      },
      {
        speaker: "aly",
        start: 116.6,
        text: "Perfect. I've submitted your request.",
      },
      {
        speaker: "aly",
        start: 119.42,
        text: "Our front desk team will review it shortly and send a confirmation email.",
      },
      {
        speaker: "aly",
        start: 123.68,
        text: "If any adjustments need to be made, someone from the office will reach out to you directly.",
      },
      {
        speaker: "patient",
        start: 128.64,
        text: "Great. Thank you.",
      },
      {
        speaker: "aly",
        start: 130.52,
        text: "Please plan to arrive about 10 minutes early and bring your photo ID, insurance card, and a form of payment.",
      },
      {
        speaker: "aly",
        start: 137.48,
        text: "One more thing. Once your request is reviewed, you'll receive new patient forms electronically. Please fill it out 24 hours ahead of time for our staff to update your patient chart.",
      },
      {
        speaker: "patient",
        start: 148.72,
        text: "Okay, no problem.",
      },
      {
        speaker: "aly",
        start: 150.72,
        text: "Is there anything else I can help you with today?",
      },
      {
        speaker: "patient",
        start: 153.38,
        text: "No, I think that's everything.",
      },
      {
        speaker: "aly",
        start: 155.66,
        text: "Great. Welcome to the practice, Finn. We're looking forward to meeting you.",
      },
      {
        speaker: "patient",
        start: 160.28,
        text: "Thank you. Oh, one more question. What was your name again?",
      },
      {
        speaker: "aly",
        start: 164.86,
        text: "My name is Aly. Have a wonderful day. Bye.",
      },
      {
        speaker: "patient",
        start: 168.44,
        text: "Same to you, Aly. Bye.",
      },
    ],
    toothache: [
      {
        speaker: "aly",
        start: 0,
        text: "Thank you for calling Buurma Family Dentistry. This is Aly. How can I help you today?",
      },
      {
        speaker: "patient",
        start: 4.76,
        text: "Hey, I have an awful toothache that's kept me up all night. Are you open?",
      },
      {
        speaker: "aly",
        start: 10.18,
        text: "I'm sorry to hear that. Unfortunately, our office is closed until Monday morning.",
      },
      {
        speaker: "aly",
        start: 14.9,
        text: "But we do have an on-call team that reviews urgent situations like this, and someone will follow up with you as soon as possible.",
      },
      {
        speaker: "aly",
        start: 21.98,
        text: "I'm going to gather a little information so I can pass it along to our on-call team. Let's start with your name and date of birth.",
      },
      {
        speaker: "patient",
        start: 28.6,
        text: "My name is Finn Leo. My birthday is May 10, 1997.",
      },
      {
        speaker: "aly",
        start: 34.0,
        text: "Perfect. What is a good phone number to reach you at?",
      },
      {
        speaker: "patient",
        start: 39.0,
        text: "616-123-1356.",
      },
      {
        speaker: "aly",
        start: 42.6,
        text: "Do you have dental insurance?",
      },
      {
        speaker: "patient",
        start: 44.68,
        text: "Yeah, I have Delta Dental.",
      },
      {
        speaker: "aly",
        start: 47.14,
        text: "Great. Thank you. Can you tell me where the pain is coming from and when it started?",
      },
      {
        speaker: "patient",
        start: 52.24,
        text: "It's my bottom molar on the right side. I noticed it a couple days ago, but it's gotten worse today and it's starting to spread into my jaw.",
      },
      {
        speaker: "aly",
        start: 60.34,
        text: "I'll make a note of that. On a scale from 1 to 10, how bad is it right now, and how bad was it at its worst?",
      },
      {
        speaker: "patient",
        start: 67.86,
        text: "Before it was only a 1 or 2, but today it's climbed up to about a 6.",
      },
      {
        speaker: "aly",
        start: 72.58,
        text: "Okay. Have you noticed any facial swelling, fever, or difficulty swallowing?",
      },
      {
        speaker: "patient",
        start: 77.88,
        text: "No, I don't think so.",
      },
      {
        speaker: "aly",
        start: 80.16,
        text: "Okay, that's good. I'm sending your information to the on-call team now.",
      },
      {
        speaker: "aly",
        start: 84.22,
        text: "Keep your phone nearby because one of our staff members will be calling you shortly.",
      },
      {
        speaker: "aly",
        start: 89.14,
        text: "If you develop difficulty swallowing, difficulty breathing, significant facial swelling, or feel like the swelling is spreading, please seek immediate medical attention or call 911.",
      },
      {
        speaker: "patient",
        start: 100.84,
        text: "Okay, thank you so much. And what was your name again?",
      },
      {
        speaker: "aly",
        start: 104.86,
        text: "My name is Aly. You're very welcome, Finn. Take care.",
      },
      {
        speaker: "patient",
        start: 108.74,
        text: "Goodbye, Aly.",
      },
    ],
    "broken-tooth": [
      {
        speaker: "aly",
        start: 0,
        text: "Thank you for calling Buurma Family Dentistry. This is Aly. How can I help you today?",
      },
      {
        speaker: "patient",
        start: 4,
        text: "Hi, I chipped a front tooth and wanted to see if someone could take a look today.",
      },
      {
        speaker: "aly",
        start: 10,
        text: "[Placeholder transcript — update timings when final audio is added.]",
      },
    ],
  };

  function formatTime(secs) {
    const total = Math.max(0, Math.floor(secs));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function resolveAudioUrl(file) {
    try {
      const encoded = file
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
      return new URL(encoded, window.location.href).href;
    } catch {
      return file;
    }
  }

  function audioSourceMatches(audio, file) {
    if (!audio || !file) return false;
    const target = resolveAudioUrl(file);
    return audio.src === target || audio.currentSrc === target;
  }

  function setAudioSource(audio, file) {
    if (!audio || !file) return;
    const target = resolveAudioUrl(file);
    if (!audioSourceMatches(audio, file)) {
      audio.src = target;
      audio.load();
    }
  }

  function waitForAudioReady(audio) {
    return new Promise((resolve, reject) => {
      if (!audio) {
        reject(new Error("missing audio element"));
        return;
      }

      if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA && !audio.error) {
        resolve();
        return;
      }

      const cleanup = () => {
        audio.removeEventListener("canplay", onReady);
        audio.removeEventListener("loadeddata", onReady);
        audio.removeEventListener("error", onError);
      };

      const onReady = () => {
        cleanup();
        resolve();
      };

      const onError = () => {
        cleanup();
        reject(audio.error || new Error("audio failed to load"));
      };

      audio.addEventListener("canplay", onReady, { once: true });
      audio.addEventListener("loadeddata", onReady, { once: true });
      audio.addEventListener("error", onError, { once: true });

      if (audio.networkState === HTMLMediaElement.NETWORK_EMPTY || audio.error) {
        audio.load();
      }
    });
  }

  function buildTurns(rawTurns, offset) {
    return rawTurns.map((turn) => ({
      speaker: turn.speaker,
      text: turn.text,
      start: turn.start + offset,
    }));
  }

  function renderTranscript(container, turns) {
    container.innerHTML = "";
    turns.forEach((turn, index) => {
      const side = turn.speaker === "patient" ? "chat-patient" : "chat-agent";
      const bubble = document.createElement("div");
      bubble.className = `chat-bubble ${side}`;
      bubble.dataset.segment = String(index);
      bubble.dataset.speaker = turn.speaker;

      const text = document.createElement("p");
      text.className = "chat-text";
      text.textContent = turn.text;
      bubble.appendChild(text);

      container.appendChild(bubble);
    });
    return [...container.querySelectorAll(".chat-bubble")];
  }

  function initDemoCard(card, meta, turns, allCards) {
    const transcriptEl = card.querySelector(".demo-card-transcript");
    if (!turns?.length || !transcriptEl) {
      console.warn(`FreedomDesk demo: missing transcript for "${card.dataset.demo}".`);
      return;
    }

    const bubbles = renderTranscript(transcriptEl, turns);
    const audio = card.querySelector("audio");
    const playBtn = card.querySelector(".demo-card-play");
    const progressBar = card.querySelector(".demo-card-progress-bar");
    const progressTrack = card.querySelector(".demo-card-progress");
    const progressHandle = card.querySelector(".demo-card-progress-handle");
    const timeEl = card.querySelector(".demo-card-time");

    let duration = meta.duration;
    let rafId = null;
    let state = "idle";
    let isScrubbing = false;
    let scrubPointerId = null;
    let wasPlayingBeforeScrub = false;
    let lastVisibleCount = 0;

    function getDuration() {
      if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
        return audio.duration;
      }
      return duration;
    }

    function setDuration(nextDuration) {
      if (!Number.isFinite(nextDuration) || nextDuration <= 0) return;
      duration = nextDuration;
      if (progressTrack) {
        progressTrack.setAttribute("aria-valuemax", String(Math.ceil(duration)));
      }
      if (state !== "playing" && !isScrubbing) {
        updateProgress(audio?.currentTime || 0);
      }
    }

    function setState(nextState) {
      state = nextState;
    }

    function stopRaf() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }

    card._stopDemoRaf = stopRaf;
    card._setDemoState = setState;
    card._resetDemo = hardResetDemo;

    if (audio && meta.file) {
      audio.preload = "metadata";
      setAudioSource(audio, meta.file);
    } else {
      console.error(`FreedomDesk demo "${meta.title}": missing audio element or file path.`);
    }

    console.info(`FreedomDesk demo "${meta.title}": initialized`, {
      turns: turns.length,
      audio: meta.file,
    });

    if (timeEl) {
      timeEl.textContent = `0:00 / ${formatTime(duration)}`;
    }

    function syncTranscriptPanel() {
      card.classList.toggle("demo-transcript-open", lastVisibleCount > 0);
    }

    function applyTranscriptState(currentTime, { scroll = false } = {}) {
      let visibleCount = 0;
      let activeIndex = -1;
      const prevVisibleCount = lastVisibleCount;

      turns.forEach((turn, index) => {
        const bubble = bubbles[index];
        if (!bubble) return;

        const visible = currentTime >= turn.start;

        if (visible) {
          visibleCount += 1;
          activeIndex = index;
          bubble.classList.add("visible");
        } else {
          bubble.classList.remove("visible", "is-speaking");
        }
      });

      bubbles.forEach((bubble, index) => {
        const isActive = index === activeIndex && currentTime >= turns[index].start;
        bubble.classList.toggle("is-speaking", state === "playing" && isActive);
      });

      lastVisibleCount = visibleCount;
      syncTranscriptPanel();

      const shouldScroll = scroll ? activeIndex >= 0 : visibleCount > prevVisibleCount;
      if (shouldScroll && activeIndex >= 0) {
        bubbles[activeIndex]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }

    function revealAllTurns() {
      bubbles.forEach((bubble) => {
        bubble.classList.add("visible");
        bubble.classList.remove("is-speaking");
      });
      lastVisibleCount = turns.length;
      syncTranscriptPanel();
    }

    function resetTranscript() {
      bubbles.forEach((bubble) => bubble.classList.remove("visible", "is-speaking"));
      lastVisibleCount = 0;
      syncTranscriptPanel();
    }

    function hardResetDemo() {
      if (!audio) return;

      audio.pause();
      audio.currentTime = 0;
      isScrubbing = false;
      scrubPointerId = null;
      progressTrack?.classList.remove("is-scrubbing");
      card.classList.remove("is-scrubbing");
      stopRaf();
      resetTranscript();
      updateProgress(0);
      setState("idle");
      setPlayingUi(false);
    }

    function updateProgress(currentTime) {
      const total = getDuration();
      const pct = total > 0 ? Math.min((currentTime / total) * 100, 100) : 0;

      if (progressBar) progressBar.style.width = `${pct}%`;
      if (progressHandle) progressHandle.style.left = `${pct}%`;

      if (progressTrack) {
        progressTrack.setAttribute("aria-valuenow", String(Math.round(currentTime)));
        progressTrack.setAttribute("aria-valuetext", formatTime(currentTime));
      }

      if (timeEl) {
        timeEl.textContent = `${formatTime(currentTime)} / ${formatTime(total)}`;
      }
    }

    function getTimeFromClientX(clientX) {
      if (!progressTrack) return 0;
      const rect = progressTrack.getBoundingClientRect();
      if (rect.width <= 0) return 0;
      const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return pct * getDuration();
    }

    function seekTo(time, { scroll = true } = {}) {
      if (!audio) return 0;

      const total = getDuration();
      const nextTime = Math.min(total, Math.max(0, time));

      audio.currentTime = nextTime;
      updateProgress(nextTime);
      applyTranscriptState(nextTime, { scroll });

      if (nextTime >= total - 0.1) {
        if (isScrubbing) {
          revealAllTurns();
          updateProgress(total);
        } else {
          finishPlayback();
        }
        return nextTime;
      }

      if (state === "complete") {
        setState("paused");
        setPlayingUi(false);
      }

      return nextTime;
    }

    function beginScrub() {
      isScrubbing = true;
      wasPlayingBeforeScrub = state === "playing" && audio && !audio.paused;
      stopRaf();

      if (wasPlayingBeforeScrub) {
        audio.pause();
      }

      progressTrack?.classList.add("is-scrubbing");
      card.classList.add("is-scrubbing");
    }

    function endScrub() {
      if (!isScrubbing) return;

      isScrubbing = false;
      scrubPointerId = null;
      progressTrack?.classList.remove("is-scrubbing");
      card.classList.remove("is-scrubbing");

      if (!audio) return;

      if (audio.currentTime >= getDuration() - 0.1) {
        finishPlayback();
        return;
      }

      if (wasPlayingBeforeScrub) {
        void startPlayback();
        return;
      }

      setState(audio.currentTime > 0 ? "paused" : "idle");
      setPlayingUi(false);
    }

    function tick() {
      if (!audio || audio.paused || isScrubbing) return;
      const t = audio.currentTime;
      applyTranscriptState(t, { scroll: true });
      updateProgress(t);
      rafId = requestAnimationFrame(tick);
    }

    function pauseOthers() {
      allCards.forEach((other) => {
        if (other === card) return;

        const otherAudio = other.querySelector("audio");
        const hasProgress = otherAudio && otherAudio.currentTime > 0;

        if (otherAudio && (!otherAudio.paused || hasProgress)) {
          other._resetDemo?.();
        }
      });
    }

    function setPlayingUi(playing) {
      playBtn?.classList.toggle("is-playing", playing);
      card.classList.toggle("is-playing", playing);
      playBtn?.setAttribute("aria-label", playing ? `Pause ${meta.title}` : `Play ${meta.title}`);
    }

    async function startPlayback() {
      if (!audio) return;

      pauseOthers();
      setAudioSource(audio, meta.file);

      if (audio.currentTime >= getDuration() - 0.05) {
        audio.currentTime = 0;
        resetTranscript();
        updateProgress(0);
      }

      try {
        if (audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA || audio.error) {
          await waitForAudioReady(audio);
        }
        await audio.play();
      } catch (err) {
        const mediaError = audio.error;
        console.error(`FreedomDesk demo "${meta.title}": playback failed`, {
          file: meta.file,
          currentSrc: audio.currentSrc,
          code: mediaError?.code ?? null,
          error: err,
        });
        setState("idle");
        setPlayingUi(false);
        stopRaf();
        return;
      }

      setState("playing");
      setPlayingUi(true);
      stopRaf();
      applyTranscriptState(audio.currentTime, { scroll: true });
      updateProgress(audio.currentTime);
      rafId = requestAnimationFrame(tick);
    }

    function pausePlayback() {
      audio?.pause();
      stopRaf();
      if (audio) {
        applyTranscriptState(audio.currentTime, { scroll: false });
      }
      setState("paused");
      setPlayingUi(false);
    }

    function startFromBeginning() {
      if (!audio) return;
      audio.currentTime = 0;
      resetTranscript();
      updateProgress(0);
      void startPlayback();
    }

    function finishPlayback() {
      stopRaf();
      isScrubbing = false;
      scrubPointerId = null;
      progressTrack?.classList.remove("is-scrubbing");
      card.classList.remove("is-scrubbing");
      updateProgress(getDuration());
      revealAllTurns();
      setState("complete");
      setPlayingUi(false);
    }

    playBtn?.addEventListener("click", () => {
      if (state === "playing" && audio && !audio.paused) {
        pausePlayback();
        return;
      }

      if (state === "complete" || (audio && audio.currentTime >= getDuration() - 0.15)) {
        startFromBeginning();
        return;
      }

      if (state === "paused") {
        void startPlayback();
        return;
      }

      startFromBeginning();
    });

    progressTrack?.addEventListener("pointerdown", (event) => {
      if (!audio || event.button !== 0) return;

      scrubPointerId = event.pointerId;
      beginScrub();
      progressTrack.setPointerCapture(event.pointerId);
      seekTo(getTimeFromClientX(event.clientX));
      event.preventDefault();
    });

    progressTrack?.addEventListener("pointermove", (event) => {
      if (!isScrubbing || event.pointerId !== scrubPointerId) return;
      seekTo(getTimeFromClientX(event.clientX));
    });

    progressTrack?.addEventListener("pointerup", (event) => {
      if (event.pointerId !== scrubPointerId) return;
      if (progressTrack.hasPointerCapture(event.pointerId)) {
        progressTrack.releasePointerCapture(event.pointerId);
      }
      endScrub();
    });

    progressTrack?.addEventListener("pointercancel", (event) => {
      if (event.pointerId !== scrubPointerId) return;
      if (progressTrack.hasPointerCapture(event.pointerId)) {
        progressTrack.releasePointerCapture(event.pointerId);
      }
      endScrub();
    });

    progressTrack?.addEventListener("keydown", (event) => {
      if (!audio) return;

      const step = event.shiftKey ? 10 : 5;
      let nextTime = audio.currentTime;
      let handled = false;

      switch (event.key) {
        case "ArrowLeft":
          nextTime -= step;
          handled = true;
          break;
        case "ArrowRight":
          nextTime += step;
          handled = true;
          break;
        case "Home":
          nextTime = 0;
          handled = true;
          break;
        case "End":
          nextTime = getDuration();
          handled = true;
          break;
        default:
          break;
      }

      if (!handled) return;

      event.preventDefault();
      seekTo(nextTime);

      if (state === "idle") {
        setState("paused");
      }
    });

    audio?.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
      console.info(`FreedomDesk demo "${meta.title}": audio metadata loaded`, {
        src: audio.currentSrc,
        duration: audio.duration,
      });
    });

    audio?.addEventListener("playing", () => {
      applyTranscriptState(audio.currentTime, { scroll: true });
      updateProgress(audio.currentTime);
    });

    audio?.addEventListener("timeupdate", () => {
      if (!audio || isScrubbing || state !== "playing") return;
      applyTranscriptState(audio.currentTime, { scroll: true });
      updateProgress(audio.currentTime);
    });

    audio?.addEventListener("durationchange", () => {
      setDuration(audio.duration);
    });

    audio?.addEventListener("ended", finishPlayback);

    audio?.addEventListener("error", () => {
      const mediaError = audio.error;
      const reasons = {
        1: "MEDIA_ERR_ABORTED",
        2: "MEDIA_ERR_NETWORK",
        3: "MEDIA_ERR_DECODE",
        4: "MEDIA_ERR_SRC_NOT_SUPPORTED",
      };

      console.error(`FreedomDesk demo "${meta.title}": audio failed to load`, {
        file: meta.file,
        currentSrc: audio.currentSrc,
        code: mediaError?.code ?? null,
        reason: reasons[mediaError?.code] ?? "unknown",
      });

      setState("idle");
      setPlayingUi(false);
      stopRaf();
    });
  }

  function initDemoTabs(cards) {
    const tabRoot = document.querySelector("#hear .demo-tabs");
    if (!tabRoot) return;

    const tabs = [...tabRoot.querySelectorAll("[data-demo-tab]")];
    const panels = [...tabRoot.querySelectorAll("[data-demo-panel]")];
    if (!tabs.length || !panels.length) return;

    function activate(demoId) {
      tabs.forEach((tab) => {
        const selected = tab.dataset.demoTab === demoId;
        tab.setAttribute("aria-selected", selected ? "true" : "false");
        tab.classList.toggle("is-active", selected);
        tab.tabIndex = selected ? 0 : -1;
      });

      panels.forEach((panel) => {
        const active = panel.dataset.demoPanel === demoId;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
      });

      cards.forEach((card) => {
        if (card.dataset.demo !== demoId) {
          card._resetDemo?.();
        }
      });
    }

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => activate(tab.dataset.demoTab));
      tab.addEventListener("keydown", (event) => {
        const index = tabs.indexOf(tab);
        let nextIndex = -1;

        if (event.key === "ArrowRight") {
          nextIndex = (index + 1) % tabs.length;
        } else if (event.key === "ArrowLeft") {
          nextIndex = (index - 1 + tabs.length) % tabs.length;
        } else if (event.key === "Home") {
          nextIndex = 0;
        } else if (event.key === "End") {
          nextIndex = tabs.length - 1;
        }

        if (nextIndex < 0) return;

        event.preventDefault();
        tabs[nextIndex].focus();
        activate(tabs[nextIndex].dataset.demoTab);
      });
    });
  }

  async function initCallDemo() {
    const cards = [...document.querySelectorAll("#hear .demo-card")];
    if (!cards.length) return;

    let manifest = {};

    try {
      const res = await fetch("audio/manifest.json");
      if (!res.ok) throw new Error("manifest missing");
      const data = await res.json();
      if (data.audioAvailable === false) return;
      const { audioAvailable, ...scenarios } = data;
      manifest = scenarios;
    } catch {
      console.warn("FreedomDesk demo: audio manifest not found.");
      return;
    }

    cards.forEach((card) => {
      const id = card.dataset.demo;
      const meta = manifest[id];
      const rawTurns = DEMO_TRANSCRIPTS[id];
      const offset = DEMO_OFFSETS[id] ?? 0;

      if (!meta || !rawTurns) {
        console.warn(`FreedomDesk demo: missing config for "${id}".`);
        return;
      }

      initDemoCard(card, meta, buildTurns(rawTurns, offset), cards);
    });

    initDemoTabs(cards);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCallDemo);
  } else {
    initCallDemo();
  }
})();
