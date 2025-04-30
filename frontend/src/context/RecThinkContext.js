// Context provider for RecThink
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../api';

const RecThinkContext = createContext();

export const useRecThink = () => useContext(RecThinkContext);

export const RecThinkProvider = ({ children }) => {
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingProcess, setThinkingProcess] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('mistralai/mistral-small-3.1-24b-instruct:free');
  const [thinkingRounds, setThinkingRounds] = useState('auto');
  const [alternativesPerRound, setAlternativesPerRound] = useState(3);
  const [error, setError] = useState(null);
  const [showThinkingProcess, setShowThinkingProcess] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [websocket, setWebsocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Initialize chat session
  const initializeChat = async () => {
    try {
      setError(null);
      const result = await api.initializeChat(apiKey, model);
      setSessionId(result.session_id);
      
      // Initialize with welcome message
      setMessages([
        { role: 'assistant', content: 'Welcome to RecThink! I use recursive thinking to provide better responses. Ask me anything.' }
      ]);
      
      // Set up WebSocket connection
      const ws = api.createWebSocketConnection(result.session_id);
      setWebsocket(ws);
      
      return result.session_id;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  // Send a message and get response
  const sendMessage = async (content) => {
    try {
      setError(null);
      
      // Add user message to conversation
      const newMessages = [...messages, { role: 'user', content }];
      setMessages(newMessages);
      
      // Start thinking process
      setIsThinking(true);
      
      // Determine thinking rounds if set to auto
      let rounds = null;
      if (thinkingRounds !== 'auto') {
        rounds = parseInt(thinkingRounds, 10);
      }
      
      // Send message via API
      const result = await api.sendMessage(sessionId, content, {
        thinkingRounds: rounds,
        alternativesPerRound
      });
      
      // Update conversation with assistant's response
      setMessages([...newMessages, { role: 'assistant', content: result.response }]);
      
      // Store thinking process
      setThinkingProcess({
        rounds: result.thinking_rounds,
        history: result.thinking_history
      });
      
      setIsThinking(false);
      return result;
    } catch (err) {
      setError(err.message);
      setIsThinking(false);
      return null;
    }
  };

  // Save conversation
  const saveConversation = async (filename = null, fullLog = false) => {
    try {
      setError(null);
      return await api.saveConversation(sessionId, filename, fullLog);
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  // Load sessions
  const loadSessions = async () => {
    try {
      setError(null);
      const result = await api.listSessions();
      setSessions(result.sessions);
      return result.sessions;
    } catch (err) {
      setError(err.message);
      return [];
    }
  };

  // Delete session
  const deleteSession = async (id) => {
    try {
      setError(null);
      await api.deleteSession(id);
      
      // Update sessions list
      const updatedSessions = sessions.filter(session => session.session_id !== id);
      setSessions(updatedSessions);
      
      // Clear current session if it's the one being deleted
      if (id === sessionId) {
        setSessionId(null);
        setMessages([]);
        setThinkingProcess(null);
      }
      
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // Set up WebSocket listeners when connection is established
  useEffect(() => {
    if (!websocket) return;
    
    websocket.onopen = () => {
      setConnectionStatus('connected');
    };
    
    websocket.onclose = () => {
      setConnectionStatus('disconnected');
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'chunk') {
        // Handle streaming chunks for real-time updates during thinking
        // This could update a temporary display of thinking process
      } else if (data.type === 'final') {
        // Handle final response with complete thinking history
        setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: data.response }]);
        setThinkingProcess({
          rounds: data.thinking_rounds,
          history: data.thinking_history
        });
        setIsThinking(false);
      } else if (data.error) {
        setError(data.error);
        setIsThinking(false);
      }
    };
    
    websocket.onerror = (error) => {
      setError('WebSocket error: ' + error.message);
      setConnectionStatus('error');
    };
    
    // Clean up function
    return () => {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [websocket]);

  // Context value
  const value = {
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
    sessions,
    connectionStatus,
    
    // Setters
    setApiKey,
    setModel,
    setThinkingRounds,
    setAlternativesPerRound,
    setShowThinkingProcess,
    
    // Actions
    initializeChat,
    sendMessage,
    saveConversation,
    loadSessions,
    deleteSession
  };

  return (
    <RecThinkContext.Provider value={value}>
      {children}
    </RecThinkContext.Provider>
  );
};

export default RecThinkContext;
