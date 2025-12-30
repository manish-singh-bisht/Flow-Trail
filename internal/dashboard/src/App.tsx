import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FlowsPage from './pages/flow';
import FlowDetail from './pages/flow-details';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<FlowsPage />} />
          <Route path="/flows/:id" element={<FlowDetail />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
