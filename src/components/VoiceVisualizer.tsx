import React, { useRef, useEffect, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
// MicrophonePlugin 대신 RecordPlugin을 import 합니다. ESM 버전을 사용하는 것이 좋습니다.
import RecordPlugin from 'wavesurfer.js/dist/plugins/record.esm.js';

const VoiceVisualizer: React.FC = () => {
  const waveformRef = useRef<HTMLDivElement>(null);
  // Ref는 그대로 사용합니다.
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const recordPluginRef = useRef<RecordPlugin | null>(null);
  
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (!waveformRef.current) return;

    // 그라데이션 생성
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, '#4f46e5');
    gradient.addColorStop(1, '#a855f7');

    // WaveSurfer 인스턴스 생성
    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: 'rgba(209, 213, 219, 0.5)',
      progressColor: gradient,
      barWidth: 3,
      barGap: 2,
      barRadius: 2,
      height: 128,
      interact: false,
    });
    wavesurferRef.current = wavesurfer;

    // Record 플러그인 인스턴스 생성 및 등록
    const record = wavesurfer.registerPlugin(RecordPlugin.create({ scrollingWaveform: true }));
    recordPluginRef.current = record;

    // 실시간 시각화를 시작합니다.
    record.startMic()
      .then(() => {
        setIsInitializing(false);
      })
      .catch((err: Error) => {
        console.error('마이크 시작 오류:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermissionError('마이크 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.');
        } else {
          setPermissionError('마이크를 시작할 수 없습니다. 장치가 연결되어 있는지 확인해주세요.');
        }
        setIsInitializing(false);
      });
    
    record.on('record-end', () => {
      // 녹음이 끝났을 때의 로직 (여기서는 시각화만 하므로 비워둠)
    });

    // useEffect cleanup 함수
    return () => {
      console.log('리소스를 정리합니다...');
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
    <div className="w-full bg-gray-900 p-4 rounded-lg shadow-lg flex items-center justify-center min-h-[10rem]">
      <div className="w-full">
        {permissionError ? (
          <div className="text-red-400 text-center">
            <p>오류가 발생했습니다.</p>
            <p className="text-sm mt-1">{permissionError}</p>
          </div>
        ) : isInitializing ? (
          <div className="text-gray-400 text-center">
            마이크 권한을 요청 중입니다...
          </div>
        ) : null}
        <div ref={waveformRef} className={`w-full h-32 transition-opacity duration-300 ${isInitializing || permissionError ? 'opacity-0' : 'opacity-100'}`} />
      </div>
    </div>
  );
};

export default VoiceVisualizer;