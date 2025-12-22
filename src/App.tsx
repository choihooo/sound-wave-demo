import React from 'react';
import VoiceVisualizer from './components/VoiceVisualizer';

function App() {
  return (
    <div className="min-h-screen bg-gray-800 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">
            실시간 음성 파형 시각화
          </h1>
          <p className="text-indigo-300 mt-2">
            마이크에 소리를 내면 파형이 실시간으로 표시됩니다.
          </p>
        </header>
        
        <main>
          <VoiceVisualizer />
        </main>

        <footer className="text-center mt-8 text-gray-500 text-sm">
          <p>
            Powered by React, TypeScript, WaveSurfer.js, and Tailwind CSS v4.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;