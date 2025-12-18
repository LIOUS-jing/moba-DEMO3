
import React, { useState, useEffect, useRef } from 'react';
import { GameState, ProductMode, ChatMessage, PipelineLog } from '../types';
import { IconBrain, IconMic, IconActivity } from './Icons';
import { MOCK_GUIDED_QUERIES, AI_NAME } from '../constants';

interface GameHUDProps {
  mode: ProductMode;
  gameState: GameState;
  onGameStateChange: (state: GameState) => void;
  messages: ChatMessage[];
  pipelineLogs: PipelineLog[];
  onSendMessage: (text: string) => void;
  aiState: {
    isListening: boolean;
    isSpeaking: boolean;
    response: string | null;
    timer: number;
    isThinking: boolean;
  };
  onTriggerVoice: (start: boolean) => void;
  onToggleDuplex: () => void;
  isDuplexActive: boolean;
}

const GameHUD: React.FC<GameHUDProps> = ({
  mode,
  gameState,
  messages,
  pipelineLogs,
  onSendMessage,
  aiState,
  onTriggerVoice,
  onToggleDuplex,
  isDuplexActive
}) => {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [pipelineLogs]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const renderPipelineConsole = () => {
    const isVisible = [ProductMode.SINGLE_TURN_VOICE, ProductMode.MULTI_TURN_VOICE, ProductMode.FULL_DUPLEX].includes(mode);
    if (!isVisible) return null;
    
    return (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-black/95 border border-gray-800 rounded-lg font-mono p-5 overflow-hidden flex flex-col shadow-2xl z-20 pointer-events-none border-t-4 border-t-cyan-500">
        <div className="text-[10px] text-cyan-500 mb-4 border-b border-gray-800 pb-2 flex justify-between font-bold italic tracking-tighter">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${aiState.isListening ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
            <span>HEX_CORE_AI_PIPELINE v4.0 - ADVANCED_LOGGING</span>
          </div>
          <span className="opacity-50 tracking-normal">IO_SYNC: ACTIVE</span>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hide space-y-3 text-[11px]">
          {pipelineLogs.map((log) => {
            const isASRResult = log.role === 'ASR' && log.content.includes('[QUERY]');
            const isLLMResult = log.role === 'LLM' && log.content.includes('[AI_RESPONSE]');
            
            return (
              <div key={log.id} className={`flex gap-3 leading-relaxed border-l-2 pl-3 transition-all duration-300 ${
                isASRResult ? 'border-blue-500 bg-blue-950/20 py-1' : 
                isLLMResult ? 'border-green-500 bg-green-950/20 py-1' : 'border-gray-800'
              }`}>
                <span className="text-gray-600 shrink-0 tabular-nums">[{log.timestamp.split(':').slice(-2).join(':')}]</span>
                <div className="flex flex-col flex-1">
                  <span className={`font-black text-[10px] tracking-widest uppercase ${
                    log.role === 'SYSTEM' ? 'text-cyan-400' : 
                    log.role === 'ASR' ? 'text-blue-400' :
                    log.role === 'LLM' ? 'text-green-400' :
                    log.role === 'TTS' ? 'text-yellow-400' : 
                    log.role === 'USER_ACTION' ? 'text-red-400' : 'text-purple-400'
                  }`}>{log.role}</span>
                  <span className={`leading-snug ${
                    isASRResult ? 'text-blue-100 font-bold' : 
                    isLLMResult ? 'text-green-100 font-bold' : 'text-gray-400'
                  }`}>
                    {log.content}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={logEndRef} />
        </div>
      </div>
    );
  };

  const renderAIResponseBubble = () => {
    if (!aiState.isSpeaking || (mode !== ProductMode.GUIDED_QUERY && mode !== ProductMode.SINGLE_TURN_VOICE)) return null;

    return (
      <div className="w-80 bg-slate-900/95 border-l-4 border-l-cyan-500 border border-gray-800 text-white p-5 rounded shadow-2xl backdrop-blur-md animate-in slide-in-from-right-full duration-500">
        <div className="text-[10px] uppercase font-bold tracking-widest flex items-center gap-2 text-cyan-400 mb-3">
          <IconBrain className="w-4 h-4" /> {AI_NAME} 决策引擎
        </div>
        <p className="text-sm leading-relaxed font-game italic">"{aiState.response || '分析中...'}"</p>
        <div className="mt-3 flex justify-between items-center">
          <div className="flex gap-1">
            <div className="w-1 h-3 bg-cyan-500 animate-voice-wave" style={{animationDelay: '0s'}}></div>
            <div className="w-1 h-3 bg-cyan-500 animate-voice-wave" style={{animationDelay: '0.2s'}}></div>
          </div>
          <span className="text-[9px] text-gray-500 uppercase tracking-tighter">
            {mode === ProductMode.SINGLE_TURN_VOICE ? "Session Complete" : "Realtime Link"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-950 font-game">
      {renderPipelineConsole()}

      {/* Top HUD */}
      <div className="absolute top-0 w-full h-12 flex justify-between px-6 pt-2 z-10 bg-gradient-to-b from-black/90 to-transparent">
        <div className="text-gold-400 font-black text-xs tracking-widest uppercase drop-shadow-md">
          <span className="text-blue-400">BLUE</span> 15 <span className="text-gray-500 px-1 font-normal">:</span> 12 <span className="text-red-400">RED</span> 
          <span className="mx-4 text-gray-600">|</span> 
          <span className="text-white">18:45</span>
        </div>
        <div className="flex gap-4 items-center">
           {mode === ProductMode.MULTI_TURN_VOICE && aiState.isListening && (
             <div className="bg-cyan-950/80 border border-cyan-500/50 px-3 py-1 rounded-md text-cyan-400 text-[10px] font-black animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.3)]">
               LISTENING WINDOW: {aiState.timer}S
             </div>
           )}
           <div className="text-white/40 text-[9px] font-mono border border-white/10 px-2 py-1 rounded tracking-widest uppercase bg-black/40">
             Protocol: {ProductMode[mode]}
           </div>
        </div>
      </div>

      {/* Left Chat */}
      <div className="absolute bottom-12 left-6 w-80 flex flex-col gap-3 z-30">
        <div className="h-72 overflow-y-auto scrollbar-hide flex flex-col gap-2 pointer-events-none">
           {messages.map((msg) => (
             <div key={msg.id} className={`text-[13px] px-3 py-2 rounded border-l-2 transition-all ${
               msg.sender === 'ai' ? 'text-cyan-100 bg-cyan-950/40 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 
               msg.sender === 'system' ? 'text-gray-400 bg-transparent border-gray-700 italic' :
               'text-white bg-black/60 border-gray-700 shadow-md'
             }`}>
               {msg.sender === 'ai' && <span className="font-black text-cyan-400 mr-2 uppercase text-[10px]">[{AI_NAME}]:</span>}
               {msg.text}
             </div>
           ))}
           <div ref={chatEndRef} />
        </div>
        
        <div className={`pointer-events-auto transition-all duration-300 ${mode === ProductMode.TEXT_CHAT ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center bg-black/90 border border-gray-700 rounded p-1 shadow-2xl focus-within:border-cyan-500 transition-colors">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="输入指令 (e.g. @ai 我该买什么装备?)"
              className="bg-transparent border-none outline-none text-white text-xs py-2 px-3 flex-1 font-mono placeholder:text-gray-600"
            />
          </div>
        </div>
      </div>

      {/* Right Interaction UI */}
      <div className="absolute top-24 right-0 flex flex-col items-end gap-6 z-50">
        {renderAIResponseBubble()}

        {mode === ProductMode.GUIDED_QUERY && !aiState.isSpeaking && (
          <div className="flex flex-col gap-2 items-end">
            {MOCK_GUIDED_QUERIES[gameState].map((q, idx) => (
              <button key={idx} onClick={() => onSendMessage(q)} className="bg-slate-900/95 border-r-4 border-r-cyan-500 border border-gray-800 text-white px-6 py-4 rounded-l-md text-xs hover:bg-cyan-900 transition-all shadow-[0_0_30px_rgba(0,0,0,0.5)] font-black uppercase tracking-wider">
                💡 {q}
              </button>
            ))}
          </div>
        )}

        {(mode === ProductMode.SINGLE_TURN_VOICE || mode === ProductMode.MULTI_TURN_VOICE) && (
          <div className="mr-8 flex flex-col items-center gap-3">
             <div className="relative group">
                {aiState.isListening && (
                   <div className="absolute inset-0 flex items-center justify-center -m-6">
                      <div className="w-28 h-28 border border-cyan-500/40 rounded-full animate-ping"></div>
                      <div className="absolute flex items-center justify-center gap-1.5 h-10">
                         {[1,2,3,4,5,6,7].map(i => (
                           <div key={i} className="w-1 bg-cyan-400 animate-voice-wave" style={{ animationDelay: `${i*0.1}s`, height: '60%' }}></div>
                         ))}
                      </div>
                   </div>
                )}
                <button
                  onMouseDown={() => onTriggerVoice(true)}
                  onMouseUp={() => onTriggerVoice(false)}
                  onMouseLeave={() => aiState.isListening && onTriggerVoice(false)}
                  onTouchStart={() => onTriggerVoice(true)}
                  onTouchEnd={() => onTriggerVoice(false)}
                  className={`w-20 h-20 rounded-full flex items-center justify-center border-4 transition-all shadow-[0_0_40px_rgba(0,0,0,0.9)] relative z-10 active:scale-95 ${
                    aiState.isListening ? 'bg-cyan-600 border-cyan-400 scale-110 shadow-[0_0_30px_rgba(6,182,212,0.5)]' : 'bg-slate-800 border-slate-700 hover:border-cyan-500 hover:bg-slate-700'
                  }`}
                >
                  <IconMic className={`w-10 h-10 ${aiState.isListening ? 'text-white' : 'text-slate-400 group-hover:text-cyan-400'}`} />
                </button>
             </div>
            <div className="flex flex-col items-center">
              <span className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1 ${aiState.isListening ? 'text-cyan-400' : 'text-gray-500'}`}>
                {mode === ProductMode.SINGLE_TURN_VOICE ? (aiState.isListening ? 'CAPTURE ON' : 'HOLD TO TALK') : (aiState.isListening ? `REMAIN ${aiState.timer}s` : 'START WINDOW')}
              </span>
              <div className="h-0.5 w-full bg-gray-800 rounded-full overflow-hidden">
                {aiState.isListening && <div className="h-full bg-cyan-500 animate-pulse w-full"></div>}
              </div>
            </div>
          </div>
        )}

        {mode === ProductMode.FULL_DUPLEX && (
          <div className="mr-8 flex flex-col items-center gap-4">
            <div className={`w-24 h-24 rounded-full border-4 p-2 transition-all relative ${isDuplexActive ? 'border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.4)]' : 'border-gray-800 grayscale opacity-40'}`}>
               <img src="https://api.dicebear.com/7.x/bottts/svg?seed=HextechAssistant&backgroundColor=0f172a&eyes=happy" className="w-full h-full rounded-full bg-slate-900 border border-slate-800" alt="Hextech Assistant" />
               {isDuplexActive && aiState.isSpeaking && (
                 <div className="absolute -bottom-1 -right-1 flex gap-1 bg-cyan-500 px-2 py-2 rounded-full border-2 border-slate-950 shadow-xl">
                    <div className="w-1 h-3 bg-white animate-voice-wave" style={{ animationDelay: '0s' }}></div>
                    <div className="w-1 h-4 bg-white animate-voice-wave" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-3 bg-white animate-voice-wave" style={{ animationDelay: '0.2s' }}></div>
                 </div>
               )}
            </div>
            <button 
              onClick={onToggleDuplex} 
              className={`px-8 py-3 rounded text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all border active:translate-y-0.5 ${
                isDuplexActive ? 'bg-cyan-600 border-cyan-400 hover:bg-cyan-700 shadow-cyan-900/40' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isDuplexActive ? '陪伴进行中' : '唤醒海克斯陪伴'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameHUD;
