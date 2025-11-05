import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Templates from './pages/Templates'
import WorkoutDetail from './pages/WorkoutDetail'
import History from './pages/History'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="templates" element={<Templates />} />
        <Route path="workout/:id" element={<WorkoutDetail />} />
        <Route path="history" element={<History />} />
      </Route>
    </Routes>
  )
}

export default App
