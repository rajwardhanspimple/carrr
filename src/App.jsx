import { useCallback, useEffect, useState } from "react";
import GameScene from "./game/GameScene.jsx";
import Garage from "./ui/Garage.jsx";
import HUD, { useGameSnapshot } from "./ui/HUD.jsx";
import { MainMenu, GameOver, PauseOverlay, Countdown } from "./ui/Screens.jsx";
import { CARS, getCar } from "./game/cars.js";
import { game, resetGame, emit } from "./game/store.js";
import { initEntities } from "./game/entities.js";
import { bindKeyboard } from "./game/input.js";
import { audio } from "./game/audio.js";

export default function App() {
  const [screen, setScreen] = useState("menu"); // menu | garage | race
  const [carId, setCarId] = useState(() => localStorage.getItem("vr_car") || "sport");
  const [paint, setPaint] = useState(() => localStorage.getItem("vr_paint") || "");
  const [theme, setTheme] = useState(() => localStorage.getItem("vr_theme") || "sunset");
  const [quality, setQuality] = useState(() => localStorage.getItem("vr_quality") || "high");
  const [difficulty, setDifficulty] = useState(() => localStorage.getItem("vr_difficulty") || "normal");
  const [raceId, setRaceId] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const g = useGameSnapshot();
  const car = getCar(carId);
  const color = paint || car.defaultPaint;

  useEffect(() => bindKeyboard(), []);
  useEffect(() => localStorage.setItem("vr_car", carId), [carId]);
  useEffect(() => localStorage.setItem("vr_paint", paint), [paint]);
  useEffect(() => localStorage.setItem("vr_theme", theme), [theme]);
  useEffect(() => localStorage.setItem("vr_quality", quality), [quality]);
  useEffect(() => localStorage.setItem("vr_difficulty", difficulty), [difficulty]);

  const ensureAudio = () => {
    audio.init();
    audio.resume();
  };

  const startRace = useCallback(
    (overrideCar) => {
      ensureAudio();
      const c = overrideCar || getCar(carId);
      resetGame(c, difficulty);
      initEntities(c);
      game.status = "countdown";
      emit();
      setPaused(false);
      setRaceId((n) => n + 1);
      setScreen("race");
      setCountdown(3);
    },
    [carId, difficulty]
  );

  // countdown ticker
  useEffect(() => {
    if (screen !== "race" || countdown <= 0) return;
    const id = setTimeout(() => {
      const next = countdown - 1;
      setCountdown(next);
      audio.blip(next === 0 ? 1200 : 700, 0.15, "square", 0.15);
      if (next === 0) {
        game.status = "playing";
        emit();
      }
    }, 900);
    return () => clearTimeout(id);
  }, [countdown, screen]);

  const togglePause = useCallback(() => {
    if (screen !== "race") return;
    if (game.status === "playing") {
      game.status = "paused";
      setPaused(true);
      emit();
    } else if (game.status === "paused") {
      game.status = "playing";
      setPaused(false);
      emit();
    }
  }, [screen]);

  // global hotkeys
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "KeyC" && screen === "race") {
        game.cameraMode = (game.cameraMode + 1) % 3;
      }
      if ((e.code === "Escape" || e.code === "KeyP") && screen === "race") togglePause();
      if (e.code === "Enter" && screen === "race" && game.status === "over") startRace();
      if (e.code === "KeyM") {
        setMuted((m) => {
          audio.setEnabled(m);
          return !m;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, togglePause, startRace]);

  const quickPlay = () => {
    const c = CARS[Math.floor(Math.random() * CARS.length)];
    const themes = ["day", "sunset", "night"];
    setCarId(c.id);
    setPaint("");
    setTheme(themes[Math.floor(Math.random() * themes.length)]);
    startRace(c);
  };

  const goMenu = () => {
    game.status = "idle";
    emit();
    setScreen("menu");
  };
  const goGarage = () => {
    ensureAudio();
    game.status = "idle";
    emit();
    setScreen("garage");
  };

  const toggleMute = () => {
    setMuted((m) => {
      audio.setEnabled(m);
      return !m;
    });
  };

  return (
    <div className="relative w-full h-full bg-[#05060a]">
      {screen === "menu" && <MainMenu onGarage={goGarage} onQuickPlay={quickPlay} best={g.best} />}

      {screen === "garage" && (
        <Garage
          carId={carId}
          setCarId={setCarId}
          paint={paint}
          setPaint={setPaint}
          theme={theme}
          setTheme={setTheme}
          quality={quality}
          setQuality={setQuality}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          onStart={() => startRace()}
          onBack={goMenu}
        />
      )}

      {screen === "race" && (
        <>
          <div className="absolute inset-0">
            <GameScene key={raceId} car={car} color={color} theme={theme} quality={quality} />
          </div>
          <HUD onPause={togglePause} muted={muted} toggleMute={toggleMute} />
          {countdown > 0 && <Countdown n={countdown} />}
          {countdown === 0 && g.status === "playing" && g.time < 1 && <Countdown n={0} />}
          {paused && <PauseOverlay onResume={togglePause} onGarage={goGarage} onMenu={goMenu} />}
          {g.status === "over" && (
            <GameOver g={g} car={car} onRetry={() => startRace()} onGarage={goGarage} onMenu={goMenu} />
          )}
        </>
      )}
    </div>
  );
}
