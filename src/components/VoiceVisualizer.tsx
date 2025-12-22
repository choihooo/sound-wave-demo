import React, { useRef, useEffect, useState, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import RecordPlugin from "wavesurfer.js/dist/plugins/record.esm.js";
import { Detect } from "web-voice-detection";

const SILENCE_DURATION_MS = 2000; // 2초 동안 무음이면 중지

const VoiceVisualizer: React.FC = () => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const recordPluginRef = useRef<RecordPlugin | null>(null);
  const vadRef = useRef<any>(null);
  const silenceTimerRef = useRef<number | null>(null);

  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // 최신 상태를 추적하기 위한 ref
  const isRecordingRef = useRef(isRecording);
  const isPausedRef = useRef(isPaused);

  // ref를 상태와 동기화
  useEffect(() => {
    isRecordingRef.current = isRecording;
    isPausedRef.current = isPaused;
  }, [isRecording, isPaused]);

  // 상태 변경 추적
  useEffect(() => {
    console.log(
      `[상태 변경] isRecording: ${isRecording}, isPaused: ${isPaused}, isInitializing: ${isInitializing}`
    );
  }, [isRecording, isPaused, isInitializing]);

  // 녹음 시작
  const handleStart = useCallback(async () => {
    if (!recordPluginRef.current || !vadRef.current) return;

    try {
      console.log("[상태] 녹음 시작 요청");
      await recordPluginRef.current.startMic();

      // VAD 시작
      if (vadRef.current && !vadRef.current.listening) {
        vadRef.current.start();
        console.log("[VAD] VAD 시작 완료");
      }

      setIsRecording(true);
      setIsPaused(false);
      console.log("[상태] 녹음 시작 완료 | isRecording: true, isPaused: false");
    } catch (err) {
      console.error("마이크 시작 오류:", err);
    }
  }, []);

  // 녹음 중지
  const handleStop = useCallback(() => {
    console.log("[상태] 녹음 중지 요청");
    if (recordPluginRef.current) {
      recordPluginRef.current.stopMic();
    }

    // VAD 일시정지
    if (vadRef.current && vadRef.current.listening) {
      vadRef.current.pause();
      console.log("[VAD] VAD 일시정지 완료");
    }

    setIsRecording(false);
    setIsPaused(false);
    console.log("[상태] 녹음 중지 완료 | isRecording: false, isPaused: false");

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    console.log("[설정] 모든 타이머 정리 완료");
  }, []);

  useEffect(() => {
    if (!waveformRef.current) return;

    // 그라데이션 생성
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, "#4f46e5");
    gradient.addColorStop(1, "#a855f7");

    // WaveSurfer 인스턴스 생성
    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: "rgba(209, 213, 219, 0.5)",
      progressColor: gradient,
      barWidth: 3,
      barGap: 2,
      barRadius: 2,
      height: 128,
      interact: false,
    });
    wavesurferRef.current = wavesurfer;

    // Record 플러그인 인스턴스 생성 및 등록
    const record = wavesurfer.registerPlugin(
      RecordPlugin.create({ scrollingWaveform: true })
    );
    recordPluginRef.current = record;

    // VAD 초기화
    console.log("[초기화] VAD 초기화 중...");

    // base 경로 가져오기 (프로덕션: /sound-wave-demo/, 개발: /)
    const basePath = import.meta.env.BASE_URL;

    // web-voice-detection 라이브러리로 VAD 초기화
    Detect.new({
      workletURL: `${basePath}worklet.js`,
      modelURL: `${basePath}model.onnx`,
      onSpeechStart: () => {
        console.log("[VAD] 음성 시작 감지");

        // 기존 타이머 클리어
        if (silenceTimerRef.current) {
          console.log("[VAD] 음성 시작 - 무음 타이머 취소");
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        // 일시정지 상태였다면 재개
        if (isPausedRef.current) {
          console.log("[VAD] 일시정지 해제 - 녹음 재개");
          setIsPaused(false);
          if (recordPluginRef.current) {
            recordPluginRef.current.startMic().catch(console.error);
          }
          // VAD 재개
          if (vadRef.current && !vadRef.current.listening) {
            vadRef.current.start();
            console.log("[VAD] VAD 재개 완료");
          }
          // 타이머 클리어 (음성이 다시 시작되었으므로)
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        }
      },
      onSpeechEnd: () => {
        console.log("[VAD] 음성 종료 감지");

        // 무음 타이머 설정
        if (
          !silenceTimerRef.current &&
          !isPausedRef.current &&
          isRecordingRef.current
        ) {
          const startTime = Date.now();
          console.log(
            `[VAD] 음성 종료 - ${
              SILENCE_DURATION_MS / 1000
            }초 후 자동 일시정지 예정`
          );

          const timerId = window.setTimeout(() => {
            const elapsedTime = Date.now() - startTime;
            console.log(
              `[타이머] 무음 타이머 실행 - 일시정지 시작 (경과 시간: ${elapsedTime}ms)`
            );

            if (recordPluginRef.current && isRecordingRef.current) {
              console.log("[상태] 자동 일시정지 실행 - 무음으로 인한 중지");
              recordPluginRef.current.stopMic();

              // VAD도 일시정지
              if (vadRef.current && vadRef.current.listening) {
                vadRef.current.pause();
                console.log("[VAD] VAD 일시정지 완료 (무음 감지)");
              }

              setIsPaused(true);
              silenceTimerRef.current = null;
            } else {
              console.log(
                `[타이머] 타이머 실행 시점에 조건 불만족 (isRecording: ${isRecordingRef.current})`
              );
              silenceTimerRef.current = null;
            }
          }, SILENCE_DURATION_MS);

          silenceTimerRef.current = timerId;
          console.log(
            `[타이머] 무음 타이머 설정 완료 (ID: ${timerId}, ${SILENCE_DURATION_MS}ms)`
          );
        }
      },
      onMisfire: () => {
        console.log("[VAD] Misfire 감지");
      },
      fftSize: 1024,
    })
      .then((detection: any) => {
        vadRef.current = detection;
        console.log("[초기화] VAD 초기화 완료");
        setIsInitializing(false);
        console.log("[초기화] 초기화 완료 - 녹음 시작 버튼을 눌러주세요");
      })
      .catch((err: Error) => {
        console.error("VAD 초기화 오류:", err);
        setPermissionError(
          "VAD 초기화에 실패했습니다. 브라우저를 새로고침해주세요."
        );
        setIsInitializing(false);
      });

    record.on("record-end", () => {
      // 녹음이 끝났을 때의 로직
    });

    // useEffect cleanup 함수
    return () => {
      console.log("리소스를 정리합니다...");

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      if (vadRef.current) {
        // web-voice-detection의 cleanup 메서드가 있다면 호출
        if (typeof vadRef.current.destroy === "function") {
          vadRef.current.destroy();
        }
      }

      if (record) {
        record.stopMic();
        record.destroy();
      }

      if (wavesurfer) {
        wavesurfer.destroy();
      }
    };
  }, []);

  return (
    <div className="w-full bg-gray-900 p-4 rounded-lg shadow-lg">
      <div className="w-full">
        {permissionError ? (
          <div className="text-red-400 text-center mb-4">
            <p>오류가 발생했습니다.</p>
            <p className="text-sm mt-1">{permissionError}</p>
          </div>
        ) : isInitializing ? (
          <div className="text-gray-400 text-center mb-4">
            마이크 권한을 요청 중입니다...
          </div>
        ) : null}

        <div
          ref={waveformRef}
          className={`w-full h-32 transition-opacity duration-300 mb-4 ${
            isInitializing || permissionError ? "opacity-0" : "opacity-100"
          } ${isPaused ? "opacity-50" : ""}`}
        />

        {!isInitializing && !permissionError && (
          <div className="flex items-center justify-center gap-4">
            {isPaused && (
              <div className="text-yellow-400 text-sm mr-2">
                무음 감지로 일시정지됨
              </div>
            )}
            {!isRecording || isPaused ? (
              <button
                onClick={handleStart}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg"
              >
                {isPaused ? "다시 시작" : "녹음 시작"}
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg"
              >
                중지
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceVisualizer;
