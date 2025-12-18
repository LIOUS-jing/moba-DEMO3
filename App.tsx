
import React, { useState, useEffect, useRef } from 'react';
import GameHUD from './components/GameHUD';
import ControlPanel from './components/ControlPanel';
import { ProductMode, GameState, ChatMessage, PipelineLog } from './types';
import { INITIAL_CHAT_HISTORY, AI_NAME, AI_RESPONSES, DUPLEX_SCENARIOS } from './constants';
import { getAIResponse } from './services/aiService';

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<ProductMode>(ProductMode.GUIDED_QUERY);
  const [gameState, setGameState] = useState<GameState>(GameState.NORMAL);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_CHAT_HISTORY);
  const [pipelineLogs, setPipelineLogs] = useState<PipelineLog[]>([]);
  const [isDuplexActive, setIsDuplexActive] = useState(false);

  const [aiState, setAiState] = useState({
    isListening: false,
    isSpeaking: false,
    response: null as string | null,
    timer: 0,
    isThinking: false
  });

  const timerIntervalRef = useRef<number | null>(null);
  const speechTimeoutRef = useRef<number | null>(null);
  const duplexScenarioIdxRef = useRef(0);
  const isDuplexProcessingRef = useRef(false);

  const addPipelineLog = (role: PipelineLog['role'], content: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setPipelineLogs(prev => [...prev.slice(-40), { id: Math.random().toString(), role, content, timestamp: time }]);
  };

  const addChatMessage = (sender: ChatMessage['sender'], text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const runPipelineFlow = async (query: string): Promise<string> => {
    // 识别阶段高亮
    addPipelineLog('ASR', `识别结果 [QUERY]: "${query}"`);
    await new Promise(r => setTimeout(r, 600));
    
    addPipelineLog('VAD', 'VAD状态: 语音结束，音频流已切断');
    await new Promise(r => setTimeout(r, 400));
    
    addPipelineLog('NLP', '意图识别: 正在提取战术核心参数...');
    await new Promise(r => setTimeout(r, 800));
    
    addPipelineLog('LLM', '正在向 Gemini 云端发起战术分析请求...');
    const startTime = Date.now();
    const result = await getAIResponse(query, gameState);
    const duration = Date.now() - startTime;
    
    if (duration < 1200) await new Promise(r => setTimeout(r, 1200 - duration));
    
    // 决策阶段高亮
    addPipelineLog('LLM', `决策完成 [AI_RESPONSE]: "${result}"`);
    await new Promise(r => setTimeout(r, 600));
    
    addPipelineLog('TTS', '海克斯合成引擎合成中 (SampleRate: 24kHz)...');
    await new Promise(r => setTimeout(r, 1000));
    addPipelineLog('TTS', '语音包就绪，通过小队频道下发播放');
    
    return result;
  };

  const handleAIInteraction = async (query: string) => {
    const isVoiceMode = [ProductMode.SINGLE_TURN_VOICE, ProductMode.MULTI_TURN_VOICE, ProductMode.FULL_DUPLEX].includes(currentMode);

    if (currentMode === ProductMode.TEXT_CHAT) {
      const response = await getAIResponse(query, gameState);
      addChatMessage('ai', response);
      return;
    }

    let finalResponse = "";
    if (isVoiceMode) {
      finalResponse = await runPipelineFlow(query);
    } else {
      setAiState(prev => ({ ...prev, isSpeaking: true, isThinking: true }));
      finalResponse = await getAIResponse(query, gameState);
    }

    setAiState(prev => ({ ...prev, isThinking: false, response: finalResponse, isSpeaking: true }));

    // AI语音播放时长模拟
    const playDuration = 5000;
    speechTimeoutRef.current = window.setTimeout(() => {
      if (isVoiceMode) addPipelineLog('SYSTEM', '当前会话链路已正常关闭，系统重置为待命状态');
      setAiState(prev => ({ ...prev, isSpeaking: false, response: null }));
    }, playDuration);
  };

  const handleSendMessage = (text: string) => {
    if (currentMode === ProductMode.TEXT_CHAT) {
      addChatMessage('player', text);
      if (text.toLowerCase().includes('@ai')) {
        handleAIInteraction(text.replace(/@ai/gi, '').trim() || "在的，海克斯核心已连接。");
      }
    } else {
      handleAIInteraction(text);
    }
  };

  // 形态5：全双工场景多轮对话演示
  useEffect(() => {
    let scenarioTimer: number | null = null;

    if (currentMode === ProductMode.FULL_DUPLEX && isDuplexActive) {
      const runScenarioCycle = async () => {
        if (!isDuplexActive || isDuplexProcessingRef.current) return;
        isDuplexProcessingRef.current = true;

        const scenario = DUPLEX_SCENARIOS[duplexScenarioIdxRef.current % DUPLEX_SCENARIOS.length];
        duplexScenarioIdxRef.current++;

        addPipelineLog('SYSTEM', `[主动播报] 实时监测场景: ${scenario.trigger}`);
        await new Promise(r => setTimeout(r, 1000));
        addPipelineLog('LLM', `主动发起对话 [AI_RESPONSE]: "${scenario.ai}"`);
        setAiState(prev => ({ ...prev, isSpeaking: true, response: scenario.ai }));
        await new Promise(r => setTimeout(r, 4000));
        setAiState(prev => ({ ...prev, isSpeaking: false, response: null }));

        if (!isDuplexActive) { isDuplexProcessingRef.current = false; return; }

        // 模拟用户多轮追问
        await new Promise(r => setTimeout(r, 1500));
        addPipelineLog('ASR', `实时转义用户追问 [QUERY]: "${scenario.user}"`);
        await new Promise(r => setTimeout(r, 1000));

        addPipelineLog('LLM', `多轮毫秒级反馈 [AI_RESPONSE]: "${scenario.reply}"`);
        setAiState(prev => ({ ...prev, isSpeaking: true, response: scenario.reply }));
        await new Promise(r => setTimeout(r, 4000));
        setAiState(prev => ({ ...prev, isSpeaking: false, response: null }));

        isDuplexProcessingRef.current = false;
        scenarioTimer = window.setTimeout(runScenarioCycle, 8000);
      };

      scenarioTimer = window.setTimeout(runScenarioCycle, 2000);
    }

    return () => { 
      if (scenarioTimer) clearTimeout(scenarioTimer);
      isDuplexProcessingRef.current = false;
    };
  }, [currentMode, isDuplexActive]);

  // 形态4：30s 持续监听窗口
  useEffect(() => {
    if (currentMode === ProductMode.MULTI_TURN_VOICE && aiState.isListening) {
      setAiState(prev => ({ ...prev, timer: 30 }));
      timerIntervalRef.current = window.setInterval(() => {
        setAiState(prev => {
          if (prev.timer <= 1) {
            clearInterval(timerIntervalRef.current!);
            addPipelineLog('SYSTEM', '30s 多轮交互窗口已超时关闭');
            return { ...prev, isListening: false, timer: 0 };
          }
          return { ...prev, timer: prev.timer - 1 };
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [aiState.isListening, currentMode]);

  const handleVoiceTrigger = (active: boolean) => {
    // 形态3：单轮对话 - 按住说话且开启时必清空
    if (currentMode === ProductMode.SINGLE_TURN_VOICE) {
      if (active) {
        setPipelineLogs([]); // 彻底清空，体现新的一轮
        if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        setAiState(prev => ({ ...prev, isListening: true, isSpeaking: false, response: null }));
        addPipelineLog('ASR', '采集语音特征中 [Capture Start]');
      } else {
        setAiState(prev => ({ ...prev, isListening: false }));
        addPipelineLog('SYSTEM', '音频流采样结束 [Capture Stop]');
        handleAIInteraction("对面那个中单有点肥，我该怎么针对？");
      }
    } 
    // 形态4：多轮监听开关
    else if (currentMode === ProductMode.MULTI_TURN_VOICE) {
      if (!aiState.isListening) {
        setPipelineLogs([]); 
        setAiState(prev => ({ ...prev, isListening: true }));
        addPipelineLog('SYSTEM', '已激活 30s 持续监听窗口');
      } else {
        addPipelineLog('USER_ACTION', '多轮窗口内捕捉到后续追问指令');
        handleAIInteraction("帮我标记一下对方打野的位置。");
      }
    }
  };

  const toggleDuplex = () => {
    const active = !isDuplexActive;
    setIsDuplexActive(active);
    if (active) {
      setPipelineLogs([]); 
      addPipelineLog('SYSTEM', '全双工 (Full-Duplex) 实时交互协议已握手成功');
      addPipelineLog('ASR', '环境噪声自适应特征提取中 [READY]');
    } else {
      addPipelineLog('SYSTEM', '全双工连接正常关闭');
      setAiState(prev => ({ ...prev, isSpeaking: false, response: null }));
    }
  };

  const simulateInterrupt = () => {
    if (isDuplexActive && aiState.isSpeaking) {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      addPipelineLog('USER_ACTION', '!!! 系统监测到用户语音抢断 (Barge-in Activated) !!!');
      addPipelineLog('SYSTEM', '立即执行中断协议：停止当前 TTS 播报');
      setAiState(prev => ({ ...prev, isSpeaking: false, response: null }));
      
      setTimeout(() => {
        addPipelineLog('ASR', '打断内容识别 [QUERY]: "别说了，先看这波越塔，能不能杀？"');
        handleAIInteraction("这波越塔能不能杀？");
      }, 800);
    }
  };

  return (
    <div className="flex w-screen h-screen bg-black overflow-hidden text-white font-game" onContextMenu={(e) => {
      e.preventDefault();
      simulateInterrupt();
    }}>
      <div className="flex-1 relative">
        <GameHUD 
          mode={currentMode}
          gameState={gameState}
          onGameStateChange={setGameState}
          messages={messages}
          pipelineLogs={pipelineLogs}
          onSendMessage={handleSendMessage}
          aiState={aiState}
          onTriggerVoice={handleVoiceTrigger}
          onToggleDuplex={toggleDuplex}
          isDuplexActive={isDuplexActive}
        />
        {isDuplexActive && aiState.isSpeaking && (
          <div className="absolute bottom-10 right-10 bg-cyan-600/90 px-6 py-2 rounded-full animate-bounce text-xs font-black border border-white/20 shadow-[0_0_20px_rgba(6,182,212,0.6)] z-50">
            MOUSE_RIGHT 模拟实时打断 (Barge-in)
          </div>
        )}
      </div>

      <ControlPanel 
        currentMode={currentMode}
        onModeChange={(m) => {
          setCurrentMode(m);
          setPipelineLogs([]); 
          setAiState({ isListening: false, isSpeaking: false, response: null, timer: 0, isThinking: false });
          setIsDuplexActive(false);
          if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        }}
        currentState={gameState}
        onStateChange={setGameState}
      />
    </div>
  );
};

export default App;
