import React, { useState, useEffect } from 'react';
import { Send, Save, Settings, Brain, MoveDown, CheckCircle, X, MessageSquare, Clock, RefreshCw, Zap } from 'lucide-react';
import { useRecThink } from '../context/RecThinkContext';

const RecursiveThinkingInterface = () => {
  const {
    sessionId,
    messages,
    isThinking,
    thinkingProcess,
    apiKey,
    model,
    thinkingRounds,
    alternativesPerRound,
    error,
    showThinkingProcess,
    connectionStatus,
    
    setApiKey,
    setModel,
    setThinkingRounds,
    setAlternativesPerRound,
    setShowThinkingProcess,
    
    initializeChat,
    sendMessage,
    saveConversation
  } = useRecThink();
  
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  
  // Initialize chat on first load if API key is available
  useEffect(() => {
    const initSession = async () => {
      if (apiKey && !sessionId) {
        await initializeChat();
      }
    };
    
    initSession();
  }, [apiKey, sessionId, initializeChat]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    if (!sessionId) {
      // Initialize chat if not already done
      const newSessionId = await initializeChat();
      if (!newSessionId) return;
    }
    
    await sendMessage(input);
    setInput('');
  };
  
  const handleSaveConversation = async (fullLog = false) => {
    if (!sessionId) return;
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `recthink_conversation_${timestamp}.json`;
    
    await saveConversation(filename, fullLog);
  };

  const renderThinkingIndicator = () => (
    <div className="flex items-center p-4 bg-blue-50 rounded-lg my-2">
      <Brain className="text-blue-500 mr-2" />
      <div className="flex flex-col">
        <div className="flex items-center">
          <span className="font-medium text-blue-700">Thinking recursively...</span>
          <div className="ml-2 flex items-center">
            {[1, 2, 3].map(i => (
              <div key={i} className={`w-2 h-2 mx-1 rounded-full ${thinkingProcess && i <= thinkingProcess.rounds ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
            ))}
          </div>
        </div>
        <span className="text-sm text-blue-600">
          {thinkingProcess ? 
            `Generating ${thinkingProcess.rounds} rounds of alternatives` : 
            'Analyzing your request...'}
        </span>
      </div>
    </div>
  );

  const renderThinkingProcess = () => {
    if (!thinkingProcess) return null;
    
    return (
      <div className="mt-4 border rounded-lg overflow-hidden">
        <div className="bg-gray-100 p-3 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Brain className="text-blue-600 mr-2" size={18} />
              <h3 className="font-medium">Recursive Thinking Process</h3>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-2">{thinkingProcess.rounds} rounds</span>
              <X 
                className="cursor-pointer text-gray-500 hover:text-gray-700" 
                size={18} 
                onClick={() => setShowThinkingProcess(false)}
              />
            </div>
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto p-2">
          {thinkingProcess.history.map((item, index) => (
            <div 
              key={index}
              className={`mb-3 p-3 rounded-lg ${item.selected ? 'border-2 border-green-500 bg-green-50' : 'border border-gray-200 bg-white'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Round {item.round}</span>
                  {item.alternative_number && (
                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full ml-2">Alternative {item.alternative_number}</span>
                  )}
                  {item.selected && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full ml-2 flex items-center">
                      <CheckCircle size={12} className="mr-1" /> Selected
                    </span>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{item.response}</div>
              {item.explanation && item.selected && (
                <div className="mt-2 text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                  <strong>Selected because:</strong> {item.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderChatMessage = (message, index) => (
    <div key={index} className={`mb-4 ${message.role === 'user' ? 'ml-12' : 'mr-12'}`}>
      <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div 
          className={`p-3 rounded-lg ${
            message.role === 'user' 
              ? 'bg-blue-600 text-white rounded-br-none' 
              : 'bg-gray-100 text-gray-800 rounded-bl-none'
          }`}
        >
          {message.content}
          {message.role === 'assistant' && index === messages.length - 1 && thinkingProcess && (
            <div className="mt-2 flex items-center justify-end text-xs text-gray-500">
              <span 
                className="flex items-center cursor-pointer hover:text-blue-600"
                onClick={() => setShowThinkingProcess(true)}
              >
                <Brain size={14} className="mr-1" />
                View thinking process
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-16 bg-gray-900 flex flex-col items-center py-6">
        <div className="bg-blue-600 p-2 rounded-lg mb-8">
          <Brain className="text-white" />
        </div>
        
        <button 
          className={`p-2 rounded-lg mb-4 ${activeTab === 'chat' ? 'bg-gray-800 text-blue-500' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare />
        </button>
        
        <button 
          className={`p-2 rounded-lg mb-4 ${activeTab === 'history' ? 'bg-gray-800 text-blue-500' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setActiveTab('history')}
        >
          <Clock />
        </button>
        
        <button 
          className={`p-2 rounded-lg ${activeTab === 'settings' ? 'bg-gray-800 text-blue-500' : 'text-gray-400 hover:text-white'}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings />
        </button>
        
        <div className="mt-auto">
          <button 
            className="p-2 text-gray-400 hover:text-white"
            onClick={() => handleSaveConversation(false)}
            disabled={!sessionId}
          >
            <Save />
          </button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b flex items-center justify-between p-4">
          <div className="flex items-center">
            <h1 className="text-xl font-medium">RecThink</h1>
            <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">Enhanced Recursive Thinking</span>
          </div>
          
          <div className="flex items-center">
            {sessionId && (
              <div className="flex items-center text-sm mr-4">
                <span className={`inline-block w-2 h-2 mr-1 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 
                  connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
                }`}></span>
                <span className="text-gray-600">
                  {connectionStatus === 'connected' ? 'Connected' : 
                   connectionStatus === 'error' ? 'Connection error' : 'Disconnected'}
                </span>
              </div>
            )}
            
            <button 
              className="flex items-center text-sm text-gray-600 hover:text-blue-600 mr-4"
              onClick={() => {}}
              disabled={!thinkingProcess}
            >
              <RefreshCw size={14} className="mr-1" />
              Thinking rounds: {thinkingProcess ? thinkingProcess.rounds : '?'}
            </button>
            
            <button 
              className="flex items-center text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={14} className="mr-1" />
              Settings
            </button>
          </div>
        </header>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-100 text-red-700 p-3 text-sm border-b">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {/* Main content area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'chat' && (
            <>
              {/* Messages container */}
              <div className="flex-1 overflow-y-auto p-4 bg-white">
                {messages.map(renderChatMessage)}
                {isThinking && renderThinkingIndicator()}
                {showThinkingProcess && thinkingProcess && renderThinkingProcess()}
              </div>
              
              {/* Input area */}
              <div className="p-4 bg-white border-t">
                <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask something..."
                    className="flex-1 bg-transparent outline-none"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={!apiKey || isThinking}
                  />
                  <button 
                    className={`ml-2 p-2 ${
                      !apiKey || isThinking ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                    } text-white rounded-lg flex items-center`}
                    onClick={handleSendMessage}
                    disabled={!apiKey || isThinking}
                  >
                    <Zap size={16} className="mr-1" />
                    Think
                  </button>
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>Model: {model.split('/')[1]}</span>
                  <span className="flex items-center">
                    <Brain size={12} className="mr-1" />
                    Enhanced with recursive thinking
                  </span>
                </div>
              </div>
            </>
          )}
          
          {activeTab === 'settings' && (
            <div className="flex-1 overflow-y-auto p-6">
              <h2 className="text-xl font-medium mb-6">Settings</h2>
              
              <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
                <h3 className="text-lg font-medium mb-4">API Configuration</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">OpenRouter API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <select 
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="mistralai/mistral-small-3.1-24b-instruct:free">Mistral Small 3.1 24B</option>
                    <option value="anthropic/claude-3-opus-20240229">Claude 3 Opus</option>
                    <option value="anthropic/claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                    <option value="openai/gpt-4o-2024-05-13">GPT-4o</option>
                  </select>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
                <h3 className="text-lg font-medium mb-4">Recursive Thinking Settings</h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Thinking Rounds</label>
                  <select 
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                    value={thinkingRounds}
                    onChange={(e) => setThinkingRounds(e.target.value)}
                  >
                    <option value="auto">Auto (Let AI decide)</option>
                    <option value="1">1 Round</option>
                    <option value="2">2 Rounds</option>
                    <option value="3">3 Rounds</option>
                    <option value="4">4 Rounds</option>
                    <option value="5">5 Rounds</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Let the AI decide how many rounds of thinking are needed, or set a fixed number.</p>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alternatives Per Round</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={alternativesPerRound}
                    onChange={(e) => setAlternativesPerRound(parseInt(e.target.value, 10))}
                    className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={showThinkingProcess}
                      onChange={(e) => setShowThinkingProcess(e.target.checked)}
                      className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    Always show thinking process
                  </label>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'history' && (
            <div className="flex-1 overflow-y-auto p-6">
              <h2 className="text-xl font-medium mb-6">Conversation History</h2>
              
              <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
                <h3 className="text-lg font-medium mb-4">Current Session</h3>
                
                {sessionId ? (
                  <div>
                    <p className="mb-2"><strong>Session ID:</strong> {sessionId}</p>
                    <p className="mb-4"><strong>Messages:</strong> {messages.length}</p>
                    
                    <div className="flex space-x-2">
                      <button 
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm flex items-center"
                        onClick={() => handleSaveConversation(false)}
                      >
                        <Save size={14} className="mr-1" />
                        Save Conversation
                      </button>
                      
                      <button 
                        className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 text-sm flex items-center"
                        onClick={() => handleSaveConversation(true)}
                      >
                        <Save size={14} className="mr-1" />
                        Save Full Log
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No active session.</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-center text-gray-500 py-4">
                    Previous sessions are saved as JSON files in your project directory.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecursiveThinkingInterface;