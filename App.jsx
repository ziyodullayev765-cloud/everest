import React, { useState } from 'react';
import './styles/everest-theme.css'; // Stil fayli
import { Navigation } from './components/Navigation'; // Navigatsiya
import { Dashboard } from './components/Dashboard'; // Asosiy panel

function App() {
  const [currentTab, setTab] = useState('home');

  // O'quvchi ma'lumotlari
  const myHomeworks = [
    { id: 1, title: 'Essential Grammar: Unit 27', description: 'Past Simple exercises', dueDate: 'Sep 24' },
    { id: 2, title: 'Vocabulary List 5', description: 'Learn 20 new words', dueDate: 'Sep 26' }
  ];

  return (
    <div className="app-container">
      <Navigation currentTab={currentTab} setTab={setTab} />
      <main style={{ flex: 1 }}>
        {currentTab === 'home' && <Dashboard studentName="Aziza" homeworks={myHomeworks} />}
      </main>
    </div>
  );
}

export default App;