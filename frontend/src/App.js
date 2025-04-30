import React from 'react';
import { RecThinkProvider } from './context/RecThinkContext';
import RecursiveThinkingInterface from './components/RecursiveThinkingInterface';
import './App.css';

function App() {
  return (
    <RecThinkProvider>
      <RecursiveThinkingInterface />
    </RecThinkProvider>
  );
}

export default App;
